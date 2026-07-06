-- ============================================================
-- Migration: Add rec_type column + RLS policies to student_recommendations
--
-- Changes:
-- 1. Add `rec_type VARCHAR(50)` column with check constraint
-- 2. Enable RLS on the table
-- 3. Add policies:
--    - Students: SELECT own recommendations only
--    - Faculty: SELECT for students in their courses (via course_schedules),
--               INSERT for manual recommendations
--    - Academic Management: SELECT for students in their managed departments
--    - Tenant Admin: ALL within their tenant
--    - Super Admin: ALL
-- ============================================================

-- 1. Add rec_type column
ALTER TABLE student_recommendations
  ADD COLUMN IF NOT EXISTS rec_type VARCHAR(50)
  CHECK (rec_type IN ('remedial', 'enrichment', 'on_demand', 'daily_tip', 'manual'));

-- Set default for existing rows based on sent_by and title patterns
UPDATE student_recommendations
SET rec_type = CASE
  WHEN sent_by IS NOT NULL AND title LIKE '%طلب توصية%' THEN 'on_demand'
  WHEN sent_by IS NULL AND title LIKE '%تحسين الأداء%' THEN 'remedial'
  WHEN sent_by IS NULL AND title LIKE '%إثراء معرفي%' THEN 'enrichment'
  WHEN sent_by IS NULL AND title LIKE '%نصيحة يومية%' THEN 'daily_tip'
  ELSE 'manual'
END
WHERE rec_type IS NULL;

-- 2. Enable RLS
ALTER TABLE student_recommendations ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies

-- 3a. Student: SELECT only their own recommendations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'student_recommendations' AND policyname = 'student_select_own_recommendations'
  ) THEN
    CREATE POLICY "student_select_own_recommendations"
      ON student_recommendations FOR SELECT
      USING (student_id = current_profile_id());
  END IF;
END $$;

-- 3b. Faculty: SELECT for students enrolled in courses they teach via course_schedules
--     course_schedules -> study_plan_courses -> course_id -> enrollments -> student_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'student_recommendations' AND policyname = 'faculty_select_recommendations'
  ) THEN
    CREATE POLICY "faculty_select_recommendations"
      ON student_recommendations FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM course_schedules cs
          JOIN study_plan_courses spc ON spc.id = cs.study_plan_course_id
          JOIN enrollments e ON e.course_id = spc.course_id
            AND e.tenant_id = cs.tenant_id
          WHERE cs.instructor_id = current_profile_id()
            AND e.student_id = student_recommendations.student_id
            AND e.tenant_id = student_recommendations.tenant_id
        )
      );
  END IF;
END $$;

-- 3c. Faculty: INSERT manual recommendations for their students
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'student_recommendations' AND policyname = 'faculty_insert_recommendations'
  ) THEN
    CREATE POLICY "faculty_insert_recommendations"
      ON student_recommendations FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM course_schedules cs
          JOIN study_plan_courses spc ON spc.id = cs.study_plan_course_id
          JOIN enrollments e ON e.course_id = spc.course_id
            AND e.tenant_id = cs.tenant_id
          WHERE cs.instructor_id = current_profile_id()
            AND e.student_id = student_recommendations.student_id
            AND e.tenant_id = student_recommendations.tenant_id
        )
      );
  END IF;
END $$;

-- 3d. Academic Management: SELECT for students in managed departments
--     academic_management_departments -> departments -> courses -> enrollments -> student_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'student_recommendations' AND policyname = 'academic_management_select_recommendations'
  ) THEN
    CREATE POLICY "academic_management_select_recommendations"
      ON student_recommendations FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM academic_management_departments amd
          JOIN departments d ON d.id = amd.department_id
          JOIN courses co ON co.department_id = d.id
          JOIN enrollments e ON e.course_id = co.id
          WHERE amd.profile_id = current_profile_id()
            AND e.student_id = student_recommendations.student_id
            AND e.tenant_id = student_recommendations.tenant_id
        )
      );
  END IF;
END $$;

-- 3e. Tenant Admin: ALL within their tenant
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'student_recommendations' AND policyname = 'tenant_admin_all_recommendations'
  ) THEN
    CREATE POLICY "tenant_admin_all_recommendations"
      ON student_recommendations FOR ALL
      USING (
        tenant_id = current_tenant_id()
        AND EXISTS (
          SELECT 1 FROM profiles
          WHERE id = current_profile_id()
            AND role = 'tenant_admin'
        )
      );
  END IF;
END $$;

-- 3f. Super Admin: ALL
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'student_recommendations' AND policyname = 'super_admin_all_recommendations'
  ) THEN
    CREATE POLICY "super_admin_all_recommendations"
      ON student_recommendations FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = current_profile_id()
            AND role = 'super_admin'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE 'Migration complete: Added rec_type column + RLS policies to student_recommendations';
END $$;
