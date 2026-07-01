-- Migration 22: Fix channel_type cast in find_or_create_course_channel()
-- ============================================================

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
            || ' - مستوى ' || COALESCE(v_level_number::text, '?'),
        'course'::channel_type
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

DO $$
BEGIN
    RAISE NOTICE 'Migration 22 complete: fixed channel_type cast in find_or_create_course_channel()';
END $$;
