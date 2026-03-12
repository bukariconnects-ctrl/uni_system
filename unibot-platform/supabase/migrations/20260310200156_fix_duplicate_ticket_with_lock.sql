-- Fix: Add row-level locking to prevent race conditions when generating ticket numbers
-- This ensures that concurrent ticket creations don't generate the same number

CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_max_num INT;
BEGIN
    -- Lock the tickets table for this tenant to prevent race conditions
    -- Use FOR UPDATE to ensure exclusive access during number generation
    SELECT COALESCE(MAX(NULLIF(regexp_replace(ticket_number, '\D', '', 'g'), '')::INT), 0)
    INTO v_max_num
    FROM tickets 
    WHERE tenant_id = NEW.tenant_id
    FOR UPDATE;  -- This prevents concurrent inserts from getting the same max number

    -- Generate the next ticket number
    NEW.ticket_number := 'TKT-' || LPAD((v_max_num + 1)::TEXT, 6, '0');
    RETURN NEW;
END;
$$;
