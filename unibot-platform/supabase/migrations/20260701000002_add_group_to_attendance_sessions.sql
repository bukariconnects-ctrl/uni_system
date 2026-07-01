-- ============================================================
-- Migration 15: Add major_id and academic_level_id to attendance_sessions
--
-- A faculty member may teach the same course to multiple groups
-- (different majors, different academic levels). This migration
-- allows each session to be associated with a specific group,
-- so attendance records are only created for students in that
-- group (major + level).
-- ============================================================

ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS major_id UUID REFERENCES majors(id) ON DELETE SET NULL;
ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS academic_level_id UUID REFERENCES academic_levels(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_att_sessions_major_id ON attendance_sessions(major_id);
CREATE INDEX IF NOT EXISTS idx_att_sessions_academic_level_id ON attendance_sessions(academic_level_id);

DO $$
BEGIN
    RAISE NOTICE 'Migration 15 complete: Added major_id and academic_level_id to attendance_sessions';
END $$;
