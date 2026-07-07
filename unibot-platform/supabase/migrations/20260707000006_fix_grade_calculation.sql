-- Fix grade calculation: total_grade GENERATED column formula
--
-- PROBLEM:
--   The original formula was a weighted sum:
--     coursework_grade * 0.30 + midterm_grade * 0.30 + final_grade * 0.40
--
--   Since the max scores are already 30 + 30 + 40 = 100, the weights are
--   baked in.  Multiplying raw scores by weights produces a percentage-like
--   value even though the scores themselves already sum to 100 directly.
--   Example: 29 + 28 + 40 = 97, but the old formula gave 33.1.
--
-- FIX:
--   Simple sum of the three components:
--     coursework_grade + midterm_grade + final_grade
--
--   This correctly yields the total out of 100.
--
-- NOTE: The sections table was dropped in a prior migration
-- (20260628000004_drop_old_tables.sql). All course lookups use
-- enrollments.course_id directly.

-- ── Step 1: Drop broken generated column ──
ALTER TABLE gradebook_entries DROP COLUMN total_grade;

-- ── Step 2: Re‑add with correct formula ──
ALTER TABLE gradebook_entries ADD COLUMN total_grade NUMERIC(6,2) GENERATED ALWAYS AS (
    COALESCE(coursework_grade, 0) + COALESCE(midterm_grade, 0) + COALESCE(final_grade, 0)
) STORED;

-- ── Step 3: Fix calculate_student_gpa() — resolve ambiguous column reference ──
-- The variable `total_credit_hours` in the SET clause clashed with the column
-- `student_profiles.total_credit_hours`, causing a PG ambiguity error.
-- Fix: rename the variable to v_total_credit_hours.
CREATE OR REPLACE FUNCTION calculate_student_gpa(p_student_id UUID, p_tenant_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    total_grade_points NUMERIC := 0;
    v_total_credit_hours INT := 0;
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
    INTO total_grade_points, v_total_credit_hours
    FROM grade_points;

    IF v_total_credit_hours > 0 THEN
        new_gpa := total_grade_points / v_total_credit_hours;
    ELSE
        new_gpa := 0;
    END IF;

    UPDATE student_profiles
    SET cumulative_gpa = ROUND(new_gpa::numeric, 2),
        total_credit_hours = v_total_credit_hours,
        earned_credit_hours = (
            SELECT COALESCE(SUM(c.credit_hours), 0)
            FROM enrollments e
            JOIN courses c ON e.course_id = c.id
            WHERE e.student_id = p_student_id
              AND e.tenant_id = p_tenant_id
              AND e.status = 'completed'
              AND e.final_grade >= 60
        )
    WHERE profile_id = p_student_id;
END;
$$;

-- ── Step 4: Disable the GPA trigger temporarily (we batch-recalculate
--            ourselves in Step 6 instead). ──
ALTER TABLE enrollments DISABLE TRIGGER trg_enrollments_update_gpa;

-- ── Step 5: Recalculate final_grade & letter_grade for every published entry ──
UPDATE enrollments e
SET final_grade  = ge.total_grade,
    letter_grade =
        CASE
            WHEN ge.total_grade >= 90 THEN 'A+'
            WHEN ge.total_grade >= 85 THEN 'A'
            WHEN ge.total_grade >= 80 THEN 'B+'
            WHEN ge.total_grade >= 75 THEN 'B'
            WHEN ge.total_grade >= 70 THEN 'C+'
            WHEN ge.total_grade >= 65 THEN 'C'
            WHEN ge.total_grade >= 60 THEN 'D+'
            WHEN ge.total_grade >= 55 THEN 'D'
            ELSE 'F'
        END,
    updated_at = NOW()
FROM gradebook_entries ge
WHERE ge.enrollment_id = e.id
  AND ge.is_published = TRUE;

-- ── Step 6: Re-enable the trigger and recalculate GPA for all affected students ──
ALTER TABLE enrollments ENABLE TRIGGER trg_enrollments_update_gpa;

UPDATE student_profiles sp
SET
    cumulative_gpa = COALESCE((
        SELECT
            SUM(CASE
                WHEN e.final_grade >= 90 THEN 4.0 * c.credit_hours
                WHEN e.final_grade >= 80 THEN 3.0 * c.credit_hours
                WHEN e.final_grade >= 70 THEN 2.0 * c.credit_hours
                WHEN e.final_grade >= 60 THEN 1.0 * c.credit_hours
                ELSE 0.0
            END)
            /
            NULLIF(SUM(c.credit_hours), 0)
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        WHERE e.student_id = sp.profile_id
          AND e.tenant_id = sp.tenant_id
          AND e.status = 'completed'
          AND e.final_grade IS NOT NULL
    ), 0),
    total_credit_hours = COALESCE((
        SELECT SUM(c.credit_hours)
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        WHERE e.student_id = sp.profile_id
          AND e.tenant_id = sp.tenant_id
          AND e.status = 'completed'
          AND e.final_grade IS NOT NULL
    ), 0),
    earned_credit_hours = COALESCE((
        SELECT COUNT(c.credit_hours)
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        WHERE e.student_id = sp.profile_id
          AND e.tenant_id = sp.tenant_id
          AND e.status = 'completed'
          AND e.final_grade >= 60
    ), 0)
WHERE sp.profile_id IN (
    SELECT DISTINCT e.student_id
    FROM enrollments e
    JOIN gradebook_entries ge ON ge.enrollment_id = e.id
    WHERE ge.is_published = TRUE
);
