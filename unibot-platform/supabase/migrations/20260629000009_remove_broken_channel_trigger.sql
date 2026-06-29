-- Migration 9: Drop broken auto_add_to_course_channel() trigger function
--
-- This trigger fired on INSERT into enrollments and tried to JOIN with the
-- sections table — which no longer exists since we removed sections in favor
-- of course_schedules. It also referenced NEW.section_id, which was dropped
-- from the enrollments table.
--
-- The trigger was silently blocking ALL enrollment inserts (including
-- auto-enrollment) because the SQL error it raised was always caught by
-- application-level try/catch. Students were created but never actually
-- enrolled in any courses.
--
-- The channel membership logic needs to be redesigned for the new schema
-- (course-based instead of section-based); for now we drop the function
-- and its trigger so enrollment workflows work correctly.

DROP FUNCTION IF EXISTS auto_add_to_course_channel() CASCADE;

DO $$
BEGIN
    RAISE NOTICE 'Migration 9 complete: dropped auto_add_to_course_channel() and its trigger';
END $$;
