import type {
  BookingFlowCategory,
} from "@/lib/bookings/bookingFlowSkeleton/types";
import {
  formatPartnerMenuItemPriceLabel,
  normalizePartnerMenuPriceType,
  type PartnerMenuItemOption,
  type PartnerMenuServiceConfig,
  type PartnerMenuServiceItem,
  type PartnerMenuServiceSection,
} from "@/lib/bookings/partnerMenuShared";
import { getSupabaseServerClient, hasSupabaseServerAccess } from "@/lib/supabaseServer";

export * from "@/lib/bookings/partnerMenuShared";

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
    const priceType = normalizePartnerMenuPriceType(row.price_type);
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
