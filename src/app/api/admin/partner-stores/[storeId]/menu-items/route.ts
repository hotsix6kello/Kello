import { NextRequest, NextResponse } from "next/server";
import { requireAdminRouteAccess } from "@/lib/admin/adminRouteAccess.ts";
import { getSupabaseServerClient } from "@/lib/supabaseServer.ts";
import { handleAdminRouteError, jsonFailure } from "@/lib/admin/adminApiResponse.ts";
import { isPartnerStoreBulkReviewPatchItem, type PartnerStoreBulkReviewPatchItem } from "@/lib/admin/partnerStoreAdmin.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ storeId: string }> }) {
  try {
    await requireAdminRouteAccess(request);

    const { storeId } = await params;
    if (!storeId) {
      return jsonFailure("store id is required", 400);
    }

    const body = (await request.json()) as { items?: unknown };
    const items = Array.isArray(body.items) ? body.items : null;

    if (!items || items.length === 0 || !items.every(isPartnerStoreBulkReviewPatchItem)) {
      return jsonFailure("items must be a non-empty array of { id, review_status }", 400);
    }

    const client = getSupabaseServerClient();

    const results = await Promise.all(
      (items as PartnerStoreBulkReviewPatchItem[]).map((item) =>
        client
          .from("menu_items")
          .update({ review_status: item.review_status })
          .eq("id", item.id)
          .eq("store_id", storeId)
          .select("id, review_status")
          .maybeSingle(),
      ),
    );

    const failed = results.find((result) => result.error);
    if (failed?.error) {
      console.error("[admin-partner-store-menu-items] update_failed", failed.error.message);
      return jsonFailure("failed to update menu items", 500);
    }

    const updated = results
      .map((result) => result.data)
      .filter((row): row is { id: string; review_status: string } => row !== null);

    return NextResponse.json({
      ok: true,
      items: updated.map((row) => ({ id: row.id, reviewStatus: row.review_status })),
    });
  } catch (error) {
    const adminFailure = handleAdminRouteError(error, "admin-partner-store-menu-items");
    if (adminFailure) return adminFailure;
    console.error("[admin-partner-store-menu-items] unexpected_failure", error);
    return jsonFailure("failed to update menu items", 500);
  }
}
