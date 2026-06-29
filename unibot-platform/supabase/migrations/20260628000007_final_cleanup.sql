-- ============================================================
-- Migration 7: Final cleanup and verification
-- ============================================================

-- Step 1: Drop old ENUM types if no longer referenced
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE udt_name = 'section_status' LIMIT 1
  ) THEN
    DROP TYPE IF EXISTS section_status;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE udt_name = 'section_type' LIMIT 1
  ) THEN
    DROP TYPE IF EXISTS section_type;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE udt_name = 'schedule_status' LIMIT 1
  ) THEN
    DROP TYPE IF EXISTS schedule_status;
  END IF;
END $$;

-- NOTE: schedule_day ENUM is preserved — used by course_schedules.day_of_week

-- Step 2: Drop old migration-related functions
DROP FUNCTION IF EXISTS sync_section_enrolled_count();
DROP FUNCTION IF EXISTS check_schedule_conflicts();
DROP FUNCTION IF EXISTS auto_create_course_channel();
DROP FUNCTION IF EXISTS update_channel_instructor();

-- Step 3: Recreate GPA update trigger if needed
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trg_enrollments_update_gpa') THEN
    CREATE TRIGGER trg_enrollments_update_gpa
      AFTER UPDATE ON enrollments
      FOR EACH ROW EXECUTE FUNCTION update_student_gpa_trigger();
  END IF;
END $$;

-- Step 4: Drop deprecated columns from sections (table may be gone)
-- If sections exists, these have been handled. If not, no-op.

-- Step 5: (Indexes on course_id columns were created in Migration 6; skip duplicates)

-- Step 6: Update comment on remaining schedule_day type
COMMENT ON TYPE schedule_day IS 'Preserved for course_schedules.day_of_week. Days: sunday-saturday';

-- Step 7: Log completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 7 complete: Cleaned up old schema artifacts';
END $$;
