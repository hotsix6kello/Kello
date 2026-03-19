import { getSupabaseServerClient, hasSupabaseServerAccess } from "@/lib/supabaseServer.ts";
import { getMissingSupabaseServerEnvVars } from "@/lib/supabaseServer.ts";

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
 */
export function getBeautyBookingNotificationTemplate(
  eventType: BeautyBookingNotificationEventType,
  metadata: Record<string, any>,
  bookingId?: string
): BeautyBookingNotificationContent {
  const storeName = metadata.storeName || "매장";
  const date = metadata.bookingDate || "";
  const time = metadata.bookingTime || "";
  const service = metadata.primaryServiceName || "시술";

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const myBookingUrl = bookingId 
    ? `${baseUrl}/my/bookings/beauty?bookingId=${bookingId}`
    : `${baseUrl}/my/bookings/beauty`;
  const notificationUrl = `${baseUrl}/my/notifications`;

  switch (eventType) {
    case "booking_created":
      return {
        title: `[Kello] 예약 요청 접수: ${storeName}`,
        body: `${storeName} 매장에 ${date} ${time} 예약을 심사 중입니다. 잠시만 기다려 주세요.`,
        ctaText: "내 예약 확인하기",
        ctaLink: myBookingUrl,
      };
    case "booking_confirmed":
      return {
        title: `[Kello] 예약 확정 안내: ${storeName}`,
        body: `축하드려요! ${storeName} 예약을 확정했습니다. (${date} ${time}, ${service})`,
        ctaText: "예약 상세 보기",
        ctaLink: myBookingUrl,
      };
    case "booking_canceled_by_customer":
      return {
        title: `[Kello] 예약 취소 완료: ${storeName}`,
        body: `${storeName} 예약이 정상적으로 취소되었습니다. 다음에 또 이용해 주세요.`,
        ctaText: "Kello 홈으로",
        ctaLink: baseUrl,
      };
    case "booking_change_approved":
      return {
        title: `[Kello] 예약 변경 승인: ${storeName}`,
        body: `요청하신 예약 변경이 승인되었습니다. (${date} ${time})`,
        ctaText: "변경된 예약 확인",
        ctaLink: myBookingUrl,
      };
    case "booking_change_rejected":
      return {
        title: `[Kello] 예약 변경 반려: ${storeName}`,
        body: `안타깝게도 예약 변경 요청이 반려되었습니다. 사유: ${metadata.reason || "없음"}`,
        ctaText: "내 예약 보기",
        ctaLink: myBookingUrl,
      };
    case "alternative_offer_sent":
      return {
        title: `[Kello] 대체 일정 제안 도착: ${storeName}`,
        body: `원하신 시간이 마감되어 ${storeName}에서 대체 시간을 제안하셨습니다. 일정을 확인하고 선택해 주세요.`,
        ctaText: "제안 일정 확인하기",
        ctaLink: myBookingUrl,
      };
    case "alternative_offer_accepted":
      return {
        title: `[Kello] 제안 일정 수락 완료: ${storeName}`,
        body: `${storeName}의 대체 일정 제안을 수락하셨습니다. 예약 시간이 ${date} ${time}으로 변경되었습니다.`,
        ctaText: "내 예약 보기",
        ctaLink: myBookingUrl,
      };
    case "alternative_offer_rejected":
      return {
        title: `[Kello] 제안 일정 거절: ${storeName}`,
        body: `${storeName}의 대체 일정 제안을 거절하셨습니다. 운영자가 다른 가능성을 다시 검토할 예정입니다.`,
        ctaText: "내 예약 보기",
        ctaLink: myBookingUrl,
      };
    default:
      return {
        title: `[Kello] 알림이 도착했습니다`,
        body: `${storeName} 관련 새로운 소식이 있습니다.`,
        ctaText: "알림 확인하기",
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
    const template = getBeautyBookingNotificationTemplate(
      payload.event_type, 
      payload.metadata_json || {},
      payload.booking_id
    );
    
    // 3. Send via Resend API
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: "Kello <no-reply@kello.ai>", // Replace with verified domain in production
        to: [user.email],
        subject: template.title,
        text: template.body,
        html: `<div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px;">
          <h2 style="color: #7c3aed; margin-top: 0;">${template.title}</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">${template.body}</p>
          ${template.ctaLink ? `
            <div style="margin: 30px 0;">
              <a href="${template.ctaLink}" style="background-color: #7c3aed; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                ${template.ctaText || '상세 보기'}
              </a>
            </div>
          ` : ''}
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #9ca3af;">본 메일은 자동 발송되는 알림 메일입니다. 문의사항은 Kello 고객센터를 이용해 주세요.</p>
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
  const { data: original, error: fetchError } = await client
    .from(BEAUTY_NOTIFICATION_TABLE)
    .select("*")
    .eq("id", notificationId)
    .single();

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
