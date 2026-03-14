-- Fix RLS for tenant_admin to see all users in their tenant
-- The issue is that current_tenant_id() may not work correctly due to JWT claims

-- Drop existing policy and recreate with a more robust approach
DROP POLICY IF EXISTS "tenant_admin_manage_own_tenant_profiles" ON profiles;

-- Create a helper function that bypasses RLS to get tenant_id
CREATE OR REPLACE FUNCTION get_my_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT tenant_id FROM profiles WHERE id = auth.uid();
$$;

-- Create a helper function that bypasses RLS to get user role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role::text FROM profiles WHERE id = auth.uid();
$$;

-- Recreate the policy using the new helper functions
CREATE POLICY "tenant_admin_manage_own_tenant_profiles"
    ON profiles FOR ALL
    USING (
        tenant_id = get_my_tenant_id() 
        AND get_my_role() = 'tenant_admin'
    );

-- Also fix the student_profiles, faculty_profiles policies to use the same approach
DROP POLICY IF EXISTS "admin_faculty_read_student_profiles" ON student_profiles;
CREATE POLICY "admin_faculty_read_student_profiles"
    ON student_profiles FOR SELECT
    USING (
        tenant_id = get_my_tenant_id() 
        AND get_my_role() IN ('tenant_admin', 'academic_management', 'faculty')
    );

DROP POLICY IF EXISTS "system_write_student_profiles" ON student_profiles;
CREATE POLICY "system_write_student_profiles"
    ON student_profiles FOR ALL
    USING (
        tenant_id = get_my_tenant_id() 
        AND get_my_role() IN ('tenant_admin', 'super_admin')
    );

-- Fix faculty_profiles policies
DROP POLICY IF EXISTS "admin_manage_faculty_profiles" ON faculty_profiles;
CREATE POLICY "admin_manage_faculty_profiles"
    ON faculty_profiles FOR ALL
    USING (
        tenant_id = get_my_tenant_id() 
        AND get_my_role() IN ('tenant_admin', 'super_admin')
    );

DROP POLICY IF EXISTS "tenant_read_faculty_profiles" ON faculty_profiles;
CREATE POLICY "tenant_read_faculty_profiles"
    ON faculty_profiles FOR SELECT
    USING (tenant_id = get_my_tenant_id());
