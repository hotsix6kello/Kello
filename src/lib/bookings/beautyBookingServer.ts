import type { BeautyBookingPayload } from "@/app/explore/beautyBooking.ts";
import {
  BEAUTY_BOOKING_ALLOWED_TRANSITIONS,
  isBeautyBookingCancelActor,
  isBeautyBookingAdminStatus,
  normalizeBeautyBookingAdminListStatus,
  type BeautyBookingAdminListFilters,
  type BeautyBookingAdminRecord,
  type BeautyBookingAdminStatus,
  type BeautyBookingChangeRequestStatus,
  type BeautyBookingOperatorStatus,
  type BeautyBookingAlternativeOfferStatus,
  type BeautyBookingAlternativeOfferItem,
} from "@/lib/bookings/beautyBookingAdmin.ts";
import {
  getMissingSupabaseServerEnvVars,
  getSupabaseServerClient,
  hasSupabaseServerAccess,
} from "@/lib/supabaseServer.ts";
import { 
  createBeautyBookingNotification,
  type BeautyBookingNotificationEventType 
} from "./beautyNotificationServer.ts";

export const BEAUTY_BOOKING_TABLE = "beauty_booking_requests";
export type BeautyBookingStorageErrorCode =
  | "env_missing"
  | "schema_missing"
  | "insert_failed"
  | "read_failed"
  | "update_failed"
  | "not_found"
  | "invalid_status"
  | "transition_not_allowed"
  | "forbidden_owner"
  | "invalid_cancel_reason";

type BeautyBookingInsertRow = {
  category: "beauty";
  customer_user_id: string | null;
  beauty_category: string;
  region: string;
  store_id: string;
  store_name: string;
  booking_date: string;
  booking_time: string;
  designer_id: string | null;
  designer_name: string | null;
  primary_service_id: string;
  primary_service_name: string;
  add_on_ids: string[];
  add_on_names: string[];
  base_price: number;
  add_on_price: number;
  designer_surcharge: number;
  total_price: number;
  customer_name: string;
  customer_phone: string;
  customer_request: string;
  communication_language: string;
  communication_intent: string;
  korean_message: string;
  localized_message: string;
  agreements: BeautyBookingPayload["agreements"];
  created_from_flow: BeautyBookingPayload["createdFrom"]["flow"];
  payload_json: BeautyBookingPayload;
  status: "requested";
  canceled_at?: string | null;
  canceled_by?: "customer" | "admin" | null;
  cancel_reason?: string;
  change_requested_at?: string | null;
  change_reason?: string;
  status_before_change_request?: string | null;
  change_request_status?: string | null;
  change_reviewed_at?: string | null;
  change_reviewed_by?: string | null;
  change_review_note?: string;
};

type BeautyBookingAdminSelectRow = {
  id: string;
  customer_user_id: string | null;
  created_at: string;
  updated_at: string;
  status: string;
  canceled_at: string | null;
  canceled_by: string | null;
  cancel_reason: string | null;
  change_requested_at: string | null;
  change_reason: string | null;
  status_before_change_request: string | null;
  change_request_status: string | null;
  change_reviewed_at: string | null;
  change_reviewed_by: string | null;
  change_review_note: string | null;
  category: "beauty";
  beauty_category: string;
  region: string;
  store_id: string;
  store_name: string;
  booking_date: string;
  booking_time: string;
  designer_id: string | null;
  designer_name: string | null;
  alternative_offer_status: string | null;
  alternative_offer_items: any | null;
  alternative_offer_note: string | null;
  alternative_offered_at: string | null;
  alternative_offered_by: string | null;
  alternative_response_at: string | null;
  operator_status: string | null;
  internal_note: string | null;
  shop_contacted: boolean;
  customer_contacted: boolean;
  follow_up_needed: boolean;
  primary_service_id: string;
  primary_service_name: string;
  add_on_ids: string[] | null;
  add_on_names: string[] | null;
  base_price: number;
  add_on_price: number;
  designer_surcharge: number;
  total_price: number;
  customer_name: string;
  customer_phone: string;
  customer_request: string;
  communication_language: string;
  communication_intent: string;
  korean_message: string;
  localized_message: string;
  agreements: unknown;
  created_from_flow: string;
};

export type PersistedBeautyBookingRecord = {
  bookingId: string;
  status: "requested";
  createdAt: string;
};

