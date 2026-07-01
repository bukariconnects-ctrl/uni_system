-- ============================================================
-- Migration 17: Add major_id and academic_level_id to circulars
--
-- Allows faculty to target a specific group (major + level)
-- within a course when creating circulars, instead of sending
-- to all students enrolled in the course regardless of major.
-- ============================================================

ALTER TABLE circulars ADD COLUMN IF NOT EXISTS major_id UUID REFERENCES majors(id) ON DELETE SET NULL;
ALTER TABLE circulars ADD COLUMN IF NOT EXISTS academic_level_id UUID REFERENCES academic_levels(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_circulars_major_id ON circulars(major_id);
CREATE INDEX IF NOT EXISTS idx_circulars_academic_level_id ON circulars(academic_level_id);

DO $$
BEGIN
    RAISE NOTICE 'Migration 17 complete: Added major_id and academic_level_id to circulars';
END $$;
