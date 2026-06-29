-- ============================================================
-- Migration 3: Migrate existing data — ALL sections-dependent
-- operations go here, BEFORE sections table is dropped.
-- ============================================================

-- ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
-- PART A: Populate new columns in enrollments + deduplicate
-- ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

-- A0: Drop the UNIQUE constraint added in migration 2 temporarily.
--     It was added with NULL course_id (which Postgres allows), but
--     after populating course_id we may hit duplicates.
ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS uq_enrollments_student_course_semester;

-- A1: Populate enrollments.course_id from sections
DO $$
BEGIN
  UPDATE enrollments e
  SET course_id = s.course_id
  FROM sections s
  WHERE e.section_id = s.id
    AND e.course_id IS NULL;
END $$;

-- A2: Populate enrollments.major_id from student_majors (is_primary = true)
-- NOTE: student_majors has no academic_level_id column, so academic_level_id
--       remains NULL for existing records. The new auto-enrollment will set it.
DO $$
DECLARE
  v_updated INT;
BEGIN
  UPDATE enrollments e
  SET major_id = sm.major_id
  FROM student_majors sm
  WHERE e.student_id = sm.student_id
    AND e.major_id IS NULL
    AND sm.is_primary = true;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RAISE NOTICE 'Populated major_id for % enrollment records', v_updated;
END $$;

-- A3: Validate completeness — flag any remaining NULL course_id
DO $$
DECLARE
  v_missing INT;
BEGIN
  SELECT COUNT(*) INTO v_missing FROM enrollments WHERE course_id IS NULL;
  IF v_missing > 0 THEN
    RAISE WARNING '% enrollment records still have NULL course_id — they were probably orphaned', v_missing;
  END IF;
END $$;

-- A4: Deduplicate — remove duplicate enrollments with same (student_id, course_id, semester_id).
--     Keeps the record with the most recent enrolled_at (or id if no enrolled_at).
DELETE FROM enrollments e1
WHERE EXISTS (
  SELECT 1 FROM enrollments e2
  WHERE e2.student_id = e1.student_id
    AND e2.course_id = e1.course_id
    AND e2.semester_id = e1.semester_id
    AND e2.created_at > e1.created_at
);

-- A5: Re-add the UNIQUE constraint now that data is clean
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_enrollments_student_course_semester'
  ) THEN
    ALTER TABLE enrollments
      ADD CONSTRAINT uq_enrollments_student_course_semester
      UNIQUE (student_id, course_id, semester_id);
  END IF;
END $$;


-- ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
-- PART B: Migrate sections + schedules data → course_schedules
-- ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

-- For each (section × schedule × study_plan_course) combination,
-- create a row in course_schedules.
-- section_type 'lecture'/'tutorial' → component_type 'theoretical'
-- section_type 'lab'              → component_type 'practical'
--
-- study_plan_course lookup: match on course_id. If multiple academic levels
-- exist for the same course, pick one. This is best-effort for existing data.
DO $$
DECLARE
  v_count INT;
BEGIN
  INSERT INTO course_schedules (
    tenant_id, semester_id, study_plan_course_id,
    component_type, day_of_week, start_time, end_time,
    venue_id, instructor_id, status, created_at, updated_at
  )
  SELECT DISTINCT ON (s.id, sch.id)
    s.tenant_id,
    s.semester_id,
    spc.id                        AS study_plan_course_id,
    CASE
      WHEN s.section_type = 'lab' THEN 'practical'
      ELSE 'theoretical'
    END                           AS component_type,
    sch.day_of_week,
    sch.start_time,
    sch.end_time,
    sch.venue_id,
    s.instructor_id,
    CASE
      WHEN s.status = 'archived' OR s.status = 'closed' THEN 'draft'
      ELSE 'published'
    END                           AS status,
    LEAST(s.created_at, sch.created_at),
    GREATEST(s.updated_at, sch.updated_at)
  FROM sections s
  JOIN schedules sch             ON sch.section_id = s.id
  JOIN study_plan_courses spc    ON spc.course_id = s.course_id
  WHERE s.tenant_id IS NOT NULL
  ORDER BY s.id, sch.id, spc.created_at ASC;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Migrated % schedule entries from sections → course_schedules', v_count;
END $$;


-- ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
-- PART C: Add course_id to child tables & populate from sections
-- ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

-- C1: gradebook_entries
ALTER TABLE gradebook_entries ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE CASCADE;
UPDATE gradebook_entries ge
SET course_id = e.course_id
FROM enrollments e
WHERE ge.enrollment_id = e.id
  AND ge.course_id IS NULL;

ALTER TABLE gradebook_entries ALTER COLUMN section_id DROP NOT NULL;

-- C2: attendance_sessions
ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE CASCADE;
ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS semester_id UUID REFERENCES semesters(id) ON DELETE SET NULL;
DO $$
BEGIN
  UPDATE attendance_sessions a
  SET course_id = s.course_id,
      semester_id = s.semester_id
  FROM sections s
  WHERE a.section_id = s.id
    AND a.course_id IS NULL;
END $$;
ALTER TABLE attendance_sessions ALTER COLUMN section_id DROP NOT NULL;

