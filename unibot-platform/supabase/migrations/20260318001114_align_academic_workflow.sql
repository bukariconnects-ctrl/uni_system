-- ============================================================
-- Migration: align_academic_workflow
-- Purpose: Bridge gaps between current schema and the
--          Academic Operational Workflow blueprint.
-- Changes:
--   1. Create `campuses` table
--   2. Add `campus_id` to `colleges` and `venues`
--   3. Add `absence_threshold` to `colleges`
--   4. Add `parent_section_id` + `section_type` to `sections`
--   5. Extend `semester_status` ENUM with `registration` + `grade_freeze`
--   6. Add cross-campus cloning helper function
--   7. Update conflict detector trigger to respect campus isolation
-- ============================================================


-- ============================================================
-- STEP 1: Create CAMPUSES table
-- ============================================================

CREATE TABLE IF NOT EXISTS campuses (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    location    TEXT,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    UNIQUE (tenant_id, name)
);

CREATE TRIGGER trg_campuses_updated_at
    BEFORE UPDATE ON campuses
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_campuses_tenant_id ON campuses(tenant_id);

-- Enable RLS
ALTER TABLE campuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_admin_manage_campuses"
    ON campuses FOR ALL
    USING (
        (auth.jwt() ->> 'user_role') = 'tenant_admin'
        AND tenant_id = (auth.jwt() ->> 'tenant_id')::UUID
    );

CREATE POLICY "tenant_members_read_campuses"
    ON campuses FOR SELECT
    USING (
        tenant_id = (auth.jwt() ->> 'tenant_id')::UUID
    );


-- ============================================================
-- STEP 2: Add `campus_id` to COLLEGES
-- ============================================================

ALTER TABLE colleges
    ADD COLUMN IF NOT EXISTS campus_id UUID REFERENCES campuses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_colleges_campus_id ON colleges(campus_id);


-- ============================================================
-- STEP 3: Add `absence_threshold` to COLLEGES
-- (Per-college override of the tenant-wide threshold)
-- ============================================================

ALTER TABLE colleges
    ADD COLUMN IF NOT EXISTS absence_threshold NUMERIC(5, 2)
        CONSTRAINT chk_college_absence_threshold CHECK (absence_threshold BETWEEN 0 AND 100);


-- ============================================================
-- STEP 4: Add `campus_id` to VENUES
-- (Spatial isolation per campus — prevents false conflict detection)
-- ============================================================

ALTER TABLE venues
    ADD COLUMN IF NOT EXISTS campus_id UUID REFERENCES campuses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_venues_campus_id ON venues(campus_id);


-- ============================================================
-- STEP 5: Add `section_type` ENUM + alter SECTIONS table
-- ============================================================

-- Create section_type enum
DO $$ BEGIN
    CREATE TYPE section_type AS ENUM ('lecture', 'lab', 'tutorial');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Add parent_section_id (self-referencing FK for child lab sections)
ALTER TABLE sections
    ADD COLUMN IF NOT EXISTS parent_section_id UUID REFERENCES sections(id) ON DELETE CASCADE;

-- Add section_type to distinguish lecture (parent) from lab (child)
ALTER TABLE sections
    ADD COLUMN IF NOT EXISTS section_type section_type NOT NULL DEFAULT 'lecture';

CREATE INDEX IF NOT EXISTS idx_sections_parent_id ON sections(parent_section_id);


-- ============================================================
-- STEP 6: Extend semester_status ENUM
-- Current: planning, active, archived
-- New:     planning, registration, active, grade_freeze, archived
-- ============================================================

-- PostgreSQL requires adding enum values (cannot remove old ones safely)
ALTER TYPE semester_status ADD VALUE IF NOT EXISTS 'registration' AFTER 'planning';
ALTER TYPE semester_status ADD VALUE IF NOT EXISTS 'grade_freeze' AFTER 'active';


-- ============================================================
-- STEP 7: Update `check_schedule_conflicts` trigger
-- to respect campus isolation for spatial conflict check
-- ============================================================

CREATE OR REPLACE FUNCTION check_schedule_conflicts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_instructor_id   UUID;
    v_course_id       UUID;
    v_semester_id     UUID;
    v_venue_campus_id UUID;
    spatial_conflict  INT;
    faculty_conflict  INT;
    student_conflict  INT;
