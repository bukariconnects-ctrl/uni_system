import { createClient, createAdminClient } from "@/lib/supabase/server";
import { computeRiskScores } from "@/lib/risk-computation";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, tenant_id")
      .eq("id", user.id)
      .single();

    if (
      !profile ||
      !["academic_management", "tenant_admin", "super_admin"].includes(
        profile.role,
      )
    ) {
      return NextResponse.json({ error: "صلاحيات غير كافية" }, { status: 403 });
    }

    const body = await request.json();
    const { tenant_id, semester_id } = body;

    if (!tenant_id || !semester_id) {
      return NextResponse.json(
        { error: "tenant_id و semester_id مطلوبان" },
        { status: 400 },
      );
    }

    if (profile.role !== "super_admin" && profile.tenant_id !== tenant_id) {
      return NextResponse.json(
        { error: "لا يمكنك الوصول لبيانات مستأجر آخر" },
        { status: 403 },
      );
    }

    const adminClient = await createAdminClient();
    const result = await computeRiskScores(adminClient, tenant_id, semester_id);

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "خطأ غير متوقع";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
