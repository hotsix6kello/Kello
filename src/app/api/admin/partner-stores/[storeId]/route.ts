import { NextRequest, NextResponse } from "next/server";
import { requireAdminRouteAccess } from "@/lib/admin/adminRouteAccess.ts";
import { getSupabaseServerClient } from "@/lib/supabaseServer.ts";
import { handleAdminRouteError, jsonFailure } from "@/lib/admin/adminApiResponse.ts";
import {
  STORE_PHOTOS_BUCKET,
  STORE_PHOTOS_SIGNED_URL_EXPIRES_SECONDS,
  type PartnerStoreBusinessHours,
  type PartnerStoreCategory,
  type PartnerStoreDetailStore,
  type PartnerStoreMenuItem,
  type PartnerStoreMenuItemOption,
  type PartnerStorePhoto,
  type PartnerStoreReviewPatchBody,
} from "@/lib/admin/partnerStoreAdmin.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StoreRow = {
  id: string;
  owner_id: string | null;
  name: string | null;
  business_types: string[] | null;
  address: string | null;
  phone: string | null;
  capacity: number | null;
  lead_time_hours: number | null;
  slot_interval_minutes: number | null;
  published: boolean | null;
  review_status: string | null;
  review_reason: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string | null;
};

type CategoryRow = {
  id: string;
  store_id: string;
  name: string | null;
  order_index: number | null;
};

type MenuItemRow = {
  id: string;
  store_id: string;
  category_id: string | null;
  name: string | null;
  price_type: string | null;
  price: number | null;
  price_min: number | null;
  price_max: number | null;
  duration_min: number | null;
  visible: boolean | null;
  review_status: string | null;
  order_index: number | null;
};

type MenuItemOptionRow = {
  id: string;
  menu_item_id: string;
  name: string | null;
  price: number | null;
};

type BusinessHoursRow = {
  store_id: string;
  day_of_week: number;
  is_open: boolean | null;
  start_time: string | null;
  end_time: string | null;
  break_start_time: string | null;
  break_end_time: string | null;
};

