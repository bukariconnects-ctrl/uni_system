-- Migration: Add course_id/major_id/academic_level_id to enrollments, create department_staff table, extend user_role, update guard functions
-- Date: 2026-06-28
--
-- PART A: Add course_id, major_id, academic_level_id columns to enrollments; make section_id nullable; replace unique constraint
-- PART B: Update sync_section_enrolled_count() to gracefully handle NULL section_id (new-style enrollments)
-- PART C: Create department_staff table for department-level roles (head_of_department, secretary, ticket_technician)
-- PART D: Extend user_role enum with head_of_department, secretary, ticket_technician, lecturer
-- PART E: guard_enrollment_semester_state() already reads NEW.semester_id directly -- no change needed
-- PART F: Update guard_grade_entry_state() to resolve semester_id from enrollments table instead of sections table


-- ============================================================
-- PART A: Modify enrollments table
-- ============================================================

-- 1. Add new FK columns
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE CASCADE;
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS major_id UUID REFERENCES majors(id) ON DELETE SET NULL;
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS academic_level_id UUID REFERENCES academic_levels(id) ON DELETE SET NULL;

-- 2. Make section_id nullable (it was NOT NULL; now optional for new-style enrollments)
ALTER TABLE enrollments ALTER COLUMN section_id DROP NOT NULL;

-- 3. Drop the old UNIQUE (student_id, section_id) constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'enrollments_student_id_section_id_key'
  ) THEN
    ALTER TABLE enrollments DROP CONSTRAINT enrollments_student_id_section_id_key;
  END IF;
END $$;

-- Add new UNIQUE on (student_id, course_id, semester_id)
-- NOTE: course_id may still be NULL for existing records at this stage;
--       PostgreSQL allows multiple NULLs in a UNIQUE constraint.
--       Migration 3 populates course_id and handles any duplicates.
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

-- 4. Index on course_id
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id);


-- ============================================================
-- PART B: Update sync_section_enrolled_count() for nullable section_id
-- ============================================================

-- Drop any triggers that may reference the old function under different names
DROP TRIGGER IF EXISTS trg_sync_enrolled_count ON enrollments;
DROP TRIGGER IF EXISTS trg_sync_enrolled_count_update ON enrollments;

-- Replace the function with a version that handles NULL section_id gracefully
CREATE OR REPLACE FUNCTION sync_section_enrolled_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_section_id   UUID;
    v_new_count    INT;
    v_max_capacity INT;
    v_status       TEXT;
BEGIN
    -- Determine which section is affected
    IF TG_OP = 'DELETE' THEN
        v_section_id := OLD.section_id;
    ELSE
        v_section_id := NEW.section_id;
    END IF;

    -- If section_id is NULL (new-style enrollment), skip the sync
    IF v_section_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Update enrolled_count and read back current capacity + status
    IF TG_OP = 'INSERT' AND NEW.status = 'enrolled' THEN
        UPDATE sections
        SET enrolled_count = enrolled_count + 1
        WHERE id = v_section_id
        RETURNING enrolled_count, max_capacity, status
        INTO v_new_count, v_max_capacity, v_status;

    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status = 'enrolled' AND NEW.status <> 'enrolled' THEN
            UPDATE sections
            SET enrolled_count = GREATEST(enrolled_count - 1, 0)
            WHERE id = v_section_id
            RETURNING enrolled_count, max_capacity, status
            INTO v_new_count, v_max_capacity, v_status;
        ELSIF OLD.status <> 'enrolled' AND NEW.status = 'enrolled' THEN
            UPDATE sections
            SET enrolled_count = enrolled_count + 1
            WHERE id = v_section_id
            RETURNING enrolled_count, max_capacity, status
            INTO v_new_count, v_max_capacity, v_status;
        ELSE
            RETURN COALESCE(NEW, OLD);
        END IF;

    ELSIF TG_OP = 'DELETE' AND OLD.status = 'enrolled' THEN
        UPDATE sections
        SET enrolled_count = GREATEST(enrolled_count - 1, 0)
        WHERE id = v_section_id
        RETURNING enrolled_count, max_capacity, status
        INTO v_new_count, v_max_capacity, v_status;
    ELSE
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Auto-close when section reaches capacity
    IF v_new_count >= v_max_capacity AND v_status = 'open' THEN
        UPDATE sections SET status = 'closed' WHERE id = v_section_id;
    END IF;

    -- Auto-reopen when a spot frees up (only if section was closed due to capacity)
    IF v_new_count < v_max_capacity AND v_status = 'closed' THEN
        UPDATE sections SET status = 'open' WHERE id = v_section_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;


-- ============================================================
-- PART C: Create department_staff table
-- ============================================================

CREATE TABLE IF NOT EXISTS department_staff (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    department_id UUID        NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    profile_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role          VARCHAR(50) NOT NULL CHECK (role IN ('head_of_department', 'secretary', 'ticket_technician')),
    is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (department_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_department_staff_tenant     ON department_staff(tenant_id);
CREATE INDEX IF NOT EXISTS idx_department_staff_department ON department_staff(department_id);
CREATE INDEX IF NOT EXISTS idx_department_staff_profile    ON department_staff(profile_id);

ALTER TABLE department_staff ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- PART D: Add new user_role enum values
-- ============================================================

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'head_of_department'  AFTER 'academic_management';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'secretary'           AFTER 'head_of_department';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'ticket_technician'   AFTER 'secretary';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'lecturer'            AFTER 'ticket_technician';


-- ============================================================
-- PART E: guard_enrollment_semester_state()
-- Already reads semester_id from NEW.semester_id directly.
-- No change needed -- the existing function correctly uses
-- NEW.semester_id rather than deriving it from a section join.
-- ============================================================


-- ============================================================
-- PART F: Update guard_grade_entry_state() to use enrollment_id
-- ============================================================

-- The old function resolved semester_id via sections.id = NEW.section_id.
-- The new function reads semester_id from the enrollments table directly,
-- since enrollments now carry semester_id as a first-class column.
CREATE OR REPLACE FUNCTION guard_grade_entry_state()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_sem_status semester_status;
    v_sem_id     UUID;
BEGIN
    -- Get semester_id from the enrollment (which has semester_id directly)
    SELECT semester_id INTO v_sem_id FROM enrollments WHERE id = NEW.enrollment_id;
    IF v_sem_id IS NULL THEN RETURN NEW; END IF; -- skip guard if no enrollment found
    SELECT status INTO v_sem_status FROM semesters WHERE id = v_sem_id;
    IF v_sem_status IN ('grade_freeze', 'archived') THEN
        RAISE EXCEPTION 'GRADE_LOCKED: Cannot modify grades when semester status is %', v_sem_status;
    END IF;
    RETURN NEW;
END;
$$;
