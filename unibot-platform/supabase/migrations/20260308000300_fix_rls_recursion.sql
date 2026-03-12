CREATE OR REPLACE FUNCTION private_get_profile_claims(uid uuid)
RETURNS TABLE(user_role text, user_tenant_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role::text, tenant_id FROM profiles WHERE id = uid;
$$;

REVOKE EXECUTE ON FUNCTION private_get_profile_claims FROM public, anon;
GRANT EXECUTE ON FUNCTION private_get_profile_claims TO authenticated;

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
    SELECT user_tenant_id INTO tid FROM private_get_profile_claims(auth.uid());
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
    SELECT user_role INTO r FROM private_get_profile_claims(auth.uid());
    RETURN r;
END;
$$;