export class BeautyBookingStorageError extends Error {
  constructor(
    public readonly code: BeautyBookingStorageErrorCode,
    public readonly details?: Record<string, unknown>,
  ) {
    super(code);
    this.name = "BeautyBookingStorageError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function normalizeDbStatus(value: string): BeautyBookingAdminStatus {
  if (value === "cancelled") {
    return "canceled";
  }

  return isBeautyBookingAdminStatus(value) ? value : "requested";
}

function mapAgreements(value: unknown): BeautyBookingAdminRecord["agreements"] {
  if (!isRecord(value)) {
    return {
      bookingConfirmed: false,
      privacyConsent: false,
    };
  }

  return {
    bookingConfirmed: value.bookingConfirmed === true,
    privacyConsent: value.privacyConsent === true,
  };
}

export function mapBeautyBookingRowToAdminRecord(row: BeautyBookingAdminSelectRow): BeautyBookingAdminRecord {
  return {
    id: row.id,
    customerUserId: row.customer_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: normalizeDbStatus(row.status),
    canceledAt: row.canceled_at,
    canceledBy: isBeautyBookingCancelActor(row.canceled_by) ? row.canceled_by : null,
    cancelReason: row.cancel_reason ?? "",
    changeRequestedAt: row.change_requested_at,
    changeReason: row.change_reason ?? "",
    statusBeforeChangeRequest: row.status_before_change_request ? (normalizeDbStatus(row.status_before_change_request) as BeautyBookingAdminStatus) : null,
    changeRequestStatus: (row.change_request_status as BeautyBookingChangeRequestStatus) ?? "pending",
    changeReviewedAt: row.change_reviewed_at,
    changeReviewedBy: row.change_reviewed_by,
    changeReviewNote: row.change_review_note ?? "",
    category: row.category,
    beautyCategory: row.beauty_category,
    region: row.region,
    storeId: row.store_id,
    storeName: row.store_name,
    bookingDate: row.booking_date,
    bookingTime: row.booking_time,
    designerId: row.designer_id,
    designerName: row.designer_name,
    primaryServiceId: row.primary_service_id,
    primaryServiceName: row.primary_service_name,
    addOnIds: row.add_on_ids ?? [],
    addOnNames: row.add_on_names ?? [],
    basePrice: row.base_price,
    addOnPrice: row.add_on_price,
    designerSurcharge: row.designer_surcharge,
    totalPrice: row.total_price,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerRequest: row.customer_request,
    communicationLanguage: row.communication_language,
    communicationIntent: row.communication_intent,
    koreanMessage: row.korean_message,
    localizedMessage: row.localized_message,
    agreements: mapAgreements(row.agreements),
    createdFromFlow: row.created_from_flow,
    alternativeOfferStatus: (row.alternative_offer_status as BeautyBookingAlternativeOfferStatus) ?? "none",
    alternativeOfferItems: Array.isArray(row.alternative_offer_items) ? row.alternative_offer_items : [],
    alternativeOfferNote: row.alternative_offer_note ?? "",
    alternativeOfferedAt: row.alternative_offered_at,
    alternativeOfferedBy: row.alternative_offered_by,
    alternativeResponseAt: row.alternative_response_at,
    operatorStatus: (row.operator_status as BeautyBookingOperatorStatus) ?? "pending_assignment",
    internalNote: row.internal_note ?? "",
    shopContacted: !!row.shop_contacted,
    customerContacted: !!row.customer_contacted,
    followUpNeeded: !!row.follow_up_needed,
  };
}

export const BEAUTY_BOOKING_ADMIN_SELECT = [
  "id",
  "customer_user_id",
  "created_at",
  "updated_at",
  "status",
  "canceled_at",
  "canceled_by",
  "cancel_reason",
  "change_requested_at",
  "change_reason",
  "status_before_change_request",
  "change_request_status",
  "change_reviewed_at",
  "change_reviewed_by",
  "change_review_note",
  "category",
  "beauty_category",
  "region",
  "store_id",
  "store_name",
  "booking_date",
  "booking_time",
  "designer_id",
  "designer_name",
  "primary_service_id",
  "primary_service_name",
  "add_on_ids",
  "add_on_names",
  "base_price",
  "add_on_price",
  "designer_surcharge",
  "total_price",
  "customer_name",
  "customer_phone",
  "customer_request",
  "communication_language",
  "communication_intent",
  "korean_message",
  "localized_message",
  "agreements",
  "created_from_flow",
  "operator_status",
  "internal_note",
  "shop_contacted",
  "customer_contacted",
  "follow_up_needed",
].join(", ");

function mapBeautyBookingPayloadToRow(
  payload: BeautyBookingPayload,
  customerUserId: string | null = null,
): BeautyBookingInsertRow {
  return {
    category: payload.category,
    customer_user_id: customerUserId,
    beauty_category: payload.beautyCategory,
    region: payload.region,
    store_id: payload.storeId,
    store_name: payload.storeName,
    booking_date: payload.bookingDate,
    booking_time: payload.bookingTime,
    designer_id: payload.designerId,
    designer_name: payload.designerName,
    primary_service_id: payload.primaryServiceId,
    primary_service_name: payload.primaryServiceName,
    add_on_ids: payload.addOnIds,
    add_on_names: payload.addOnNames,
    base_price: payload.priceSummary.basePrice,
    add_on_price: payload.priceSummary.addOnPrice,
    designer_surcharge: payload.priceSummary.designerSurcharge,
    total_price: payload.priceSummary.totalPrice,
    customer_name: payload.customer.name,
    customer_phone: payload.customer.phone,
    customer_request: payload.customer.request,
    communication_language: payload.communication.language,
    communication_intent: payload.communication.intent,
    korean_message: payload.communication.messages.korean,
    localized_message: payload.communication.messages.localized,
    agreements: payload.agreements,
    created_from_flow: payload.createdFrom.flow,
    payload_json: payload,
    status: "requested",
    canceled_at: null,
    canceled_by: null,
    cancel_reason: "",
    change_requested_at: null,
    change_reason: "",
    status_before_change_request: null,
    change_request_status: null,
    change_reviewed_at: null,
    change_reviewed_by: null,
    change_review_note: "",
  };
}

export async function createBeautyBookingRequest(
  payload: BeautyBookingPayload,
  customerUserId: string | null = null,
): Promise<PersistedBeautyBookingRecord> {
  if (!hasSupabaseServerAccess()) {
    throw new BeautyBookingStorageError("env_missing", {
      missingEnvVars: getMissingSupabaseServerEnvVars(),
    });
  }

  const client = getSupabaseServerClient();
  const { data, error } = await client
    .from(BEAUTY_BOOKING_TABLE)
    .insert(mapBeautyBookingPayloadToRow(payload, customerUserId))
    .select("id, status, created_at, customer_user_id, store_name, booking_date, booking_time")
    .single();

  if (error) {
    if (isRecord(error) && error.code === "42P01") {
      throw new BeautyBookingStorageError("schema_missing", {
        table: BEAUTY_BOOKING_TABLE,
        code: error.code,
      });
    }

    throw new BeautyBookingStorageError("insert_failed", {
      code: isRecord(error) && typeof error.code === "string" ? error.code : undefined,
    });
  }

  // Dispatch Notification (Async, don't wait for response)
  if (data.customer_user_id) {
    void createBeautyBookingNotification({
      user_id: String(data.customer_user_id),
      booking_id: data.id,
      event_type: "booking_created",
      title: "예약 요청이 접수되었어요",
      message: `${data.store_name}에서 ${data.booking_date} ${data.booking_time} 예약을 요청하셨습니다.`,
      metadata_json: { 
        storeName: data.store_name, 
        bookingDate: data.booking_date, 
        bookingTime: data.booking_time 
      },
    }).catch(console.error);
  }

  return {
    bookingId: String(data.id),
    status: "requested",
    createdAt: String(data.created_at),
  };
}

export async function listBeautyBookingRequests(
  filters: BeautyBookingAdminListFilters = {},
): Promise<BeautyBookingAdminRecord[]> {
  if (!hasSupabaseServerAccess()) {
    throw new BeautyBookingStorageError("env_missing", {
      missingEnvVars: getMissingSupabaseServerEnvVars(),
    });
  }

  const client = getSupabaseServerClient();
  let query = client
    .from(BEAUTY_BOOKING_TABLE)
    .select(BEAUTY_BOOKING_ADMIN_SELECT)
    .order("created_at", { ascending: false })
    .limit(200);

  if (filters.status && filters.status !== "all" && isBeautyBookingAdminStatus(filters.status)) {
    query = query.eq("status", filters.status);
  }

  if (filters.beautyCategory && filters.beautyCategory !== "all") {
    query = query.eq("beauty_category", filters.beautyCategory);
  }

  const { data, error } = await query;

  if (error) {
    if (isRecord(error) && error.code === "42P01") {
      throw new BeautyBookingStorageError("schema_missing", {
        table: BEAUTY_BOOKING_TABLE,
        code: error.code,
      });
    }

    throw new BeautyBookingStorageError("read_failed", {
      code: isRecord(error) && typeof error.code === "string" ? error.code : undefined,
    });
  }

  const normalizedQuery = filters.query?.trim().toLowerCase() ?? "";
  const items = ((data as unknown as BeautyBookingAdminSelectRow[] | null) ?? []).map(
    mapBeautyBookingRowToAdminRecord,
  );

  if (!normalizedQuery) {
    return items;
  }

  return items.filter((item) => {
    const storeName = item.storeName.toLowerCase();
    const customerName = item.customerName.toLowerCase();
    return storeName.includes(normalizedQuery) || customerName.includes(normalizedQuery);
  });
}

export async function listBeautyBookingRequestsForUser(
  customerUserId: string,
): Promise<BeautyBookingAdminRecord[]> {
  if (!hasSupabaseServerAccess()) {
    throw new BeautyBookingStorageError("env_missing", {
      missingEnvVars: getMissingSupabaseServerEnvVars(),
    });
  }

  const client = getSupabaseServerClient();
  const { data, error } = await client
    .from(BEAUTY_BOOKING_TABLE)
    .select(BEAUTY_BOOKING_ADMIN_SELECT)
    .eq("customer_user_id", customerUserId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    if (isRecord(error) && error.code === "42P01") {
      throw new BeautyBookingStorageError("schema_missing", {
        table: BEAUTY_BOOKING_TABLE,
        code: error.code,
      });
    }

    throw new BeautyBookingStorageError("read_failed", {
      code: isRecord(error) && typeof error.code === "string" ? error.code : undefined,
    });
  }

  return ((data as unknown as BeautyBookingAdminSelectRow[] | null) ?? []).map(
    mapBeautyBookingRowToAdminRecord,
  );
}

export async function updateBeautyBookingRequestStatus(
  bookingId: string,
  nextStatus: BeautyBookingAdminStatus,
): Promise<BeautyBookingAdminRecord> {
  if (!hasSupabaseServerAccess()) {
    throw new BeautyBookingStorageError("env_missing", {
      missingEnvVars: getMissingSupabaseServerEnvVars(),
    });
  }

  if (!isBeautyBookingAdminStatus(nextStatus)) {
    throw new BeautyBookingStorageError("invalid_status");
  }

  const client = getSupabaseServerClient();
  const { data: currentRow, error: currentError } = await client
    .from(BEAUTY_BOOKING_TABLE)
    .select(BEAUTY_BOOKING_ADMIN_SELECT)
    .eq("id", bookingId)
    .maybeSingle();

  if (currentError) {
    if (isRecord(currentError) && currentError.code === "42P01") {
      throw new BeautyBookingStorageError("schema_missing", {
        table: BEAUTY_BOOKING_TABLE,
        code: currentError.code,
      });
    }

    throw new BeautyBookingStorageError("read_failed", {
      code: isRecord(currentError) && typeof currentError.code === "string" ? currentError.code : undefined,
    });
  }

  if (!currentRow) {
    throw new BeautyBookingStorageError("not_found");
  }

  const currentStatus = normalizeDbStatus(
    String((currentRow as unknown as BeautyBookingAdminSelectRow).status),
  );
  const allowedNextStatuses = BEAUTY_BOOKING_ALLOWED_TRANSITIONS[currentStatus] ?? [];

  if (!allowedNextStatuses.includes(nextStatus)) {
    throw new BeautyBookingStorageError("transition_not_allowed", {
      currentStatus,
      nextStatus,
    });
  }

  const { data: updatedRow, error: updateError } = await client
    .from(BEAUTY_BOOKING_TABLE)
    .update({
      status: nextStatus,
      ...(nextStatus === "canceled"
        ? {
            canceled_at: new Date().toISOString(),
            canceled_by: "admin",
            cancel_reason: "",
          }
        : nextStatus === "change_requested"
          ? {
              change_requested_at: new Date().toISOString(),
              change_reason: "",
            }
          : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .select(BEAUTY_BOOKING_ADMIN_SELECT)
    .single();

  if (updateError) {
    if (isRecord(updateError) && updateError.code === "42P01") {
      throw new BeautyBookingStorageError("schema_missing", {
        table: BEAUTY_BOOKING_TABLE,
        code: updateError.code,
      });
    }

    throw new BeautyBookingStorageError("update_failed", {
      code: isRecord(updateError) && typeof updateError.code === "string" ? updateError.code : undefined,
    });
  }

  const updatedRecord = mapBeautyBookingRowToAdminRecord(updatedRow as unknown as BeautyBookingAdminSelectRow);

  // Dispatch Notification
  if (updatedRecord.customerUserId) {
    let eventType: BeautyBookingNotificationEventType = "booking_cancel_review_required";
    let title = "예약 상태가 변경되었습니다";
    let message = `예약 상태가 ${nextStatus}로 변경되었습니다.`;

    if (nextStatus === "confirmed") {
      eventType = "booking_confirmed";
      title = "예약이 확정되었어요";
      message = `${updatedRecord.storeName} 예약이 확정되었습니다.`;
    } else if (nextStatus === "completed") {
      eventType = "booking_completed";
      title = "서비스가 완료되었어요";
      message = `${updatedRecord.storeName} 서비스를 이용해 주셔서 감사합니다.`;
    } else if (nextStatus === "canceled") {
      eventType = "booking_canceled_by_customer";
      title = "예약이 취소되었습니다";
      message = `${updatedRecord.storeName} 예약이 취소되었습니다.`;
    }

    void createBeautyBookingNotification({
      user_id: updatedRecord.customerUserId,
      booking_id: bookingId,
      event_type: eventType,
      title,
      message,
      metadata_json: {
        storeName: updatedRecord.storeName,
        bookingDate: updatedRecord.bookingDate,
        bookingTime: updatedRecord.bookingTime,
        primaryServiceName: updatedRecord.primaryServiceName,
      },
    }).catch(console.error);
  }

  return updatedRecord;
}

export async function cancelBeautyBookingRequestAsCustomer(
  bookingId: string,
  customerUserId: string,
  cancelReason: string,
): Promise<BeautyBookingAdminRecord> {
  if (!hasSupabaseServerAccess()) {
    throw new BeautyBookingStorageError("env_missing", {
      missingEnvVars: getMissingSupabaseServerEnvVars(),
    });
  }

  if (!cancelReason.trim()) {
    throw new BeautyBookingStorageError("invalid_cancel_reason");
  }

  const client = getSupabaseServerClient();
  const { data: currentRow, error: currentError } = await client
    .from(BEAUTY_BOOKING_TABLE)
    .select(BEAUTY_BOOKING_ADMIN_SELECT)
    .eq("id", bookingId)
    .maybeSingle();

  if (currentError) {
    if (isRecord(currentError) && currentError.code === "42P01") {
      throw new BeautyBookingStorageError("schema_missing", {
        table: BEAUTY_BOOKING_TABLE,
        code: currentError.code,
      });
    }

    throw new BeautyBookingStorageError("read_failed", {
      code: isRecord(currentError) && typeof currentError.code === "string" ? currentError.code : undefined,
    });
  }

  if (!currentRow) {
    throw new BeautyBookingStorageError("not_found");
  }

  const currentBooking = currentRow as unknown as BeautyBookingAdminSelectRow;

  if (currentBooking.customer_user_id !== customerUserId) {
    throw new BeautyBookingStorageError("forbidden_owner");
  }

  const currentStatus = normalizeDbStatus(String(currentBooking.status));
  const allowedNextStatuses = BEAUTY_BOOKING_ALLOWED_TRANSITIONS[currentStatus] ?? [];

  if (!allowedNextStatuses.includes("canceled")) {
    throw new BeautyBookingStorageError("transition_not_allowed", {
      currentStatus,
      nextStatus: "canceled",
    });
  }

  const canceledAt = new Date().toISOString();
  const { data: updatedRow, error: updateError } = await client
    .from(BEAUTY_BOOKING_TABLE)
    .update({
      status: "canceled",
      canceled_at: canceledAt,
      canceled_by: "customer",
      cancel_reason: cancelReason.trim(),
      updated_at: canceledAt,
    })
    .eq("id", bookingId)
    .eq("customer_user_id", customerUserId)
    .select(BEAUTY_BOOKING_ADMIN_SELECT)
    .single();

  if (updateError) {
    if (isRecord(updateError) && updateError.code === "42P01") {
      throw new BeautyBookingStorageError("schema_missing", {
        table: BEAUTY_BOOKING_TABLE,
        code: updateError.code,
      });
    }

    throw new BeautyBookingStorageError("update_failed", {
      code: isRecord(updateError) && typeof updateError.code === "string" ? updateError.code : undefined,
    });
  }

  const updatedRecord = mapBeautyBookingRowToAdminRecord(updatedRow as unknown as BeautyBookingAdminSelectRow);

  // Dispatch Notification to customer
  if (updatedRecord.customerUserId) {
    void createBeautyBookingNotification({
      user_id: updatedRecord.customerUserId,
      booking_id: bookingId,
      event_type: "booking_canceled_by_customer",
      title: "예약이 취소되었습니다",
      message: `${updatedRecord.storeName} 예약이 정상적으로 취소되었습니다.`,
      metadata_json: {
        storeName: updatedRecord.storeName,
        bookingDate: updatedRecord.bookingDate,
        bookingTime: updatedRecord.bookingTime,
        reason: cancelReason.trim(),
      },
    }).catch(console.error);
  }

  return updatedRecord;
}

export async function requestChangeBeautyBookingAsCustomer(
  bookingId: string,
  customerUserId: string,
  changeReason: string,
): Promise<BeautyBookingAdminRecord> {
  if (!hasSupabaseServerAccess()) {
    throw new BeautyBookingStorageError("env_missing", {
      missingEnvVars: getMissingSupabaseServerEnvVars(),
    });
  }

  if (!changeReason.trim()) {
    throw new BeautyBookingStorageError("invalid_cancel_reason");
  }

  const client = getSupabaseServerClient();
  const { data: currentRow, error: currentError } = await client
    .from(BEAUTY_BOOKING_TABLE)
    .select(BEAUTY_BOOKING_ADMIN_SELECT)
    .eq("id", bookingId)
    .maybeSingle();

  if (currentError) {
    if (isRecord(currentError) && currentError.code === "42P01") {
      throw new BeautyBookingStorageError("schema_missing", {
        table: BEAUTY_BOOKING_TABLE,
        code: currentError.code,
      });
    }

    throw new BeautyBookingStorageError("read_failed", {
      code: isRecord(currentError) && typeof currentError.code === "string" ? currentError.code : undefined,
    });
  }

  if (!currentRow) {
    throw new BeautyBookingStorageError("not_found");
  }

  const currentBooking = currentRow as unknown as BeautyBookingAdminSelectRow;

  if (currentBooking.customer_user_id !== customerUserId) {
    throw new BeautyBookingStorageError("forbidden_owner");
  }

  const currentStatus = normalizeDbStatus(String(currentBooking.status));
  const allowedNextStatuses = BEAUTY_BOOKING_ALLOWED_TRANSITIONS[currentStatus] ?? [];

  if (!allowedNextStatuses.includes("change_requested")) {
    throw new BeautyBookingStorageError("transition_not_allowed", {
      currentStatus,
      nextStatus: "change_requested",
    });
  }

  const changeRequestedAt = new Date().toISOString();
  const { data: updatedRow, error: updateError } = await client
    .from(BEAUTY_BOOKING_TABLE)
    .update({
      status: "change_requested",
      status_before_change_request: currentBooking.status,
      change_requested_at: changeRequestedAt,
      change_reason: changeReason.trim(),
      change_request_status: "pending",
      updated_at: changeRequestedAt,
    })
    .eq("id", bookingId)
    .eq("customer_user_id", customerUserId)
    .select(BEAUTY_BOOKING_ADMIN_SELECT)
    .single();

  if (updateError) {
    if (isRecord(updateError) && updateError.code === "42P01") {
      throw new BeautyBookingStorageError("schema_missing", {
        table: BEAUTY_BOOKING_TABLE,
        code: updateError.code,
      });
    }

    throw new BeautyBookingStorageError("update_failed", {
      code: isRecord(updateError) && typeof updateError.code === "string" ? updateError.code : undefined,
    });
  }

  const updatedRecord = mapBeautyBookingRowToAdminRecord(updatedRow as unknown as BeautyBookingAdminSelectRow);

  // Dispatch Notification to customer (Acknowledgement)
  if (updatedRecord.customerUserId) {
    void createBeautyBookingNotification({
      user_id: updatedRecord.customerUserId,
      booking_id: bookingId,
      event_type: "booking_change_requested",
      title: "변경 요청이 접수되었어요",
      message: "운영자가 곧 내용을 확인한 뒤 안내해 드릴게요.",
      metadata_json: {
        storeName: updatedRecord.storeName,
        bookingDate: updatedRecord.bookingDate,
        bookingTime: updatedRecord.bookingTime,
        reason: changeReason.trim(),
      },
    }).catch(console.error);
  }

  return updatedRecord;
}

export async function reviewBeautyBookingChangeRequest(
  bookingId: string,
  adminUserId: string,
  action: "approved" | "rejected",
  note: string,
): Promise<BeautyBookingAdminRecord> {
  if (!hasSupabaseServerAccess()) {
    throw new BeautyBookingStorageError("env_missing", {
      missingEnvVars: getMissingSupabaseServerEnvVars(),
    });
  }

  const client = getSupabaseServerClient();
  const { data: currentRow, error: currentError } = await client
    .from(BEAUTY_BOOKING_TABLE)
    .select(BEAUTY_BOOKING_ADMIN_SELECT)
    .eq("id", bookingId)
    .maybeSingle();

  if (currentError) {
    throw new BeautyBookingStorageError("read_failed", {
      code: isRecord(currentError) && typeof currentError.code === "string" ? currentError.code : undefined,
    });
  }

  if (!currentRow) {
    throw new BeautyBookingStorageError("not_found");
  }

  const currentBooking = currentRow as unknown as BeautyBookingAdminSelectRow;
  const currentStatus = normalizeDbStatus(String(currentBooking.status));

  if (currentStatus !== "change_requested") {
    throw new BeautyBookingStorageError("transition_not_allowed", {
      currentStatus,
      nextStatus: action === "approved" ? "approved_change" : "rejected_change",
    });
  }

  // Determine return status: if status_before_change_request exists, use it.
  // Otherwise default to confirmed (safer than requested)
  const nextStatus = (currentBooking.status_before_change_request as BeautyBookingAdminStatus) || "confirmed";

  const { data: updatedRow, error: updateError } = await client
    .from(BEAUTY_BOOKING_TABLE)
    .update({
      status: nextStatus,
      change_request_status: action,
      change_reviewed_at: new Date().toISOString(),
      change_reviewed_by: adminUserId,
      change_review_note: note.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .select(BEAUTY_BOOKING_ADMIN_SELECT)
    .single();

  if (updateError) {
    throw new BeautyBookingStorageError("update_failed", {
      code: isRecord(updateError) && typeof updateError.code === "string" ? updateError.code : undefined,
    });
  }

  const updatedRecord = mapBeautyBookingRowToAdminRecord(updatedRow as unknown as BeautyBookingAdminSelectRow);

  // Dispatch Notification
  if (updatedRecord.customerUserId) {
    void createBeautyBookingNotification({
      user_id: updatedRecord.customerUserId,
      booking_id: bookingId,
      event_type: action === "approved" ? "booking_change_approved" : "booking_change_rejected",
      title: action === "approved" ? "변경 요청이 승인되었어요" : "변경 요청이 반려되었어요",
      message: action === "approved" ? "요청하신 변경 내용이 반영되었습니다." : `변경 요청이 반려되었습니다. 사유: ${note || "불가 내역"}`,
      metadata_json: { 
        action, 
        note,
        storeName: updatedRecord.storeName,
        bookingDate: updatedRecord.bookingDate,
        bookingTime: updatedRecord.bookingTime,
        reason: note 
      },
    }).catch(console.error);
  }

  return updatedRecord;
}

/**
 * Update operator-specific information for a beauty booking.
 * This is internally used by admins and does not trigger customer notifications.
 */
export async function updateBeautyBookingOperatorInfo(
  bookingId: string,
  updates: {
    operatorStatus?: BeautyBookingOperatorStatus;
    internalNote?: string;
    shopContacted?: boolean;
    customerContacted?: boolean;
    followUpNeeded?: boolean;
  }
): Promise<BeautyBookingAdminRecord> {
  if (!hasSupabaseServerAccess()) {
    throw new BeautyBookingStorageError("env_missing", {
      missingEnvVars: getMissingSupabaseServerEnvVars(),
    });
  }

  const client = getSupabaseServerClient();
  const dbUpdates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.operatorStatus !== undefined) dbUpdates.operator_status = updates.operatorStatus;
  if (updates.internalNote !== undefined) dbUpdates.internal_note = updates.internalNote;
  if (updates.shopContacted !== undefined) dbUpdates.shop_contacted = updates.shopContacted;
  if (updates.customerContacted !== undefined) dbUpdates.customer_contacted = updates.customerContacted;
  if (updates.followUpNeeded !== undefined) dbUpdates.follow_up_needed = updates.followUpNeeded;

  const { data: updatedRow, error: updateError } = await client
    .from(BEAUTY_BOOKING_TABLE)
    .update(dbUpdates)
    .eq("id", bookingId)
    .select(BEAUTY_BOOKING_ADMIN_SELECT)
    .single();

  if (updateError) {
    throw new BeautyBookingStorageError("update_failed", {
      code: isRecord(updateError) && typeof updateError.code === "string" ? updateError.code : undefined,
    });
  }

  return mapBeautyBookingRowToAdminRecord(updatedRow as unknown as BeautyBookingAdminSelectRow);
}

/**
 * Offer alternative schedule to the customer.
 */
export async function offerAlternativeSchedule(
  bookingId: string,
  adminId: string,
  items: BeautyBookingAlternativeOfferItem[],
  note: string = ""
): Promise<BeautyBookingAdminRecord> {
  if (!hasSupabaseServerAccess()) {
    throw new BeautyBookingStorageError("env_missing");
  }

  const client = getSupabaseServerClient();
  const { data: updatedRow, error: updateError } = await client
    .from(BEAUTY_BOOKING_TABLE)
    .update({
      alternative_offer_status: "offered",
      alternative_offer_items: items,
      alternative_offer_note: note,
      alternative_offered_at: new Date().toISOString(),
      alternative_offered_by: adminId,
      operator_status: "awaiting_customer_reply",
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .select(BEAUTY_BOOKING_ADMIN_SELECT)
    .single();

  if (updateError) {
    throw new BeautyBookingStorageError("update_failed");
  }

  const record = mapBeautyBookingRowToAdminRecord(updatedRow as unknown as BeautyBookingAdminSelectRow);

  // Notify customer
  if (record.customerUserId) {
    void createBeautyBookingNotification({
      user_id: record.customerUserId,
      booking_id: bookingId,
      event_type: "alternative_offer_sent",
      title: "일정 변경 제안이 도착했어요",
      message: "선택하신 시간이 마감되어 다른 가능한 시간을 안내해 드립니다. 확인 후 선택해 주세요.",
      metadata_json: { 
        items, 
        note,
        storeName: record.storeName,
        bookingDate: record.bookingDate,
        bookingTime: record.bookingTime 
      },
    }).catch(console.error);
  }

  return record;
}

/**
 * Respond to an alternative schedule offer by the customer.
 */
export async function respondToAlternativeOffer(
  bookingId: string,
  userId: string,
  response: "accepted" | "rejected",
  selectedItem?: BeautyBookingAlternativeOfferItem
): Promise<BeautyBookingAdminRecord> {
  if (!hasSupabaseServerAccess()) {
    throw new BeautyBookingStorageError("env_missing");
  }

  const client = getSupabaseServerClient();
  
  // Verify ownership
  const { data: existing, error: readError } = await client
    .from(BEAUTY_BOOKING_TABLE)
    .select("customer_user_id, status")
    .eq("id", bookingId)
    .single();

  if (readError || !existing) throw new BeautyBookingStorageError("not_found");
  if (existing.customer_user_id !== userId) throw new BeautyBookingStorageError("forbidden_owner");

  const updates: Record<string, any> = {
    alternative_offer_status: response,
    alternative_response_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (response === "accepted" && selectedItem) {
    updates.booking_date = selectedItem.date;
    updates.booking_time = selectedItem.time;
    updates.operator_status = "ready_to_confirm";
  } else {
    updates.operator_status = "alternative_time_needed"; // Indicate operator needs to try again or book something else
  }

  const { data: updatedRow, error: updateError } = await client
    .from(BEAUTY_BOOKING_TABLE)
    .update(updates)
    .eq("id", bookingId)
    .select(BEAUTY_BOOKING_ADMIN_SELECT)
    .single();

  if (updateError) {
    throw new BeautyBookingStorageError("update_failed");
  }

  const record = mapBeautyBookingRowToAdminRecord(updatedRow as unknown as BeautyBookingAdminSelectRow);

  // Notify customer
  if (record.customerUserId) {
    void createBeautyBookingNotification({
      user_id: record.customerUserId,
      booking_id: bookingId,
      event_type: response === "accepted" ? "alternative_offer_accepted" : "alternative_offer_rejected",
      title: response === "accepted" ? "제안을 수락하셨습니다" : "제안을 거절하셨습니다",
      message: response === "accepted" ? "예약 시간이 변경되었습니다." : "다른 일정을 다시 확인해 드릴게요.",
      metadata_json: {
        storeName: record.storeName,
        bookingDate: record.bookingDate,
        bookingTime: record.bookingTime,
        response
      },
    }).catch(console.error);
  }

  return record;
}
