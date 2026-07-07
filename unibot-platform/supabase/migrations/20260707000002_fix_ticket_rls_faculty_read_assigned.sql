-- Fix: Faculty cannot read tickets assigned to them
-- ============================================================
-- The existing RLS policies for tickets only allow:
--   1. "user_read_own_tickets" → created_by = current_profile_id()
--   2. "admin_manage_all_tickets" → role IN ('tenant_admin', 'academic_management')
--
-- Faculty members are NOT included in either policy, so when:
--   - A student creates a ticket with assigned_to = faculty_id (direct-to-faculty)
--   - Academic management transfers a ticket to a faculty member
-- ...the faculty member cannot read the ticket because of RLS filtering.
-- ============================================================

DO $$
BEGIN
    -- Allow faculty (and any non-student) to read tickets assigned to them
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'tickets'
          AND policyname = 'user_read_assigned_tickets'
    ) THEN
        CREATE POLICY "user_read_assigned_tickets"
            ON tickets FOR SELECT
            USING (
                tenant_id = current_tenant_id()
                AND assigned_to = current_profile_id()
            );
    END IF;

    -- Allow faculty to update tickets assigned to them (change status, etc.)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'tickets'
          AND policyname = 'faculty_update_assigned_tickets'
    ) THEN
        CREATE POLICY "faculty_update_assigned_tickets"
            ON tickets FOR UPDATE
            USING (
                tenant_id = current_tenant_id()
                AND assigned_to = current_profile_id()
                AND current_user_role() IN ('faculty', 'lecturer', 'head_of_department', 'secretary', 'ticket_technician')
            )
            WITH CHECK (
                tenant_id = current_tenant_id()
                AND assigned_to = current_profile_id()
            );
    END IF;
END;
$$;
