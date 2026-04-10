-- Auto-restore dismissed enrollment when attendance is changed to present
-- This allows faculty to fix mistakes by marking a dismissed student as present

CREATE OR REPLACE FUNCTION recalculate_attendance_summary()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_enrollment_id      UUID;
    v_tenant_id          UUID;
    v_enrollment_status  TEXT;
    v_total              INT;
    v_attended           INT;
    v_excused            INT;
    v_unexcused          INT;
    v_late               INT;
    v_pct                NUMERIC(5,2);
    v_threshold          NUMERIC(5,2);
    v_is_dismissed       BOOLEAN;
    v_dismissed_at       TIMESTAMPTZ;
BEGIN
    SELECT e.id, e.tenant_id, e.status
    INTO v_enrollment_id, v_tenant_id, v_enrollment_status
    FROM enrollments e
    WHERE e.student_id = COALESCE(NEW.student_id, OLD.student_id)
      AND e.section_id = COALESCE(NEW.section_id, OLD.section_id)
    LIMIT 1;

    IF v_enrollment_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Only count attendance from CLOSED sessions (is_open = FALSE)
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE ar.status = 'present'),
        COUNT(*) FILTER (WHERE ar.status = 'excused'),
        COUNT(*) FILTER (WHERE ar.status = 'absent'),
        COUNT(*) FILTER (WHERE ar.status = 'late')
    INTO v_total, v_attended, v_excused, v_unexcused, v_late
    FROM attendance_records ar
    JOIN attendance_sessions asess ON asess.id = ar.session_id
    WHERE ar.section_id = COALESCE(NEW.section_id, OLD.section_id)
      AND ar.student_id = COALESCE(NEW.student_id, OLD.student_id)
      AND asess.is_open = FALSE;

    v_pct := CASE WHEN v_total > 0
                  THEN ROUND((v_unexcused::NUMERIC / v_total) * 100, 2)
                  ELSE 0 END;

    SELECT COALESCE(t.absence_threshold, 25)
    INTO v_threshold
    FROM tenants t WHERE t.id = v_tenant_id;

    SELECT is_dismissed, dismissed_at
    INTO v_is_dismissed, v_dismissed_at
    FROM attendance_summaries WHERE enrollment_id = v_enrollment_id;

    -- Check if student should be dismissed (threshold exceeded AND at least 3 closed sessions)
    IF v_pct >= v_threshold AND v_total >= 3 AND NOT COALESCE(v_is_dismissed, FALSE) THEN
        v_is_dismissed := TRUE;
        v_dismissed_at := NOW();
        UPDATE enrollments SET status = 'dismissed' WHERE id = v_enrollment_id;
    -- Check if student should be RESTORED (was dismissed but now below threshold)
    ELSIF v_pct < v_threshold AND v_enrollment_status = 'dismissed' THEN
        v_is_dismissed := FALSE;
        v_dismissed_at := NULL;
        UPDATE enrollments SET status = 'enrolled' WHERE id = v_enrollment_id;
    END IF;

    INSERT INTO attendance_summaries (
        tenant_id, enrollment_id, student_id, section_id,
        total_sessions, attended_sessions, excused_absences,
        unexcused_absences, late_count, absence_percentage,
        is_dismissed, dismissed_at, last_updated
    ) VALUES (
        v_tenant_id, v_enrollment_id,
        COALESCE(NEW.student_id, OLD.student_id),
        COALESCE(NEW.section_id, OLD.section_id),
        v_total, v_attended, v_excused, v_unexcused, v_late,
        v_pct, COALESCE(v_is_dismissed, FALSE), v_dismissed_at, NOW()
    )
    ON CONFLICT (enrollment_id) DO UPDATE SET
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
