-- ============================================================
-- Migration 13: Fix attendance_summaries trigger & schema
--
-- The recalculate_attendance_summary() trigger still used
-- section_id to match enrollments and count records. Since
-- sections were removed and attendance_records no longer
-- have a section_id value (NULL), the trigger:
--   1. Could not find the enrollment → skipped summary update
--   2. Counted records by section_id → got 0 for new records
--
-- Fix: add course_id to attendance_summaries, drop NOT NULL
-- on section_id, and rewrite the trigger to use course_id.
-- ============================================================

-- Step 1: Drop the old trigger first (function depends on table)
DROP TRIGGER IF EXISTS trg_recalc_attendance_summary ON attendance_records;

-- Step 2: Fix attendance_summaries schema
ALTER TABLE attendance_summaries ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE SET NULL;
ALTER TABLE attendance_summaries ALTER COLUMN section_id DROP NOT NULL;

-- Drop FK to sections if somehow still dangling
DO $$
BEGIN
  ALTER TABLE attendance_summaries DROP CONSTRAINT IF EXISTS attendance_summaries_section_id_fkey;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DROP INDEX IF EXISTS idx_att_summaries_section_id;
CREATE INDEX IF NOT EXISTS idx_att_summaries_course_id ON attendance_summaries(course_id);

-- Step 3: Rewrite the trigger function to use course_id
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
    v_threshold          NUMERIC(5,2);
    v_is_dismissed       BOOLEAN;
    v_dismissed_at       TIMESTAMPTZ;
    v_student_id         UUID;
    v_course_id          UUID;
BEGIN
    v_student_id := COALESCE(NEW.student_id, OLD.student_id);
    v_course_id  := COALESCE(NEW.course_id, OLD.course_id);

    -- Find enrollment by student + course (section_id is gone)
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

    SELECT COALESCE(t.absence_threshold, 25)
    INTO v_threshold
    FROM tenants t WHERE t.id = v_tenant_id;

    SELECT is_dismissed, dismissed_at
    INTO v_is_dismissed, v_dismissed_at
    FROM attendance_summaries WHERE enrollment_id = v_enrollment_id;

    IF v_pct >= v_threshold AND NOT COALESCE(v_is_dismissed, FALSE) THEN
        v_is_dismissed := TRUE;
        v_dismissed_at := NOW();
        UPDATE enrollments SET status = 'dismissed' WHERE id = v_enrollment_id;
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
        v_pct, COALESCE(v_is_dismissed, FALSE), v_dismissed_at, NOW()
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
        dismissed_at       = COALESCE(attendance_summaries.dismissed_at, EXCLUDED.dismissed_at),
        last_updated       = NOW();

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Step 4: Recreate the trigger
CREATE TRIGGER trg_recalc_attendance_summary
    AFTER INSERT OR UPDATE OR DELETE ON attendance_records
    FOR EACH ROW EXECUTE FUNCTION recalculate_attendance_summary();

DO $$
BEGIN
    RAISE NOTICE 'Migration 13 complete: Fixed attendance_summaries trigger';
END $$;
