import { execSync } from "child_process";

const PROJECT_REF = "leduumxihcngowpaujkr";

let accessToken = "";
try {
  const output = execSync("npx supabase projects api-keys --project-ref " + PROJECT_REF, {
    encoding: "utf-8",
    cwd: process.cwd(),
  });
  console.log("API Keys output:", output);
} catch (e) {
  console.log("Could not get API keys directly");
}

try {
  const tokenOutput = execSync("npx supabase auth token", {
    encoding: "utf-8",
    cwd: process.cwd(),
    timeout: 15000,
  }).trim();
  
  const lines = tokenOutput.split("\n");
  for (const line of lines) {
    if (line.includes("access_token") || (line.trim().length > 50 && !line.includes(" "))) {
      accessToken = line.trim();
      break;
    }
  }
  if (!accessToken) accessToken = lines[lines.length - 1].trim();
} catch {
  try {
    accessToken = execSync("npx supabase --experimental auth token", {
      encoding: "utf-8", 
      cwd: process.cwd(),
      timeout: 15000,
    }).trim().split("\n").pop().trim();
  } catch {
    console.log("Cannot retrieve access token via CLI.");
    console.log("Please enable the hook manually in the Supabase Dashboard:");
    console.log(`https://supabase.com/dashboard/project/${PROJECT_REF}/auth/hooks`);
    process.exit(1);
  }
}

console.log("Attempting to enable custom_access_token_hook via Management API...\n");

const response = await fetch(
  `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`,
  {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      HOOK_CUSTOM_ACCESS_TOKEN_ENABLED: true,
      HOOK_CUSTOM_ACCESS_TOKEN_URI: "pg-functions://postgres/public/custom_access_token_hook",
    }),
  }
);

if (response.ok) {
  console.log("✅ Hook enabled successfully!");
  const data = await response.json();
  console.log("Response:", JSON.stringify(data, null, 2));
} else {
  const text = await response.text();
  console.log(`❌ Failed (${response.status}): ${text}`);
  console.log("\nPlease enable manually:");
  console.log(`https://supabase.com/dashboard/project/${PROJECT_REF}/auth/hooks`);
}
