import { NextRequest, NextResponse } from "next/server";

import { AdminRouteAccessError, requireAuthenticatedRouteAccess } from "@/lib/admin/adminRouteAccess.ts";
import { BOOKING_FLOW_CATEGORY_IDS, type BookingFlowCategory } from "@/lib/bookings/bookingFlowSkeleton/types.ts";
import { loadPartnerServiceMenu, type PartnerMenuServiceConfig } from "@/lib/bookings/partnerMenu.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PartnerStoreMenuRouteResponse =
  | { ok: true; menu: PartnerMenuServiceConfig | null }
  | { ok: false; error: string };

function isBookingFlowCategory(value: string | null): value is BookingFlowCategory {
  return !!value && (BOOKING_FLOW_CATEGORY_IDS as readonly string[]).includes(value);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> },
) {
  try {
    await requireAuthenticatedRouteAccess(request);
  } catch (error) {
    if (error instanceof AdminRouteAccessError) {
      return NextResponse.json({ ok: false, error: "login_required" } satisfies PartnerStoreMenuRouteResponse, {
        status: 401,
      });
    }
    throw error;
  }

  const { storeId } = await params;
  const category = request.nextUrl.searchParams.get("category");

  if (!storeId) {
    return NextResponse.json({ ok: false, error: "store id is required" } satisfies PartnerStoreMenuRouteResponse, {
      status: 400,
    });
  }

  if (!isBookingFlowCategory(category)) {
    return NextResponse.json({ ok: false, error: "invalid category" } satisfies PartnerStoreMenuRouteResponse, {
      status: 400,
    });
  }

  try {
    const menu = await loadPartnerServiceMenu(storeId, category);
    return NextResponse.json({ ok: true, menu } satisfies PartnerStoreMenuRouteResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[partner-stores/menu] Failed to load partner menu:", message);
    return NextResponse.json(
      { ok: false, error: "failed to load partner menu" } satisfies PartnerStoreMenuRouteResponse,
      { status: 500 },
    );
  }
}
