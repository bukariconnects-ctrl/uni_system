import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");

let SUPABASE_URL = "";
let SUPABASE_SERVICE_ROLE_KEY = "";

try {
  const env = readFileSync(envPath, "utf-8");
  for (const line of env.split("\n")) {
    const [key, ...val] = line.split("=");
    const value = val.join("=").trim();
    if (key?.trim() === "NEXT_PUBLIC_SUPABASE_URL") SUPABASE_URL = value;
    if (key?.trim() === "SUPABASE_SERVICE_ROLE_KEY") SUPABASE_SERVICE_ROLE_KEY = value;
  }
} catch {
  console.error("❌ Could not read .env.local — set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY as env vars instead");
  process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const anonKeyMatch = readFileSync(envPath, "utf-8").match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);
const SUPABASE_ANON_KEY = anonKeyMatch?.[1]?.trim() ?? "";
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TEST_EMAIL = "admin@ust-taiz.edu.ye";
const TEST_PASSWORD = "123456";

console.log("=".repeat(60));
console.log("UniBot Auth Diagnostics");
console.log("=".repeat(60));
console.log(`\n🔗 Supabase URL: ${SUPABASE_URL}\n`);

async function checkUserInAuthUsers() {
  console.log("── 1. Checking auth.users via admin API ──");
  const { data, error } = await adminClient.auth.admin.listUsers();
  if (error) {
    console.error("  ❌ admin.listUsers error:", error.message);
    return null;
  }
  const user = data.users.find((u) => u.email === TEST_EMAIL);
  if (!user) {
    console.log(`  ❌ User '${TEST_EMAIL}' NOT FOUND in auth.users`);
    return null;
  }
  console.log(`  ✅ Found user: ${user.email}`);
  console.log(`     id:                  ${user.id}`);
  console.log(`     email_confirmed_at:  ${user.email_confirmed_at ?? "NULL ← problem!"}`);
  console.log(`     created_at:          ${user.created_at}`);
  console.log(`     identities count:    ${user.identities?.length ?? 0}`);
  if (user.identities?.length) {
    for (const id of user.identities) {
      console.log(`     identity provider:   ${id.provider}`);
      console.log(`     identity_data:       ${JSON.stringify(id.identity_data)}`);
      const emailVerified = id.identity_data?.email_verified;
      if (!emailVerified) {
        console.log(`     ❌ identity_data.email_verified is MISSING/FALSE ← sign-in will fail`);
      } else {
        console.log(`     ✅ email_verified: ${emailVerified}`);
      }
    }
  } else {
    console.log(`     ❌ No identities found ← sign-in will fail`);
  }
  return user;
}

async function trySignIn() {
  console.log(`\n── 2. Attempting signInWithPassword ──`);
  const { data, error } = await anonClient.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  if (error) {
    console.log(`  ❌ Sign-in FAILED: ${error.message} (status: ${error.status})`);
    return false;
  }
  console.log(`  ✅ Sign-in SUCCESS! session user: ${data.user?.email}`);
  return true;
}

async function resetPasswordViaAdmin() {
  console.log(`\n── 3. Resetting password via admin API (updateUserById) ──`);
  const { data: listData } = await adminClient.auth.admin.listUsers();
  const user = listData?.users.find((u) => u.email === TEST_EMAIL);
  if (!user) {
    console.log("  ❌ User not found, skipping password reset");
    return;
  }
  const { data, error } = await adminClient.auth.admin.updateUserById(user.id, {
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (error) {
    console.error("  ❌ updateUserById error:", error.message);
  } else {
    console.log(`  ✅ Password reset and email confirmed for: ${data.user.email}`);
  }
}

async function retrySignIn() {
  console.log(`\n── 4. Retrying signInWithPassword after fix ──`);
  const { data, error } = await anonClient.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  if (error) {
    console.log(`  ❌ Still failing: ${error.message}`);
  } else {
    console.log(`  ✅ SUCCESS after fix! user: ${data.user?.email}`);
  }
}

const user = await checkUserInAuthUsers();
const signedIn = await trySignIn();

if (!signedIn) {
  await resetPasswordViaAdmin();
  await retrySignIn();
}

console.log("\n" + "=".repeat(60));
