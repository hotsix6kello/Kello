import { NextRequest, NextResponse } from "next/server";
import { requireAdminRouteAccess } from "@/lib/admin/adminRouteAccess.ts";
import { getSupabaseServerClient } from "@/lib/supabaseServer.ts";
import { handleAdminRouteError, jsonFailure } from "@/lib/admin/adminApiResponse.ts";
import {
  isPartnerStoreListStatusFilter,
  type PartnerStoreListItem,
} from "@/lib/admin/partnerStoreAdmin.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StoreRow = {
  id: string;
  name: string | null;
  business_types: string[] | null;
  address: string | null;
  published: boolean | null;
  review_status: string | null;
  created_at: string | null;
};

function countByStoreId(rows: { store_id: string }[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.store_id, (counts.get(row.store_id) ?? 0) + 1);
  }
  return counts;
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminRouteAccess(request);

    const statusParam = request.nextUrl.searchParams.get("status") ?? "pending";
    const status = isPartnerStoreListStatusFilter(statusParam) ? statusParam : "pending";

    const client = getSupabaseServerClient();

    let storesQuery = client
      .from("stores")
      .select("id, name, business_types, address, published, review_status, created_at")
      .order("created_at", { ascending: false });

    if (status !== "all") {
      storesQuery = storesQuery.eq("review_status", status);
    }

    const { data: storeRows, error: storesError } = await storesQuery;

    if (storesError) {
      console.error("[admin-partner-stores] stores_fetch_failed", storesError.message);
      return jsonFailure("failed to fetch partner stores", 500);
    }

    const stores = (storeRows ?? []) as StoreRow[];
    const storeIds = stores.map((store) => store.id);

    let pendingMenuItemCounts = new Map<string, number>();
    let pendingPhotoCounts = new Map<string, number>();

    if (storeIds.length > 0) {
      const [menuItemsResult, photosResult] = await Promise.all([
        client
          .from("menu_items")
          .select("store_id")
          .in("store_id", storeIds)
          .eq("review_status", "pending"),
        client
          .from("photos")
          .select("store_id")
          .in("store_id", storeIds)
          .eq("review_status", "pending"),
      ]);

      if (menuItemsResult.error) {
        console.error("[admin-partner-stores] pending_menu_items_fetch_failed", menuItemsResult.error.message);
      } else {
        pendingMenuItemCounts = countByStoreId((menuItemsResult.data ?? []) as { store_id: string }[]);
      }

      if (photosResult.error) {
        console.error("[admin-partner-stores] pending_photos_fetch_failed", photosResult.error.message);
      } else {
        pendingPhotoCounts = countByStoreId((photosResult.data ?? []) as { store_id: string }[]);
      }
    }

    const items: PartnerStoreListItem[] = stores.map((store) => ({
      id: store.id,
      name: store.name,
      businessTypes: store.business_types ?? [],
      address: store.address,
      published: store.published ?? false,
      reviewStatus: (store.review_status as PartnerStoreListItem["reviewStatus"]) ?? "pending",
      createdAt: store.created_at,
      pendingMenuItemsCount: pendingMenuItemCounts.get(store.id) ?? 0,
      pendingPhotosCount: pendingPhotoCounts.get(store.id) ?? 0,
    }));

    return NextResponse.json({ ok: true, items });
  } catch (error) {
    const adminFailure = handleAdminRouteError(error, "admin-partner-stores");
    if (adminFailure) return adminFailure;
    console.error("[admin-partner-stores] unexpected_failure", error);
    return jsonFailure("failed to fetch partner stores", 500);
  }
}
