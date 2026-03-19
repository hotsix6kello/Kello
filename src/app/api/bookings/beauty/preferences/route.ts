import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedRouteAccess, AdminRouteAccessError } from "@/lib/admin/adminRouteAccess.ts";
import { getBeautyNotificationPreferences, updateBeautyNotificationPreferences } from "@/lib/bookings/beautyNotificationPreferences.ts";
import { getMissingSupabaseServerEnvVars } from "@/lib/supabaseServer.ts";

export const runtime = "nodejs";

// Verified connection with UI page: /my/settings/notifications
function jsonFailure(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuthenticatedRouteAccess(request);
    const prefs = await getBeautyNotificationPreferences(userId);
    return NextResponse.json({ ok: true, preferences: prefs });
  } catch (error) {
    if (error instanceof AdminRouteAccessError) {
      return jsonFailure("unauthorized", error.code === "forbidden" ? 403 : 401);
    }
    return jsonFailure("failed to fetch notification preferences", 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await requireAuthenticatedRouteAccess(request);
    const body = await request.json();
    
    // Whitelist allowed updates (client direct DB access 우회 방지 목적)
    const updates = {
      inAppEnabled: body.inAppEnabled,
      emailEnabled: body.emailEnabled,
      bookingUpdatesEnabled: body.bookingUpdatesEnabled,
      changeRequestUpdatesEnabled: body.changeRequestUpdatesEnabled,
      alternativeOfferUpdatesEnabled: body.alternativeOfferUpdatesEnabled,
    };

    const updatedPrefs = await updateBeautyNotificationPreferences(userId, updates);
    return NextResponse.json({ ok: true, preferences: updatedPrefs });
  } catch (error) {
    if (error instanceof AdminRouteAccessError) {
      return jsonFailure("unauthorized", error.code === "forbidden" ? 403 : 401);
    }
    return jsonFailure("failed to update notification preferences", 500);
  }
}
