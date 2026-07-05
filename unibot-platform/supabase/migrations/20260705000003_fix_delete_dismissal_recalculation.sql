-- ============================================================
-- Migration: Fix recalculation of is_dismissed on DELETE
--
-- The trigger function recalculate_attendance_summary() only
-- evaluated the dismissal flags (is_dismissed, dismissed_at)
-- for INSERT and UPDATE operations, but NOT for DELETE.
--
-- When a faculty member deletes an attendance session, the
-- attendance_records are cascade-deleted, and the trigger fires.
-- But since TG_OP = 'DELETE', the is_dismissed flag was never
-- re-evaluated — so a student who was "dismissed" due to
-- reaching the absence limit would remain "dismissed" even
-- after the session that caused the dismissal was deleted.
--
-- Fix: Remove the TG_OP guard so the dismissal logic always
-- runs, regardless of whether the trigger fired from
-- INSERT, UPDATE, or DELETE.
-- ============================================================

-- Step 1: Drop the old trigger
DROP TRIGGER IF EXISTS trg_recalc_attendance_summary ON attendance_records;

-- Step 2: Replace the function — remove TG_OP guard around dismissal logic
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

    -- Find enrollment by student + course (include any status)
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

    -- Re-evaluate dismissal flag for ANY operation (INSERT, UPDATE, DELETE)
    -- This ensures that deleting a session correctly clears the flag
    -- if the student is now below the absence limit

    -- Mark as dismissed in summary if unexcused >= limit
    IF v_unexcused >= v_limit_count AND NOT COALESCE(v_is_dismissed, FALSE) THEN
        v_is_dismissed := TRUE;
        v_dismissed_at := NOW();

    -- Restore flag if student goes back below threshold (e.g., a session was deleted or status changed to excused)
    ELSIF v_unexcused < v_limit_count AND COALESCE(v_is_dismissed, FALSE) = TRUE THEN
        v_is_dismissed := FALSE;
        v_dismissed_at := NULL;
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

DO $$
BEGIN
    RAISE NOTICE 'Migration complete: Fixed is_dismissed recalculation on DELETE operations';
END $$;
