DROP POLICY IF EXISTS "student_read_own_profile" ON profiles;

CREATE POLICY "student_read_tenant_profiles"
    ON profiles FOR SELECT
    USING (
        current_user_role() = 'student'
        AND tenant_id = current_tenant_id()
    );
