import type { BookingFlowCategory } from "@/lib/bookings/bookingFlowSkeleton/types";

/**
 * Kello Partner의 stores.business_types 값.
 * Kello(고객 앱)의 BookingFlowCategory와 동일한 항목이지만,
 * "에스테틱" 카테고리만 명칭이 다르다 (esthetic <-> aesthetic).
 */
export const PARTNER_BUSINESS_TYPES = [
  "hair",
  "nail",
  "eyelash",
  "makeup",
  "esthetic",
  "waxing",
] as const;

export type PartnerBusinessType = (typeof PARTNER_BUSINESS_TYPES)[number];

const PARTNER_BUSINESS_TYPE_TO_BOOKING_FLOW_CATEGORY: Record<PartnerBusinessType, BookingFlowCategory> = {
  hair: "hair",
  nail: "nail",
  eyelash: "eyelash",
  makeup: "makeup",
  esthetic: "aesthetic",
  waxing: "waxing",
};

const BOOKING_FLOW_CATEGORY_TO_PARTNER_BUSINESS_TYPE: Record<BookingFlowCategory, PartnerBusinessType> = {
  hair: "hair",
  nail: "nail",
  eyelash: "eyelash",
  makeup: "makeup",
  aesthetic: "esthetic",
  waxing: "waxing",
};

export function isPartnerBusinessType(value: unknown): value is PartnerBusinessType {
  return typeof value === "string" && (PARTNER_BUSINESS_TYPES as readonly string[]).includes(value);
}

/** Kello Partner의 business_type 값을 Kello(고객 앱)의 BookingFlowCategory로 변환한다. */
export function mapPartnerBusinessTypeToBookingFlowCategory(
  businessType: PartnerBusinessType,
): BookingFlowCategory {
  return PARTNER_BUSINESS_TYPE_TO_BOOKING_FLOW_CATEGORY[businessType];
}

/** Kello(고객 앱)의 BookingFlowCategory를 Kello Partner의 business_type 값으로 변환한다. */
export function mapBookingFlowCategoryToPartnerBusinessType(
  category: BookingFlowCategory,
): PartnerBusinessType {
  return BOOKING_FLOW_CATEGORY_TO_PARTNER_BUSINESS_TYPE[category];
}
