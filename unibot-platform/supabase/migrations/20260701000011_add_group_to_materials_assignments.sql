-- Migration 24: Add group columns to course_materials and assignments
-- ============================================================

ALTER TABLE course_materials ADD COLUMN IF NOT EXISTS major_id         UUID REFERENCES majors(id) ON DELETE SET NULL;
ALTER TABLE course_materials ADD COLUMN IF NOT EXISTS academic_level_id UUID REFERENCES academic_levels(id) ON DELETE SET NULL;

ALTER TABLE assignments ADD COLUMN IF NOT EXISTS major_id         UUID REFERENCES majors(id) ON DELETE SET NULL;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS academic_level_id UUID REFERENCES academic_levels(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_course_materials_major_id          ON course_materials(major_id);
CREATE INDEX IF NOT EXISTS idx_course_materials_academic_level_id ON course_materials(academic_level_id);
CREATE INDEX IF NOT EXISTS idx_assignments_major_id               ON assignments(major_id);
CREATE INDEX IF NOT EXISTS idx_assignments_academic_level_id      ON assignments(academic_level_id);

DO $$
BEGIN
    RAISE NOTICE 'Migration 24 complete: added group columns to course_materials and assignments';
END $$;
