-- Migration: Create course_schedules table (replaces sections + schedules)
-- Date: 2026-06-28

-- 1. Create the schedule_day enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'schedule_day') THEN
    CREATE TYPE schedule_day AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');
  END IF;
END
$$;

-- 2. Create course_schedules table
CREATE TABLE IF NOT EXISTS course_schedules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  semester_id     UUID NOT NULL,
  study_plan_course_id UUID NOT NULL,
  component_type  VARCHAR(20) NOT NULL CHECK (component_type IN ('theoretical', 'practical')),
  day_of_week     schedule_day NOT NULL,
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  venue_id        UUID,
  instructor_id   UUID,
  status          VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_course_schedules_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_course_schedules_semester
    FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
  CONSTRAINT fk_course_schedules_study_plan_course
    FOREIGN KEY (study_plan_course_id) REFERENCES study_plan_courses(id) ON DELETE CASCADE,
  CONSTRAINT fk_course_schedules_venue
    FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE SET NULL,
  CONSTRAINT fk_course_schedules_instructor
    FOREIGN KEY (instructor_id) REFERENCES profiles(id) ON DELETE SET NULL,

  CONSTRAINT chk_course_schedule_times
    CHECK (start_time < end_time),

  CONSTRAINT uq_course_schedules_venue_slot
    UNIQUE (semester_id, venue_id, day_of_week, start_time, end_time),

  CONSTRAINT uq_course_schedules_instructor_slot
    UNIQUE (semester_id, instructor_id, day_of_week, start_time, end_time)
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_course_schedules_semester
  ON course_schedules (semester_id);

CREATE INDEX IF NOT EXISTS idx_course_schedules_study_plan
  ON course_schedules (study_plan_course_id);

CREATE INDEX IF NOT EXISTS idx_course_schedules_instructor
  ON course_schedules (instructor_id);

CREATE INDEX IF NOT EXISTS idx_course_schedules_venue
  ON course_schedules (venue_id);

-- 4. Updated_at trigger (uses existing set_updated_at function)
DROP TRIGGER IF EXISTS trg_course_schedules_set_updated_at ON course_schedules;
CREATE TRIGGER trg_course_schedules_set_updated_at
  BEFORE UPDATE ON course_schedules
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- 5. Row Level Security
ALTER TABLE course_schedules ENABLE ROW LEVEL SECURITY;

-- 6. Conflict-checking function (venue + instructor only; no student conflict)
--    Does NOT reference sections or schedules tables.
CREATE OR REPLACE FUNCTION check_course_schedule_conflicts()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_overlap RECORD;
BEGIN
  -- Check for overlapping schedules at the same venue (excluding own row on update)
  SELECT 1 INTO v_overlap
  FROM course_schedules
  WHERE tenant_id = NEW.tenant_id
    AND semester_id = NEW.semester_id
    AND day_of_week = NEW.day_of_week
    AND (id IS DISTINCT FROM NEW.id)
    AND (
      (NEW.start_time, NEW.end_time) OVERLAPS (start_time, end_time)
    )
    AND (
      NEW.venue_id IS NOT NULL
      AND venue_id = NEW.venue_id
    );

  IF FOUND THEN
    RAISE EXCEPTION 'Course schedule conflict: the venue is already booked at the requested time'
      USING ERRCODE = 'P0001';
  END IF;

  -- Check for overlapping schedules for the same instructor (excluding own row on update)
  SELECT 1 INTO v_overlap
  FROM course_schedules
  WHERE tenant_id = NEW.tenant_id
    AND semester_id = NEW.semester_id
    AND day_of_week = NEW.day_of_week
    AND (id IS DISTINCT FROM NEW.id)
    AND (
      (NEW.start_time, NEW.end_time) OVERLAPS (start_time, end_time)
    )
    AND (
      NEW.instructor_id IS NOT NULL
      AND instructor_id = NEW.instructor_id
    );

  IF FOUND THEN
    RAISE EXCEPTION 'Course schedule conflict: the instructor is already assigned at the requested time'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

-- 7. Trigger for conflict checks
DROP TRIGGER IF EXISTS trg_check_course_schedule_conflicts ON course_schedules;
CREATE TRIGGER trg_check_course_schedule_conflicts
  BEFORE INSERT OR UPDATE ON course_schedules
  FOR EACH ROW
  EXECUTE FUNCTION check_course_schedule_conflicts();

-- 8. RLS policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'course_schedules' AND policyname = 'tenant_read_course_schedules'
  ) THEN
    CREATE POLICY tenant_read_course_schedules ON course_schedules
      FOR SELECT
      USING (tenant_id = current_tenant_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'course_schedules' AND policyname = 'academic_management_write_course_schedules'
  ) THEN
    CREATE POLICY academic_management_write_course_schedules ON course_schedules
      FOR ALL
      USING (
        tenant_id = current_tenant_id()
        AND current_user_role() IN ('super_admin', 'tenant_admin', 'academic_management')
      )
      WITH CHECK (
        tenant_id = current_tenant_id()
        AND current_user_role() IN ('super_admin', 'tenant_admin', 'academic_management')
      );
  END IF;
END
$$;

-- 9. Table comment
COMMENT ON TABLE course_schedules IS 'Replaces sections + schedules: each row is one component (theoretical/practical) of a course in a study plan for a semester';
