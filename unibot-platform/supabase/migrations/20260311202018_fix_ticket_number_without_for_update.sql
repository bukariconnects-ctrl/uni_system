-- Fix: FOR UPDATE cannot be used with aggregate functions like MAX()
-- Solution: Use a PostgreSQL sequence per tenant for guaranteed unique ticket numbers

-- Create a sequence table to track the next ticket number for each tenant
CREATE TABLE IF NOT EXISTS ticket_number_sequences (
    tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    next_number INT NOT NULL DEFAULT 1
);

-- Grant permissions
ALTER TABLE ticket_number_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_ticket_sequences"
    ON ticket_number_sequences FOR ALL
    USING (tenant_id = current_tenant_id() AND current_user_role() IN ('tenant_admin', 'academic_management', 'super_admin'));

-- New function to generate ticket numbers using atomic increment
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_next_num INT;
BEGIN
    -- Insert or update the sequence for this tenant atomically
    INSERT INTO ticket_number_sequences (tenant_id, next_number)
    VALUES (NEW.tenant_id, 2)
    ON CONFLICT (tenant_id) 
    DO UPDATE SET next_number = ticket_number_sequences.next_number + 1
    RETURNING next_number - 1 INTO v_next_num;

    -- Generate the ticket number
    NEW.ticket_number := 'TKT-' || LPAD(v_next_num::TEXT, 6, '0');
    RETURN NEW;
END;
$$;

-- Initialize sequences for existing tenants based on their current max ticket number
INSERT INTO ticket_number_sequences (tenant_id, next_number)
SELECT 
    tenant_id,
    COALESCE(MAX(NULLIF(regexp_replace(ticket_number, '\D', '', 'g'), '')::INT), 0) + 1
FROM tickets
GROUP BY tenant_id
ON CONFLICT (tenant_id) DO NOTHING;
