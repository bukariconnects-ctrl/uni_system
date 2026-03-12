import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(resolve(__dirname, "../.env.local"), "utf-8");

let SUPABASE_URL = "";
let SERVICE_KEY = "";
for (const line of env.split("\n")) {
  const [key, ...val] = line.split("=");
  const value = val.join("=").trim();
  if (key?.trim() === "NEXT_PUBLIC_SUPABASE_URL") SUPABASE_URL = value;
  if (key?.trim() === "SUPABASE_SERVICE_ROLE_KEY") SERVICE_KEY = value;
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

const BUCKETS = [
  { id: "course-materials", name: "Course Materials", public: true, fileSizeLimit: 52428800 },
  { id: "submissions", name: "Student Submissions", public: false, fileSizeLimit: 52428800 },
  { id: "avatars", name: "Profile Avatars", public: true, fileSizeLimit: 5242880 },
];

for (const bucket of BUCKETS) {
  const { data, error } = await admin.storage.createBucket(bucket.id, {
    public: bucket.public,
    fileSizeLimit: bucket.fileSizeLimit,
    allowedMimeTypes: bucket.id === "avatars"
      ? ["image/jpeg", "image/png", "image/webp", "image/gif"]
      : undefined,
  });

  if (error) {
    if (error.message?.includes("already exists")) {
      console.log(`⚠️  ${bucket.id}: already exists`);
    } else {
      console.log(`❌ ${bucket.id}: ${error.message}`);
    }
  } else {
    console.log(`✅ ${bucket.id}: created`);
  }
}

console.log("\nSetting up storage RLS policies...");

const policies = [
  {
    bucket: "course-materials",
    sql: `
      CREATE POLICY IF NOT EXISTS "faculty_upload_materials" ON storage.objects FOR INSERT
        WITH CHECK (bucket_id = 'course-materials' AND auth.role() = 'authenticated');
      CREATE POLICY IF NOT EXISTS "public_read_materials" ON storage.objects FOR SELECT
        USING (bucket_id = 'course-materials');
      CREATE POLICY IF NOT EXISTS "faculty_delete_materials" ON storage.objects FOR DELETE
        USING (bucket_id = 'course-materials' AND auth.role() = 'authenticated');
    `
  },
  {
    bucket: "submissions",
    sql: `
      CREATE POLICY IF NOT EXISTS "student_upload_submissions" ON storage.objects FOR INSERT
        WITH CHECK (bucket_id = 'submissions' AND auth.role() = 'authenticated');
      CREATE POLICY IF NOT EXISTS "auth_read_submissions" ON storage.objects FOR SELECT
        USING (bucket_id = 'submissions' AND auth.role() = 'authenticated');
      CREATE POLICY IF NOT EXISTS "auth_delete_submissions" ON storage.objects FOR DELETE
        USING (bucket_id = 'submissions' AND auth.role() = 'authenticated');
    `
  },
  {
    bucket: "avatars",
    sql: `
      CREATE POLICY IF NOT EXISTS "user_upload_avatar" ON storage.objects FOR INSERT
        WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
      CREATE POLICY IF NOT EXISTS "public_read_avatars" ON storage.objects FOR SELECT
        USING (bucket_id = 'avatars');
      CREATE POLICY IF NOT EXISTS "user_update_avatar" ON storage.objects FOR UPDATE
        USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
      CREATE POLICY IF NOT EXISTS "user_delete_avatar" ON storage.objects FOR DELETE
        USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
    `
  }
];

for (const p of policies) {
  const { error } = await admin.rpc("exec_sql", { sql: p.sql }).catch(() => ({ error: null }));
  if (error) {
    console.log(`⚠️  ${p.bucket} policies: manual setup may be needed`);
  } else {
    console.log(`✅ ${p.bucket} policies: applied`);
  }
}

console.log("\nDone!");
