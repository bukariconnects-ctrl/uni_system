import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Generates a short-lived signed URL for private bucket objects.
// Used by faculty to download student submissions without exposing bucket publicly.
export async function GET(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fileUrl = req.nextUrl.searchParams.get("url");
  if (!fileUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  // Extract bucket name and file path from the stored public URL.
  // Format: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const storageBase = `${supabaseUrl}/storage/v1/object/public/`;

  if (!fileUrl.startsWith(storageBase)) {
    return NextResponse.json({ error: "Invalid file URL" }, { status: 400 });
  }

  const rest = fileUrl.slice(storageBase.length);
  const slashIdx = rest.indexOf("/");
  if (slashIdx === -1) {
    return NextResponse.json({ error: "Cannot parse bucket/path" }, { status: 400 });
  }

  const bucket = rest.slice(0, slashIdx);
  const filePath = rest.slice(slashIdx + 1);

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, 120); // 2 minutes — enough for download

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to create signed URL" },
      { status: 500 }
    );
  }

  return NextResponse.redirect(data.signedUrl);
}
