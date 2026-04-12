-- ============================================================
-- RUN THIS IN: Supabase Dashboard → SQL Editor
-- Purpose: Allow faculty to create/manage their own circulars
-- ============================================================

-- Drop old policy if it somehow conflicts (safe to run even if not exists)
DROP POLICY IF EXISTS "faculty_manage_own_circulars" ON circulars;

-- Faculty can INSERT/UPDATE/DELETE their own circulars
-- Restricted to target_type: 'students' (their students) or 'section' (their sections)
CREATE POLICY "faculty_manage_own_circulars"
    ON circulars FOR ALL
    USING (
        tenant_id = current_tenant_id()
        AND current_user_role() = 'faculty'
        AND created_by = current_profile_id()
    )
    WITH CHECK (
        tenant_id = current_tenant_id()
        AND current_user_role() = 'faculty'
        AND created_by = current_profile_id()
        AND target_type IN ('students', 'section')
        AND (
            target_type <> 'section'
            OR target_id IN (
                SELECT id FROM sections
                WHERE instructor_id = current_profile_id()
            )
        )
    );
