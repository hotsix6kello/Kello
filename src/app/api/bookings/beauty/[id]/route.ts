import { NextRequest, NextResponse } from "next/server";

import { AdminRouteAccessError, requireAdminRouteAccess } from "@/lib/admin/adminRouteAccess.ts";
import {
  BEAUTY_BOOKING_TABLE,
  BeautyBookingStorageError,
  updateBeautyBookingRequestStatus,
  reviewBeautyBookingChangeRequest,
  updateBeautyBookingOperatorInfo,
  offerAlternativeSchedule,
} from "@/lib/bookings/beautyBookingServer.ts";
import {
  listNotificationsByBooking,
  resendBeautyBookingNotification,
  type BeautyBookingNotificationRecord,
} from "@/lib/bookings/beautyNotificationServer.ts";
import { 
  isBeautyBookingAdminStatus, 
  type BeautyBookingAdminRecord,
  type BeautyBookingOperatorStatus,
  type BeautyBookingAlternativeOfferItem
} from "@/lib/bookings/beautyBookingAdmin.ts";
import { getMissingSupabaseServerEnvVars } from "@/lib/supabaseServer.ts";

export const runtime = "nodejs";

type BeautyBookingPatchRouteResponse =
  | {
      ok: true;
      item: BeautyBookingAdminRecord;
    }
  | {
      ok: false;
      error: string;
    };

function jsonFailure(error: string, status: number) {
  return NextResponse.json(
    {
      ok: false,
      error,
    } satisfies BeautyBookingPatchRouteResponse,
    { status },
  );
}

function handleAdminRouteError(error: unknown) {
  if (error instanceof AdminRouteAccessError && error.code === "missing_token") {
    return jsonFailure("admin session is required", 401);
  }

  if (error instanceof AdminRouteAccessError && error.code === "unauthorized") {
    return jsonFailure("admin session is invalid", 401);
  }

  if (error instanceof AdminRouteAccessError && error.code === "forbidden") {
    return jsonFailure("admin access is required", 403);
  }

  if (error instanceof AdminRouteAccessError && error.code === "env_missing") {
    console.error("[beauty-booking-patch-route] admin_env_missing", {
      missingEnvVars: getMissingSupabaseServerEnvVars(),
    });

    return jsonFailure("booking storage is not ready", 500);
  }

  return null;
}


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminRouteAccess(request);
    const { id } = await params;

    if (!id) {
      return jsonFailure("booking id is required", 400);
    }

    const notifications = await listNotificationsByBooking(id);

    return NextResponse.json({
      ok: true,
      notifications,
    });
  } catch (error) {
    const adminFailure = handleAdminRouteError(error);
    if (adminFailure) return adminFailure;

    return jsonFailure("failed to fetch notification history", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId: adminId } = await requireAdminRouteAccess(request);
    const { id } = await params;
    const body = (await request.json()) as { 
      status?: unknown; 
      action?: "approved" | "rejected" | "update_operator_info" | "offer_alternative" | "resend_notification";
      notificationId?: string;
      note?: string;
      operatorStatus?: BeautyBookingOperatorStatus;
      internalNote?: string;
      shopContacted?: boolean;
      customerContacted?: boolean;
      followUpNeeded?: boolean;
      alternativeItems?: BeautyBookingAlternativeOfferItem[];
    };

    if (!id) {
      return jsonFailure("booking id is required", 400);
    }

    let item: BeautyBookingAdminRecord;
    if (body.action === "approved" || body.action === "rejected") {
      item = await reviewBeautyBookingChangeRequest(id, adminId, body.action, body.note ?? "");
    } else if (body.action === "update_operator_info") {
      item = await updateBeautyBookingOperatorInfo(id, {
        operatorStatus: body.operatorStatus,
        internalNote: body.internalNote,
        shopContacted: body.shopContacted,
        customerContacted: body.customerContacted,
        followUpNeeded: body.followUpNeeded,
      });
    } else if (body.action === "offer_alternative") {
      if (!Array.isArray(body.alternativeItems) || body.alternativeItems.length === 0) {
        return jsonFailure("at least one alternative time slot is required", 400);
      }
      item = await offerAlternativeSchedule(id, adminId, body.alternativeItems, body.note ?? "");
    } else if (body.action === "resend_notification") {
      if (!body.notificationId) {
        return jsonFailure("notificationId is required for resending", 400);
      }
      
      try {
        await resendBeautyBookingNotification(body.notificationId, adminId);
      } catch (resendError: any) {
        if (resendError.message === "resend_limit_exceeded") {
          return jsonFailure("maximum resend limit (3) reached for this notification", 429);
        }
        if (resendError.message === "resend_cooldown_active") {
          return jsonFailure("please wait 5 minutes before resending this notification icon", 429);
        }
        throw resendError;
      }

      // We return the current item state
      const { getSupabaseServerClient } = await import("@/lib/supabaseServer.ts");
      const { mapBeautyBookingRowToAdminRecord, BEAUTY_BOOKING_ADMIN_SELECT } = await import("@/lib/bookings/beautyBookingServer.ts");
      const client = getSupabaseServerClient();
      const { data } = await client.from(BEAUTY_BOOKING_TABLE).select(BEAUTY_BOOKING_ADMIN_SELECT).eq("id", id).single();
      item = mapBeautyBookingRowToAdminRecord(data as any);
    } else {
      if (!isBeautyBookingAdminStatus(body.status)) {
        return jsonFailure("valid booking status is required for status updates", 400);
      }
      item = await updateBeautyBookingRequestStatus(id, body.status);
    }

    return NextResponse.json(
      {
        ok: true,
        item,
      } satisfies BeautyBookingPatchRouteResponse,
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof Error && error.name === "SyntaxError") {
      return jsonFailure("request body must be valid JSON", 400);
    }

    const adminFailure = handleAdminRouteError(error);

    if (adminFailure) {
      return adminFailure;
    }

    if (error instanceof BeautyBookingStorageError && error.code === "not_found") {
      return jsonFailure("booking request was not found", 404);
    }

    if (error instanceof BeautyBookingStorageError && error.code === "transition_not_allowed") {
      return jsonFailure("booking status change is not allowed", 400);
    }

    if (error instanceof BeautyBookingStorageError && error.code === "invalid_status") {
      return jsonFailure("valid booking id and status are required", 400);
    }

    if (error instanceof BeautyBookingStorageError && error.code === "schema_missing") {
      console.error("[beauty-booking-patch-route] schema_missing", {
        table: BEAUTY_BOOKING_TABLE,
      });
      return jsonFailure("booking storage is not ready", 500);
    }

    if (error instanceof BeautyBookingStorageError) {
      console.error("[beauty-booking-patch-route] update_failed", {
        code: error.code,
      });
      return jsonFailure("booking status could not be updated", 500);
    }

    console.error("[beauty-booking-patch-route] unexpected_failure");
    return jsonFailure("booking status could not be updated", 500);
  }
}
