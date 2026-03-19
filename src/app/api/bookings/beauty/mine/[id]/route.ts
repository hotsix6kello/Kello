import { NextRequest, NextResponse } from "next/server";

import { AdminRouteAccessError, requireAuthenticatedRouteAccess } from "@/lib/admin/adminRouteAccess.ts";
import {
  BEAUTY_BOOKING_TABLE,
  BeautyBookingStorageError,
  cancelBeautyBookingRequestAsCustomer,
  requestChangeBeautyBookingAsCustomer,
  respondToAlternativeOffer,
} from "@/lib/bookings/beautyBookingServer.ts";
import { type BeautyBookingAlternativeOfferItem } from "@/lib/bookings/beautyBookingAdmin.ts";
import { getMissingSupabaseServerEnvVars } from "@/lib/supabaseServer.ts";

export const runtime = "nodejs";

type BeautyBookingMinePatchRouteResponse =
  | {
      ok: true;
      item: Awaited<ReturnType<typeof cancelBeautyBookingRequestAsCustomer>>;
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
    } satisfies BeautyBookingMinePatchRouteResponse,
    { status },
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireAuthenticatedRouteAccess(request);
    const { id } = await params;
    const body = (await request.json()) as { 
      action?: string; 
      reason?: unknown;
      response?: "accepted" | "rejected";
      selectedItem?: BeautyBookingAlternativeOfferItem;
    };

    const action = body.action || "cancel";
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    if (!id || !reason) {
      return jsonFailure(`${action} reason is required`, 400);
    }

    let item;
    if (action === "request_change") {
      if (!reason) return jsonFailure("reason is required", 400);
      item = await requestChangeBeautyBookingAsCustomer(id, userId, reason);
    } else if (action === "respond_alternative") {
      if (!body.response) return jsonFailure("response is required", 400);
      item = await respondToAlternativeOffer(id, userId, body.response, body.selectedItem);
    } else {
      if (!reason) return jsonFailure("reason is required", 400);
      item = await cancelBeautyBookingRequestAsCustomer(id, userId, reason);
    }

    return NextResponse.json(
      {
        ok: true,
        item,
      } satisfies BeautyBookingMinePatchRouteResponse,
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof Error && error.name === "SyntaxError") {
      return jsonFailure("request body must be valid JSON", 400);
    }

    if (error instanceof AdminRouteAccessError && error.code === "missing_token") {
      return jsonFailure("login is required", 401);
    }

    if (error instanceof AdminRouteAccessError && error.code === "unauthorized") {
      return jsonFailure("customer session is invalid", 401);
    }

    if (error instanceof AdminRouteAccessError && error.code === "env_missing") {
      console.error("[beauty-booking-mine-patch-route] env_missing", {
        missingEnvVars: getMissingSupabaseServerEnvVars(),
      });
      return jsonFailure("booking storage is not ready", 500);
    }

    if (error instanceof BeautyBookingStorageError && error.code === "forbidden_owner") {
      return jsonFailure("booking access is forbidden", 403);
    }

    if (error instanceof BeautyBookingStorageError && error.code === "not_found") {
      return jsonFailure("booking request was not found", 404);
    }

    if (
      error instanceof BeautyBookingStorageError &&
      (error.code === "transition_not_allowed" || error.code === "invalid_cancel_reason")
    ) {
      return jsonFailure("booking cannot be processed in the current state", 400);
    }

    if (error instanceof BeautyBookingStorageError && error.code === "schema_missing") {
      console.error("[beauty-booking-mine-patch-route] schema_missing", {
        table: BEAUTY_BOOKING_TABLE,
      });
      return jsonFailure("booking storage is not ready", 500);
    }

    if (error instanceof BeautyBookingStorageError) {
      console.error("[beauty-booking-mine-patch-route] update_failed", {
        code: error.code,
      });
      return jsonFailure("booking request could not be processed", 500);
    }

    console.error("[beauty-booking-mine-patch-route] unexpected_failure");
    return jsonFailure("booking request could not be processed", 500);
  }
}