BEGIN
    -- Retrieve context from the section being scheduled
    SELECT s.instructor_id, s.course_id, s.semester_id
    INTO v_instructor_id, v_course_id, v_semester_id
    FROM sections s WHERE s.id = NEW.section_id;

    -- Retrieve campus of the venue being booked (NULL = no campus, global scope)
    IF NEW.venue_id IS NOT NULL THEN
        SELECT campus_id INTO v_venue_campus_id FROM venues WHERE id = NEW.venue_id;
    END IF;

    -- ---- Spatial Conflict ----
    -- same venue, same day, overlapping time, same semester
    -- campus_id check: only conflict if both venues are on same campus (or both NULL)
    SELECT COUNT(*) INTO spatial_conflict
    FROM schedules sc
    JOIN sections se ON sc.section_id = se.id
    JOIN venues v ON sc.venue_id = v.id
    WHERE sc.id          <> COALESCE(NEW.id, gen_random_uuid())
      AND sc.tenant_id    = NEW.tenant_id
      AND sc.venue_id     = NEW.venue_id
      AND sc.day_of_week  = NEW.day_of_week
      AND se.semester_id  = v_semester_id
      AND sc.start_time   < NEW.end_time
      AND sc.end_time     > NEW.start_time
      AND (
          v_venue_campus_id IS NULL
          OR v.campus_id IS NULL
          OR v.campus_id = v_venue_campus_id
      );

    IF spatial_conflict > 0 THEN
        RAISE EXCEPTION 'SPATIAL_CONFLICT: Venue is already booked at this time slot.';
    END IF;

    -- ---- Faculty Conflict ----
    -- same instructor, same day, overlapping time, same semester
    IF v_instructor_id IS NOT NULL THEN
        SELECT COUNT(*) INTO faculty_conflict
        FROM schedules sc
        JOIN sections se ON sc.section_id = se.id
        WHERE sc.id          <> COALESCE(NEW.id, gen_random_uuid())
          AND sc.tenant_id    = NEW.tenant_id
          AND se.instructor_id = v_instructor_id
          AND sc.day_of_week  = NEW.day_of_week
          AND se.semester_id  = v_semester_id
          AND sc.start_time   < NEW.end_time
          AND sc.end_time     > NEW.start_time;

        IF faculty_conflict > 0 THEN
            RAISE EXCEPTION 'FACULTY_CONFLICT: Instructor is already scheduled at this time slot.';
        END IF;
    END IF;

    -- ---- Student Conflict ----
    -- two mandatory courses at same academic level, same day, overlapping time, same semester
    SELECT COUNT(*) INTO student_conflict
    FROM schedules sc
    JOIN sections se ON sc.section_id = se.id
    JOIN courses c ON se.course_id = c.id
    JOIN study_plan_courses spc ON c.id = spc.course_id
    WHERE sc.id          <> COALESCE(NEW.id, gen_random_uuid())
      AND sc.tenant_id    = NEW.tenant_id
      AND sc.day_of_week  = NEW.day_of_week
      AND sc.start_time   < NEW.end_time
      AND sc.end_time     > NEW.start_time
      AND spc.plan_course_type = 'mandatory'
      AND spc.academic_level_id = (
          SELECT spc2.academic_level_id
          FROM study_plan_courses spc2
          WHERE spc2.course_id = v_course_id
          LIMIT 1
      )
      AND se.semester_id  = v_semester_id
      AND se.section_type = 'lecture';   -- only check lecture sections for student conflicts

    IF student_conflict > 0 THEN
        RAISE EXCEPTION 'STUDENT_CONFLICT: Mandatory course at same academic level is already scheduled at this time slot.';
    END IF;

    RETURN NEW;
END;
$$;


-- ============================================================
-- STEP 8: Cross-Campus Cloning Function
-- Deep copies college + departments + majors + academic_levels
-- from source campus to target campus (new UUIDs, no users/venues)
-- ============================================================

