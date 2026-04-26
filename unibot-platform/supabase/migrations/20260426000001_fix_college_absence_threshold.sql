-- Fix: Use college-level absence_threshold when set, falling back to tenant default
-- The operational doc specifies: "يبحث الـ Trigger عن نسبة كليته أولاً"
-- Previously the function always read from `tenants.absence_threshold` only.

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
    v_closed_total       INT;
    v_closed_unexcused   INT;
    v_pct                NUMERIC(5,2);
    v_threshold          NUMERIC(5,2);
    v_is_dismissed       BOOLEAN;
    v_dismissed_at       TIMESTAMPTZ;
    v_college_threshold  NUMERIC(5,2);
    v_tenant_threshold   NUMERIC(5,2);
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

    -- Count ALL sessions for display purposes
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE ar.status = 'present'),
        COUNT(*) FILTER (WHERE ar.status = 'excused'),
        COUNT(*) FILTER (WHERE ar.status = 'absent'),
        COUNT(*) FILTER (WHERE ar.status = 'late')
    INTO v_total, v_attended, v_excused, v_unexcused, v_late
    FROM attendance_records ar
    WHERE ar.section_id = COALESCE(NEW.section_id, OLD.section_id)
      AND ar.student_id = COALESCE(NEW.student_id, OLD.student_id);

    -- Count only CLOSED sessions for dismissal calculation
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE ar.status = 'absent')
    INTO v_closed_total, v_closed_unexcused
    FROM attendance_records ar
    JOIN attendance_sessions asess ON asess.id = ar.session_id
    WHERE ar.section_id = COALESCE(NEW.section_id, OLD.section_id)
      AND ar.student_id = COALESCE(NEW.student_id, OLD.student_id)
      AND asess.is_open = FALSE;

    -- Calculate absence percentage based on CLOSED sessions only
    v_pct := CASE WHEN v_closed_total > 0
                  THEN ROUND((v_closed_unexcused::NUMERIC / v_closed_total) * 100, 2)
                  ELSE 0 END;

    -- Resolve threshold: college-level override first, then tenant default
    -- Path: section -> course -> department -> college.absence_threshold
    SELECT c.absence_threshold
    INTO v_college_threshold
    FROM sections s
    JOIN courses co ON co.id = s.course_id
    JOIN departments d  ON d.id  = co.department_id
    JOIN colleges c     ON c.id  = d.college_id
    WHERE s.id = COALESCE(NEW.section_id, OLD.section_id)
    LIMIT 1;

    SELECT COALESCE(t.absence_threshold, 25)
    INTO v_tenant_threshold
    FROM tenants t WHERE t.id = v_tenant_id;

    -- Use college threshold when explicitly set; otherwise fall back to tenant default
    v_threshold := COALESCE(v_college_threshold, v_tenant_threshold);

    SELECT is_dismissed, dismissed_at
    INTO v_is_dismissed, v_dismissed_at
    FROM attendance_summaries WHERE enrollment_id = v_enrollment_id;

    -- Dismiss if threshold exceeded AND at least 3 CLOSED sessions recorded
    IF v_pct >= v_threshold AND v_closed_total >= 3 AND NOT COALESCE(v_is_dismissed, FALSE) THEN
        v_is_dismissed := TRUE;
        v_dismissed_at := NOW();
        UPDATE enrollments SET status = 'dismissed' WHERE id = v_enrollment_id;
    -- Restore if previously dismissed but now back below threshold
    -- Use v_is_dismissed (from attendance_summaries) not v_enrollment_status (stale snapshot)
    ELSIF v_pct < v_threshold AND COALESCE(v_is_dismissed, FALSE) = TRUE THEN
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