type PhotoRow = {
  id: string;
  store_id: string;
  slot_type: string | null;
  slot_index: number | null;
  storage_path: string;
  review_status: string | null;
  category_id: string | null;
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ storeId: string }> }) {
  try {
    await requireAdminRouteAccess(request);

    const { storeId } = await params;
    if (!storeId) {
      return jsonFailure("store id is required", 400);
    }

    const client = getSupabaseServerClient();

    const [storeResult, categoriesResult, menuItemsResult, businessHoursResult, photosResult] = await Promise.all([
      client.from("stores").select("*").eq("id", storeId).maybeSingle(),
      client
        .from("categories")
        .select("id, store_id, name, order_index")
        .eq("store_id", storeId)
        .order("order_index", { ascending: true }),
      client
        .from("menu_items")
        .select(
          "id, store_id, category_id, name, price_type, price, price_min, price_max, duration_min, visible, review_status, order_index",
        )
        .eq("store_id", storeId)
        .order("order_index", { ascending: true }),
      client
        .from("business_hours")
        .select("store_id, day_of_week, is_open, start_time, end_time, break_start_time, break_end_time")
        .eq("store_id", storeId)
        .order("day_of_week", { ascending: true }),
      client
        .from("photos")
        .select("id, store_id, slot_type, slot_index, storage_path, review_status, category_id")
        .eq("store_id", storeId),
    ]);

    if (storeResult.error) {
      console.error("[admin-partner-store-detail] store_fetch_failed", storeResult.error.message);
      return jsonFailure("failed to fetch partner store", 500);
    }

    const storeRow = storeResult.data as StoreRow | null;
    if (!storeRow) {
      return jsonFailure("store not found", 404);
    }

    if (categoriesResult.error) {
      console.error("[admin-partner-store-detail] categories_fetch_failed", categoriesResult.error.message);
    }
    if (menuItemsResult.error) {
      console.error("[admin-partner-store-detail] menu_items_fetch_failed", menuItemsResult.error.message);
    }
    if (businessHoursResult.error) {
      console.error("[admin-partner-store-detail] business_hours_fetch_failed", businessHoursResult.error.message);
    }
    if (photosResult.error) {
      console.error("[admin-partner-store-detail] photos_fetch_failed", photosResult.error.message);
    }

    const menuItemRows = (menuItemsResult.data ?? []) as MenuItemRow[];
    const optionsByMenuItemId = new Map<string, PartnerStoreMenuItemOption[]>();

    if (menuItemRows.length > 0) {
      const { data: optionRows, error: optionsError } = await client
        .from("menu_item_options")
        .select("id, menu_item_id, name, price")
        .in(
          "menu_item_id",
          menuItemRows.map((item) => item.id),
        );

      if (optionsError) {
        console.error("[admin-partner-store-detail] menu_item_options_fetch_failed", optionsError.message);
      } else {
        for (const option of (optionRows ?? []) as MenuItemOptionRow[]) {
          const list = optionsByMenuItemId.get(option.menu_item_id) ?? [];
          list.push({
            id: option.id,
            menuItemId: option.menu_item_id,
            name: option.name,
            price: option.price,
          });
          optionsByMenuItemId.set(option.menu_item_id, list);
        }
      }
    }

    const photoRows = (photosResult.data ?? []) as PhotoRow[];
    const signedUrlByPath = new Map<string, string>();

    if (photoRows.length > 0) {
      const paths = photoRows.map((photo) => photo.storage_path);
      const { data: signedData, error: signedError } = await client.storage
        .from(STORE_PHOTOS_BUCKET)
        .createSignedUrls(paths, STORE_PHOTOS_SIGNED_URL_EXPIRES_SECONDS);

      if (signedError) {
        console.error("[admin-partner-store-detail] create_signed_urls_failed", signedError.message);
      } else {
        for (const item of signedData ?? []) {
          if (item.path && item.signedUrl) {
            signedUrlByPath.set(item.path, item.signedUrl);
          }
        }
      }
    }

    const store: PartnerStoreDetailStore = {
      id: storeRow.id,
      ownerId: storeRow.owner_id,
      name: storeRow.name,
      businessTypes: storeRow.business_types ?? [],
      address: storeRow.address,
      phone: storeRow.phone,
      capacity: storeRow.capacity,
      leadTimeHours: storeRow.lead_time_hours,
      slotIntervalMinutes: storeRow.slot_interval_minutes,
      published: storeRow.published ?? false,
      reviewStatus: (storeRow.review_status as PartnerStoreDetailStore["reviewStatus"]) ?? "pending",
      reviewReason: storeRow.review_reason,
      latitude: storeRow.latitude,
      longitude: storeRow.longitude,
      createdAt: storeRow.created_at,
    };

    const categories: PartnerStoreCategory[] = ((categoriesResult.data ?? []) as CategoryRow[]).map((category) => ({
      id: category.id,
      storeId: category.store_id,
      name: category.name,
      orderIndex: category.order_index,
    }));

    const menuItems: PartnerStoreMenuItem[] = menuItemRows.map((item) => ({
      id: item.id,
      storeId: item.store_id,
      categoryId: item.category_id,
      name: item.name,
      priceType: item.price_type,
      price: item.price,
      priceMin: item.price_min,
      priceMax: item.price_max,
      durationMin: item.duration_min,
      visible: item.visible ?? false,
      reviewStatus: (item.review_status as PartnerStoreMenuItem["reviewStatus"]) ?? "pending",
      orderIndex: item.order_index,
      options: optionsByMenuItemId.get(item.id) ?? [],
    }));

    const businessHours: PartnerStoreBusinessHours[] = ((businessHoursResult.data ?? []) as BusinessHoursRow[]).map(
      (hours) => ({
        storeId: hours.store_id,
        dayOfWeek: hours.day_of_week,
        isOpen: hours.is_open ?? false,
        startTime: hours.start_time,
        endTime: hours.end_time,
        breakStartTime: hours.break_start_time,
        breakEndTime: hours.break_end_time,
      }),
    );

    const photos: PartnerStorePhoto[] = photoRows.map((photo) => ({
      id: photo.id,
      storeId: photo.store_id,
      slotType: photo.slot_type,
      slotIndex: photo.slot_index,
      storagePath: photo.storage_path,
      reviewStatus: (photo.review_status as PartnerStorePhoto["reviewStatus"]) ?? "pending",
      categoryId: photo.category_id,
      signedUrl: signedUrlByPath.get(photo.storage_path) ?? null,
    }));

    return NextResponse.json({
      ok: true,
      store,
      categories,
      menuItems,
      businessHours,
      photos,
    });
  } catch (error) {
    const adminFailure = handleAdminRouteError(error, "admin-partner-store-detail");
    if (adminFailure) return adminFailure;
    console.error("[admin-partner-store-detail] unexpected_failure", error);
    return jsonFailure("failed to fetch partner store", 500);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ storeId: string }> }) {
  try {
    await requireAdminRouteAccess(request);

    const { storeId } = await params;
    if (!storeId) {
      return jsonFailure("store id is required", 400);
    }

    const body = (await request.json()) as Partial<PartnerStoreReviewPatchBody>;

    if (body.review_status !== "approved" && body.review_status !== "rejected") {
      return jsonFailure("review_status must be 'approved' or 'rejected'", 400);
    }

    const updatePayload: { review_status: "approved" | "rejected"; review_reason?: string | null } = {
      review_status: body.review_status,
    };

    if (Object.prototype.hasOwnProperty.call(body, "review_reason")) {
      updatePayload.review_reason = typeof body.review_reason === "string" ? body.review_reason : null;
    }

    const client = getSupabaseServerClient();
    const { data, error } = await client
      .from("stores")
      .update(updatePayload)
      .eq("id", storeId)
      .select("id, review_status, review_reason")
      .maybeSingle();

    if (error) {
      console.error("[admin-partner-store-detail] review_update_failed", error.message);
      return jsonFailure("failed to update store review status", 500);
    }

    if (!data) {
      return jsonFailure("store not found", 404);
    }

    return NextResponse.json({
      ok: true,
      store: {
        id: data.id as string,
        reviewStatus: data.review_status as string,
        reviewReason: data.review_reason as string | null,
      },
    });
  } catch (error) {
    const adminFailure = handleAdminRouteError(error, "admin-partner-store-detail");
    if (adminFailure) return adminFailure;
    console.error("[admin-partner-store-detail] unexpected_failure", error);
    return jsonFailure("failed to update store review status", 500);
  }
}
