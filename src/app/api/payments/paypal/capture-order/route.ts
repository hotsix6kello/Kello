import { NextRequest, NextResponse } from "next/server";

import { AdminRouteAccessError, requireAuthenticatedRouteAccess } from "@/lib/admin/adminRouteAccess.ts";
import {
  BEAUTY_BOOKING_TABLE,
  BeautyBookingStorageError,
  BEAUTY_BOOKING_ADMIN_SELECT,
  mapBeautyBookingRowToAdminRecord,
  type BeautyBookingAdminSelectRow,
} from "@/lib/bookings/beautyBookingServer.ts";
import { getSupabaseServerClient, hasSupabaseServerAccess, getMissingSupabaseServerEnvVars } from "@/lib/supabaseServer.ts";
import { getPayPalAccessToken, getPayPalBaseUrl } from "@/lib/paypal/paypalClient.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CaptureOrderResponse =
  | { ok: true; message: string }
  | { ok: false; error: string };

function jsonFailure(error: string, status: number) {
  return NextResponse.json({ ok: false, error } satisfies CaptureOrderResponse, { status });
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuthenticatedRouteAccess(request);

    const body = (await request.json()) as { bookingId?: unknown; orderId?: unknown };
    const bookingId = typeof body.bookingId === "string" ? body.bookingId.trim() : "";
    const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";

    if (!bookingId || !orderId) {
      return jsonFailure("bookingId and orderId are required", 400);
    }

    if (!hasSupabaseServerAccess()) {
      console.error("[paypal-capture-order] env_missing", {
        missingEnvVars: getMissingSupabaseServerEnvVars(),
      });
      return jsonFailure("booking storage is not ready", 500);
    }

    const client = getSupabaseServerClient();
    const { data: row, error: readError } = await client
      .from(BEAUTY_BOOKING_TABLE)
      .select(BEAUTY_BOOKING_ADMIN_SELECT)
      .eq("id", bookingId)
      .maybeSingle();

    if (readError) {
      console.error("[paypal-capture-order] read_failed", { code: readError.code });
      return jsonFailure("booking could not be read", 500);
    }

    if (!row) {
      return jsonFailure("booking not found", 404);
    }

    const booking = mapBeautyBookingRowToAdminRecord(row as unknown as BeautyBookingAdminSelectRow);

    if (booking.customerUserId !== userId) {
      return jsonFailure("access forbidden", 403);
    }

    if (booking.quoteStatus !== "accepted") {
      return jsonFailure("payment is only available for accepted proposals", 400);
    }

    if (booking.paymentStatus === "paid") {
      return jsonFailure("booking is already paid", 400);
    }

    if (booking.quoteCurrency !== "USD") {
      return jsonFailure("only USD payments are supported at this time", 400);
    }

    const accessToken = await getPayPalAccessToken();

    const captureResponse = await fetch(
      `${getPayPalBaseUrl()}/v2/checkout/orders/${orderId}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!captureResponse.ok) {
      const errText = await captureResponse.text();
      console.error("[paypal-capture-order] paypal_capture_failed", {
        status: captureResponse.status,
        body: errText,
      });
      return jsonFailure("PayPal capture failed", 502);
    }

    const captureData = (await captureResponse.json()) as {
      id?: string;
      status?: string;
      purchase_units?: Array<{
        payments?: {
          captures?: Array<{ id?: string; status?: string }>;
        };
      }>;
    };

    if (captureData.status !== "COMPLETED") {
      console.error("[paypal-capture-order] capture_not_completed", {
        status: captureData.status,
      });
      return jsonFailure("PayPal capture did not complete", 502);
    }

    const captureId =
      captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? orderId;

    const now = new Date().toISOString();
    const { error: updateError } = await client
      .from(BEAUTY_BOOKING_TABLE)
      .update({
        payment_status: "paid",
        payment_method: "paypal",
        payment_transaction_id: captureId,
        paypal_order_id: orderId,
        paypal_capture_id: captureId,
        paid_at: now,
        status: "confirmed",
        updated_at: now,
      })
      .eq("id", bookingId)
      .eq("customer_user_id", userId);

    if (updateError) {
      console.error("[paypal-capture-order] db_update_failed", {
        code: updateError.code,
        message: updateError.message,
        bookingId,
        orderId,
        captureId,
      });
      return jsonFailure("payment recorded but booking update failed", 500);
    }

    return NextResponse.json(
      { ok: true, message: "payment completed and booking confirmed" } satisfies CaptureOrderResponse,
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
      return jsonFailure("session is invalid", 401);
    }

    if (error instanceof BeautyBookingStorageError) {
      return jsonFailure("booking storage error", 500);
    }

    console.error("[paypal-capture-order] unexpected_failure", {
      message: error instanceof Error ? error.message : String(error),
    });
    return jsonFailure("capture failed", 500);
  }
}