-- Drop schedule_id FK from attendance_sessions
DO $$
BEGIN
  ALTER TABLE attendance_sessions DROP CONSTRAINT IF EXISTS attendance_sessions_schedule_id_fkey;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
ALTER TABLE attendance_sessions ALTER COLUMN schedule_id DROP NOT NULL;

-- C3: assignments
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE CASCADE;
UPDATE assignments a
SET course_id = s.course_id
FROM sections s
WHERE a.section_id = s.id
  AND a.course_id IS NULL;
ALTER TABLE assignments ALTER COLUMN section_id DROP NOT NULL;

-- C4: course_materials
ALTER TABLE course_materials ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE CASCADE;
UPDATE course_materials cm
SET course_id = s.course_id
FROM sections s
WHERE cm.section_id = s.id
  AND cm.course_id IS NULL;
ALTER TABLE course_materials ALTER COLUMN section_id DROP NOT NULL;

-- C5: tickets (related_section_id → related_course_id)
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS related_course_id UUID REFERENCES courses(id) ON DELETE SET NULL;
DO $$
BEGIN
  UPDATE tickets t
  SET related_course_id = s.course_id
  FROM sections s
  WHERE t.related_section_id = s.id
    AND t.related_course_id IS NULL;
END $$;
ALTER TABLE tickets ALTER COLUMN related_section_id DROP NOT NULL;

-- C6: student_risk_scores
ALTER TABLE student_risk_scores ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE CASCADE;
UPDATE student_risk_scores rs
SET course_id = s.course_id
FROM sections s
WHERE rs.section_id = s.id
  AND rs.course_id IS NULL;
ALTER TABLE student_risk_scores ALTER COLUMN section_id DROP NOT NULL;

-- C7: course_risk_flags
ALTER TABLE course_risk_flags ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE CASCADE;
UPDATE course_risk_flags rf
SET course_id = s.course_id
FROM sections s
WHERE rf.section_id = s.id
  AND rf.course_id IS NULL;
ALTER TABLE course_risk_flags ALTER COLUMN section_id DROP NOT NULL;

-- C8: student_recommendations
ALTER TABLE student_recommendations ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE SET NULL;
UPDATE student_recommendations r
SET course_id = s.course_id
FROM sections s
WHERE r.section_id = s.id
  AND r.course_id IS NULL;
ALTER TABLE student_recommendations ALTER COLUMN section_id DROP NOT NULL;

-- C9: ai_knowledge_documents
ALTER TABLE ai_knowledge_documents ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE SET NULL;
UPDATE ai_knowledge_documents d
SET course_id = s.course_id
FROM sections s
WHERE d.section_id = s.id
  AND d.course_id IS NULL;
ALTER TABLE ai_knowledge_documents ALTER COLUMN section_id DROP NOT NULL;

-- C10: channels (section_id)
ALTER TABLE channels ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE SET NULL;
DO $$
BEGIN
  UPDATE channels ch
  SET course_id = s.course_id
  FROM sections s
  WHERE ch.section_id = s.id
    AND ch.course_id IS NULL;
END $$;
ALTER TABLE channels ALTER COLUMN section_id DROP NOT NULL;

-- C11: syllabi (syllabi is dropped with CASCADE, so just add course_id for safety)
ALTER TABLE syllabi ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE CASCADE;


-- ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
-- PART D: Drop old triggers (sections-related)
-- ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

-- D1: Triggers on sections table
DROP TRIGGER IF EXISTS trg_section_auto_close ON sections;
DROP TRIGGER IF EXISTS trg_sections_updated_at ON sections;
DROP TRIGGER IF EXISTS trg_auto_create_course_channel ON sections;
DROP TRIGGER IF EXISTS trg_update_channel_instructor ON sections;

-- D2: Triggers on schedules table
DROP TRIGGER IF EXISTS trg_schedules_updated_at ON schedules;
DROP TRIGGER IF EXISTS trg_check_schedule_conflicts ON schedules;

-- D3: Triggers on enrollments that reference sections
DROP TRIGGER IF EXISTS trg_enrollments_sync_count ON enrollments;
DROP TRIGGER IF EXISTS trg_sync_enrolled_count ON enrollments;
DROP TRIGGER IF EXISTS trg_sync_enrolled_count_update ON enrollments;
DROP TRIGGER IF EXISTS trg_enrollments_updated_at ON enrollments;

-- D4: Also drop syllabus FK to sections before it's dropped
DO $$
BEGIN
  ALTER TABLE syllabi DROP CONSTRAINT IF EXISTS syllabi_section_id_fkey;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;


-- ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
-- PART E: Create indexes on new course_id columns
-- ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

CREATE INDEX IF NOT EXISTS idx_gradebook_entries_course_id ON gradebook_entries(course_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_course_id ON attendance_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_assignments_course_id ON assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_materials_course_id ON course_materials(course_id);
CREATE INDEX IF NOT EXISTS idx_tickets_related_course_id ON tickets(related_course_id);
CREATE INDEX IF NOT EXISTS idx_channels_course_id ON channels(course_id);
