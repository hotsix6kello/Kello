import type { BeautyBookingPayload } from "@/app/explore/beautyBooking";
import type {
  BookingServiceMenuConfig,
  BookingServiceMenuItem,
  BookingServiceMenuSection,
} from "@/lib/bookings/bookingFlowSkeleton/types";

/**
 * Kello Partner 제휴 매장 메뉴와 관련된 타입/순수 함수 모음.
 * supabaseServer를 사용하지 않으므로 클라이언트 컴포넌트에서도 안전하게 import할 수 있다.
 * 서버 전용 로더(loadPartnerServiceMenu)는 partnerMenu.ts에 있다.
 */

export type PartnerMenuPriceType = "fixed" | "from" | "range";

export type PartnerMenuItemOption = {
  id: string;
  name: string;
  price: number;
};

export type PartnerMenuServiceItem = BookingServiceMenuItem & {
  priceType: PartnerMenuPriceType;
  price: number | null;
  priceMin: number | null;
  priceMax: number | null;
  durationMin: number | null;
  addOns: PartnerMenuItemOption[];
};

export type PartnerMenuServiceSection = Omit<BookingServiceMenuSection, "items"> & {
  items: PartnerMenuServiceItem[];
};

export type PartnerMenuServiceConfig = Omit<BookingServiceMenuConfig, "sections"> & {
  sections: PartnerMenuServiceSection[];
};

export function normalizePartnerMenuPriceType(value: string | null): PartnerMenuPriceType {
  return value === "from" || value === "range" ? value : "fixed";
}

function formatWon(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}원`;
}

/** 메뉴 항목의 price_type에 따라 화면에 보여줄 가격 라벨을 만든다. */
export function formatPartnerMenuItemPriceLabel(item: {
  priceType: PartnerMenuPriceType;
  price: number | null;
  priceMin: number | null;
  priceMax: number | null;
}): string | null {
  switch (item.priceType) {
    case "fixed":
      return item.price !== null ? formatWon(item.price) : null;
    case "from":
      return item.price !== null ? `${formatWon(item.price)}~ (최소가)` : null;
    case "range":
      if (item.priceMin !== null && item.priceMax !== null) {
        return `${formatWon(item.priceMin)} ~ ${formatWon(item.priceMax)} (예상 범위)`;
      }
      return item.priceMin !== null ? `${formatWon(item.priceMin)}~ (예상 범위)` : null;
    default:
      return null;
  }
}

/** id로 메뉴 항목을 찾는다 (선택된 시술의 가격 계산 등에 사용). */
export function findPartnerMenuItemById(
  menu: PartnerMenuServiceConfig | null | undefined,
  itemId: string | null | undefined,
): PartnerMenuServiceItem | null {
  if (!menu || !itemId) {
    return null;
  }

  for (const section of menu.sections) {
    const found = section.items.find((item) => item.id === itemId);
    if (found) {
      return found;
    }
  }

  return null;
}

/**
 * 선택된 제휴 매장 메뉴 항목의 price_type에 따라 예약 결제 요약(priceSummary)을 계산한다.
 * - fixed: price를 그대로 사용
 * - from : price를 "최소가"로 사용
 * - range: price_min을 기준가로 사용 (price_max는 "예상 범위"로 화면 표시용, 합계에는 포함하지 않음)
 * 최종 확정 금액은 이후 견적/운영자 플로우에서 조정된다.
 */
export function resolvePartnerMenuItemPriceSummary(
  item: PartnerMenuServiceItem | null | undefined,
  selectedAddOnIds: string[] = [],
): BeautyBookingPayload["priceSummary"] {
  if (!item) {
    return { basePrice: 0, addOnPrice: 0, designerSurcharge: 0, totalPrice: 0 };
  }

  let basePrice = 0;
  switch (item.priceType) {
    case "fixed":
      basePrice = item.price ?? 0;
      break;
    case "from":
      basePrice = item.price ?? 0;
      break;
    case "range":
      basePrice = item.priceMin ?? 0;
      break;
  }

  const addOnPrice = item.addOns
    .filter((option) => selectedAddOnIds.includes(option.id))
    .reduce((sum, option) => sum + (option.price ?? 0), 0);

  return {
    basePrice,
    addOnPrice,
    designerSurcharge: 0,
    totalPrice: basePrice + addOnPrice,
  };
}
