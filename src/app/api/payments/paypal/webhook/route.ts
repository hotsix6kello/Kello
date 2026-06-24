import { NextRequest, NextResponse } from "next/server";

import {
  BEAUTY_BOOKING_TABLE,
} from "@/lib/bookings/beautyBookingServer.ts";
import { getSupabaseServerClient, hasSupabaseServerAccess } from "@/lib/supabaseServer.ts";
import { getPayPalAccessToken, getPayPalBaseUrl } from "@/lib/paypal/paypalClient.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PayPalWebhookEvent = {
  id: string;
  event_type: string;
  resource_type?: string;
  resource?: {
    id?: string;
    status?: string;
    supplementary_data?: {
      related_ids?: {
        order_id?: string;
      };
    };
    purchase_units?: Array<{
      reference_id?: string;
      payments?: {
        captures?: Array<{ id?: string; status?: string }>;
      };
    }>;
  };
};

async function verifyPayPalWebhookSignature(
  request: NextRequest,
  rawBody: string,
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    console.error("[paypal-webhook] PAYPAL_WEBHOOK_ID not configured");
    return false;
  }

  const transmissionId = request.headers.get("paypal-transmission-id");
  const transmissionTime = request.headers.get("paypal-transmission-time");
  const certUrl = request.headers.get("paypal-cert-url");
  const authAlgo = request.headers.get("paypal-auth-algo");
  const transmissionSig = request.headers.get("paypal-transmission-sig");

  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
    console.error("[paypal-webhook] missing verification headers");
    return false;
  }

  try {
    const accessToken = await getPayPalAccessToken();
    const verifyResponse = await fetch(
      `${getPayPalBaseUrl()}/v1/notifications/verify-webhook-signature`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          auth_algo: authAlgo,
          cert_url: certUrl,
          transmission_id: transmissionId,
          transmission_sig: transmissionSig,
          transmission_time: transmissionTime,
          webhook_id: webhookId,
          webhook_event: JSON.parse(rawBody),
        }),
      },
    );

    if (!verifyResponse.ok) {
      console.error("[paypal-webhook] verification request failed", { status: verifyResponse.status });
      return false;
    }

    const result = (await verifyResponse.json()) as { verification_status?: string };
    return result.verification_status === "SUCCESS";
  } catch (err) {
    console.error("[paypal-webhook] verification error", err);
    return false;
  }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  const isValid = await verifyPayPalWebhookSignature(request, rawBody);
  if (!isValid) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let event: PayPalWebhookEvent;
  try {
    event = JSON.parse(rawBody) as PayPalWebhookEvent;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  if (!hasSupabaseServerAccess()) {
    console.error("[paypal-webhook] supabase not ready");
    return NextResponse.json({ error: "storage unavailable" }, { status: 503 });
  }

  const client = getSupabaseServerClient();
  const now = new Date().toISOString();

  try {
    switch (event.event_type) {
      case "PAYMENT.CAPTURE.COMPLETED": {
        const captureId = event.resource?.id;
        const orderId = event.resource?.supplementary_data?.related_ids?.order_id;

        if (!captureId && !orderId) {
          console.error("[paypal-webhook] CAPTURE.COMPLETED missing ids", { event });
          break;
        }

        // Find booking by paypal_order_id or paypal_capture_id
        const query = client
          .from(BEAUTY_BOOKING_TABLE)
          .select("id, payment_status")
          .neq("payment_status", "paid");

        const { data: rows } = orderId
          ? await query.eq("paypal_order_id", orderId)
          : await query.eq("paypal_capture_id", captureId);

        if (!rows || rows.length === 0) {
          // Already paid or not found — idempotent, treat as success
          break;
        }

        await client
          .from(BEAUTY_BOOKING_TABLE)
          .update({
            payment_status: "paid",
            payment_method: "paypal",
            payment_transaction_id: captureId ?? orderId,
            paypal_capture_id: captureId ?? null,
            paid_at: now,
            status: "confirmed",
            updated_at: now,
          })
          .eq("id", rows[0].id);

        break;
      }

      case "PAYMENT.CAPTURE.REVERSED":
      case "PAYMENT.CAPTURE.REFUNDED": {
        const captureId = event.resource?.id;
        if (!captureId) {
          console.error("[paypal-webhook] REFUNDED/REVERSED missing captureId");
          break;
        }

        await client
          .from(BEAUTY_BOOKING_TABLE)
          .update({
            payment_status: "refunded",
            status: "canceled",
            updated_at: now,
          })
          .eq("paypal_capture_id", captureId);

        break;
      }

      default:
        // Unhandled event types — acknowledge receipt so PayPal doesn't retry
        break;
    }
  } catch (err) {
    console.error("[paypal-webhook] handler error", {
      event_type: event.event_type,
      message: err instanceof Error ? err.message : String(err),
    });
    // Return 500 so PayPal retries
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
