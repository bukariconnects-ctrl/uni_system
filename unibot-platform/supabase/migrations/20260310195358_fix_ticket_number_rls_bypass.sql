-- Fix: The trigger function must use SECURITY DEFINER to bypass RLS when reading existing tickets
-- Otherwise, students can only see their own tickets, causing duplicate numbers

CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER  -- This allows the function to bypass RLS and see ALL tickets
SET search_path = public
AS $$
DECLARE
    v_max_num INT;
BEGIN
    -- Extract the numeric part and find the maximum ticket number for this tenant
    SELECT COALESCE(MAX(NULLIF(regexp_replace(ticket_number, '\D', '', 'g'), '')::INT), 0)
    INTO v_max_num
    FROM tickets 
    WHERE tenant_id = NEW.tenant_id;

    -- Generate the next ticket number
    NEW.ticket_number := 'TKT-' || LPAD((v_max_num + 1)::TEXT, 6, '0');
    RETURN NEW;
END;
$$;
