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

const USERS = [
  { id: "c0000000-0000-0000-0000-000000000001", email: "superadmin@unibot.io" },
  { id: "c0000000-0000-0000-0000-000000000002", email: "admin@ust-taiz.edu.ye" },
  { id: "c0000000-0000-0000-0000-000000000003", email: "khaled.nasser@ust-taiz.edu.ye" },
  { id: "c0000000-0000-0000-0000-000000000004", email: "layla.omar@ust-taiz.edu.ye" },
  { id: "c0000000-0000-0000-0000-000000000005", email: "dr.ahmed@ust-taiz.edu.ye" },
  { id: "c0000000-0000-0000-0000-000000000006", email: "dr.sarah@ust-taiz.edu.ye" },
  { id: "c0000000-0000-0000-0000-000000000011", email: "mohammed.ali@ust-taiz.edu.ye" },
  { id: "c0000000-0000-0000-0000-000000000012", email: "fatima.saleh@ust-taiz.edu.ye" },
  { id: "c0000000-0000-0000-0000-000000000013", email: "omar.hassan@ust-taiz.edu.ye" },
  { id: "c0000000-0000-0000-0000-000000000014", email: "aisha.qasim@ust-taiz.edu.ye" },
  { id: "c0000000-0000-0000-0000-000000000015", email: "yusuf.mahdi@ust-taiz.edu.ye" },
];

console.log("=".repeat(60));
console.log("UniBot — Fix All Seeded Users (password + email confirm)");
console.log("=".repeat(60));

for (const user of USERS) {
  const { data, error } = await admin.auth.admin.updateUserById(user.id, {
    password: "123456",
    email_confirm: true,
  });
  if (error) {
    console.log(`❌ ${user.email}: ${error.message}`);
  } else {
    console.log(`✅ ${data.user.email} — password set, email confirmed`);
  }
}

console.log("\n✅ Done. All users can now sign in with password: 123456");
console.log("=".repeat(60));
