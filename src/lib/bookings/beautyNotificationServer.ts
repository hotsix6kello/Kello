import { getSupabaseServerClient, hasSupabaseServerAccess } from "@/lib/supabaseServer.ts";
import { REFUND_POLICY, PLATFORM_FEE_RATE } from "@/constants/refundPolicy";
import { getServerT } from "@/lib/i18n/serverTranslation";

export type BeautyBookingNotificationEventType =
  | "booking_created"
  | "booking_canceled_by_customer"
  | "booking_cancel_review_required" // Admin cancel or error
  | "booking_change_requested"
  | "booking_change_approved"
  | "booking_change_rejected"
  | "booking_confirmed"
  | "booking_completed"
  | "alternative_offer_sent"
  | "alternative_offer_accepted"
  | "alternative_offer_rejected";

export type BeautyBookingNotificationChannel = "in_app" | "email" | "sms" | "push";

export type BeautyBookingNotificationInsert = {
  user_id: string;
  booking_id: string;
  event_type: BeautyBookingNotificationEventType;
  title: string;
  message: string;
  channel?: BeautyBookingNotificationChannel;
  metadata_json?: Record<string, unknown>;
  dispatch_status?: "pending" | "sent" | "failed";
  error_log?: string;
};

export type BeautyBookingNotificationRecord = BeautyBookingNotificationInsert & {
  id: string;
  created_at: string;
  status: string;
  read_at: string | null;
  resend_count: number;
  last_resent_at: string | null;
  resent_by: string | null;
};

export const BEAUTY_NOTIFICATION_RESEND_MAX_LIMIT = 3;
export const BEAUTY_NOTIFICATION_RESEND_COOLDOWN_MS = 5 * 60 * 1000; // 5 mins

const BEAUTY_NOTIFICATION_TABLE = "beauty_booking_notifications";

function buildRefundPolicyHtml(locale?: string): string {
  const t = getServerT(locale);
  const rows = REFUND_POLICY.map((tier) => {
    const noRefund = tier.refundRate === 0;
    const color = noRefund ? "#dc2626" : "#374151";
    const weight = noRefund ? "700" : "400";
    const valueText = noRefund
      ? t("server_notifications.refund_no_refund")
      : t("server_notifications.refund_rate", { rate: tier.refundRate });
    return `<tr>
      <td style="padding:3px 0;font-size:12px;color:${color};font-weight:${weight};">${tier.label_ko}</td>
      <td style="padding:3px 0;font-size:12px;color:${color};font-weight:${weight};text-align:right;">${valueText}</td>
    </tr>`;
  }).join("");

  const platformRate = Math.round(PLATFORM_FEE_RATE * 100);
  return `<div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:8px;padding:16px;margin:24px 0;">
    <p style="font-size:13px;font-weight:700;color:#7c3aed;margin:0 0 10px 0;">${t("server_notifications.refund_policy_title")}</p>
    <table style="width:100%;border-collapse:collapse;">${rows}</table>
    <p style="font-size:11px;color:#9ca3af;margin:10px 0 0 0;">${t("server_notifications.platform_fee_note", { rate: platformRate })}</p>
  </div>`;
}

/**
 * Notifies the admin via email about a new beauty booking request.
 * Operates only if BEAUTY_BOOKING_ADMIN_EMAIL environment variable is set.
 */
export async function notifyAdminNewBooking(
  bookingId: string,
  metadata: Record<string, unknown>
): Promise<void> {
  const adminEmail = process.env.BEAUTY_BOOKING_ADMIN_EMAIL;
  const apiKey = process.env.RESEND_API_KEY;
  // Use NEXT_PUBLIC_APP_URL as primary, fallback to APP_BASE_URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL;

  if (!adminEmail || !apiKey) {
    // Silently skip if admin email or API key is not configured
    return;
  }

  const customerName = (metadata.customerName as string) || "Unknown Customer";
  const storeName = (metadata.storeName as string) || "Unknown Store";
  const bookingDate = (metadata.bookingDate as string) || "Unknown Date";
  const bookingTime = (metadata.bookingTime as string) || "Unknown Time";

  // Construct admin link if baseUrl is available
  const adminLink = baseUrl 
    ? `${baseUrl.replace(/\/$/, "")}/admin/bookings/beauty?bookingId=${bookingId}` 
    : null;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: "Kello <no-reply@kello.ai>",
        to: [adminEmail],
        subject: `[Kello] New beauty booking request`,
        text: `New beauty booking request.\n- Customer: ${customerName}\n- Store: ${storeName}\n- Schedule: ${bookingDate} ${bookingTime}\n- Booking ID: ${bookingId}${adminLink ? `\n\nOpen admin bookings: ${adminLink}` : ""}`,
        html: `<div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; border: 1px solid #eee; border-radius: 12px;">
          <h2 style="color: #7c3aed; margin-top: 0;">New Beauty Booking Request</h2>
          <p style="margin: 8px 0;"><strong>Customer:</strong> ${customerName}</p>
          <p style="margin: 8px 0;"><strong>Store:</strong> ${storeName}</p>
          <p style="margin: 8px 0;"><strong>Schedule:</strong> ${bookingDate} ${bookingTime}</p>
          <p style="margin: 8px 0;"><strong>Booking ID:</strong> ${bookingId}</p>
          ${adminLink ? `
            <div style="margin: 30px 0;">
              <a href="${adminLink}" style="background-color: #7c3aed; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                Open admin bookings
              </a>
            </div>
          ` : ""}
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #9ca3af;">This is an automated admin notification from Kello.</p>
        </div>`,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.warn("[beauty-notification] admin dispatch failed silently", errorData);
    }
  } catch (error) {
    console.warn("[beauty-notification] admin dispatch error", error);
  }
}


