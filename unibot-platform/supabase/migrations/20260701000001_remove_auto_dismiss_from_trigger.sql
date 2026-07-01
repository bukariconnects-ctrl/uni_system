-- ============================================================
-- Migration 14: Remove auto-dismiss from attendance trigger
--
-- The recalculate_attendance_summary() trigger was automatically
-- dismissing students (changing enrollment status to 'dismissed')
-- when absence percentage exceeded the threshold. This is not
-- desired behavior — the system should only track attendance,
-- not modify enrollment status.
-- ============================================================

-- Step 1: Drop the old trigger
DROP TRIGGER IF EXISTS trg_recalc_attendance_summary ON attendance_records;

-- Step 2: Rewrite the function WITHOUT auto-dismiss logic
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
    v_pct                NUMERIC(5,2);
    v_student_id         UUID;
    v_course_id          UUID;
BEGIN
    v_student_id := COALESCE(NEW.student_id, OLD.student_id);
    v_course_id  := COALESCE(NEW.course_id, OLD.course_id);

    -- Find enrollment by student + course
    SELECT e.id, e.tenant_id
    INTO v_enrollment_id, v_tenant_id
    FROM enrollments e
    WHERE e.student_id = v_student_id
      AND e.course_id = v_course_id
      AND e.status = 'enrolled'
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

    v_pct := CASE WHEN v_total > 0
                  THEN ROUND((v_unexcused::NUMERIC / v_total) * 100, 2)
                  ELSE 0 END;

    -- NOTE: Auto-dismissal has been removed per user request.
    -- The summary tracks attendance data only; enrollment status
    -- is never modified by this trigger.

    INSERT INTO attendance_summaries (
        tenant_id, enrollment_id, student_id, course_id, section_id,
        total_sessions, attended_sessions, excused_absences,
        unexcused_absences, late_count, absence_percentage,
        is_dismissed, dismissed_at, last_updated
    ) VALUES (
        v_tenant_id, v_enrollment_id,
        v_student_id, v_course_id, NULL,
        v_total, v_attended, v_excused, v_unexcused, v_late,
        v_pct, FALSE, NULL, NOW()
    )
    ON CONFLICT (enrollment_id) DO UPDATE SET
        course_id          = EXCLUDED.course_id,
        total_sessions     = EXCLUDED.total_sessions,
        attended_sessions  = EXCLUDED.attended_sessions,
        excused_absences   = EXCLUDED.excused_absences,
        unexcused_absences = EXCLUDED.unexcused_absences,
        late_count         = EXCLUDED.late_count,
        absence_percentage = EXCLUDED.absence_percentage,
        is_dismissed       = FALSE,
        dismissed_at       = NULL,
        last_updated       = NOW();

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Step 3: Recreate the trigger
CREATE TRIGGER trg_recalc_attendance_summary
    AFTER INSERT OR UPDATE OR DELETE ON attendance_records
    FOR EACH ROW EXECUTE FUNCTION recalculate_attendance_summary();

-- Step 4: Restore any enrollments that were incorrectly dismissed
UPDATE enrollments
SET status = 'enrolled'
WHERE status = 'dismissed';

-- Step 5: Reset is_dismissed flag on all attendance_summaries
UPDATE attendance_summaries
SET is_dismissed = FALSE,
    dismissed_at = NULL;

DO $$
BEGIN
    RAISE NOTICE 'Migration 14 complete: Removed auto-dismiss from attendance trigger, restored dismissed enrollments';
END $$;
