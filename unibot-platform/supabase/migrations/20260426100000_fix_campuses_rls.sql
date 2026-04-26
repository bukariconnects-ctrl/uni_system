-- ============================================================
-- Migration: fix_campuses_rls
-- Purpose: Replace broken JWT-claim-based RLS policies on
--          `campuses` with the same helper-function pattern
--          used by all other academic tables (current_tenant_id,
--          current_user_role). The old policies used
--          auth.jwt() ->> 'user_role' which is unreliable
--          and caused "new row violates row-level security" errors.
-- ============================================================

-- Drop old broken policies
DROP POLICY IF EXISTS "tenant_admin_manage_campuses"  ON campuses;
DROP POLICY IF EXISTS "tenant_members_read_campuses"  ON campuses;

-- tenant_admin can do full CRUD on their own tenant's campuses
CREATE POLICY "tenant_admin_manage_campuses"
    ON campuses FOR ALL
    USING (
        tenant_id = current_tenant_id()
        AND current_user_role() = 'tenant_admin'
    )
    WITH CHECK (
        tenant_id = current_tenant_id()
        AND current_user_role() = 'tenant_admin'
    );

-- All authenticated members of the tenant can read campuses
-- (needed by venues, colleges, schedules forms to populate dropdowns)
CREATE POLICY "tenant_members_read_campuses"
    ON campuses FOR SELECT
    USING (
        tenant_id = current_tenant_id()
    );
