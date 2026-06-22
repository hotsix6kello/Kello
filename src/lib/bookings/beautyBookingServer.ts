import type { BeautyBookingPayload } from "@/app/explore/beautyBooking.ts";
import {
  BEAUTY_BOOKING_ALLOWED_TRANSITIONS,
  isBeautyBookingCancelActor,
  isBeautyBookingAdminStatus,
  isBeautyBookingQuoteStatus,
  type BeautyBookingAdminListFilters,
  type BeautyBookingAdminRecord,
  type BeautyBookingAdminStatus,
  type BeautyBookingChangeRequestStatus,
  type BeautyBookingOperatorStatus,
  type BeautyBookingAlternativeOfferStatus,
  type BeautyBookingAlternativeOfferItem,
  type BeautyBookingQuoteStatus,
} from "@/lib/bookings/beautyBookingAdmin.ts";
import {
  getMissingSupabaseServerEnvVars,
  getSupabaseServerClient,
  hasSupabaseServerAccess,
} from "@/lib/supabaseServer.ts";
import {
  createBeautyBookingNotification,
  getBeautyBookingNotificationTemplate,
  notifyAdminNewBooking,
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
  id?: string;
  category: "beauty";
  customer_user_id: string | null;
  customer_email: string | null;
  beauty_category: string;
  region: string;
  store_id: string;
  store_name: string;
  store_source: string;
  booking_date: string;
  booking_time: string;
  designer_id: string | null;
  designer_name: string | null;
  primary_service_id: string | null;
  primary_service_name: string | null;
  add_on_ids: string[];
  add_on_names: string[];
  base_price: number;
  add_on_price: number;
  designer_surcharge: number;
  total_price: number;
  service_duration_min: number | null;
  customer_name: string;
  customer_phone: string;
  customer_request: string;
  image_urls: string[] | null;
  current_image_url: string | null;
  style_image_url: string | null;
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

export type BeautyBookingAdminSelectRow = {
  id: string;
  customer_user_id: string | null;
  customer_email: string | null;
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
  store_source: string;
  booking_date: string;
  booking_time: string;
  designer_id: string | null;
  designer_name: string | null;
  alternative_offer_status: string | null;
  alternative_offer_items: BeautyBookingAlternativeOfferItem[] | null;
  alternative_offer_note: string | null;
  alternative_offered_at: string | null;
  alternative_offered_by: string | null;
  alternative_response_at: string | null;
  operator_status: string | null;
  internal_note: string | null;
  shop_contacted: boolean;
  customer_contacted: boolean;
  follow_up_needed: boolean;
  quote_shop_name: string | null;
  quote_shop_address: string | null;
  quote_service_name: string | null;
  quote_date: string | null;
  quote_time: string | null;
  quote_total_price: number | null;
  quote_currency: string | null;
  quote_note: string | null;
  quote_refund_policy: string | null;
  quote_expires_at: string | null;
  quote_status: string | null;
  quote_sent_at: string | null;
  quote_responded_at: string | null;
  primary_service_id: string | null;
  primary_service_name: string | null;
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
  current_image_url: string | null;
  style_image_url: string | null;
  agreements: unknown;
  created_from_flow: string;
  payment_status: string | null;
  payment_method: string | null;
  payment_transaction_id: string | null;
  paypal_order_id: string | null;
  paypal_capture_id: string | null;
  paid_at: string | null;
};

type BeautyBookingImageSelectRow = {
  request_id: string;
  image_type: "current" | "style";
  storage_path: string;
  original_file_name: string | null;
  bucket_name: string;
};

type BeautyBookingSummarySelectRow = Pick<
  BeautyBookingAdminSelectRow,
  | "id"
  | "status"
  | "store_name"
  | "primary_service_name"
  | "beauty_category"
  | "booking_date"
  | "booking_time"
  | "total_price"
>;

export type BeautyBookingSummaryRecord = Pick<
  BeautyBookingAdminRecord,
  | "id"
  | "status"
  | "storeName"
  | "primaryServiceName"
  | "beautyCategory"
  | "bookingDate"
  | "bookingTime"
  | "totalPrice"
>;

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
      serviceTermsAgreed: false,
      privacyPolicyAgreed: false,
      thirdPartySharingAgreed: false,
      marketingConsentAgreed: false,
      refundPolicyAgreed: false,
      refundPolicyAgreedAt: null,
    };
  }

  return {
    serviceTermsAgreed: value.serviceTermsAgreed === true,
    privacyPolicyAgreed: value.privacyPolicyAgreed === true,
    thirdPartySharingAgreed: value.thirdPartySharingAgreed === true,
    marketingConsentAgreed: value.marketingConsentAgreed === true,
    refundPolicyAgreed: value.refundPolicyAgreed === true,
    refundPolicyAgreedAt: typeof value.refundPolicyAgreedAt === 'string' ? value.refundPolicyAgreedAt : null,
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
    storeSource: row.store_source === "partner" ? "partner" : "google",
    bookingDate: row.booking_date,
    bookingTime: row.booking_time,
    designerId: row.designer_id,
    designerName: row.designer_name,
    primaryServiceId: row.primary_service_id ?? null,
    primaryServiceName: row.primary_service_name ?? null,
    addOnIds: row.add_on_ids ?? [],
    addOnNames: row.add_on_names ?? [],
    basePrice: row.base_price,
    addOnPrice: row.add_on_price,
    designerSurcharge: row.designer_surcharge,
    totalPrice: row.total_price,
    customerName: row.customer_name,
    customerEmail: row.customer_email ?? null,
    customerPhone: row.customer_phone,
    customerRequest: row.customer_request,
    imageUrls: Array.isArray((row as unknown as { image_urls?: string[] }).image_urls) ? (row as unknown as { image_urls: string[] }).image_urls : [],
    currentImageUrl: row.current_image_url ?? null,
    styleImageUrl: row.style_image_url ?? null,
    hasCurrentImage: Boolean(row.current_image_url),
    hasStyleImage: Boolean(row.style_image_url),
    currentImagePath: null,
    styleImagePath: null,
    currentImageName: null,
    styleImageName: null,
    communicationLanguage: row.communication_language,
    communicationIntent: row.communication_intent,
    koreanMessage: row.korean_message,
    localizedMessage: row.localized_message,
    agreements: mapAgreements(row.agreements),
    createdFromFlow: row.created_from_flow,
    quoteShopName: row.quote_shop_name ?? null,
    quoteShopAddress: row.quote_shop_address ?? null,
    quoteServiceName: row.quote_service_name ?? null,
    quoteDate: row.quote_date ?? null,
    quoteTime: row.quote_time ?? null,
    quoteTotalPrice: row.quote_total_price ?? null,
    quoteCurrency: row.quote_currency ?? null,
    quoteNote: row.quote_note ?? null,
    quoteExpiresAt: row.quote_expires_at ?? null,
    quoteStatus: isBeautyBookingQuoteStatus(row.quote_status) ? row.quote_status : null,
    quoteSentAt: row.quote_sent_at ?? null,
    quoteRespondedAt: row.quote_responded_at ?? null,
    paymentStatus: row.payment_status ?? null,
    paymentMethod: row.payment_method ?? null,
    paymentTransactionId: row.payment_transaction_id ?? null,
    paypalOrderId: row.paypal_order_id ?? null,
    paypalCaptureId: row.paypal_capture_id ?? null,
    paidAt: row.paid_at ?? null,
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
  "customer_email",
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
  "store_source",
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
  "image_urls",
  "communication_language",
  "communication_intent",
  "korean_message",
  "localized_message",
  "current_image_url",
  "style_image_url",
  "agreements",
  "created_from_flow",
  "operator_status",
  "internal_note",
  "shop_contacted",
  "customer_contacted",
  "follow_up_needed",
  "quote_shop_name",
  "quote_shop_address",
  "quote_service_name",
  "quote_date",
  "quote_time",
  "quote_total_price",
  "quote_currency",
  "quote_note",
  "quote_refund_policy",
  "quote_expires_at",
  "quote_status",
  "quote_sent_at",
  "quote_responded_at",
  "payment_status",
  "payment_method",
  "payment_transaction_id",
  "paypal_order_id",
  "paypal_capture_id",
  "paid_at",
].join(", ");

