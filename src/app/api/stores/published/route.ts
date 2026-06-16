import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "store-photos";
const SIGNED_URL_EXPIRES = 60 * 60; // 1 hour
const MAX_STORES = 20;

export type PublishedStoreItem = {
  id: string;
  name: string | null;
  businessTypes: string[];
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  thumbnailUrl: string | null;
};

export async function GET() {
  try {
    const client = getSupabaseServerClient();

    const { data: storeRows, error: storesError } = await client
      .from("stores")
      .select("id, name, business_types, address, latitude, longitude")
      .eq("published", true)
      .eq("review_status", "approved")
      .order("created_at", { ascending: false })
      .limit(MAX_STORES);

    if (storesError) {
      console.error("[stores/published] stores_fetch_failed", storesError.message);
      return NextResponse.json({ ok: false, error: "failed to fetch stores" }, { status: 500 });
    }

    const stores = storeRows ?? [];
    const storeIds = stores.map((s) => s.id as string);

    // 매장별 승인된 사진 1장씩만 조회
    const photosByStore = new Map<string, string>();
    if (storeIds.length > 0) {
      const { data: photoRows, error: photosError } = await client
        .from("photos")
        .select("store_id, storage_path")
        .in("store_id", storeIds)
        .eq("review_status", "approved")
        .order("slot_index", { ascending: true });

      if (!photosError && photoRows) {
        for (const row of photoRows as { store_id: string; storage_path: string }[]) {
          if (!photosByStore.has(row.store_id)) {
            photosByStore.set(row.store_id, row.storage_path);
          }
        }
      }

      // 사진이 있는 storage_path에 대해 signed URL 일괄 생성
      const paths = Array.from(photosByStore.values());
      if (paths.length > 0) {
        const { data: signedUrls, error: signedError } = await client.storage
          .from(BUCKET)
          .createSignedUrls(paths, SIGNED_URL_EXPIRES);

        if (!signedError && signedUrls) {
          const urlByPath = new Map(
            (signedUrls as { path: string; signedUrl: string }[])
              .filter((u) => u.signedUrl)
              .map((u) => [u.path, u.signedUrl]),
          );
          // photosByStore를 path → signedUrl로 교체
          for (const [storeId, path] of photosByStore.entries()) {
            const signed = urlByPath.get(path);
            if (signed) {
              photosByStore.set(storeId, signed);
            } else {
              photosByStore.delete(storeId);
            }
          }
        } else {
          photosByStore.clear();
        }
      }
    }

    const items: PublishedStoreItem[] = stores.map((s) => ({
      id: s.id as string,
      name: (s.name as string | null) ?? null,
      businessTypes: (s.business_types as string[] | null) ?? [],
      address: (s.address as string | null) ?? null,
      latitude: (s.latitude as number | null) ?? null,
      longitude: (s.longitude as number | null) ?? null,
      thumbnailUrl: photosByStore.get(s.id as string) ?? null,
    }));

    return NextResponse.json({ ok: true, items });
  } catch (error) {
    console.error("[stores/published] unexpected_failure", error);
    return NextResponse.json({ ok: false, error: "internal server error" }, { status: 500 });
  }
}
