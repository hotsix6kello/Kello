import { NextRequest, NextResponse } from "next/server";
import { AdminRouteAccessError, requireAuthenticatedRouteAccess } from "@/lib/admin/adminRouteAccess.ts";
import { 
  listUserBeautyNotifications, 
  markNotificationAsRead 
} from "@/lib/bookings/beautyNotificationServer.ts";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuthenticatedRouteAccess(request);
    const notifications = await listUserBeautyNotifications(userId);

    return NextResponse.json({
      ok: true,
      items: notifications
    });
  } catch (error) {
    if (error instanceof AdminRouteAccessError) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    console.error("[beauty-notifications-api] GET failed", error);
    return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await requireAuthenticatedRouteAccess(request);
    const body = await request.json();
    const { notificationId } = body;

    if (!notificationId) {
      return NextResponse.json({ ok: false, error: "Notification ID is required" }, { status: 400 });
    }

    await markNotificationAsRead(notificationId, userId);

    return NextResponse.json({
      ok: true
    });
  } catch (error) {
    if (error instanceof AdminRouteAccessError) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    console.error("[beauty-notifications-api] PATCH failed", error);
    return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
  }
}
