import { NextRequest, NextResponse } from "next/server";

import { requireAdminRouteAccess, AdminRouteAccessError } from "@/lib/admin/adminRouteAccess.ts";
import {
  BEAUTY_BOOKING_TABLE,
  BeautyBookingStorageError,
  BEAUTY_BOOKING_ADMIN_SELECT,
  mapBeautyBookingRowToAdminRecord,
  type BeautyBookingAdminSelectRow,
} from "@/lib/bookings/beautyBookingServer.ts";
import { getSupabaseServerClient, hasSupabaseServerAccess, getMissingSupabaseServerEnvVars } from "@/lib/supabaseServer.ts";
import { getPayPalAccessToken, getPayPalBaseUrl } from "@/lib/paypal/paypalClient.ts";
import { calculateRefund, PLATFORM_FEE_RATE } from "@/constants/refundPolicy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RefundResponse =
  | { ok: true; refundId: string; totalRefund: number; currency: string }
  | { ok: false; error: string };

function jsonFailure(error: string, status: number) {
  return NextResponse.json({ ok: false, error } satisfies RefundResponse, { status });
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminRouteAccess(request);

    const body = (await request.json()) as { bookingId?: unknown };
    const bookingId = typeof body.bookingId === "string" ? body.bookingId.trim() : "";

    if (!bookingId) {
      return jsonFailure("bookingId is required", 400);
    }

    if (!hasSupabaseServerAccess()) {
      console.error("[paypal-refund] env_missing", {
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
      console.error("[paypal-refund] read_failed", { code: readError.code });
      return jsonFailure("booking could not be read", 500);
    }

    if (!row) {
      return jsonFailure("booking not found", 404);
    }

    const booking = mapBeautyBookingRowToAdminRecord(row as unknown as BeautyBookingAdminSelectRow);

    if (booking.paymentStatus !== "paid") {
      return jsonFailure("booking is not in paid status", 400);
    }

    if (!booking.paypalCaptureId) {
      return jsonFailure("PayPal capture ID is missing", 400);
    }

    if (!booking.quoteTotalPrice || booking.quoteTotalPrice <= 0) {
      return jsonFailure("payment amount is not available", 400);
    }

    if (booking.quoteCurrency !== "USD") {
      return jsonFailure("only USD refunds are supported", 400);
    }

    // Calculate refund amount based on policy
    const platformFee = Math.round(booking.quoteTotalPrice * PLATFORM_FEE_RATE * 100) / 100;
    const serviceFee = booking.quoteTotalPrice - platformFee;
    const appointmentDate = new Date(`${booking.bookingDate}T00:00:00+09:00`);
    const now = new Date();

    const refundCalc = calculateRefund({
      appointmentDate,
      cancelDate: now,
      serviceFee,
      platformFee,
    });

    if (!refundCalc.isRefundable || refundCalc.totalRefund <= 0) {
      return jsonFailure("refund is not available based on the cancellation policy", 400);
    }

    const refundAmount = refundCalc.totalRefund.toFixed(2);

    // Call PayPal Refund API
    const accessToken = await getPayPalAccessToken();
    const refundResponse = await fetch(
      `${getPayPalBaseUrl()}/v2/payments/captures/${booking.paypalCaptureId}/refund`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "PayPal-Request-Id": `kello-refund-${bookingId}-${Date.now()}`,
        },
        body: JSON.stringify({
          amount: {
            value: refundAmount,
            currency_code: "USD",
          },
          note_to_payer: "Kello booking cancellation refund",
        }),
      },
    );

    if (!refundResponse.ok) {
      const errText = await refundResponse.text();
      console.error("[paypal-refund] paypal_refund_failed", {
        status: refundResponse.status,
        body: errText,
        bookingId,
      });
      return jsonFailure("PayPal refund request failed", 502);
    }

    const refundData = (await refundResponse.json()) as {
      id?: string;
      status?: string;
    };

    if (refundData.status !== "COMPLETED" && refundData.status !== "PENDING") {
      console.error("[paypal-refund] unexpected_status", { status: refundData.status, bookingId });
      return jsonFailure("PayPal refund returned unexpected status", 502);
    }

    const refundId = refundData.id ?? "";
    const nowIso = new Date().toISOString();

    const { error: updateError } = await client
      .from(BEAUTY_BOOKING_TABLE)
      .update({
        payment_status: "refunded",
        status: "canceled",
        payment_transaction_id: refundId || booking.paymentTransactionId,
        updated_at: nowIso,
      })
      .eq("id", bookingId);

    if (updateError) {
      console.error("[paypal-refund] db_update_failed", {
        code: updateError.code,
        message: updateError.message,
        bookingId,
        refundId,
      });
      return jsonFailure("refund issued but booking update failed", 500);
    }

    return NextResponse.json(
      {
        ok: true,
        refundId,
        totalRefund: refundCalc.totalRefund,
        currency: "USD",
      } satisfies RefundResponse,
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof Error && error.name === "SyntaxError") {
      return jsonFailure("request body must be valid JSON", 400);
    }

    if (error instanceof AdminRouteAccessError) {
      const status = error.code === "forbidden" ? 403 : 401;
      return jsonFailure("admin access required", status);
    }

    if (error instanceof BeautyBookingStorageError) {
      return jsonFailure("booking storage error", 500);
    }

    console.error("[paypal-refund] unexpected_failure", {
      message: error instanceof Error ? error.message : String(error),
    });
    return jsonFailure("refund failed", 500);
  }
}
