CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_max_num INT;
BEGIN
    SELECT COALESCE(MAX(NULLIF(regexp_replace(ticket_number, '\D', '', 'g'), '')::INT), 0)
    INTO v_max_num
    FROM tickets 
    WHERE tenant_id = NEW.tenant_id;

    NEW.ticket_number := 'TKT-' || LPAD((v_max_num + 1)::TEXT, 6, '0');
    RETURN NEW;
END;
$$;
