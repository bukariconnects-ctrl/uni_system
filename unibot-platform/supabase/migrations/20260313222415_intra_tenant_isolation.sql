CREATE TABLE academic_management_departments (
    profile_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    assigned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,

    PRIMARY KEY (profile_id, department_id)
);

CREATE INDEX idx_am_depts_profile_id    ON academic_management_departments(profile_id);
CREATE INDEX idx_am_depts_dept_id       ON academic_management_departments(department_id);
CREATE INDEX idx_am_depts_tenant_id     ON academic_management_departments(tenant_id);

ALTER TABLE academic_management_departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_admin_manage_am_departments"
    ON academic_management_departments FOR ALL
    USING (tenant_id = current_tenant_id() AND current_user_role() IN ('tenant_admin', 'super_admin'));

CREATE POLICY "am_read_own_department_assignments"
    ON academic_management_departments FOR SELECT
    USING (profile_id = current_profile_id() AND current_user_role() = 'academic_management');

CREATE OR REPLACE FUNCTION get_my_managed_departments()
RETURNS UUID[] LANGUAGE SQL SECURITY DEFINER STABLE AS $$
    SELECT COALESCE(
        ARRAY(
            SELECT department_id
            FROM academic_management_departments
            WHERE profile_id = auth.uid()
        ),
        '{}'::UUID[]
    );
$$;

DROP POLICY IF EXISTS "admin_write_majors" ON majors;

CREATE POLICY "admin_write_majors"
    ON majors FOR ALL
    USING (tenant_id = current_tenant_id() AND current_user_role() IN ('tenant_admin', 'super_admin'));

CREATE POLICY "academic_management_scoped_write_majors"
    ON majors FOR ALL
    USING (
        current_user_role() = 'academic_management'
        AND tenant_id = current_tenant_id()
        AND department_id = ANY(get_my_managed_departments())
    );

CREATE POLICY "academic_management_scoped_write_courses"
    ON courses FOR ALL
    USING (
        current_user_role() = 'academic_management'
        AND tenant_id = current_tenant_id()
        AND department_id = ANY(get_my_managed_departments())
    );

DROP POLICY IF EXISTS "academic_management_write_sections" ON sections;

CREATE POLICY "admin_write_sections"
    ON sections FOR ALL
    USING (tenant_id = current_tenant_id() AND current_user_role() IN ('tenant_admin', 'super_admin'));

CREATE POLICY "academic_management_scoped_write_sections"
    ON sections FOR ALL
    USING (
        current_user_role() = 'academic_management'
        AND tenant_id = current_tenant_id()
        AND course_id IN (
            SELECT id FROM courses
            WHERE department_id = ANY(get_my_managed_departments())
        )
    );

DROP POLICY IF EXISTS "academic_management_write_schedules" ON schedules;

CREATE POLICY "admin_write_schedules"
    ON schedules FOR ALL
    USING (tenant_id = current_tenant_id() AND current_user_role() IN ('tenant_admin', 'super_admin'));

CREATE POLICY "academic_management_scoped_write_schedules"
    ON schedules FOR ALL
    USING (
        current_user_role() = 'academic_management'
        AND tenant_id = current_tenant_id()
        AND section_id IN (
            SELECT id FROM sections
            WHERE course_id IN (
                SELECT id FROM courses
                WHERE department_id = ANY(get_my_managed_departments())
            )
        )
    );
