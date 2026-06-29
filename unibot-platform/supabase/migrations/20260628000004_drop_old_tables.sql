-- ============================================================
-- Migration 4: Drop old tables, functions, and schema artifacts
-- NOTE: Migration 3 already extracted all data and made
--       section_id nullable on child tables.
-- ============================================================

-- Step 1: Drop ALL FK constraints from child tables to sections
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT tc.table_name, tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_name = kcu.table_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND kcu.column_name = 'section_id'
  ) LOOP
    BEGIN
      EXECUTE 'ALTER TABLE ' || r.table_name || ' DROP CONSTRAINT IF EXISTS ' || r.constraint_name;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Could not drop constraint %.%: %', r.table_name, r.constraint_name, SQLERRM;
    END;
  END LOOP;
END $$;

-- Step 2: Drop self-referencing FKs in sections
ALTER TABLE sections DROP CONSTRAINT IF EXISTS sections_parent_section_id_fkey;
ALTER TABLE sections DROP CONSTRAINT IF EXISTS sections_merged_into_id_fkey;

-- Step 3: Drop old tables (syllabi kept — course_id added in migration 3)
DROP TABLE IF EXISTS schedules CASCADE;
DROP TABLE IF EXISTS sections CASCADE;

-- NOTE: schedules.section_id FK, sections.course_id FK, sections.semester_id FK,
--       and all other FK constraints on these tables are dropped by CASCADE.

-- Step 4: Drop the trigger that depends on sync_section_enrolled_count()
DROP TRIGGER IF EXISTS trg_enrollments_sync_count ON enrollments;

-- Step 5: Drop old functions
DROP FUNCTION IF EXISTS sync_section_enrolled_count();
DROP FUNCTION IF EXISTS check_schedule_conflicts();
DROP FUNCTION IF EXISTS auto_create_course_channel();
DROP FUNCTION IF EXISTS update_channel_instructor();

-- Step 6: Drop indexes on old columns
DROP INDEX IF EXISTS idx_enrollments_section_id;
DROP INDEX IF EXISTS idx_schedules_section_id;

-- Step 7: Update calculate_student_gpa() to use course_id from enrollments directly
--         (no longer joining through sections)
CREATE OR REPLACE FUNCTION calculate_student_gpa(p_student_id UUID, p_tenant_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    total_grade_points NUMERIC := 0;
    total_credit_hours INT := 0;
    new_gpa NUMERIC;
BEGIN
    WITH grade_points AS (
        SELECT
            e.final_grade,
            c.credit_hours,
            CASE
                WHEN e.final_grade >= 90 THEN 4.0
                WHEN e.final_grade >= 80 THEN 3.0
                WHEN e.final_grade >= 70 THEN 2.0
                WHEN e.final_grade >= 60 THEN 1.0
                ELSE 0.0
            END AS points_per_hour
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        WHERE e.student_id = p_student_id
          AND e.tenant_id = p_tenant_id
          AND e.status = 'completed'
          AND e.final_grade IS NOT NULL
    )
    SELECT
        COALESCE(SUM(points_per_hour * credit_hours), 0),
        COALESCE(SUM(credit_hours), 0)
    INTO total_grade_points, total_credit_hours
    FROM grade_points;

    IF total_credit_hours > 0 THEN
        new_gpa := total_grade_points / total_credit_hours;
    ELSE
        new_gpa := 0;
    END IF;

    UPDATE student_profiles
    SET cumulative_gpa = ROUND(new_gpa::numeric, 2),
        earned_credit_hours = (
            SELECT COALESCE(SUM(c.credit_hours), 0)
            FROM enrollments e
            JOIN courses c ON e.course_id = c.id
            WHERE e.student_id = p_student_id
              AND e.tenant_id = p_tenant_id
              AND e.status = 'completed'
              AND e.final_grade >= 60
        ),
        total_credit_hours = total_credit_hours
    WHERE profile_id = p_student_id;
END;
$$;