CREATE OR REPLACE FUNCTION clone_college_to_campus(
    p_source_college_id UUID,
    p_target_campus_id  UUID,
    p_tenant_id         UUID
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_new_college_id    UUID;
    v_src_dept          RECORD;
    v_new_dept_id       UUID;
    v_src_major         RECORD;
    v_new_major_id      UUID;
    v_src_level         RECORD;
BEGIN
    -- Clone the College
    INSERT INTO colleges (tenant_id, campus_id, name, code, absence_threshold)
    SELECT
        p_tenant_id,
        p_target_campus_id,
        name || ' (نسخة)',
        code || '_' || SUBSTRING(p_target_campus_id::TEXT, 1, 4),
        absence_threshold
    FROM colleges
    WHERE id = p_source_college_id
    RETURNING id INTO v_new_college_id;

    -- Clone Departments
    FOR v_src_dept IN
        SELECT * FROM departments WHERE college_id = p_source_college_id
    LOOP
        INSERT INTO departments (tenant_id, college_id, name, code)
        VALUES (
            p_tenant_id,
            v_new_college_id,
            v_src_dept.name,
            v_src_dept.code || '_' || SUBSTRING(p_target_campus_id::TEXT, 1, 4)
        )
        RETURNING id INTO v_new_dept_id;

        -- Clone Majors under this Department
        FOR v_src_major IN
            SELECT * FROM majors WHERE department_id = v_src_dept.id
        LOOP
            INSERT INTO majors (tenant_id, department_id, name, code, total_credits, duration_years)
            VALUES (
                p_tenant_id,
                v_new_dept_id,
                v_src_major.name,
                v_src_major.code || '_' || SUBSTRING(p_target_campus_id::TEXT, 1, 4),
                v_src_major.total_credits,
                v_src_major.duration_years
            )
            RETURNING id INTO v_new_major_id;

            -- Clone Academic Levels under this Major
            FOR v_src_level IN
                SELECT * FROM academic_levels WHERE major_id = v_src_major.id
            LOOP
                INSERT INTO academic_levels (tenant_id, major_id, level_number, name)
                VALUES (
                    p_tenant_id,
                    v_new_major_id,
                    v_src_level.level_number,
                    v_src_level.name
                );
            END LOOP;
        END LOOP;
    END LOOP;

    RETURN v_new_college_id;
END;
$$;


-- ============================================================
-- STEP 9: Semester state transition guard
-- Prevents illegal state transitions (e.g., archived -> planning)
-- ============================================================

CREATE OR REPLACE FUNCTION guard_semester_state_transition()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    -- Only enforce when status actually changes
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    -- Valid transitions:
    -- planning -> registration
    -- planning -> active (skip registration allowed for admins)
    -- registration -> active
    -- active -> grade_freeze
    -- grade_freeze -> archived
    -- Any -> planning is forbidden once moved forward

    IF OLD.status = 'planning'      AND NEW.status IN ('registration', 'active') THEN RETURN NEW; END IF;
    IF OLD.status = 'registration'  AND NEW.status = 'active'                    THEN RETURN NEW; END IF;
    IF OLD.status = 'active'        AND NEW.status = 'grade_freeze'               THEN RETURN NEW; END IF;
    IF OLD.status = 'grade_freeze'  AND NEW.status = 'archived'                   THEN RETURN NEW; END IF;

    RAISE EXCEPTION 'INVALID_STATE_TRANSITION: Cannot move semester from % to %', OLD.status, NEW.status;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_semester_state ON semesters;
CREATE TRIGGER trg_guard_semester_state
    BEFORE UPDATE OF status ON semesters
    FOR EACH ROW EXECUTE FUNCTION guard_semester_state_transition();


-- ============================================================
-- STEP 10: Enrollment guard — block if semester not in 'registration' or 'active'
-- ============================================================

CREATE OR REPLACE FUNCTION guard_enrollment_semester_state()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_sem_status semester_status;
BEGIN
    SELECT status INTO v_sem_status FROM semesters WHERE id = NEW.semester_id;

    IF v_sem_status NOT IN ('registration', 'active') THEN
        RAISE EXCEPTION 'ENROLLMENT_BLOCKED: Cannot enroll students when semester status is %', v_sem_status;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_enrollment_state ON enrollments;
CREATE TRIGGER trg_guard_enrollment_state
    BEFORE INSERT ON enrollments
    FOR EACH ROW EXECUTE FUNCTION guard_enrollment_semester_state();


-- ============================================================
-- STEP 11: Grade entry guard — block when semester is 'grade_freeze' or 'archived'
-- ============================================================

CREATE OR REPLACE FUNCTION guard_grade_entry_state()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_sem_status semester_status;
    v_sem_id     UUID;
BEGIN
    -- Get semester_id from the section
    SELECT semester_id INTO v_sem_id FROM sections WHERE id = NEW.section_id;
    SELECT status INTO v_sem_status FROM semesters WHERE id = v_sem_id;

    IF v_sem_status IN ('grade_freeze', 'archived') THEN
        RAISE EXCEPTION 'GRADE_LOCKED: Cannot modify grades when semester status is %', v_sem_status;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_grade_entry ON gradebook_entries;
CREATE TRIGGER trg_guard_grade_entry
    BEFORE INSERT OR UPDATE ON gradebook_entries
    FOR EACH ROW EXECUTE FUNCTION guard_grade_entry_state();


-- ============================================================
-- Done
-- ============================================================
