import type { BeautyBookingPayload } from "@/app/explore/beautyBooking";
import type {
  BookingFlowCategory,
  BookingServiceMenuConfig,
  BookingServiceMenuItem,
  BookingServiceMenuSection,
} from "@/lib/bookings/bookingFlowSkeleton/types";
import { getSupabaseServerClient, hasSupabaseServerAccess } from "@/lib/supabaseServer";

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

type CategoryRow = {
  id: string;
  name: string | null;
  order_index: number | null;
};

type MenuItemRow = {
  id: string;
  category_id: string | null;
  name: string | null;
  price_type: string | null;
  price: number | null;
  price_min: number | null;
  price_max: number | null;
  duration_min: number | null;
  order_index: number | null;
};

type MenuItemOptionRow = {
  id: string;
  menu_item_id: string;
  name: string | null;
  price: number | null;
};

const UNCATEGORIZED_SECTION_ID = "uncategorized";

function normalizePriceType(value: string | null): PartnerMenuPriceType {
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

/**
 * Kello Partner의 categories/menu_items/menu_item_options를 읽어
 * Kello(고객 앱)의 BookingServiceMenuConfig 형태로 변환한다.
 * - visible=true AND review_status='approved'인 메뉴만 노출한다.
 * - 반환되는 config.category는 호출자가 넘긴 category(BookingFlowCategory)를 그대로 사용한다.
 *   (Kello Partner의 categories.name은 store별 자유 텍스트이며 esthetic<->aesthetic 같은
 *   business_type 매핑 대상이 아니다.)
 */
export async function loadPartnerServiceMenu(
  storeId: string,
  category: BookingFlowCategory,
): Promise<PartnerMenuServiceConfig | null> {
  if (!storeId || !hasSupabaseServerAccess()) {
    return null;
  }

  const supabase = getSupabaseServerClient();

  const [categoriesResult, menuItemsResult] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, order_index")
      .eq("store_id", storeId)
      .order("order_index", { ascending: true }),
    supabase
      .from("menu_items")
      .select("id, category_id, name, price_type, price, price_min, price_max, duration_min, order_index")
      .eq("store_id", storeId)
      .eq("visible", true)
      .eq("review_status", "approved")
      .order("order_index", { ascending: true }),
  ]);

  if (categoriesResult.error) {
    console.error("[partnerMenu] Failed to load categories:", categoriesResult.error.message);
    return null;
  }

  if (menuItemsResult.error) {
    console.error("[partnerMenu] Failed to load menu_items:", menuItemsResult.error.message);
    return null;
  }

  const categories = (categoriesResult.data ?? []) as CategoryRow[];
  const menuItems = (menuItemsResult.data ?? []) as MenuItemRow[];

  let optionsByMenuItemId = new Map<string, PartnerMenuItemOption[]>();

  if (menuItems.length > 0) {
    const { data: optionRows, error: optionsError } = await supabase
      .from("menu_item_options")
      .select("id, menu_item_id, name, price")
      .in("menu_item_id", menuItems.map((item) => item.id));

    if (optionsError) {
      console.error("[partnerMenu] Failed to load menu_item_options:", optionsError.message);
    } else {
      optionsByMenuItemId = new Map();
      for (const row of (optionRows ?? []) as MenuItemOptionRow[]) {
        const list = optionsByMenuItemId.get(row.menu_item_id) ?? [];
        list.push({ id: row.id, name: row.name ?? "", price: row.price ?? 0 });
        optionsByMenuItemId.set(row.menu_item_id, list);
      }
    }
  }

  function toServiceItem(row: MenuItemRow): PartnerMenuServiceItem {
    const priceType = normalizePriceType(row.price_type);
    const priceLabel = formatPartnerMenuItemPriceLabel({
      priceType,
      price: row.price,
      priceMin: row.price_min,
      priceMax: row.price_max,
    });

    return {
      id: row.id,
      title: row.name ?? "",
      description: row.duration_min ? `${row.duration_min}분` : "",
      durationMinutes: row.duration_min ?? null,
      priceLabel,
      priceType,
      price: row.price,
      priceMin: row.price_min,
      priceMax: row.price_max,
      durationMin: row.duration_min ?? null,
      addOns: optionsByMenuItemId.get(row.id) ?? [],
    };
  }

  const sections: PartnerMenuServiceSection[] = categories.map((categoryRow) => ({
    id: categoryRow.id,
    title: categoryRow.name ?? "",
    items: menuItems.filter((item) => item.category_id === categoryRow.id).map(toServiceItem),
  }));

  const categoryIds = new Set(categories.map((categoryRow) => categoryRow.id));
  const uncategorizedItems = menuItems
    .filter((item) => !item.category_id || !categoryIds.has(item.category_id))
    .map(toServiceItem);

  if (uncategorizedItems.length > 0) {
    sections.push({
      id: UNCATEGORIZED_SECTION_ID,
      title: "기타",
      items: uncategorizedItems,
    });
  }

  return {
    category,
    title: "",
    description: "",
    sections,
  };
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
