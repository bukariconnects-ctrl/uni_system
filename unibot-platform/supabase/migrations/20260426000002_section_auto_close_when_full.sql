-- Section auto-close when full, auto-reopen when a slot frees up
-- The operational doc specifies: "إذا وصل العداد إلى max_capacity، تُغلق الشعبة تلقائياً"
-- Previously sync_section_enrolled_count() only updated the counter without changing status.

CREATE OR REPLACE FUNCTION sync_section_enrolled_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_section_id   UUID;
    v_new_count    INT;
    v_max_capacity INT;
    v_status       TEXT;
BEGIN
    -- Determine which section is affected
    IF TG_OP = 'DELETE' THEN
        v_section_id := OLD.section_id;
    ELSE
        v_section_id := NEW.section_id;
    END IF;

    -- Update enrolled_count and read back current capacity + status
    IF TG_OP = 'INSERT' AND NEW.status = 'enrolled' THEN
        UPDATE sections
        SET enrolled_count = enrolled_count + 1
        WHERE id = v_section_id
        RETURNING enrolled_count, max_capacity, status
        INTO v_new_count, v_max_capacity, v_status;

    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status = 'enrolled' AND NEW.status <> 'enrolled' THEN
            UPDATE sections
            SET enrolled_count = GREATEST(enrolled_count - 1, 0)
            WHERE id = v_section_id
            RETURNING enrolled_count, max_capacity, status
            INTO v_new_count, v_max_capacity, v_status;
        ELSIF OLD.status <> 'enrolled' AND NEW.status = 'enrolled' THEN
            UPDATE sections
            SET enrolled_count = enrolled_count + 1
            WHERE id = v_section_id
            RETURNING enrolled_count, max_capacity, status
            INTO v_new_count, v_max_capacity, v_status;
        ELSE
            RETURN COALESCE(NEW, OLD);
        END IF;

    ELSIF TG_OP = 'DELETE' AND OLD.status = 'enrolled' THEN
        UPDATE sections
        SET enrolled_count = GREATEST(enrolled_count - 1, 0)
        WHERE id = v_section_id
        RETURNING enrolled_count, max_capacity, status
        INTO v_new_count, v_max_capacity, v_status;
    ELSE
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Auto-close when section reaches capacity
    IF v_new_count >= v_max_capacity AND v_status = 'open' THEN
        UPDATE sections SET status = 'closed' WHERE id = v_section_id;
    END IF;

    -- Auto-reopen when a spot frees up (only if section was closed due to capacity)
    IF v_new_count < v_max_capacity AND v_status = 'closed' THEN
        UPDATE sections SET status = 'open' WHERE id = v_section_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;
