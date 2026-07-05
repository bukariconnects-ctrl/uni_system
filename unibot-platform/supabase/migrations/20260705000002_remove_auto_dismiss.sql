-- ============================================================
-- Migration: Remove auto-dismissal of students when exceeding absence limit
--
-- Students should remain enrolled in courses even after exceeding
-- the absence limit. The is_dismissed flag on attendance_summaries
-- is kept for display/warning purposes only.
-- ============================================================

-- Step 1: Drop the old trigger so we can replace the function
DROP TRIGGER IF EXISTS trg_recalc_attendance_summary ON attendance_records;

-- Step 2: Rewrite the function — REMOVED the UPDATE enrollments SET status = 'dismissed'
CREATE OR REPLACE FUNCTION recalculate_attendance_summary()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_enrollment_id      UUID;
    v_tenant_id          UUID;
    v_total              INT;
    v_attended           INT;
    v_excused            INT;
    v_unexcused          INT;
    v_late               INT;
    v_limit_count        INT;
    v_is_dismissed       BOOLEAN;
    v_dismissed_at       TIMESTAMPTZ;
    v_student_id         UUID;
    v_course_id          UUID;
    v_previous_unexcused INT;
BEGIN
    v_student_id := COALESCE(NEW.student_id, OLD.student_id);
    v_course_id  := COALESCE(NEW.course_id, OLD.course_id);

    -- Find enrollment by student + course (include any status, not just 'enrolled')
    SELECT e.id, e.tenant_id
    INTO v_enrollment_id, v_tenant_id
    FROM enrollments e
    WHERE e.student_id = v_student_id
      AND e.course_id = v_course_id
    LIMIT 1;

    IF v_enrollment_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Count attendance records for this student + course
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE ar.status = 'present'),
        COUNT(*) FILTER (WHERE ar.status = 'excused'),
        COUNT(*) FILTER (WHERE ar.status = 'absent'),
        COUNT(*) FILTER (WHERE ar.status = 'late')
    INTO v_total, v_attended, v_excused, v_unexcused, v_late
    FROM attendance_records ar
    JOIN attendance_sessions s ON ar.session_id = s.id
    WHERE s.course_id = v_course_id
      AND ar.student_id = v_student_id;

    -- Resolve absence limit count: college-level override first, then tenant default
    SELECT COALESCE(c.absence_limit_count, t.absence_limit_count, 5)
    INTO v_limit_count
    FROM tenants t
    LEFT JOIN enrollments e ON e.id = v_enrollment_id
    LEFT JOIN courses co ON co.id = e.course_id
    LEFT JOIN departments d ON d.id = co.department_id
    LEFT JOIN colleges c ON c.id = d.college_id
    WHERE t.id = v_tenant_id
    LIMIT 1;

    -- Get current dismissal state from summary (if exists)
    SELECT is_dismissed, dismissed_at
    INTO v_is_dismissed, v_dismissed_at
    FROM attendance_summaries WHERE enrollment_id = v_enrollment_id;

    -- Set is_dismissed flag for display purposes only — DO NOT change enrollment status
    IF TG_OP = 'UPDATE' OR TG_OP = 'INSERT' THEN
        -- Mark as dismissed in summary if unexcused >= limit
        IF v_unexcused >= v_limit_count AND NOT COALESCE(v_is_dismissed, FALSE) THEN
            v_is_dismissed := TRUE;
            v_dismissed_at := NOW();
        END IF;

        -- Restore flag if student goes back below threshold (e.g. status changed to excused)
        IF v_unexcused < v_limit_count AND COALESCE(v_is_dismissed, FALSE) = TRUE THEN
            v_is_dismissed := FALSE;
            v_dismissed_at := NULL;
        END IF;
    END IF;

    INSERT INTO attendance_summaries (
        tenant_id, enrollment_id, student_id, course_id, section_id,
        total_sessions, attended_sessions, excused_absences,
        unexcused_absences, late_count, absence_percentage,
        is_dismissed, dismissed_at, last_updated
    ) VALUES (
        v_tenant_id, v_enrollment_id,
        v_student_id, v_course_id, NULL,
        v_total, v_attended, v_excused, v_unexcused, v_late,
        CASE WHEN v_total > 0 THEN ROUND((v_unexcused::NUMERIC / v_total) * 100, 2) ELSE 0 END,
        COALESCE(v_is_dismissed, FALSE), v_dismissed_at, NOW()
    )
    ON CONFLICT (enrollment_id) DO UPDATE SET
        course_id          = EXCLUDED.course_id,
        total_sessions     = EXCLUDED.total_sessions,
        attended_sessions  = EXCLUDED.attended_sessions,
        excused_absences   = EXCLUDED.excused_absences,
        unexcused_absences = EXCLUDED.unexcused_absences,
        late_count         = EXCLUDED.late_count,
        absence_percentage = EXCLUDED.absence_percentage,
        is_dismissed       = EXCLUDED.is_dismissed,
        dismissed_at       = CASE
                               WHEN EXCLUDED.is_dismissed = FALSE THEN NULL
                               ELSE COALESCE(attendance_summaries.dismissed_at, EXCLUDED.dismissed_at)
                             END,
        last_updated       = NOW();

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Step 3: Recreate the trigger
CREATE TRIGGER trg_recalc_attendance_summary
    AFTER INSERT OR UPDATE OR DELETE ON attendance_records
    FOR EACH ROW EXECUTE FUNCTION recalculate_attendance_summary();

-- Step 4: Restore all dismissed enrollments back to enrolled
UPDATE enrollments
SET status = 'enrolled',
    updated_at = NOW()
WHERE status = 'dismissed';

-- Step 5: Also update is_dismissed on existing summaries where unexcused >= limit
-- (recalculate using current data)
UPDATE attendance_summaries s
SET is_dismissed = TRUE,
    dismissed_at = COALESCE(s.dismissed_at, NOW())
WHERE s.is_dismissed = FALSE
  AND EXISTS (
    SELECT 1 FROM tenants t
    LEFT JOIN enrollments e ON e.id = s.enrollment_id
    LEFT JOIN courses co ON co.id = s.course_id
    LEFT JOIN departments d ON d.id = co.department_id
    LEFT JOIN colleges c ON c.id = d.college_id
    WHERE COALESCE(c.absence_limit_count, t.absence_limit_count, 5) IS NOT NULL
      AND s.unexcused_absences >= COALESCE(c.absence_limit_count, t.absence_limit_count, 5)
  );

DO $$
BEGIN
    RAISE NOTICE 'Migration complete: Removed auto-dismissal, restored all dismissed enrollments to enrolled';
END $$;