/**
 * Interface for generating notification title and body.
 */
export interface BeautyBookingNotificationContent {
  title: string;
  body: string;
  ctaText?: string;
  ctaLink?: string;
}

/**
 * Templates for the notification content.
 * @param locale – canonical locale code (e.g. "en", "ko", "ja"). Falls back to "en".
 */
export function getBeautyBookingNotificationTemplate(
  eventType: BeautyBookingNotificationEventType,
  metadata: Record<string, unknown>,
  bookingId?: string,
  locale?: string
): BeautyBookingNotificationContent {
  const t = getServerT(locale);
  const storeName = (metadata.storeName as string) || "";
  const date = (metadata.bookingDate as string) || "";
  const time = (metadata.bookingTime as string) || "";
  const service = (metadata.primaryServiceName as string) || "";
  const reason = (metadata.reason as string) || "-";

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const myBookingUrl = bookingId
    ? `${baseUrl}/my/bookings/beauty?bookingId=${bookingId}`
    : `${baseUrl}/my/bookings/beauty`;
  const notificationUrl = `${baseUrl}/my/notifications`;

  switch (eventType) {
    case "booking_created":
      return {
        title: t("server_notifications.booking_created_title", { storeName }),
        body: t("server_notifications.booking_created_body", { storeName, date, time }),
        ctaText: t("server_notifications.booking_created_cta"),
        ctaLink: myBookingUrl,
      };
    case "booking_confirmed":
      return {
        title: t("server_notifications.booking_confirmed_title", { storeName }),
        body: t("server_notifications.booking_confirmed_body", { storeName, date, time, service }),
        ctaText: t("server_notifications.booking_confirmed_cta"),
        ctaLink: myBookingUrl,
      };
    case "booking_canceled_by_customer":
      return {
        title: t("server_notifications.booking_canceled_title", { storeName }),
        body: t("server_notifications.booking_canceled_body", { storeName }),
        ctaText: t("server_notifications.booking_canceled_cta"),
        ctaLink: baseUrl,
      };
    case "booking_change_requested":
      return {
        title: t("server_notifications.booking_change_requested_title"),
        body: t("server_notifications.booking_change_requested_body"),
        ctaText: t("server_notifications.booking_change_requested_cta"),
        ctaLink: myBookingUrl,
      };
    case "booking_change_approved":
      return {
        title: t("server_notifications.booking_change_approved_title", { storeName }),
        body: t("server_notifications.booking_change_approved_body", { date, time }),
        ctaText: t("server_notifications.booking_change_approved_cta"),
        ctaLink: myBookingUrl,
      };
    case "booking_change_rejected":
      return {
        title: t("server_notifications.booking_change_rejected_title", { storeName }),
        body: t("server_notifications.booking_change_rejected_body", { reason }),
        ctaText: t("server_notifications.booking_change_rejected_cta"),
        ctaLink: myBookingUrl,
      };
    case "alternative_offer_sent":
      return {
        title: t("server_notifications.alternative_offer_sent_title", { storeName }),
        body: t("server_notifications.alternative_offer_sent_body", { storeName }),
        ctaText: t("server_notifications.alternative_offer_sent_cta"),
        ctaLink: myBookingUrl,
      };
    case "alternative_offer_accepted":
      return {
        title: t("server_notifications.alternative_offer_accepted_title", { storeName }),
        body: t("server_notifications.alternative_offer_accepted_body", { storeName, date, time }),
        ctaText: t("server_notifications.alternative_offer_accepted_cta"),
        ctaLink: myBookingUrl,
      };
    case "alternative_offer_rejected":
      return {
        title: t("server_notifications.alternative_offer_rejected_title", { storeName }),
        body: t("server_notifications.alternative_offer_rejected_body", { storeName }),
        ctaText: t("server_notifications.alternative_offer_rejected_cta"),
        ctaLink: myBookingUrl,
      };
    default:
      return {
        title: t("server_notifications.default_title"),
        body: t("server_notifications.default_body", { storeName }),
        ctaText: t("server_notifications.default_cta"),
        ctaLink: notificationUrl,
      };
  }
}

