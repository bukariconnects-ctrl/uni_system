-- ============================================================
-- Migration: Make syllabi.section_id nullable (sections table dropped)
-- ============================================================

-- The sections table was dropped in migration 4. The FK constraint
-- on syllabi.section_id was already removed in migration 3, but the
-- NOT NULL constraint remained, causing INSERT failures.
ALTER TABLE syllabi ALTER COLUMN section_id DROP NOT NULL;

-- Also ensure course_id is indexed for fast lookups
CREATE INDEX IF NOT EXISTS idx_syllabi_course_id ON syllabi(course_id);

DO $$
BEGIN
  RAISE NOTICE 'Migration complete: Made syllabi.section_id nullable';
END $$;
