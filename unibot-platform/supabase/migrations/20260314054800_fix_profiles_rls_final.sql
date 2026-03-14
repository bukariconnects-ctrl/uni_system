-- Final fix for profiles RLS - tenant_admin users visibility
-- The issue: tenant_admin cannot see other users in their tenant

-- Step 1: Drop all existing profile-related policies to start fresh
DROP POLICY IF EXISTS "tenant_admin_manage_own_tenant_profiles" ON profiles;
DROP POLICY IF EXISTS "super_admin_manage_all_profiles" ON profiles;
DROP POLICY IF EXISTS "users_read_own_profile" ON profiles;
DROP POLICY IF EXISTS "tenant_users_read_same_tenant" ON profiles;

-- Step 2: Create SECURITY DEFINER functions that bypass RLS
-- These functions run with the privileges of the function owner (postgres)
-- and can read from profiles without triggering RLS recursion

CREATE OR REPLACE FUNCTION auth_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT tenant_id FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role::text FROM profiles WHERE id = auth.uid();
$$;

-- Step 3: Create new RLS policies for profiles table

-- Policy 1: Super admin can do everything
CREATE POLICY "super_admin_full_access"
    ON profiles FOR ALL
    USING (auth_user_role() = 'super_admin')
    WITH CHECK (auth_user_role() = 'super_admin');

-- Policy 2: Tenant admin can manage all profiles in their tenant
CREATE POLICY "tenant_admin_manage_tenant_profiles"
    ON profiles FOR ALL
    USING (
        auth_user_role() = 'tenant_admin' 
        AND tenant_id = auth_tenant_id()
    )
    WITH CHECK (
        auth_user_role() = 'tenant_admin' 
        AND tenant_id = auth_tenant_id()
    );

-- Policy 3: All users can read their own profile
CREATE POLICY "users_read_own_profile"
    ON profiles FOR SELECT
    USING (id = auth.uid());

-- Policy 4: Users in same tenant can read each other's basic info
CREATE POLICY "tenant_users_read_profiles"
    ON profiles FOR SELECT
    USING (tenant_id = auth_tenant_id());

-- Step 4: Fix student_profiles policies
DROP POLICY IF EXISTS "admin_faculty_read_student_profiles" ON student_profiles;
DROP POLICY IF EXISTS "system_write_student_profiles" ON student_profiles;
DROP POLICY IF EXISTS "students_read_own" ON student_profiles;

CREATE POLICY "tenant_admin_manage_student_profiles"
    ON student_profiles FOR ALL
    USING (
        auth_user_role() = 'tenant_admin' 
        AND tenant_id = auth_tenant_id()
    );

CREATE POLICY "faculty_read_student_profiles"
    ON student_profiles FOR SELECT
    USING (
        auth_user_role() IN ('faculty', 'academic_management')
        AND tenant_id = auth_tenant_id()
    );

CREATE POLICY "students_read_own_profile"
    ON student_profiles FOR SELECT
    USING (profile_id = auth.uid());

-- Step 5: Fix faculty_profiles policies
DROP POLICY IF EXISTS "admin_manage_faculty_profiles" ON faculty_profiles;
DROP POLICY IF EXISTS "tenant_read_faculty_profiles" ON faculty_profiles;
DROP POLICY IF EXISTS "faculty_read_own" ON faculty_profiles;
DROP POLICY IF EXISTS "faculty_read_own_profile" ON faculty_profiles;
DROP POLICY IF EXISTS "tenant_admin_manage_faculty_profiles" ON faculty_profiles;
DROP POLICY IF EXISTS "tenant_users_read_faculty_profiles" ON faculty_profiles;

CREATE POLICY "tenant_admin_manage_faculty_profiles"
    ON faculty_profiles FOR ALL
    USING (
        auth_user_role() = 'tenant_admin' 
        AND tenant_id = auth_tenant_id()
    );

CREATE POLICY "tenant_users_read_faculty_profiles"
    ON faculty_profiles FOR SELECT
    USING (tenant_id = auth_tenant_id());

CREATE POLICY "faculty_read_own_profile"
    ON faculty_profiles FOR SELECT
    USING (profile_id = auth.uid());

-- Step 6: Fix student_majors policies
DROP POLICY IF EXISTS "tenant_admin_manage_student_majors" ON student_majors;
DROP POLICY IF EXISTS "tenant_read_student_majors" ON student_majors;

CREATE POLICY "tenant_admin_manage_student_majors"
    ON student_majors FOR ALL
    USING (
        auth_user_role() = 'tenant_admin' 
        AND tenant_id = auth_tenant_id()
    );

CREATE POLICY "tenant_users_read_student_majors"
    ON student_majors FOR SELECT
    USING (tenant_id = auth_tenant_id());

-- Step 7: Fix faculty_departments policies
DROP POLICY IF EXISTS "tenant_admin_manage_faculty_departments" ON faculty_departments;
DROP POLICY IF EXISTS "tenant_read_faculty_departments" ON faculty_departments;

CREATE POLICY "tenant_admin_manage_faculty_departments"
    ON faculty_departments FOR ALL
    USING (
        auth_user_role() = 'tenant_admin' 
        AND tenant_id = auth_tenant_id()
    );

CREATE POLICY "tenant_users_read_faculty_departments"
    ON faculty_departments FOR SELECT
    USING (tenant_id = auth_tenant_id());

-- Step 8: Fix academic_management_departments policies
DROP POLICY IF EXISTS "tenant_admin_manage_amd" ON academic_management_departments;
DROP POLICY IF EXISTS "tenant_read_amd" ON academic_management_departments;

CREATE POLICY "tenant_admin_manage_amd"
    ON academic_management_departments FOR ALL
    USING (
        auth_user_role() = 'tenant_admin' 
        AND tenant_id = auth_tenant_id()
    );

CREATE POLICY "tenant_users_read_amd"
    ON academic_management_departments FOR SELECT
    USING (tenant_id = auth_tenant_id());
