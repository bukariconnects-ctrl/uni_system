import { requireRole } from "@/lib/auth/get-user";
import { NextRequest, NextResponse } from "next/server";
import { performIngest } from "@/lib/ai/ingest-service";

/**
 * POST /api/ai/ingest
 *
 * Triggers the embedding pipeline for a single knowledge document.
 * Auth is enforced here via `requireRole`; the actual ingest logic lives in
 * `@/lib/ai/ingest-service` so it can also be called directly from Server
 * Actions without an HTTP round-trip.
 */
export async function POST(request: NextRequest) {
  try {
    const { profile } = await requireRole([
      "tenant_admin",
      "faculty",
      "super_admin",
    ]);

    const body = await request.json();
    const { document_id } = body;

    if (!document_id) {
      return NextResponse.json(
        { error: "document_id مطلوب" },
        { status: 400 }
      );
    }

    const result = await performIngest(document_id, profile);

    return NextResponse.json({
      success: true,
      total_chunks: result.total_chunks,
      tokens_used: result.tokens_used,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "خطأ غير متوقع";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
