-- ============================================================
-- Migration: Allow faculty to create and manage their own circulars
-- Fixes: RLS blocking faculty INSERT on circulars table
-- Also restricts: faculty can only target 'students' or 'section'
--   and only sections they teach
-- ============================================================

-- 1. Add faculty insert/update/delete policy for circulars
--    Faculty can INSERT circulars for:
--      - target_type = 'students' (their enrolled students, resolved in app)
--      - target_type = 'section'  (a section they teach)
--    They can only manage their OWN circulars (created_by = current_profile_id())

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
        -- Faculty circular targets must be 'students' or 'section'
        AND target_type IN ('students', 'section')
        -- If targeting a specific section, it must be one they teach
        AND (
            target_type <> 'section'
            OR target_id IN (
                SELECT id FROM sections WHERE instructor_id = current_profile_id()
            )
        )
    );

-- 2. Faculty must also be able to READ all published circulars
--    (already covered by tenant_read_published_circulars, but ensuring
--     faculty can also READ their own drafts via the new policy above)

-- 3. Grant faculty read access to their own unpublished circulars (drafts)
--    This is already handled by "faculty_manage_own_circulars" above (FOR ALL)
--    but let's make it explicit for SELECT to avoid conflicts with existing policies

-- Note: The existing "tenant_read_published_circulars" covers published circulars for everyone.
-- "faculty_manage_own_circulars" covers faculty's own (any status).
-- No changes needed to existing admin_manage_circulars policy.
