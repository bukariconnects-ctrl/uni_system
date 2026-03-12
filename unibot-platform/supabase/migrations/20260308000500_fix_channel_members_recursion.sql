CREATE OR REPLACE FUNCTION get_my_channel_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT channel_id FROM channel_members WHERE profile_id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION get_my_channel_ids FROM public, anon;
GRANT EXECUTE ON FUNCTION get_my_channel_ids TO authenticated;

DROP POLICY IF EXISTS "members_read_channel_members" ON channel_members;
CREATE POLICY "members_read_channel_members"
    ON channel_members FOR SELECT
    USING (
        tenant_id = current_tenant_id()
        AND channel_id IN (SELECT get_my_channel_ids())
    );

DROP POLICY IF EXISTS "channel_members_read_channels" ON channels;
CREATE POLICY "channel_members_read_channels"
    ON channels FOR SELECT
    USING (
        tenant_id = current_tenant_id()
        AND (
            current_user_role() IN ('tenant_admin', 'academic_management', 'super_admin')
            OR id IN (SELECT get_my_channel_ids())
        )
    );

DROP POLICY IF EXISTS "read_channel_messages" ON messages;
CREATE POLICY "read_channel_messages"
    ON messages FOR SELECT
    USING (
        tenant_id = current_tenant_id()
        AND message_type = 'channel'
        AND channel_id IN (SELECT get_my_channel_ids())
    );

DROP POLICY IF EXISTS "channel_admin_manage_messages" ON messages;
CREATE POLICY "channel_admin_manage_messages"
    ON messages FOR ALL
    USING (
        tenant_id = current_tenant_id()
        AND (
            current_user_role() IN ('tenant_admin', 'academic_management', 'super_admin')
            OR (
                current_user_role() = 'faculty'
                AND channel_id IN (
                    SELECT id FROM channels
                    WHERE section_id IN (SELECT id FROM sections WHERE instructor_id = current_profile_id())
                )
            )
        )
    );
