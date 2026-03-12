-- Enable Realtime for notifications table to ensure instant notification delivery

-- Enable Realtime publication for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Ensure RLS policies allow Realtime subscriptions
-- The existing policies already allow users to read their own notifications
-- This migration just ensures Realtime is properly enabled