/**
 * Creates and stores a notification for a beauty booking.
 * This is the central seam for adding future notification providers (e.g., email, push).
 */
export async function createBeautyBookingNotification(
  payload: BeautyBookingNotificationInsert
): Promise<string> {
  if (!hasSupabaseServerAccess()) {
    throw new Error("Supabase access is not available on server.");
  }

  const client = getSupabaseServerClient();
  
  // 1. Persist to DB for in-app display (Required)
  const { data, error } = await client
    .from(BEAUTY_NOTIFICATION_TABLE)
    .insert({
      user_id: payload.user_id,
      booking_id: payload.booking_id,
      event_type: payload.event_type,
      title: payload.title,
      message: payload.message,
      channel: payload.channel ?? "in_app",
      metadata_json: payload.metadata_json ?? {},
      dispatch_status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[beauty-notification] failed to persist notification", error);
    throw new Error(`Failed to create notification: ${error.message}`);
  }

  // 2. Dispatch to other channels asynchronously
  void dispatchBeautyBookingNotification(data.id, payload).catch((err) => {
    console.warn("[beauty-notification] untracked dispatch failure", err);
  });

  return data.id;
}

/**
 * Dispatches notification to external channels (Email, SMS, etc.)
 */
async function dispatchBeautyBookingNotification(
  notificationId: string,
  payload: BeautyBookingNotificationInsert
) {
  const client = getSupabaseServerClient();

  // In-app notifications are delivered by being persisted to the table above;
  // there is no external channel to dispatch to, so mark them sent right away.
  if ((payload.channel ?? "in_app") === "in_app") {
    await client
      .from(BEAUTY_NOTIFICATION_TABLE)
      .update({
        dispatch_status: "sent",
        dispatched_at: new Date().toISOString(),
      })
      .eq("id", notificationId);
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;

  try {
    // 1. Get user email
    const { data: { user }, error: authError } = await client.auth.admin.getUserById(payload.user_id);
    if (authError || !user?.email) {
      throw new Error(`User email not found for ID: ${payload.user_id}`);
    }

    if (!apiKey) {
      console.warn("[beauty-notification] RESEND_API_KEY is missing. Mocking success for dev.");
      // For development purposes, if the key is missing but we are here, we might just log it and mark as failed
      // Or if the user hasn't set up yet, we can't send.
      throw new Error("RESEND_API_KEY not configured.");
    }

    // 2. Check Preferences
    const { getBeautyNotificationPreferences } = await import("@/lib/bookings/beautyNotificationPreferences.ts");
    const prefs = await getBeautyNotificationPreferences(payload.user_id);
    
    // Policy: External dispatch (Email) only if enabled
    if (!prefs.emailEnabled) {
      console.log("[beauty-notification] email dispatch skipped by user preference", payload.user_id);
      return;
    }

    // Event-specific checks
    if (!prefs.bookingUpdatesEnabled && 
        (payload.event_type === "booking_created" || 
         payload.event_type === "booking_confirmed" || 
         payload.event_type === "booking_completed" ||
         payload.event_type === "booking_canceled_by_customer" ||
         payload.event_type === "booking_cancel_review_required")) {
      console.log("[beauty-notification] booking update email skipped by user preference", payload.user_id);
      return;
    }

    if (!prefs.changeRequestUpdatesEnabled && 
        (payload.event_type === "booking_change_requested" || payload.event_type === "booking_change_approved" || payload.event_type === "booking_change_rejected")) {
      console.log("[beauty-notification] change request email skipped by user preference", payload.user_id);
      return;
    }

    if (!prefs.alternativeOfferUpdatesEnabled && 
        (payload.event_type === "alternative_offer_sent" || payload.event_type === "alternative_offer_accepted" || payload.event_type === "alternative_offer_rejected")) {
      console.log("[beauty-notification] alternative offer email skipped by user preference", payload.user_id);
      return;
    }

    // 3. Generate formal template content for Email
    const emailLocale = (payload.metadata_json?.communicationLanguage as string) ?? undefined;
    const t = getServerT(emailLocale);
    const template = getBeautyBookingNotificationTemplate(
      payload.event_type,
      payload.metadata_json || {},
      payload.booking_id,
      emailLocale
    );

    // 3. Send via Resend API
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: "Kello <no-reply@kello.ai>",
        to: [user.email],
        subject: template.title,
        text: template.body,
        html: `<div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px;">
          <h2 style="color: #7c3aed; margin-top: 0;">${template.title}</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">${template.body}</p>
          ${(payload.event_type === "booking_created" || payload.event_type === "booking_confirmed") ? buildRefundPolicyHtml(emailLocale) : ""}
          ${template.ctaLink ? `
            <div style="margin: 30px 0;">
              <a href="${template.ctaLink}" style="background-color: #7c3aed; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                ${template.ctaText || t("server_notifications.cta_view_detail")}
              </a>
            </div>
          ` : ''}
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #9ca3af;">${t("server_notifications.email_footer")}</p>
        </div>`,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
    }

    // 4. Update status to sent
    await client
      .from(BEAUTY_NOTIFICATION_TABLE)
      .update({
        dispatch_status: "sent",
        dispatched_at: new Date().toISOString()
      })
      .eq("id", notificationId);

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[beauty-notification] dispatch failed", errorMsg);
    
    try {
      await client
        .from(BEAUTY_NOTIFICATION_TABLE)
        .update({
          dispatch_status: "failed",
          error_log: errorMsg
        })
        .eq("id", notificationId);
    } catch (saveError) {
      console.error("[beauty-notification] failed to save error log", saveError);
    }
  }
}

/**
 * List notifications for the current user.
 */
export async function listUserBeautyNotifications(userId: string): Promise<BeautyBookingNotificationRecord[]> {
  const client = getSupabaseServerClient();
  const { data, error } = await client
    .from(BEAUTY_NOTIFICATION_TABLE)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list notifications: ${error.message}`);
  }

  return data as BeautyBookingNotificationRecord[];
}

/**
 * Mark a notification as read.
 */
export async function markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
  const client = getSupabaseServerClient();
  const { error } = await client
    .from(BEAUTY_NOTIFICATION_TABLE)
    .update({ 
      read_at: new Date().toISOString(),
      status: 'read'
    })
    .eq("id", notificationId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to mark notification as read: ${error.message}`);
  }
}

