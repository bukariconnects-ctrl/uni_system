-- Migration 23: Channel message notifications + unread message counters
-- ============================================================

-- 1. Extend the direct-message notification trigger to also handle channel messages
DROP TRIGGER IF EXISTS trg_notify_new_direct_message ON messages;
DROP FUNCTION IF EXISTS notify_new_direct_message();

CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.message_type = 'direct' AND NEW.conversation_id IS NOT NULL THEN
        INSERT INTO notifications (tenant_id, recipient_id, notification_type, title, body, reference_table, reference_id)
        SELECT NEW.tenant_id,
               CASE WHEN participant_a = NEW.sender_id THEN participant_b ELSE participant_a END,
               'system', 'رسالة جديدة', 'لديك رسالة مباشرة جديدة.', 'messages', NEW.id
        FROM conversations WHERE id = NEW.conversation_id;

    ELSIF NEW.message_type = 'channel' AND NEW.channel_id IS NOT NULL THEN
        INSERT INTO notifications (tenant_id, recipient_id, notification_type, title, body, reference_table, reference_id)
        SELECT NEW.tenant_id, cm.profile_id, 'system', 'رسالة جديدة في المجموعة', LEFT(NEW.body, 200), 'messages', NEW.id
        FROM channel_members cm
        WHERE cm.channel_id = NEW.channel_id
          AND cm.profile_id != NEW.sender_id;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_message
    AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION notify_new_message();

-- 2. Add last_read_at for unread tracking
ALTER TABLE channel_members ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_read_at_a TIMESTAMPTZ;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_read_at_b TIMESTAMPTZ;

UPDATE conversations SET last_read_at_a = NOW(), last_read_at_b = NOW() WHERE last_read_at_a IS NULL;
ALTER TABLE conversations ALTER COLUMN last_read_at_a SET NOT NULL;
ALTER TABLE conversations ALTER COLUMN last_read_at_b SET NOT NULL;
ALTER TABLE conversations ALTER COLUMN last_read_at_a SET DEFAULT NOW();
ALTER TABLE conversations ALTER COLUMN last_read_at_b SET DEFAULT NOW();

-- 3. Helper function: unread channel message counts for a user
CREATE OR REPLACE FUNCTION get_unread_channel_counts(p_profile_id UUID)
RETURNS TABLE(channel_id UUID, unread_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT cm.channel_id, COUNT(m.id)::BIGINT
    FROM channel_members cm
    LEFT JOIN messages m ON m.channel_id = cm.channel_id
        AND m.message_type = 'channel'
        AND m.created_at > cm.last_read_at
        AND m.sender_id != cm.profile_id
    WHERE cm.profile_id = p_profile_id
    GROUP BY cm.channel_id;
END;
$$;

-- 4. Helper function: unread conversation counts for a user
CREATE OR REPLACE FUNCTION get_unread_conversation_counts(p_profile_id UUID)
RETURNS TABLE(conversation_id UUID, unread_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT c.id, COUNT(m.id)::BIGINT
    FROM conversations c
    LEFT JOIN messages m ON m.conversation_id = c.id
        AND m.message_type = 'direct'
        AND m.sender_id != p_profile_id
        AND m.created_at > CASE
            WHEN c.participant_a = p_profile_id THEN c.last_read_at_a
            ELSE c.last_read_at_b
        END
    WHERE c.participant_a = p_profile_id OR c.participant_b = p_profile_id
    GROUP BY c.id;
END;
$$;

DO $$
BEGIN
    RAISE NOTICE 'Migration 23 complete: channel notifications + unread tracking';
END $$;
