import { NextRequest, NextResponse } from "next/server";

import { AdminRouteAccessError, requireAuthenticatedRouteAccess } from "@/lib/admin/adminRouteAccess.ts";
import { getSupabaseServerClient } from "@/lib/supabaseServer.ts";

export const runtime = "nodejs";

type PartnerStatus = "none" | "pending" | "approved" | "rejected";

function jsonFailure(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuthenticatedRouteAccess(request);
    const client = getSupabaseServerClient();

    const {
      data: { user },
      error: userError,
    } = await client.auth.admin.getUserById(userId);

    if (userError || !user) {
      return jsonFailure("unauthorized", 401);
    }

    const email = typeof user.email === "string" ? user.email.trim() : "";

    if (!email) {
      return NextResponse.json({
        ok: true,
        partnerStatus: "none" satisfies PartnerStatus,
      });
    }

    const { data: partner, error: partnerError } = await client
      .from("partners")
      .select("status")
      .eq("email", email)
      .maybeSingle();

    if (partnerError) {
      throw partnerError;
    }

    return NextResponse.json({
      ok: true,
      partnerStatus: ((partner?.status as PartnerStatus | null) ?? "none") satisfies PartnerStatus,
    });
  } catch (error) {
    if (error instanceof AdminRouteAccessError) {
      return jsonFailure("unauthorized", error.code === "forbidden" ? 403 : 401);
    }

    return jsonFailure("failed_to_fetch_partner_status", 500);
  }
}
