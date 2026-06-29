-- Migration 8: Allow enrollment inserts when semester is in "planning" status
-- Auto-enrollment runs when a student is created, which often happens while
-- the semester is still in "planning" (before schedules are published).
-- The guard trigger was too restrictive — it blocked ALL enrollment inserts
-- unless the semester was in "registration" or "active".

CREATE OR REPLACE FUNCTION guard_enrollment_semester_state()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_sem_status semester_status;
BEGIN
    SELECT status INTO v_sem_status FROM semesters WHERE id = NEW.semester_id;

    IF v_sem_status NOT IN ('planning', 'registration', 'active') THEN
        RAISE EXCEPTION 'ENROLLMENT_BLOCKED: Cannot enroll students when semester status is %', v_sem_status;
    END IF;

    RETURN NEW;
END;
$$;

-- The trigger itself is unchanged — it uses the updated function
-- DROP TRIGGER IF EXISTS trg_guard_enrollment_state ON enrollments;
-- CREATE TRIGGER trg_guard_enrollment_state
--     BEFORE INSERT ON enrollments
--     FOR EACH ROW EXECUTE FUNCTION guard_enrollment_semester_state();

DO $$
BEGIN
    RAISE NOTICE 'Migration 8 complete: guard_enrollment_semester_state() now allows planning status';
END $$;
