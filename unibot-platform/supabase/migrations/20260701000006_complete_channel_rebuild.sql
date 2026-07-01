-- Migration 19: Complete channel rebuild (follow-up to migration 18)
-- Migration 18 partially applied (added columns + indexes, then failed on unique index).
-- This migration completes the remaining steps.
-- ============================================================

-- Step 1: Wipe old course channels (CASCADE takes care of members + messages)
DELETE FROM channels WHERE channel_type = 'course';

-- Step 2: Unique index for course group channels
DROP INDEX IF EXISTS uq_channels_course_group;
CREATE UNIQUE INDEX uq_channels_course_group
ON channels (
    tenant_id,
    COALESCE(course_id,       '00000000-0000-0000-0000-000000000000'),
    COALESCE(major_id,        '00000000-0000-0000-0000-000000000000'),
    COALESCE(academic_level_id,'00000000-0000-0000-0000-000000000000'),
    COALESCE(semester_id,     '00000000-0000-0000-0000-000000000000')
)
WHERE channel_type = 'course';

-- Step 3: Helper function — find-or-create a channel for a course group
CREATE OR REPLACE FUNCTION find_or_create_course_channel(
    p_tenant_id          UUID,
    p_course_id          UUID,
    p_major_id           UUID,
    p_academic_level_id  UUID,
    p_semester_id        UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_channel_id    UUID;
    v_course_name   VARCHAR(255);
    v_major_name    VARCHAR(255);
    v_level_number  INT;
    v_semester_name VARCHAR(100);
BEGIN
    SELECT id INTO v_channel_id
    FROM channels
    WHERE channel_type = 'course'
      AND tenant_id = p_tenant_id
      AND course_id       IS NOT DISTINCT FROM p_course_id
      AND major_id        IS NOT DISTINCT FROM p_major_id
      AND academic_level_id IS NOT DISTINCT FROM p_academic_level_id
      AND semester_id     IS NOT DISTINCT FROM p_semester_id
    LIMIT 1;

    IF v_channel_id IS NOT NULL THEN
        RETURN v_channel_id;
    END IF;

    SELECT c.name INTO v_course_name   FROM courses c WHERE c.id = p_course_id;
    SELECT m.name INTO v_major_name    FROM majors m WHERE m.id = p_major_id;
    SELECT al.level_number INTO v_level_number FROM academic_levels al WHERE al.id = p_academic_level_id;
    SELECT s.name   INTO v_semester_name FROM semesters s WHERE s.id = p_semester_id;

    INSERT INTO channels (tenant_id, course_id, major_id, academic_level_id, semester_id, name, channel_type)
    VALUES (
        p_tenant_id,
        p_course_id,
        p_major_id,
        p_academic_level_id,
        p_semester_id,
        COALESCE(v_course_name, 'مادة')
            || ' - ' || COALESCE(v_major_name, 'تخصص')
            || ' - مستوى ' || COALESCE(v_level_number::text, '?')
            || ' (' || COALESCE(v_semester_name, '') || ')',
        'course'
    )
    RETURNING id INTO v_channel_id;

    INSERT INTO channel_members (tenant_id, channel_id, profile_id, is_admin)
    SELECT DISTINCT p_tenant_id, v_channel_id, cs.instructor_id, TRUE
    FROM course_schedules cs
    JOIN study_plan_courses spc ON spc.id = cs.study_plan_course_id
    WHERE spc.course_id = p_course_id
      AND spc.academic_level_id = p_academic_level_id
      AND cs.semester_id = p_semester_id
      AND cs.instructor_id IS NOT NULL
    ON CONFLICT (channel_id, profile_id) DO UPDATE SET is_admin = TRUE;

    RETURN v_channel_id;
END;
$$;

-- Step 4: Trigger function — auto-add/remove students on enrollment changes
CREATE OR REPLACE FUNCTION auto_add_to_course_channel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_channel_id UUID;
BEGIN
    IF NEW.status = 'enrolled' AND NEW.course_id IS NOT NULL AND NEW.semester_id IS NOT NULL THEN
        v_channel_id := find_or_create_course_channel(
            NEW.tenant_id, NEW.course_id, NEW.major_id, NEW.academic_level_id, NEW.semester_id
        );

        IF v_channel_id IS NOT NULL THEN
            INSERT INTO channel_members (tenant_id, channel_id, profile_id, is_admin)
            VALUES (NEW.tenant_id, v_channel_id, NEW.student_id, FALSE)
            ON CONFLICT (channel_id, profile_id) DO NOTHING;
        END IF;

    ELSIF NEW.status IN ('dropped', 'dismissed', 'withdrawn')
          AND NEW.course_id IS NOT NULL AND NEW.semester_id IS NOT NULL
    THEN
        SELECT id INTO v_channel_id
        FROM channels
        WHERE channel_type = 'course'
          AND tenant_id = NEW.tenant_id
          AND course_id       IS NOT DISTINCT FROM NEW.course_id
          AND major_id        IS NOT DISTINCT FROM NEW.major_id
          AND academic_level_id IS NOT DISTINCT FROM NEW.academic_level_id
          AND semester_id     IS NOT DISTINCT FROM NEW.semester_id
        LIMIT 1;

        IF v_channel_id IS NOT NULL THEN
            DELETE FROM channel_members
            WHERE channel_id = v_channel_id AND profile_id = NEW.student_id AND is_admin = FALSE;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_channel_membership ON enrollments;
CREATE TRIGGER trg_auto_channel_membership
    AFTER INSERT OR UPDATE ON enrollments
    FOR EACH ROW EXECUTE FUNCTION auto_add_to_course_channel();

-- Step 5: Backfill — create channels for every existing enrolled group
DO $$
DECLARE
    rec RECORD;
    ch_id UUID;
BEGIN
    FOR rec IN (
        SELECT DISTINCT
            e.tenant_id,
            e.course_id,
            e.major_id,
            e.academic_level_id,
            e.semester_id
        FROM enrollments e
        WHERE e.status = 'enrolled'
          AND e.course_id IS NOT NULL
          AND e.semester_id IS NOT NULL
    ) LOOP
        ch_id := find_or_create_course_channel(
            rec.tenant_id, rec.course_id, rec.major_id, rec.academic_level_id, rec.semester_id
        );
    END LOOP;

    RAISE NOTICE 'Migration 19 complete: channels rebuilt for course groups';
END $$;
