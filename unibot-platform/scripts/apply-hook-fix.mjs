import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(resolve(__dirname, "../.env.local"), "utf-8");

let SUPABASE_URL = "";
let SUPABASE_SERVICE_ROLE_KEY = "";
for (const line of env.split("\n")) {
  const [key, ...val] = line.split("=");
  const value = val.join("=").trim();
  if (key?.trim() === "NEXT_PUBLIC_SUPABASE_URL") SUPABASE_URL = value;
  if (key?.trim() === "SUPABASE_SERVICE_ROLE_KEY") SUPABASE_SERVICE_ROLE_KEY = value;
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log("=".repeat(60));
console.log("Applying custom_access_token_hook fix to remote DB");
console.log("=".repeat(60));

const sql = `
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

CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID LANGUAGE SQL STABLE AS $$
    SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id', '')::UUID;
$$;

CREATE OR REPLACE FUNCTION current_user_role() RETURNS TEXT LANGUAGE SQL STABLE AS $$
    SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'user_role';
$$;

CREATE OR REPLACE FUNCTION current_profile_id() RETURNS UUID LANGUAGE SQL STABLE AS $$
    SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'profile_id', '')::UUID;
$$;
`;

const { data, error } = await admin.rpc("exec_sql", { sql_query: sql }).maybeSingle();

if (error) {
  console.log("rpc exec_sql not available, using raw REST approach...");
  
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_SERVICE_ROLE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ sql_query: sql }),
  });
  
  if (!response.ok) {
    console.log("Direct RPC not available. Will use supabase db push instead.");
    console.log("Please run: npx supabase db push --linked");
  }
} else {
  console.log("✅ Hook function and RLS helpers updated successfully");
}
