CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    claims jsonb;
    p_role text;
    p_tenant_id uuid;
BEGIN
    claims := event->'claims';

    SELECT p.role, p.tenant_id
    INTO p_role, p_tenant_id
    FROM public.profiles p
    WHERE p.id = (event->>'user_id')::uuid;

    IF p_role IS NOT NULL THEN
        claims := jsonb_set(claims, '{user_role}', to_jsonb(p_role));
        claims := jsonb_set(claims, '{profile_id}', to_jsonb((event->>'user_id')::text));
        IF p_tenant_id IS NOT NULL THEN
            claims := jsonb_set(claims, '{tenant_id}', to_jsonb(p_tenant_id::text));
        END IF;
    END IF;

    event := jsonb_set(event, '{claims}', claims);
    RETURN event;
END;
$$;

GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
GRANT SELECT ON TABLE public.profiles TO supabase_auth_admin;

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
