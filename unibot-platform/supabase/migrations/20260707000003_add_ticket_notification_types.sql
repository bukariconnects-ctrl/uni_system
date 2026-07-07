-- Add new notification types for ticket assignments
-- ============================================================
-- new_ticket: sent to academic_management when student creates a ticket
-- ticket_assigned: sent to faculty when a ticket is assigned/transferred to them
-- ============================================================

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'new_ticket';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'ticket_assigned';
