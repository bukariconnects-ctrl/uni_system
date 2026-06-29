-- ============================================================
-- Migration 5: Update RLS policies for new schema
-- ============================================================

-- Step 1: Drop old section/schedule RLS policies (if tables still exist)
DO $$
BEGIN
  DROP POLICY IF EXISTS "tenant_read_sections" ON sections;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$
BEGIN
  DROP POLICY IF EXISTS "academic_management_write_sections" ON sections;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$
BEGIN
  DROP POLICY IF EXISTS "tenant_read_schedules" ON schedules;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$
BEGIN
  DROP POLICY IF EXISTS "academic_management_write_schedules" ON schedules;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Step 2: Update enrollment RLS policies (remove sections dependency)
DROP POLICY IF EXISTS "faculty_read_section_enrollments" ON enrollments;

CREATE POLICY "faculty_read_course_enrollments"
    ON enrollments FOR SELECT
    USING (
        tenant_id = current_tenant_id()
        AND course_id IN (
            SELECT spc.course_id
            FROM course_schedules cs
            JOIN study_plan_courses spc ON cs.study_plan_course_id = spc.id
            WHERE cs.instructor_id = auth.uid()
              AND cs.semester_id = enrollments.semester_id
        )
    );

DROP POLICY IF EXISTS "student_read_own_enrollments" ON enrollments;
CREATE POLICY "student_read_own_enrollments"
    ON enrollments FOR SELECT
    USING (student_id = auth.uid());

DROP POLICY IF EXISTS "admin_all_enrollments" ON enrollments;
CREATE POLICY "admin_all_enrollments"
    ON enrollments FOR ALL
    USING (
        tenant_id = current_tenant_id() 
        AND current_user_role() IN ('super_admin', 'tenant_admin', 'academic_management')
    );

-- Step 3: Add RLS policies for department_staff
CREATE POLICY "tenant_read_department_staff"
    ON department_staff FOR SELECT
    USING (tenant_id = current_tenant_id());

CREATE POLICY "tenant_admin_manage_department_staff"
    ON department_staff FOR ALL
    USING (
        tenant_id = current_tenant_id() 
        AND current_user_role() IN ('super_admin', 'tenant_admin')
    );

-- Step 4: Update channels RLS to remove sections dependency
DROP POLICY IF EXISTS "faculty_manage_own_channels" ON channels;
CREATE POLICY "faculty_manage_own_channels"
    ON channels FOR UPDATE
    USING (
        tenant_id = current_tenant_id()
        AND current_user_role() = 'faculty'
        AND created_by = current_profile_id()
    );

-- Step 5: Add RLS for course_schedules (if not already present from migration 1)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_read_course_schedules' AND tablename = 'course_schedules') THEN
    CREATE POLICY "tenant_read_course_schedules"
        ON course_schedules FOR SELECT
        USING (tenant_id = current_tenant_id());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'academic_management_write_course_schedules' AND tablename = 'course_schedules') THEN
    CREATE POLICY "academic_management_write_course_schedules"
        ON course_schedules FOR ALL
        USING (tenant_id = current_tenant_id() AND current_user_role() IN ('super_admin', 'tenant_admin', 'academic_management'));
  END IF;
END $$;
