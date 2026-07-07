-- Fix remaining enrollment grade sync — update ALL enrollments regardless of
-- publish status, so letter_grade matches the corrected total_grade for every
-- student who has any gradebook_entry.

-- ── 1. Temporarily disable GPA trigger ──
ALTER TABLE enrollments DISABLE TRIGGER trg_enrollments_update_gpa;

-- ── 2. Sync final_grade + letter_grade for EVERY enrollment that has a
--      gradebook_entry (including unpublished ones that the previous migration
--      skipped). ──
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
WHERE ge.enrollment_id = e.id;

-- ── 3. Re-enable the trigger ──
ALTER TABLE enrollments ENABLE TRIGGER trg_enrollments_update_gpa;

-- ── 4. Recalculate GPA for ALL students that have any gradebook_entry ──
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
);
