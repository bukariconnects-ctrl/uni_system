DROP POLICY IF EXISTS "student_read_own_attendance_records" ON attendance_records;
CREATE POLICY "student_read_own_attendance_records"
    ON attendance_records FOR SELECT
    USING (
        tenant_id = current_tenant_id()
        AND student_id = current_profile_id()
    );

DROP POLICY IF EXISTS "faculty_manage_attendance_records" ON attendance_records;
CREATE POLICY "faculty_manage_attendance_records"
    ON attendance_records FOR ALL
    USING (
        tenant_id = current_tenant_id()
        AND (
            current_user_role() IN ('tenant_admin', 'academic_management', 'super_admin')
            OR (
                current_user_role() = 'faculty'
                AND section_id IN (SELECT id FROM sections WHERE instructor_id = current_profile_id())
            )
        )
    );

DROP POLICY IF EXISTS "read_own_direct_messages" ON messages;
CREATE POLICY "read_own_direct_messages"
    ON messages FOR SELECT
    USING (
        tenant_id = current_tenant_id()
        AND message_type = 'direct'
        AND conversation_id IN (
            SELECT id FROM conversations
            WHERE participant_a = current_profile_id()
               OR participant_b = current_profile_id()
        )
    );

DROP POLICY IF EXISTS "read_channel_messages" ON messages;
CREATE POLICY "read_channel_messages"
    ON messages FOR SELECT
    USING (
        tenant_id = current_tenant_id()
        AND message_type = 'channel'
        AND channel_id IN (
            SELECT channel_id FROM channel_members
            WHERE profile_id = current_profile_id()
        )
    );

DROP POLICY IF EXISTS "send_messages" ON messages;
CREATE POLICY "send_messages"
    ON messages FOR INSERT
    WITH CHECK (
        tenant_id = current_tenant_id()
        AND sender_id = current_profile_id()
    );
