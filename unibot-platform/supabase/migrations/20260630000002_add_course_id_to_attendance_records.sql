-- ============================================================
-- Migration 11: Add course_id to attendance_records
--
-- The code inserts course_id into attendance_records, but the
-- column was never created in the table. This fixes that.
-- ============================================================

ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_att_records_course_id ON attendance_records(course_id);

DO $$
BEGIN
    RAISE NOTICE 'Migration 11 complete: Added course_id to attendance_records';
END $$;
