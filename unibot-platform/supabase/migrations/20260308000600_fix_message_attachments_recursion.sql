DROP POLICY IF EXISTS "read_own_message_attachments" ON message_attachments;
CREATE POLICY "read_own_message_attachments"
    ON message_attachments FOR SELECT
    USING (
        tenant_id = current_tenant_id()
        AND message_id IN (
            SELECT id FROM messages
            WHERE sender_id = current_profile_id()
               OR conversation_id IN (
                    SELECT id FROM conversations
                    WHERE participant_a = current_profile_id() OR participant_b = current_profile_id()
               )
               OR channel_id IN (SELECT get_my_channel_ids())
        )
    );
