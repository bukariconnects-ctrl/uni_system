-- Migration 21: Force-add all enrolled students to their course channels
-- Previous backfill added 0 students. This migration:
--   1. Logs current state
--   2. Creates any missing channels
--   3. Removes stale non-admin members
--   4. Adds all enrolled students
-- ============================================================

DO $$
DECLARE
    v_channel_count INT;
    v_enrolled_count INT;
    v_existing_members INT;
    v_added INT;
BEGIN
    SELECT COUNT(*) INTO v_channel_count FROM channels WHERE channel_type = 'course';
    SELECT COUNT(*) INTO v_enrolled_count FROM enrollments WHERE status = 'enrolled';
    SELECT COUNT(*) INTO v_existing_members FROM channel_members cm JOIN channels c ON cm.channel_id = c.id WHERE c.channel_type = 'course';

    RAISE NOTICE 'State before fix — channels: %, enrolled: %, existing members: %',
        v_channel_count, v_enrolled_count, v_existing_members;

    -- 1. Create missing channels for any enrolled groups that don't have one
    INSERT INTO channels (tenant_id, course_id, major_id, academic_level_id, semester_id, name, channel_type)
    SELECT DISTINCT
        e.tenant_id,
        e.course_id,
        e.major_id,
        e.academic_level_id,
        e.semester_id,
        COALESCE(c.name, 'مادة')
            || ' - ' || COALESCE(m.name, 'تخصص')
            || ' - مستوى ' || COALESCE(al.level_number::text, '?'),
        'course'::channel_type
    FROM enrollments e
    JOIN courses c ON c.id = e.course_id
    LEFT JOIN academic_levels al ON al.id = e.academic_level_id
    LEFT JOIN majors m ON m.id = COALESCE(e.major_id, al.major_id)
    WHERE e.status = 'enrolled'
      AND e.course_id IS NOT NULL AND e.semester_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM channels ch
        WHERE ch.channel_type = 'course'
          AND ch.tenant_id = e.tenant_id
          AND ch.course_id IS NOT DISTINCT FROM e.course_id
          AND ch.major_id IS NOT DISTINCT FROM e.major_id
          AND ch.academic_level_id IS NOT DISTINCT FROM e.academic_level_id
          AND ch.semester_id IS NOT DISTINCT FROM e.semester_id
      )
    ON CONFLICT DO NOTHING;

    -- 2. Add instructors as admins for any channels that lack them
    INSERT INTO channel_members (tenant_id, channel_id, profile_id, is_admin)
    SELECT DISTINCT c.tenant_id, c.id, cs.instructor_id, TRUE
    FROM channels c
    JOIN course_schedules cs ON cs.semester_id = c.semester_id
    JOIN study_plan_courses spc
        ON spc.id = cs.study_plan_course_id
        AND spc.course_id = c.course_id
        AND spc.academic_level_id = c.academic_level_id
    WHERE c.channel_type = 'course'
      AND cs.instructor_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM channel_members cm
        WHERE cm.channel_id = c.id AND cm.profile_id = cs.instructor_id AND cm.is_admin = TRUE
      )
    ON CONFLICT (channel_id, profile_id) DO UPDATE SET is_admin = TRUE;

    -- 3. Remove all non-admin student members (to start fresh)
    DELETE FROM channel_members
    WHERE is_admin = FALSE
      AND channel_id IN (SELECT id FROM channels WHERE channel_type = 'course');

    -- 4. Add all enrolled students
    INSERT INTO channel_members (tenant_id, channel_id, profile_id, is_admin)
    SELECT DISTINCT e.tenant_id, c.id, e.student_id, FALSE
    FROM enrollments e
    JOIN channels c
        ON c.channel_type = 'course'
        AND c.tenant_id = e.tenant_id
        AND c.course_id IS NOT DISTINCT FROM e.course_id
        AND c.major_id IS NOT DISTINCT FROM e.major_id
        AND c.academic_level_id IS NOT DISTINCT FROM e.academic_level_id
        AND c.semester_id IS NOT DISTINCT FROM e.semester_id
    WHERE e.status = 'enrolled'
      AND e.course_id IS NOT NULL AND e.semester_id IS NOT NULL;

    GET DIAGNOSTICS v_added = ROW_COUNT;
    RAISE NOTICE 'Migration 21 complete: added % enrolled students to course channels', v_added;
END $$;
