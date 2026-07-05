-- ============================================================
-- Migration: Change absence system from percentage-based to count-based
--
-- Instead of "absence_threshold = 25%" (meaning 25% absence leads to dismissal),
-- use "absence_limit_count = 5" (meaning 5 unexcused absences lead to dismissal).
--
-- Changes:
--   1. Add absence_limit_count columns to tenants and colleges
--   2. Rewrite recalculate_attendance_summary() to use count-based logic
--   3. Add notification triggers for absence warnings (at 3, 4 absences)
--   4. Re-enable auto-dismiss when exceeding the limit count
-- ============================================================

-- Step 1: Add absence_limit_count columns
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS absence_limit_count INTEGER NOT NULL DEFAULT 5;

ALTER TABLE colleges
  ADD COLUMN IF NOT EXISTS absence_limit_count INTEGER;

-- Step 2: Drop old trigger
DROP TRIGGER IF EXISTS trg_recalc_attendance_summary ON attendance_records;

-- Step 3: Rewrite the function to use count-based logic
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

    -- Get current dismissal state
    SELECT is_dismissed, dismissed_at
    INTO v_is_dismissed, v_dismissed_at
    FROM attendance_summaries WHERE enrollment_id = v_enrollment_id;

    -- Check if previous unexcused count was below threshold and now exceeded
    -- (used for notification logic which is handled by a separate trigger)
    IF TG_OP = 'UPDATE' OR TG_OP = 'INSERT' THEN
        -- Auto-dismiss if unexcused absences >= limit count
        IF v_unexcused >= v_limit_count AND NOT COALESCE(v_is_dismissed, FALSE) THEN
            v_is_dismissed := TRUE;
            v_dismissed_at := NOW();
            UPDATE enrollments SET status = 'dismissed' WHERE id = v_enrollment_id;
        END IF;

        -- Restore if previously dismissed but now below threshold (e.g., status changed to excused)
        IF v_unexcused < v_limit_count AND COALESCE(v_is_dismissed, FALSE) = TRUE THEN
            v_is_dismissed := FALSE;
            v_dismissed_at := NULL;
            UPDATE enrollments SET status = 'enrolled' WHERE id = v_enrollment_id;
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

-- Step 4: Recreate the trigger
CREATE TRIGGER trg_recalc_attendance_summary
    AFTER INSERT OR UPDATE OR DELETE ON attendance_records
    FOR EACH ROW EXECUTE FUNCTION recalculate_attendance_summary();

-- Step 5: Create function to send absence notifications
CREATE OR REPLACE FUNCTION notify_absence_warning()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_limit_count  INT;
    v_tenant_name  TEXT;
BEGIN
    -- Only act on INSERT or UPDATE that changes unexcused_absences
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    -- Get the limit count for this student's enrollment
    SELECT COALESCE(c.absence_limit_count, t.absence_limit_count, 5)
    INTO v_limit_count
    FROM tenants t
    LEFT JOIN enrollments e ON e.id = NEW.enrollment_id
    LEFT JOIN courses co ON co.id = e.course_id
    LEFT JOIN departments d ON d.id = co.department_id
    LEFT JOIN colleges c ON c.id = d.college_id
    WHERE t.id = NEW.tenant_id
    LIMIT 1;

    SELECT t.name INTO v_tenant_name FROM tenants t WHERE t.id = NEW.tenant_id;

    -- Warning at 3 unexcused absences (or 60% of limit if limit < 5)
    IF NEW.unexcused_absences = GREATEST(CEIL(v_limit_count * 0.6)::INT, 1) AND NEW.unexcused_absences > 0 AND NOT NEW.is_dismissed THEN
        INSERT INTO notifications (tenant_id, recipient_id, notification_type, title, body, reference_table, reference_id)
        VALUES (
            NEW.tenant_id,
            NEW.student_id,
            'absence_warning',
            'تنبيه غياب - إنذار أول',
            'عزيزي الطالب، نود إعلامك أن عدد مرات غيابك في المقرر قد وصل إلى ' || NEW.unexcused_absences || ' من أصل ' || v_limit_count || ' غيابات مسموحة. نأمل منك الالتزام بالحضور.',
            'attendance_summaries',
            NEW.id
        );
    END IF;

    -- Final warning at 4 unexcused absences (or 80% of limit)
    IF NEW.unexcused_absences = GREATEST(CEIL(v_limit_count * 0.8)::INT, 2) AND NEW.unexcused_absences > 0 AND NOT NEW.is_dismissed THEN
        INSERT INTO notifications (tenant_id, recipient_id, notification_type, title, body, reference_table, reference_id)
        VALUES (
            NEW.tenant_id,
            NEW.student_id,
            'absence_warning',
            'إنذار غياب أخير - خطر الحرمان',
            'عزيزي الطالب، ننبهك أن عدد غياباتك بلغ ' || NEW.unexcused_absences || ' من أصل ' || v_limit_count || ' غيابات مسموحة. سيتم حرمانك من المقرر إذا تجاوزت الحد المسموح.',
            'attendance_summaries',
            NEW.id
        );
    END IF;

    -- Dismissal notification when exceeding limit
    IF NEW.is_dismissed AND (TG_OP = 'UPDATE' AND OLD.is_dismissed = FALSE OR TG_OP = 'INSERT') THEN
        INSERT INTO notifications (tenant_id, recipient_id, notification_type, title, body, reference_table, reference_id)
        VALUES (
            NEW.tenant_id,
            NEW.student_id,
            'absence_dismissal',
            'حرمان من المقرر',
            'عزيزي الطالب، تم حرمانك من هذا المقرر بسبب تجاوز الحد المسموح للغياب (' || v_limit_count || ' غيابات). يرجى التواصل مع إدارة الكلية.',
            'attendance_summaries',
            NEW.id
        );
    END IF;

    RETURN NEW;
END;
$$;

-- Create trigger for absence notifications
DROP TRIGGER IF EXISTS trg_notify_absence_warning ON attendance_summaries;
CREATE TRIGGER trg_notify_absence_warning
    AFTER INSERT OR UPDATE ON attendance_summaries
    FOR EACH ROW EXECUTE FUNCTION notify_absence_warning();

-- Step 6: Update existing attendance_summaries to recalculate with new logic
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT DISTINCT ar.student_id, s.course_id, e.tenant_id
        FROM attendance_records ar
        JOIN attendance_sessions s ON ar.session_id = s.id
        JOIN enrollments e ON e.student_id = ar.student_id AND e.course_id = s.course_id AND e.status = 'enrolled'
    LOOP
        -- Touch one record per (student, course) to trigger the recalculate trigger
        UPDATE attendance_records ar
        SET modified_at = NOW()
        WHERE ar.id = (
            SELECT ar2.id
            FROM attendance_records ar2
            JOIN attendance_sessions s2 ON ar2.session_id = s2.id
            WHERE s2.course_id = r.course_id
              AND ar2.student_id = r.student_id
            LIMIT 1
        );
    END LOOP;
END $$;

DO $$
BEGIN
    RAISE NOTICE 'Migration complete: Changed absence system to count-based with auto-dismiss and notifications';
END $$;
