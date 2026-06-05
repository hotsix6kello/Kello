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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CreateOrderResponse =
  | { ok: true; orderId: string }
  | { ok: false; error: string };

function jsonFailure(error: string, status: number) {
  return NextResponse.json({ ok: false, error } satisfies CreateOrderResponse, { status });
}

function getPayPalBaseUrl(): string {
  return process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials are not configured");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error("Failed to obtain PayPal access token");
  }

  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("PayPal access token missing in response");
  }

  return data.access_token;
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuthenticatedRouteAccess(request);

    const body = (await request.json()) as { bookingId?: unknown };
    const bookingId = typeof body.bookingId === "string" ? body.bookingId.trim() : "";

    if (!bookingId) {
      return jsonFailure("bookingId is required", 400);
    }

    if (!hasSupabaseServerAccess()) {
      console.error("[paypal-create-order] env_missing", {
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
      console.error("[paypal-create-order] read_failed", { code: readError.code });
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

    if (booking.quoteTotalPrice === null || booking.quoteTotalPrice <= 0) {
      return jsonFailure("proposal price is not available", 400);
    }

    if (booking.quoteCurrency !== "KRW") {
      return jsonFailure("only KRW payments are supported at this time", 400);
    }

    const accessToken = await getPayPalAccessToken();

    const orderPayload = {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: booking.id,
          amount: {
            currency_code: "KRW",
            value: String(booking.quoteTotalPrice),
          },
          description: booking.quoteServiceName ?? booking.primaryServiceName ?? "Beauty Service",
        },
      ],
    };

    const orderResponse = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": `kello-${booking.id}-${Date.now()}`,
      },
      body: JSON.stringify(orderPayload),
    });

    if (!orderResponse.ok) {
      const errText = await orderResponse.text();
      console.error("[paypal-create-order] paypal_order_failed", {
        status: orderResponse.status,
        body: errText,
      });
      return jsonFailure("PayPal order creation failed", 502);
    }

    const orderData = (await orderResponse.json()) as { id?: string };
    const paypalOrderId = orderData.id;

    if (!paypalOrderId) {
      return jsonFailure("PayPal order id missing in response", 502);
    }

    const now = new Date().toISOString();
    const { error: updateError } = await client
      .from(BEAUTY_BOOKING_TABLE)
      .update({
        paypal_order_id: paypalOrderId,
        payment_status: "pending",
        updated_at: now,
      })
      .eq("id", bookingId)
      .eq("customer_user_id", userId);

    if (updateError) {
      console.error("[paypal-create-order] db_update_failed", { code: updateError.code });
    }

    return NextResponse.json({ ok: true, orderId: paypalOrderId } satisfies CreateOrderResponse, {
      status: 200,
    });
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

    console.error("[paypal-create-order] unexpected_failure", {
      message: error instanceof Error ? error.message : String(error),
    });
    return jsonFailure("order creation failed", 500);
  }
}
