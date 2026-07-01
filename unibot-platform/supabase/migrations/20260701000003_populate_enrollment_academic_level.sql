-- ============================================================
-- Migration 16: Populate academic_level_id on existing enrollments
--
-- The academic_level_id column was added to enrollments but was
-- never populated for existing records. This migration fills it
-- in by matching through the course_id + major_id chain.
-- ============================================================

-- Step 1: Populate academic_level_id for enrollments that have major_id
UPDATE enrollments e
SET academic_level_id = spc.academic_level_id
FROM study_plan_courses spc
JOIN academic_levels al ON al.id = spc.academic_level_id
WHERE e.course_id = spc.course_id
  AND e.major_id = al.major_id
  AND e.academic_level_id IS NULL
  AND e.major_id IS NOT NULL;

-- Step 2: For any remaining NULL major_id, try to get it from student_majors
UPDATE enrollments e
SET major_id = sm.major_id
FROM student_majors sm
WHERE e.student_id = sm.student_id
  AND sm.is_primary = TRUE
  AND e.major_id IS NULL
  AND e.course_id IS NOT NULL;

-- Step 3: Retry academic_level_id for newly populated major_ids
UPDATE enrollments e
SET academic_level_id = spc.academic_level_id
FROM study_plan_courses spc
JOIN academic_levels al ON al.id = spc.academic_level_id
WHERE e.course_id = spc.course_id
  AND e.major_id = al.major_id
  AND e.academic_level_id IS NULL
  AND e.major_id IS NOT NULL;

-- Step 4: For remaining NULLs, match by (course_id, semester_type)
WITH matched AS (
  SELECT DISTINCT ON (e.id) e.id AS enrollment_id, spc.academic_level_id
  FROM enrollments e
  JOIN study_plan_courses spc ON spc.course_id = e.course_id
  JOIN semesters sem ON sem.id = e.semester_id
  WHERE e.academic_level_id IS NULL AND e.course_id IS NOT NULL
    AND (
      (sem.semester_type = 'first' AND spc.semester_type = 'first') OR
      (sem.semester_type = 'second' AND spc.semester_type = 'second') OR
      (sem.semester_type IS NULL) OR
      (spc.semester_type IS NULL)
    )
  ORDER BY e.id,
    CASE WHEN sem.semester_type = spc.semester_type THEN 0 ELSE 1 END,
    spc.created_at ASC
)
UPDATE enrollments e
SET academic_level_id = m.academic_level_id
FROM matched m
WHERE e.id = m.enrollment_id
  AND e.academic_level_id IS NULL;

DO $$
DECLARE
    remaining INT;
BEGIN
    SELECT COUNT(*) INTO remaining FROM enrollments WHERE academic_level_id IS NULL AND course_id IS NOT NULL;
    IF remaining > 0 THEN
        RAISE NOTICE 'Warning: % enrollments still have NULL academic_level_id - group filtering may not work for them', remaining;
    ELSE
        RAISE NOTICE 'All enrollments now have academic_level_id populated';
    END IF;
END $$;
