import { getSafeExploreDetailHref } from "@/lib/exploreDetail";

export type SavedHubRecentType = "place" | "plan" | "community";

export interface SavedHubRecentEntry {
    id: string;
    type: SavedHubRecentType;
    title: string;
    href: string;
    viewedAt: string;
    subtitle?: string;
}

export interface NormalizedSavedHubRecentEntry extends SavedHubRecentEntry {
    isSafePlaceDetail: boolean;
}

export const SAVED_ITEMS_KEY = "saved_items";
export const SAVED_HUB_RECENTS_KEY = "saved_hub_recent";

function readJsonArray<T>(key: string): T[] {
    if (typeof window === "undefined") return [];

    try {
        const raw = localStorage.getItem(key);
        if (!raw) return [];

        const parsed = JSON.parse(raw) as unknown;
        return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
        return [];
    }
}

function writeJsonArray<T>(key: string, value: T[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(key, JSON.stringify(value));
}

export function readSavedItemIds(): string[] {
    return readJsonArray<string>(SAVED_ITEMS_KEY).filter(
        (item): item is string => typeof item === "string" && item.trim().length > 0
    );
}

export function readSavedHubRecentEntries(): SavedHubRecentEntry[] {
    return readJsonArray<SavedHubRecentEntry>(SAVED_HUB_RECENTS_KEY).filter((entry) => {
        return Boolean(
            entry &&
                typeof entry.id === "string" &&
                typeof entry.title === "string" &&
                typeof entry.href === "string" &&
                typeof entry.viewedAt === "string"
        );
    });
}

export function pushSavedHubRecent(entry: SavedHubRecentEntry, limit = 18) {
    const next = [
        entry,
        ...readSavedHubRecentEntries().filter(
            (item) => !(item.id === entry.id && item.type === entry.type)
        ),
    ].slice(0, limit);
    writeJsonArray(SAVED_HUB_RECENTS_KEY, next);
}

export function normalizeSavedHubRecentHref(entry: SavedHubRecentEntry): string {
    // Only place recents need revalidation because plan/community hrefs are
    // already deterministic and do not depend on current safe detail policy.
    if (entry.type !== "place" || !entry.href.startsWith("/explore/")) {
        return entry.href;
    }

    const rawId = entry.href.slice("/explore/".length).split(/[?#]/)[0];
    return getSafeExploreDetailHref(rawId) ?? "/explore";
}

export function normalizeSavedHubRecentEntry(
    entry: SavedHubRecentEntry
): NormalizedSavedHubRecentEntry {
    const href = normalizeSavedHubRecentHref(entry);
    const isSafePlaceDetail =
        entry.type !== "place" ||
        (entry.href.startsWith("/explore/")
            ? href !== "/explore"
            : entry.href !== "/explore");

    return {
        ...entry,
        href,
        isSafePlaceDetail,
    };
}