/**
 * List all notifications for a specific booking (Admin/Internal use)
 */
export async function listNotificationsByBooking(bookingId: string): Promise<BeautyBookingNotificationRecord[]> {
  const client = getSupabaseServerClient();
  const { data, error } = await client
    .from(BEAUTY_NOTIFICATION_TABLE)
    .select("*")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list booking notifications: ${error.message}`);
  }

  return data as BeautyBookingNotificationRecord[];
}

/**
 * Resends an existing notification (Admin call)
 */
export async function resendBeautyBookingNotification(notificationId: string, adminId: string): Promise<void> {
  const client = getSupabaseServerClient();
  
  // 1. Fetch original notification
  const { data: originalResult, error: fetchError } = await client
    .from(BEAUTY_NOTIFICATION_TABLE)
    .select("*")
    .eq("id", notificationId)
    .single();

  const original = originalResult as BeautyBookingNotificationRecord | null;

  if (fetchError || !original) {
    throw new Error(`Notification not found: ${notificationId}`);
  }

  // Resend Policy Enforcement
  const resendCount = (original.resend_count as number) || 0;
  const lastResentAt = original.last_resent_at ? new Date(original.last_resent_at).getTime() : 0;
  const now = Date.now();

  if (resendCount >= BEAUTY_NOTIFICATION_RESEND_MAX_LIMIT) {
    throw new Error("resend_limit_exceeded");
  }

  if (now - lastResentAt < BEAUTY_NOTIFICATION_RESEND_COOLDOWN_MS) {
    throw new Error("resend_cooldown_active");
  }

  // Update resend tracking
  const { error: updateError } = await client
    .from(BEAUTY_NOTIFICATION_TABLE)
    .update({
      resend_count: resendCount + 1,
      last_resent_at: new Date().toISOString(),
      resent_by: adminId,
      dispatch_status: 'pending', // Reset status for the new attempt
    })
    .eq("id", notificationId);

  if (updateError) {
    throw new Error(`Failed to update resend info: ${updateError.message}`);
  }

  const payload: BeautyBookingNotificationInsert = {
    user_id: original.user_id,
    booking_id: original.booking_id,
    event_type: original.event_type as BeautyBookingNotificationEventType,
    title: original.title,
    message: original.message,
    channel: original.channel as BeautyBookingNotificationChannel,
    metadata_json: original.metadata_json,
  };

  // 2. Dispatch again
  await dispatchBeautyBookingNotification(notificationId, payload);
}
