-- Smart Academic Ticketing System
-- ============================================================
-- 1. Extend ticket_category enum with new categories
-- 2. Add new columns to tickets table
-- 3. Create ticket_escalations table
-- 4. Create auto-close function for stale pending_info tickets
-- ============================================================

-- ============================================================
-- PART 1: Extend ticket_category ENUM
-- ============================================================
-- Add student category: course_content_query (direct to faculty)
-- Add faculty categories: leave_excuse_request, schedule_conflict
ALTER TYPE ticket_category ADD VALUE IF NOT EXISTS 'course_content_query';
ALTER TYPE ticket_category ADD VALUE IF NOT EXISTS 'leave_excuse_request';
ALTER TYPE ticket_category ADD VALUE IF NOT EXISTS 'schedule_conflict';

-- ============================================================
-- PART 2: Add new columns to tickets table
-- ============================================================
-- related_course_id: used when student routes ticket directly to faculty for a specific course
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS related_course_id UUID REFERENCES courses(id) ON DELETE SET NULL;

-- priority_reason: AI-generated explanation for priority assignment
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS priority_reason TEXT;

-- escalated_from: tracks the original ticket when escalated (self-referencing FK)
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS escalated_from UUID REFERENCES tickets(id) ON DELETE SET NULL;

-- is_direct_to_faculty: true when student chooses to route directly to course instructor
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS is_direct_to_faculty BOOLEAN NOT NULL DEFAULT FALSE;

-- Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_tickets_related_course_id ON tickets(related_course_id);
CREATE INDEX IF NOT EXISTS idx_tickets_is_direct_to_faculty ON tickets(is_direct_to_faculty);

-- ============================================================
-- PART 3: Ticket Escalations Table
-- ============================================================
CREATE TABLE IF NOT EXISTS ticket_escalations (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID              NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    ticket_id        UUID              NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    escalated_by     UUID              NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    escalated_to     UUID              NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    from_role        VARCHAR(50)       NOT NULL,
    to_role          VARCHAR(50)       NOT NULL,
    reason           TEXT              NOT NULL,
    previous_status  ticket_status     NOT NULL,
    created_at       TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_escalations_ticket_id ON ticket_escalations(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_escalations_tenant_id ON ticket_escalations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ticket_escalations_escalated_to ON ticket_escalations(escalated_to);

-- Enable RLS on escalations
ALTER TABLE ticket_escalations ENABLE ROW LEVEL SECURITY;

-- RLS: users can see escalations for their tenant
CREATE POLICY "tenant_isolation_ticket_escalations"
    ON ticket_escalations
    FOR ALL
    USING (
        tenant_id IN (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
    );

-- ============================================================
-- PART 4: Auto-Close Function for Stale pending_info Tickets
-- ============================================================
-- Closes tickets that have been in pending_info status for 7+ days
CREATE OR REPLACE FUNCTION auto_close_stale_tickets()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_closed_count INTEGER := 0;
BEGIN
    WITH stale_tickets AS (
        SELECT id, tenant_id, title
        FROM tickets
        WHERE status = 'pending_info'
          AND updated_at < NOW() - INTERVAL '7 days'
    )
    UPDATE tickets t
    SET status = 'closed',
        closed_at = NOW(),
        updated_at = NOW()
    FROM stale_tickets s
    WHERE t.id = s.id;

    GET DIAGNOSTICS v_closed_count = ROW_COUNT;

    -- Create notifications for closed tickets
    INSERT INTO notifications (tenant_id, recipient_id, notification_type, title, body)
    SELECT
        s.tenant_id,
        t.created_by,
        'ticket_update',
        'إغلاق تلقائي: ' || s.title,
        'تم إغلاق التذكرة تلقائياً لعدم الرد لمدة 7 أيام'
    FROM stale_tickets s
    JOIN tickets t ON t.id = s.id;

    RETURN v_closed_count;
END;
$$;
