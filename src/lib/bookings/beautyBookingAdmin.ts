export type BeautyBookingQuoteStatus = "pending" | "accepted" | "rejected" | "expired";

export function isBeautyBookingQuoteStatus(value: unknown): value is BeautyBookingQuoteStatus {
  return value === "pending" || value === "accepted" || value === "rejected" || value === "expired";
}

export type BeautyBookingAdminStatus =
  | "requested"
  | "confirmed"
  | "completed"
  | "canceled"
  | "failed"
  | "change_requested";

export type BeautyBookingChangeRequestStatus = "approved" | "rejected" | "pending";

export type BeautyBookingOperatorStatus = 
  | "pending_assignment"
  | "awaiting_shop_reply"
  | "awaiting_customer_reply"
  | "alternative_time_needed"
  | "ready_to_confirm"
  | "unable_to_book";

export type BeautyBookingAlternativeOfferStatus = "offered" | "accepted" | "rejected" | "none";

export type BeautyBookingAlternativeOfferItem = {
  date: string;
  time: string;
};

export const BEAUTY_BOOKING_OPERATOR_STATUS_LABELS: Record<BeautyBookingOperatorStatus, string> = {
  pending_assignment: "배정 대기",
  awaiting_shop_reply: "매장 답변 대기",
  awaiting_customer_reply: "고객 답변 대기",
  alternative_time_needed: "대안 시간 필요",
  ready_to_confirm: "확정 준비 완료",
  unable_to_book: "예약 불가",
};

export type BeautyBookingCancelActor = "customer" | "admin";

export type BeautyBookingAdminListStatus = BeautyBookingAdminStatus | "all";

export type BeautyBookingAdminRecord = {
  id: string;
  customerUserId: string | null;
  createdAt: string;
  updatedAt: string;
  status: BeautyBookingAdminStatus;
  canceledAt: string | null;
  canceledBy: BeautyBookingCancelActor | null;
  cancelReason: string;
  changeRequestedAt: string | null;
  changeReason: string;
  statusBeforeChangeRequest: BeautyBookingAdminStatus | null;
  changeRequestStatus: BeautyBookingChangeRequestStatus | null;
  changeReviewedAt: string | null;
  changeReviewedBy: string | null;
  changeReviewNote: string;
  // Alternative offer fields
  alternativeOfferStatus: BeautyBookingAlternativeOfferStatus;
  alternativeOfferItems: BeautyBookingAlternativeOfferItem[];
  alternativeOfferNote: string;
  alternativeOfferedAt: string | null;
  alternativeOfferedBy: string | null;
  alternativeResponseAt: string | null;
  // Operator-specific internal fields
  operatorStatus: BeautyBookingOperatorStatus;
  internalNote: string;
  shopContacted: boolean;
  customerContacted: boolean;
  followUpNeeded: boolean;
  category: "beauty";
  beautyCategory: string;
  region: string;
  storeId: string;
  storeName: string;
  storeSource: "google" | "partner";
  bookingDate: string;
  bookingTime: string;
  designerId: string | null;
  designerName: string | null;
  primaryServiceId: string | null;
  primaryServiceName: string | null;
  addOnIds: string[];
  addOnNames: string[];
  basePrice: number;
  addOnPrice: number;
  designerSurcharge: number;
  totalPrice: number;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string;
  customerRequest: string;
  imageUrls: string[];
  currentImageUrl: string | null;
  styleImageUrl: string | null;
  hasCurrentImage: boolean;
  hasStyleImage: boolean;
  currentImagePath: string | null;
  styleImagePath: string | null;
  currentImageName: string | null;
  styleImageName: string | null;
  communicationLanguage: string;
  communicationIntent: string;
  koreanMessage: string;
  localizedMessage: string;
  agreements: {
    serviceTermsAgreed: boolean;
    privacyPolicyAgreed: boolean;
    thirdPartySharingAgreed: boolean;
    marketingConsentAgreed: boolean;
    refundPolicyAgreed: boolean;
    refundPolicyAgreedAt: string | null;
  };
  createdFromFlow: string;
  // Quote fields
  quoteShopName: string | null;
  quoteShopAddress: string | null;
  quoteServiceName: string | null;
  quoteDate: string | null;
  quoteTime: string | null;
  quoteTotalPrice: number | null;
  quoteCurrency: string | null;
  quoteNote: string | null;
  quoteExpiresAt: string | null;
  quoteStatus: BeautyBookingQuoteStatus | null;
  quoteSentAt: string | null;
  quoteRespondedAt: string | null;
  // Payment fields
  paymentStatus: string | null;
  paymentMethod: string | null;
  paymentTransactionId: string | null;
  paypalOrderId: string | null;
  paypalCaptureId: string | null;
  paidAt: string | null;
  // Coupon fields
  couponId: string | null;
  couponDiscountAmount: number | null;
  paidAmount: number | null;
};

export type BeautyBookingAdminListFilters = {
  status?: BeautyBookingAdminListStatus | null;
  beautyCategory?: string | null;
  query?: string | null;
};

export const BEAUTY_BOOKING_ADMIN_STATUSES: BeautyBookingAdminStatus[] = [
  "requested",
  "confirmed",
  "completed",
  "canceled",
  "failed",
  "change_requested",
];

export const BEAUTY_BOOKING_CUSTOMER_CANCELABLE_STATUSES: BeautyBookingAdminStatus[] = [
  "requested",
  "confirmed",
  "change_requested",
];

export const BEAUTY_BOOKING_CUSTOMER_CHANGEABLE_STATUSES: BeautyBookingAdminStatus[] = [
  "requested",
  "confirmed",
];

export const BEAUTY_BOOKING_ALLOWED_TRANSITIONS: Record<
  BeautyBookingAdminStatus,
  BeautyBookingAdminStatus[]
> = {
  requested: ["confirmed", "canceled", "change_requested"],
  confirmed: ["completed", "canceled", "change_requested"],
  completed: [],
  canceled: [],
  failed: [],
  change_requested: ["confirmed", "canceled"],
};

export function isBeautyBookingAdminStatus(value: unknown): value is BeautyBookingAdminStatus {
  return typeof value === "string" && BEAUTY_BOOKING_ADMIN_STATUSES.includes(value as BeautyBookingAdminStatus);
}

export function isBeautyBookingCancelActor(value: unknown): value is BeautyBookingCancelActor {
  return value === "customer" || value === "admin";
}

export function isBeautyBookingCustomerCancelableStatus(
  value: BeautyBookingAdminStatus,
) {
  return BEAUTY_BOOKING_CUSTOMER_CANCELABLE_STATUSES.includes(value);
}

export function isBeautyBookingCustomerChangeableStatus(
  value: BeautyBookingAdminStatus,
) {
  return BEAUTY_BOOKING_CUSTOMER_CHANGEABLE_STATUSES.includes(value);
}

export function normalizeBeautyBookingAdminListStatus(
  value: string | null | undefined,
): BeautyBookingAdminListStatus {
  if (!value || value === "all") {
    return "all";
  }

  return isBeautyBookingAdminStatus(value) ? value : "all";
}
