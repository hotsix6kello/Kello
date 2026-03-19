import { MOCK_ITEMS } from "@/app/explore/mock/data";
import type { ItineraryItem } from "@/lib/contexts/TripContext";

const SAFE_EXPLORE_DETAIL_IDS = new Set(MOCK_ITEMS.map((item) => item.id));

export function isSafeExploreDetailId(
    sourceItemId: string | null | undefined
): sourceItemId is string {
    return Boolean(sourceItemId && SAFE_EXPLORE_DETAIL_IDS.has(sourceItemId));
}

export function getSafeExploreDetailId(
    sourceItemId: string | null | undefined
): string | null {
    return isSafeExploreDetailId(sourceItemId) ? sourceItemId : null;
}

export function getSafeExploreDetailHref(
    sourceItemId: string | null | undefined
): string | null {
    const safeId = getSafeExploreDetailId(sourceItemId);
    return safeId ? `/explore/${safeId}` : null;
}

export function getSafeExploreDetailIdFromItineraryItem(
    item: Pick<ItineraryItem, "sourceItemId"> | null | undefined
): string | null {
    return getSafeExploreDetailId(item?.sourceItemId);
}

export function canShowCatalogDetailForItineraryItem(
    item: Pick<ItineraryItem, "sourceItemId"> | null | undefined
): boolean {
    return Boolean(getSafeExploreDetailIdFromItineraryItem(item));
}

export function getSafeExploreDetailHrefFromItineraryItem(
    item: Pick<ItineraryItem, "sourceItemId"> | null | undefined
): string | null {
    return getSafeExploreDetailHref(item?.sourceItemId);
}
