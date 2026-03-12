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

const PROJECT_REF = "leduumxihcngowpaujkr";

async function getAccessToken() {
  const { execSync } = await import("child_process");
  try {
    const token = execSync("npx supabase --experimental login --token-stdout 2>nul", {
      encoding: "utf-8",
      timeout: 10000,
    }).trim();
    return token;
  } catch {
    return null;
  }
}

console.log("=".repeat(60));
console.log("Enabling custom_access_token_hook on Supabase Dashboard");
console.log("=".repeat(60));
console.log("");
console.log("The hook function has been deployed to your database.");
console.log("You need to enable it in the Supabase Dashboard:");
console.log("");
console.log(`1. Go to: https://supabase.com/dashboard/project/${PROJECT_REF}/auth/hooks`);
console.log("2. Find 'Custom access token' hook");
console.log("3. Click 'Enable Hook'");
console.log("4. Set:");
console.log("   - Hook Type: PostgreSQL Function");
console.log("   - Schema: public");
console.log("   - Function: custom_access_token_hook");
console.log("5. Click 'Create Hook' / 'Save'");
console.log("");
console.log("After enabling, sign out and sign back in for the new JWT claims to take effect.");
console.log("=".repeat(60));
