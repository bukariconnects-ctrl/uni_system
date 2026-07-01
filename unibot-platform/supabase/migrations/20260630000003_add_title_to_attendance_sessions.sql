ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS title TEXT;

DO $$
BEGIN
    RAISE NOTICE 'Migration 12 complete: Added title to attendance_sessions';
END $$;
