import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(resolve(__dirname, "../.env.local"), "utf-8");

let SUPABASE_URL = "";
let ANON_KEY = "";
for (const line of env.split("\n")) {
  const [key, ...val] = line.split("=");
  const value = val.join("=").trim();
  if (key?.trim() === "NEXT_PUBLIC_SUPABASE_URL") SUPABASE_URL = value;
  if (key?.trim() === "NEXT_PUBLIC_SUPABASE_ANON_KEY") ANON_KEY = value;
}

const c = createClient(SUPABASE_URL, ANON_KEY);
await c.auth.signInWithPassword({ email: "mohammed.ali@ust-taiz.edu.ye", password: "123456" });
const { data: u } = await c.auth.getUser();
const studentId = u.user.id;
console.log("Student id:", studentId);

const { data, error } = await c
  .from("conversations")
  .select("id, participant_a, participant_b, participant_a_profile:profiles!conversations_participant_a_fkey(id, first_name, last_name, role), participant_b_profile:profiles!conversations_participant_b_fkey(id, first_name, last_name, role)")
  .or(`participant_a.eq.${studentId},participant_b.eq.${studentId}`);

console.log("Error:", error);
console.log("Conv:", JSON.stringify(data, null, 2));

if (data && data.length > 0) {
  const conv = data[0];
  const other = conv.participant_a === studentId ? conv.participant_b_profile : conv.participant_a_profile;
  console.log("\nParticipant A:", conv.participant_a);
  console.log("Participant B:", conv.participant_b);
  console.log("Student ID matches participant_a?", conv.participant_a === studentId);
  console.log("Other user:", other);
}