const BEAUTY_BOOKING_SUMMARY_SELECT = [
  "id",
  "status",
  "store_name",
  "primary_service_name",
  "beauty_category",
  "booking_date",
  "booking_time",
  "total_price",
].join(", ");

function mapBeautyBookingRowToSummaryRecord(
  row: BeautyBookingSummarySelectRow,
): BeautyBookingSummaryRecord {
  return {
    id: row.id,
    status: normalizeDbStatus(row.status),
    storeName: row.store_name,
    primaryServiceName: row.primary_service_name ?? null,
    beautyCategory: row.beauty_category,
    bookingDate: row.booking_date,
    bookingTime: row.booking_time,
    totalPrice: row.total_price,
  };
}

function mapBeautyBookingPayloadToRow(
  payload: BeautyBookingPayload,
  customerUserId: string | null = null,
  customerEmail: string | null = null,
): BeautyBookingInsertRow {
  return {
    id: payload.id,
    category: payload.category,
    customer_user_id: customerUserId,
    customer_email: payload.customer.email ?? customerEmail,
    beauty_category: payload.beautyCategory,
    region: payload.region,
    store_id: payload.storeId,
    store_name: payload.storeName,
    store_source: payload.storeSource === "partner" ? "partner" : "google",
    booking_date: payload.bookingDate,
    booking_time: payload.bookingTime,
    designer_id: payload.designerId,
    designer_name: payload.designerName,
    primary_service_id: payload.primaryServiceId === 'none' ? null : payload.primaryServiceId,
    primary_service_name: payload.primaryServiceName === '선택 안 함' ? null : payload.primaryServiceName,
    add_on_ids: payload.addOnIds,
    add_on_names: payload.addOnNames,
    base_price: payload.priceSummary.basePrice,
    add_on_price: payload.priceSummary.addOnPrice,
    designer_surcharge: payload.priceSummary.designerSurcharge,
    total_price: payload.priceSummary.totalPrice,
    service_duration_min: payload.storeSource === "partner" ? (payload.serviceDurationMin ?? null) : null,
    customer_name: payload.customer.name,
    customer_phone: payload.customer.phone,
    customer_request: payload.customer.request,
    image_urls: payload.customer.imageUrls && payload.customer.imageUrls.length > 0 ? payload.customer.imageUrls : null,
    current_image_url: payload.customer.currentImageUrl ?? null,
    style_image_url: payload.customer.styleImageUrl ?? null,
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
  customerEmail: string | null = null,
): Promise<PersistedBeautyBookingRecord> {
  if (!hasSupabaseServerAccess()) {
    throw new BeautyBookingStorageError("env_missing", {
      missingEnvVars: getMissingSupabaseServerEnvVars(),
    });
  }

  const client = getSupabaseServerClient();
  const insertData = mapBeautyBookingPayloadToRow(payload, customerUserId, customerEmail);
  console.log("[beauty-booking-server] Attempting insert", {
    store_id: insertData.store_id,
    beauty_category: insertData.beauty_category,
    region: insertData.region,
    customer_name: insertData.customer_name,
  });

  const { data, error } = await client
    .from(BEAUTY_BOOKING_TABLE)
    .insert(insertData)
    .select("id, status, created_at, customer_user_id, store_name, booking_date, booking_time")
    .single();

  if (error) {
    console.error("[beauty-booking-server] Insert failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    // Continue with existing error handling below
  } else {
    console.log("[beauty-booking-server] Insert successful", { id: data?.id });

    // Insert image records into beauty_booking_request_images
    if (data?.id && data.customer_user_id) {
      const imagesToInsert = [];
      if (payload.customer.currentImagePath) {
        imagesToInsert.push({
          request_id: data.id,
          user_id: data.customer_user_id,
          image_type: 'current',
          bucket_name: 'booking',
          storage_path: payload.customer.currentImagePath,
          original_file_name: payload.customer.currentImageName ?? null,
        });
      }
      if (payload.customer.styleImagePath) {
        imagesToInsert.push({
          request_id: data.id,
          user_id: data.customer_user_id,
          image_type: 'style',
          bucket_name: 'booking',
          storage_path: payload.customer.styleImagePath,
          original_file_name: payload.customer.styleImageName ?? null,
        });
      }

      if (imagesToInsert.length > 0) {
        const { error: imagesError } = await client
          .from('beauty_booking_request_images')
          .insert(imagesToInsert);
        
        if (imagesError) {
          // image metadata insert 실패 - booking은 이미 저장됨
          // Storage 파일은 존재하지만 DB 참조가 없는 상태 (부분 orphan)
          // cleanup은 클라이언트 레벨에서 처리됨; 여기서는 상세 로그만 남김
          console.error('[beauty-booking-server] Image metadata insert failed', {
            code: imagesError.code,
            message: imagesError.message,
            details: imagesError.details,
            hint: imagesError.hint,
            request_id: data.id,
            failed_paths: imagesToInsert.map(img => img.storage_path),
          });
        }
      }
    }
  }

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
    const locale = payload.communication.language;
    const notifMeta = { storeName: data.store_name, bookingDate: data.booking_date, bookingTime: data.booking_time, communicationLanguage: locale };
    const tpl = getBeautyBookingNotificationTemplate("booking_created", notifMeta, data.id, locale);
    void createBeautyBookingNotification({
      user_id: String(data.customer_user_id),
      booking_id: data.id,
      event_type: "booking_created",
      title: tpl.title,
      message: tpl.body,
      metadata_json: notifMeta,
    }).catch(console.error);
  }

  // Support for Admin Notification
  void notifyAdminNewBooking(String(data.id), {
    customerName: payload.customer.name,
    storeName: data.store_name,
    bookingDate: data.booking_date,
    bookingTime: data.booking_time
  }).catch((err) => console.warn("[beauty-booking] admin notification failed", err));

  return {
    bookingId: String(data.id),
    status: "requested",
    createdAt: String(data.created_at),
  };
}

function mergeBookingImageMetadata(
  booking: BeautyBookingAdminRecord,
  imageRows: BeautyBookingImageSelectRow[],
): BeautyBookingAdminRecord {
  const currentImage = imageRows.find((row) => row.image_type === "current") ?? null;
  const styleImage = imageRows.find((row) => row.image_type === "style") ?? null;

  return {
    ...booking,
    hasCurrentImage: booking.hasCurrentImage || Boolean(currentImage?.storage_path),
    hasStyleImage: booking.hasStyleImage || Boolean(styleImage?.storage_path),
    currentImagePath: currentImage?.storage_path ?? null,
    styleImagePath: styleImage?.storage_path ?? null,
    currentImageName: currentImage?.original_file_name ?? null,
    styleImageName: styleImage?.original_file_name ?? null,
  };
}

async function attachBookingImageMetadata(
  client: ReturnType<typeof getSupabaseServerClient>,
  bookings: BeautyBookingAdminRecord[],
): Promise<BeautyBookingAdminRecord[]> {
  if (bookings.length === 0) {
    return bookings;
  }

  const bookingIds = bookings.map((booking) => booking.id);
  const { data, error } = await client
    .from("beauty_booking_request_images")
    .select("request_id, image_type, storage_path, original_file_name, bucket_name")
    .in("request_id", bookingIds);

  if (error || !data) {
    console.warn("[beauty-booking-server] image_metadata_fetch_failed", {
      code: error?.code,
      message: error?.message,
      bookingIds,
    });
    return bookings;
  }

  const imageRowsByBookingId = new Map<string, BeautyBookingImageSelectRow[]>();
  for (const row of data as BeautyBookingImageSelectRow[]) {
    const currentRows = imageRowsByBookingId.get(row.request_id) ?? [];
    currentRows.push(row);
    imageRowsByBookingId.set(row.request_id, currentRows);
  }

  return bookings.map((booking) =>
    mergeBookingImageMetadata(booking, imageRowsByBookingId.get(booking.id) ?? []),
  );
}

async function attachSingleBookingImageMetadata(
  client: ReturnType<typeof getSupabaseServerClient>,
  booking: BeautyBookingAdminRecord,
): Promise<BeautyBookingAdminRecord> {
  const [enriched] = await attachBookingImageMetadata(client, [booking]);
  return enriched ?? booking;
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
  const items = await attachBookingImageMetadata(client, ((data as unknown as BeautyBookingAdminSelectRow[] | null) ?? []).map(
    mapBeautyBookingRowToAdminRecord,
  ));

  if (!normalizedQuery) {
    return items;
  }

  return items.filter((item) => {
    const storeName = item.storeName.toLowerCase();
    const customerName = item.customerName.toLowerCase();
    const customerEmail = item.customerEmail?.toLowerCase() ?? "";
    return (
      storeName.includes(normalizedQuery) ||
      customerName.includes(normalizedQuery) ||
      customerEmail.includes(normalizedQuery)
    );
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

  return attachBookingImageMetadata(
    client,
    ((data as unknown as BeautyBookingAdminSelectRow[] | null) ?? []).map(
      mapBeautyBookingRowToAdminRecord,
    ),
  );
}

export async function listBeautyBookingSummaryForUser(
  customerUserId: string,
): Promise<BeautyBookingSummaryRecord[]> {
  if (!hasSupabaseServerAccess()) {
    throw new BeautyBookingStorageError("env_missing", {
      missingEnvVars: getMissingSupabaseServerEnvVars(),
    });
  }

  const client = getSupabaseServerClient();
  const { data, error } = await client
    .from(BEAUTY_BOOKING_TABLE)
    .select(BEAUTY_BOOKING_SUMMARY_SELECT)
    .eq("customer_user_id", customerUserId)
    .order("created_at", { ascending: false })
    .limit(3);

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

  return ((data as unknown as BeautyBookingSummarySelectRow[] | null) ?? []).map(
    mapBeautyBookingRowToSummaryRecord,
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

  const updatedRecord = await attachSingleBookingImageMetadata(
    client,
    mapBeautyBookingRowToAdminRecord(updatedRow as unknown as BeautyBookingAdminSelectRow),
  );

  // Dispatch Notification
  if (updatedRecord.customerUserId) {
    let eventType: BeautyBookingNotificationEventType = "booking_cancel_review_required";
    if (nextStatus === "confirmed") eventType = "booking_confirmed";
    else if (nextStatus === "completed") eventType = "booking_completed";
    else if (nextStatus === "canceled") eventType = "booking_canceled_by_customer";

    const locale = updatedRecord.communicationLanguage;
    const notifMeta = {
      storeName: updatedRecord.storeName,
      bookingDate: updatedRecord.bookingDate,
      bookingTime: updatedRecord.bookingTime,
      primaryServiceName: updatedRecord.primaryServiceName ?? "",
      communicationLanguage: locale,
    };
    const tpl = getBeautyBookingNotificationTemplate(eventType, notifMeta, bookingId, locale);
    void createBeautyBookingNotification({
      user_id: updatedRecord.customerUserId,
      booking_id: bookingId,
      event_type: eventType,
      title: tpl.title,
      message: tpl.body,
      metadata_json: notifMeta,
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

  const updatedRecord = await attachSingleBookingImageMetadata(
    client,
    mapBeautyBookingRowToAdminRecord(updatedRow as unknown as BeautyBookingAdminSelectRow),
  );

  // Dispatch Notification to customer
  if (updatedRecord.customerUserId) {
    const locale = updatedRecord.communicationLanguage;
    const notifMeta = {
      storeName: updatedRecord.storeName,
      bookingDate: updatedRecord.bookingDate,
      bookingTime: updatedRecord.bookingTime,
      reason: cancelReason.trim(),
      communicationLanguage: locale,
    };
    const tpl = getBeautyBookingNotificationTemplate("booking_canceled_by_customer", notifMeta, bookingId, locale);
    void createBeautyBookingNotification({
      user_id: updatedRecord.customerUserId,
      booking_id: bookingId,
      event_type: "booking_canceled_by_customer",
      title: tpl.title,
      message: tpl.body,
      metadata_json: notifMeta,
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

  const updatedRecord = await attachSingleBookingImageMetadata(
    client,
    mapBeautyBookingRowToAdminRecord(updatedRow as unknown as BeautyBookingAdminSelectRow),
  );

  // Dispatch Notification to customer (Acknowledgement)
  if (updatedRecord.customerUserId) {
    const locale = updatedRecord.communicationLanguage;
    const notifMeta = {
      storeName: updatedRecord.storeName,
      bookingDate: updatedRecord.bookingDate,
      bookingTime: updatedRecord.bookingTime,
      reason: changeReason.trim(),
      communicationLanguage: locale,
    };
    const tpl = getBeautyBookingNotificationTemplate("booking_change_requested", notifMeta, bookingId, locale);
    void createBeautyBookingNotification({
      user_id: updatedRecord.customerUserId,
      booking_id: bookingId,
      event_type: "booking_change_requested",
      title: tpl.title,
      message: tpl.body,
      metadata_json: notifMeta,
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

  const updatedRecord = await attachSingleBookingImageMetadata(
    client,
    mapBeautyBookingRowToAdminRecord(updatedRow as unknown as BeautyBookingAdminSelectRow),
  );

  // Dispatch Notification
  if (updatedRecord.customerUserId) {
    const eventType = action === "approved" ? "booking_change_approved" : "booking_change_rejected";
    const locale = updatedRecord.communicationLanguage;
    const notifMeta = {
      action,
      note,
      storeName: updatedRecord.storeName,
      bookingDate: updatedRecord.bookingDate,
      bookingTime: updatedRecord.bookingTime,
      reason: note,
      communicationLanguage: locale,
    };
    const tpl = getBeautyBookingNotificationTemplate(eventType, notifMeta, bookingId, locale);
    void createBeautyBookingNotification({
      user_id: updatedRecord.customerUserId,
      booking_id: bookingId,
      event_type: eventType,
      title: tpl.title,
      message: tpl.body,
      metadata_json: notifMeta,
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
  const dbUpdates: Record<string, unknown> = {
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

  return attachSingleBookingImageMetadata(
    client,
    mapBeautyBookingRowToAdminRecord(updatedRow as unknown as BeautyBookingAdminSelectRow),
  );
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

  const record = await attachSingleBookingImageMetadata(
    client,
    mapBeautyBookingRowToAdminRecord(updatedRow as unknown as BeautyBookingAdminSelectRow),
  );

  // Notify customer
  if (record.customerUserId) {
    const locale = record.communicationLanguage;
    const notifMeta = {
      items,
      note,
      storeName: record.storeName,
      bookingDate: record.bookingDate,
      bookingTime: record.bookingTime,
      communicationLanguage: locale,
    };
    const tpl = getBeautyBookingNotificationTemplate("alternative_offer_sent", notifMeta, bookingId, locale);
    void createBeautyBookingNotification({
      user_id: record.customerUserId,
      booking_id: bookingId,
      event_type: "alternative_offer_sent",
      title: tpl.title,
      message: tpl.body,
      metadata_json: notifMeta,
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

  const updates: Record<string, unknown> = {
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

  const record = await attachSingleBookingImageMetadata(
    client,
    mapBeautyBookingRowToAdminRecord(updatedRow as unknown as BeautyBookingAdminSelectRow),
  );

  // Notify customer
  if (record.customerUserId) {
    const eventType = response === "accepted" ? "alternative_offer_accepted" : "alternative_offer_rejected";
    const locale = record.communicationLanguage;
    const notifMeta = {
      storeName: record.storeName,
      bookingDate: record.bookingDate,
      bookingTime: record.bookingTime,
      response,
      communicationLanguage: locale,
    };
    const tpl = getBeautyBookingNotificationTemplate(eventType, notifMeta, bookingId, locale);
    void createBeautyBookingNotification({
      user_id: record.customerUserId,
      booking_id: bookingId,
      event_type: eventType,
      title: tpl.title,
      message: tpl.body,
      metadata_json: notifMeta,
    }).catch(console.error);
  }

  return record;
}

// ─────────────────────────────────────────────────────────────────────
// booking bucket signed URL 발급 헬퍼
// booking bucket은 private이므로 이미지 접근은 서버에서만 가능하다.
// 권한: 예약자 본인(customer_user_id) 또는 admin/super_admin
// ─────────────────────────────────────────────────────────────────────

export type BookingImageSignedUrlResult = {
  imageType: 'current' | 'style';
  storagePath: string;
  signedUrl: string | null;
  error: string | null;
};

/**
 * booking bucket의 예약 이미지에 대한 signed URL을 발급한다.
 * 발급 전 반드시 권한을 확인한다: 예약자 본인 또는 admin/super_admin만 허용.
 * signed URL 만료 시간: 3600초 (1시간)
 *
 * @param bookingId - 예약 ID
 * @param requestingUserId - 요청한 사용자의 auth UID
 * @returns signed URL 배열 (current/style 각각)
 */
export async function getBookingImageSignedUrls(
  bookingId: string,
  requestingUserId: string,
): Promise<BookingImageSignedUrlResult[]> {
  if (!hasSupabaseServerAccess()) {
    throw new BeautyBookingStorageError('env_missing', {
      missingEnvVars: getMissingSupabaseServerEnvVars(),
    });
  }

  const client = getSupabaseServerClient();

  // 1. 예약 소유자 확인
  const { data: bookingRow, error: bookingError } = await client
    .from(BEAUTY_BOOKING_TABLE)
    .select('id, customer_user_id')
    .eq('id', bookingId)
    .maybeSingle();

  if (bookingError || !bookingRow) {
    throw new BeautyBookingStorageError('not_found');
  }

  // 2. 권한 확인: 본인 또는 admin/super_admin
  const isOwner = bookingRow.customer_user_id === requestingUserId;

  if (!isOwner) {
    // admin/super_admin 여부 확인
    const { data: profileRow } = await client
      .from('profiles')
      .select('role')
      .eq('id', requestingUserId)
      .maybeSingle();

    const isAdmin = profileRow?.role === 'admin' || profileRow?.role === 'super_admin';

    if (!isAdmin) {
      console.warn('[getBookingImageSignedUrls] Forbidden access attempt', {
        bookingId,
        requestingUserId,
        ownerUserId: bookingRow.customer_user_id,
      });
      throw new BeautyBookingStorageError('forbidden_owner');
    }
  }

  // 3. 이미지 메타데이터 조회
  const { data: imageRows, error: imageError } = await client
    .from('beauty_booking_request_images')
    .select('image_type, storage_path')
    .eq('request_id', bookingId);

  if (imageError) {
    console.error('[getBookingImageSignedUrls] Failed to fetch image metadata', {
      bookingId,
      error: imageError.message,
    });
    return [];
  }

  if (!imageRows || imageRows.length === 0) {
    return [];
  }

  // 4. signed URL 일괄 발급 (만료: 3600초 = 1시간)
  const paths = imageRows.map((row) => row.storage_path);
  const { data: signedData, error: signedError } = await client.storage
    .from('booking')
    .createSignedUrls(paths, 3600);

  if (signedError) {
    console.error('[getBookingImageSignedUrls] createSignedUrls failed', {
      bookingId,
      paths,
      error: signedError.message,
    });
    return imageRows.map((row) => ({
      imageType: row.image_type as 'current' | 'style',
      storagePath: row.storage_path,
      signedUrl: null,
      error: signedError.message,
    }));
  }

  // path → signedUrl 매핑
  const signedMap = new Map<string, string>();
  signedData?.forEach((item) => {
    if (item.path && item.signedUrl) {
      signedMap.set(item.path, item.signedUrl);
    }
  });

  return imageRows.map((row) => ({
    imageType: row.image_type as 'current' | 'style',
    storagePath: row.storage_path,
    signedUrl: signedMap.get(row.storage_path) ?? null,
    error: signedMap.has(row.storage_path) ? null : 'signed URL not generated',
  }));
}

/**
 * 고객이 예약 제안서(quote)에 수락 또는 거절로 응답한다.
 * booking status, payment_status는 변경하지 않는다.
 */
export async function respondToQuote(
  bookingId: string,
  customerUserId: string,
  response: "accepted" | "rejected",
): Promise<BeautyBookingAdminRecord> {
  if (!hasSupabaseServerAccess()) {
    throw new BeautyBookingStorageError("env_missing", {
      missingEnvVars: getMissingSupabaseServerEnvVars(),
    });
  }

  const client = getSupabaseServerClient();

  const { data: currentRow, error: readError } = await client
    .from(BEAUTY_BOOKING_TABLE)
    .select("id, customer_user_id, quote_status")
    .eq("id", bookingId)
    .maybeSingle();

  if (readError) {
    if (isRecord(readError) && readError.code === "42P01") {
      throw new BeautyBookingStorageError("schema_missing", { table: BEAUTY_BOOKING_TABLE, code: readError.code });
    }
    throw new BeautyBookingStorageError("read_failed", { code: isRecord(readError) && typeof readError.code === "string" ? readError.code : undefined });
  }

  if (!currentRow) {
    throw new BeautyBookingStorageError("not_found");
  }

  if (currentRow.customer_user_id !== customerUserId) {
    throw new BeautyBookingStorageError("forbidden_owner");
  }

  if (currentRow.quote_status !== "pending") {
    throw new BeautyBookingStorageError("transition_not_allowed", {
      currentQuoteStatus: currentRow.quote_status,
      reason: "quote_status must be pending to respond",
    });
  }

  const now = new Date().toISOString();
  const { data: updatedRow, error: updateError } = await client
    .from(BEAUTY_BOOKING_TABLE)
    .update({
      quote_status: response satisfies BeautyBookingQuoteStatus,
      quote_responded_at: now,
      updated_at: now,
    })
    .eq("id", bookingId)
    .select(BEAUTY_BOOKING_ADMIN_SELECT)
    .single();

  if (updateError) {
    if (isRecord(updateError) && updateError.code === "42P01") {
      throw new BeautyBookingStorageError("schema_missing", { table: BEAUTY_BOOKING_TABLE, code: updateError.code });
    }
    throw new BeautyBookingStorageError("update_failed", { code: isRecord(updateError) && typeof updateError.code === "string" ? updateError.code : undefined });
  }

  const record = await attachSingleBookingImageMetadata(
    client,
    mapBeautyBookingRowToAdminRecord(updatedRow as unknown as BeautyBookingAdminSelectRow),
  );

  if (record.customerUserId) {
    const eventType = response === "accepted" ? "alternative_offer_accepted" : "alternative_offer_rejected";
    const locale = record.communicationLanguage;
    const notifMeta = {
      storeName: record.quoteShopName ?? record.storeName,
      bookingDate: record.quoteDate ?? record.bookingDate,
      bookingTime: record.quoteTime ?? record.bookingTime,
      quoteShopName: record.quoteShopName,
      quoteDate: record.quoteDate,
      quoteTime: record.quoteTime,
      response,
      communicationLanguage: locale,
    };
    const tpl = getBeautyBookingNotificationTemplate(eventType, notifMeta, bookingId, locale);
    void createBeautyBookingNotification({
      user_id: record.customerUserId,
      booking_id: bookingId,
      event_type: eventType,
      title: tpl.title,
      message: tpl.body,
      metadata_json: notifMeta,
    }).catch(console.error);
  }

  return record;
}

export type SendBookingQuotePayload = {
  quoteShopName: string;
  quoteShopAddress: string;
  quoteServiceName: string;
  quoteDate: string;
  quoteTime: string;
  quoteTotalPrice: number;
  quoteCurrency: string;
  quoteNote: string;
  quoteExpiresAt: string | null;
};

/**
 * 운영자가 예약 제안서를 저장/발송한다.
 * quote_status = "pending", quote_sent_at = now, quote_responded_at = null
 * booking status 및 payment_status는 변경하지 않는다.
 */
export async function sendBookingQuote(
  bookingId: string,
  payload: SendBookingQuotePayload,
): Promise<BeautyBookingAdminRecord> {
  if (!hasSupabaseServerAccess()) {
    throw new BeautyBookingStorageError("env_missing", {
      missingEnvVars: getMissingSupabaseServerEnvVars(),
    });
  }

  const client = getSupabaseServerClient();

  const { data: existing, error: readError } = await client
    .from(BEAUTY_BOOKING_TABLE)
    .select("id")
    .eq("id", bookingId)
    .maybeSingle();

  if (readError) {
    if (isRecord(readError) && readError.code === "42P01") {
      throw new BeautyBookingStorageError("schema_missing", { table: BEAUTY_BOOKING_TABLE, code: readError.code });
    }
    throw new BeautyBookingStorageError("read_failed", { code: isRecord(readError) && typeof readError.code === "string" ? readError.code : undefined });
  }

  if (!existing) {
    throw new BeautyBookingStorageError("not_found");
  }

  const now = new Date().toISOString();
  const { data: updatedRow, error: updateError } = await client
    .from(BEAUTY_BOOKING_TABLE)
    .update({
      quote_shop_name: payload.quoteShopName,
      quote_shop_address: payload.quoteShopAddress,
      quote_service_name: payload.quoteServiceName,
      quote_date: payload.quoteDate,
      quote_time: payload.quoteTime,
      quote_total_price: payload.quoteTotalPrice,
      quote_currency: payload.quoteCurrency || 'USD',
      quote_note: payload.quoteNote,
      quote_expires_at: payload.quoteExpiresAt ?? null,
      quote_status: "pending" satisfies BeautyBookingQuoteStatus,
      quote_sent_at: now,
      quote_responded_at: null,
      updated_at: now,
    })
    .eq("id", bookingId)
    .select(BEAUTY_BOOKING_ADMIN_SELECT)
    .single();

  if (updateError) {
    if (isRecord(updateError) && updateError.code === "42P01") {
      throw new BeautyBookingStorageError("schema_missing", { table: BEAUTY_BOOKING_TABLE, code: updateError.code });
    }
    throw new BeautyBookingStorageError("update_failed", { code: isRecord(updateError) && typeof updateError.code === "string" ? updateError.code : undefined });
  }

  return attachSingleBookingImageMetadata(
    client,
    mapBeautyBookingRowToAdminRecord(updatedRow as unknown as BeautyBookingAdminSelectRow),
  );
}
