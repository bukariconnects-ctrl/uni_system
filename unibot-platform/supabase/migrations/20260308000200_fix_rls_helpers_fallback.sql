CREATE OR REPLACE FUNCTION current_profile_id() RETURNS UUID LANGUAGE SQL STABLE AS $$
    SELECT auth.uid();
$$;

CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID LANGUAGE plpgsql STABLE AS $$
DECLARE
    tid uuid;
    jwt_claims jsonb;
BEGIN
    jwt_claims := current_setting('request.jwt.claims', true)::jsonb;
    tid := NULLIF(jwt_claims ->> 'tenant_id', '')::uuid;
    IF tid IS NOT NULL THEN
        RETURN tid;
    END IF;
    SELECT tenant_id INTO tid FROM public.profiles WHERE id = auth.uid();
    RETURN tid;
END;
$$;

CREATE OR REPLACE FUNCTION current_user_role() RETURNS TEXT LANGUAGE plpgsql STABLE AS $$
DECLARE
    r text;
    jwt_claims jsonb;
BEGIN
    jwt_claims := current_setting('request.jwt.claims', true)::jsonb;
    r := jwt_claims ->> 'user_role';
    IF r IS NOT NULL THEN
        RETURN r;
    END IF;
    SELECT role INTO r FROM public.profiles WHERE id = auth.uid();
    RETURN r;
END;
$$;
