import { NextRequest, NextResponse } from "next/server";

import { AdminRouteAccessError, requireAuthenticatedRouteAccess } from "@/lib/admin/adminRouteAccess.ts";
import { getSupabaseServerClient } from "@/lib/supabaseServer.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PartnerStoreSlotsRouteResponse =
  | { ok: true; slots: string[] }
  | { ok: false; error: string };

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> },
) {
  try {
    await requireAuthenticatedRouteAccess(request);
  } catch (error) {
    if (error instanceof AdminRouteAccessError) {
      return NextResponse.json({ ok: false, error: "login_required" } satisfies PartnerStoreSlotsRouteResponse, {
        status: 401,
      });
    }
    throw error;
  }

  const { storeId } = await params;
  const date = request.nextUrl.searchParams.get("date");
  const durationMinParam = request.nextUrl.searchParams.get("duration_min");
  const durationMin = durationMinParam ? Number(durationMinParam) : NaN;

  if (!storeId) {
    return NextResponse.json({ ok: false, error: "store id is required" } satisfies PartnerStoreSlotsRouteResponse, {
      status: 400,
    });
  }

  if (!date || !DATE_PATTERN.test(date)) {
    return NextResponse.json({ ok: false, error: "invalid date" } satisfies PartnerStoreSlotsRouteResponse, {
      status: 400,
    });
  }

  if (!Number.isFinite(durationMin) || durationMin <= 0) {
    return NextResponse.json({ ok: false, error: "invalid duration_min" } satisfies PartnerStoreSlotsRouteResponse, {
      status: 400,
    });
  }

  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.rpc("get_partner_available_slots", {
      p_store_id: storeId,
      p_date: date,
      p_duration_min: durationMin,
    });

    if (error) {
      console.error("[partner-stores/slots] RPC failed:", error.message);
      return NextResponse.json(
        { ok: false, error: "failed to load available slots" } satisfies PartnerStoreSlotsRouteResponse,
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, slots: Array.isArray(data) ? (data as string[]) : [] } satisfies PartnerStoreSlotsRouteResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[partner-stores/slots] Unexpected error:", message);
    return NextResponse.json(
      { ok: false, error: "failed to load available slots" } satisfies PartnerStoreSlotsRouteResponse,
      { status: 500 },
    );
  }
}
