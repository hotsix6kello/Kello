import { getSupabaseServerClient } from "@/lib/supabaseServer.ts";

export interface BeautyNotificationPreferences {
  userId: string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  bookingUpdatesEnabled: boolean;
  changeRequestUpdatesEnabled: boolean;
  alternativeOfferUpdatesEnabled: boolean;
  updatedAt: string;
}

const PREFERENCES_TABLE = "beauty_notification_preferences";

/**
 * Get notification preferences for a user.
 * Returns default values if no preferences are stored yet.
 */
export async function getBeautyNotificationPreferences(userId: string): Promise<BeautyNotificationPreferences> {
  const client = getSupabaseServerClient();
  const { data, error } = await client
    .from(PREFERENCES_TABLE)
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[beauty-notification-preferences] failed to fetch", error);
    // Return defaults on error to avoid breaking the flow
  }

  if (!data) {
    return {
      userId,
      inAppEnabled: true,
      emailEnabled: true,
      bookingUpdatesEnabled: true,
      changeRequestUpdatesEnabled: true,
      alternativeOfferUpdatesEnabled: true,
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    userId: data.user_id,
    inAppEnabled: data.in_app_enabled,
    emailEnabled: data.email_enabled,
    bookingUpdatesEnabled: data.booking_updates_enabled,
    changeRequestUpdatesEnabled: data.change_request_updates_enabled,
    alternativeOfferUpdatesEnabled: data.alternative_offer_updates_enabled,
    updatedAt: data.updated_at,
  };
}

/**
 * Upsert notification preferences for a user.
 */
export async function updateBeautyNotificationPreferences(
  userId: string,
  updates: Partial<Omit<BeautyNotificationPreferences, "userId" | "updatedAt">>
): Promise<BeautyNotificationPreferences> {
  const client = getSupabaseServerClient();
  
  const dbUpdates = {
    user_id: userId,
    updated_at: new Date().toISOString(),
    ...(updates.inAppEnabled !== undefined && { in_app_enabled: updates.inAppEnabled }),
    ...(updates.emailEnabled !== undefined && { email_enabled: updates.emailEnabled }),
    ...(updates.bookingUpdatesEnabled !== undefined && { booking_updates_enabled: updates.bookingUpdatesEnabled }),
    ...(updates.changeRequestUpdatesEnabled !== undefined && { change_request_updates_enabled: updates.changeRequestUpdatesEnabled }),
    ...(updates.alternativeOfferUpdatesEnabled !== undefined && { alternative_offer_updates_enabled: updates.alternativeOfferUpdatesEnabled }),
  };

  const { data, error } = await client
    .from(PREFERENCES_TABLE)
    .upsert(dbUpdates)
    .select("*")
    .single();

  if (error) {
    console.error("[beauty-notification-preferences] failed to update", error);
    throw new Error(`Failed to update notification preferences: ${error.message}`);
  }

  return {
    userId: data.user_id,
    inAppEnabled: data.in_app_enabled,
    emailEnabled: data.email_enabled,
    bookingUpdatesEnabled: data.booking_updates_enabled,
    changeRequestUpdatesEnabled: data.change_request_updates_enabled,
    alternativeOfferUpdatesEnabled: data.alternative_offer_updates_enabled,
    updatedAt: data.updated_at,
  };
}
