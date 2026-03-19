"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ItineraryItem, useTrip } from "@/lib/contexts/TripContext";
import { MOCK_ITEMS, ServiceItem } from "@/app/explore/mock/data";
import {
    formatCountLabel,
    formatRelativeTime,
    titleCase,
} from "@/lib/i18n/runtimeFormatters";
import { getSafeExploreDetailHref } from "@/lib/exploreDetail";
import {
    normalizeSavedHubRecentEntry,
    SavedHubRecentEntry,
    SAVED_HUB_RECENTS_KEY,
    readSavedHubRecentEntries,
    readSavedItemIds,
} from "@/lib/savedHub";
import styles from "./saved.module.css";

type SavedTab = "places" | "plans" | "recent";

interface SavedPlaceItem {
    id: string;
    title: string;
    category: string;
    area: string;
    href: string;
    isDetailSafe: boolean;
    timeLabel: string;
    sourceLabel: string;
    canAddToPlan: boolean;
    lat?: number;
    lng?: number;
    type?: string;
    price?: string;
}

interface SavedPlanItem {
    id: string;
    title: string;
    stopsLabel: string;
    areaLabel: string;
    updatedLabel: string;
    href: string;
}

const TABS: SavedTab[] = ["places", "plans", "recent"];

const SAVED_ITEM_TYPE_BY_PREFIX: Array<{ prefix: string; type: string }> = [
    { prefix: "fs", type: "festival" },
    { prefix: "f", type: "food" },
    { prefix: "b", type: "beauty" },
    { prefix: "e", type: "event" },
    { prefix: "a", type: "attraction" },
    { prefix: "t", type: "transport" },
];

function parseTab(value: string | null): SavedTab {
    return TABS.includes(value as SavedTab) ? (value as SavedTab) : "places";
}

function buildSavedUrl(params: URLSearchParams): string {
    const query = params.toString();
    return query ? `/my/saved?${query}` : "/my/saved";
}

function inferSavedItemType(id: string): string | undefined {
    const match = SAVED_ITEM_TYPE_BY_PREFIX.find(({ prefix }) => id.startsWith(prefix));
    return match?.type;
}

function findMatchingItineraryItem(
    itinerary: ItineraryItem[],
    savedId: string
): (ItineraryItem & { area?: string; price?: string }) | undefined {
    return itinerary.find((item) => {
        return (
            item.id === savedId ||
            item.id.includes(`_${savedId}_`) ||
            item.id.startsWith(`saved_${savedId}_`)
        );
    }) as (ItineraryItem & { area?: string; price?: string }) | undefined;
}

function getTranslatedExploreField(
    t: (key: string, options?: { defaultValue?: string }) => string,
    id: string,
    field: "title" | "area" | "price"
): string {
    return t(`explore_items.${id}.${field}`, { defaultValue: "" }).trim();
}

function SavedHubContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useTranslation("common");
    const { itinerary, addItineraryItem } = useTrip();

    const [activeTab, setActiveTab] = useState<SavedTab>(parseTab(searchParams.get("tab")));
    const [savedPlaceIds, setSavedPlaceIds] = useState<string[]>([]);
    const [recentEntries, setRecentEntries] = useState<SavedHubRecentEntry[]>([]);
    const [toast, setToast] = useState("");

    useEffect(() => {
        setActiveTab(parseTab(searchParams.get("tab")));
    }, [searchParams]);

    useEffect(() => {
        setSavedPlaceIds(readSavedItemIds());
        setRecentEntries(readSavedHubRecentEntries());
    }, []);

    useEffect(() => {
        if (!toast) return;

        const timeoutId = window.setTimeout(() => setToast(""), 1800);
        return () => window.clearTimeout(timeoutId);
    }, [toast]);

    const recentStorageAvailable =
        recentEntries.length > 0 || typeof window === "undefined"
            ? true
            : Boolean(localStorage.getItem(SAVED_HUB_RECENTS_KEY));

    const fallbackPlaceLookup = new Map(MOCK_ITEMS.map((item) => [item.id, item]));
    const placeIds = Array.from(new Set(savedPlaceIds));

    const places: SavedPlaceItem[] = placeIds.map((id) => {
        const itineraryMatch = findMatchingItineraryItem(itinerary, id);
        const translatedTitle = getTranslatedExploreField(t, id, "title");
        const translatedArea = getTranslatedExploreField(t, id, "area");
        const translatedPrice = getTranslatedExploreField(t, id, "price");
        const fallbackItem = fallbackPlaceLookup.get(id) as ServiceItem | undefined;

        const title =
            itineraryMatch?.name ||
            translatedTitle ||
            fallbackItem?.title ||
            t("my_page.saved.places.fallback_title", {
                id: id.slice(0, 6).toUpperCase(),
            });
        const categoryType =
            itineraryMatch?.type || inferSavedItemType(id) || fallbackItem?.type || "place";
        const area =
            itineraryMatch?.area ||
            translatedArea ||
            fallbackItem?.area ||
            t("common.states.details_unavailable");
        const detailHref = getSafeExploreDetailHref(id);
        const href = detailHref ?? "/explore";
        const sourceLabel = itineraryMatch
            ? t("my_page.saved.places.source_plan")
            : translatedTitle
              ? t("my_page.saved.places.source_saved")
              : fallbackItem
                ? t("my_page.saved.places.source_fallback")
                : t("my_page.saved.places.source_id_only");
        const actionableSource = itineraryMatch || fallbackItem;

        return {
            id,
            title,
            category: t(`common.categories.${categoryType}`, {
                defaultValue: titleCase(categoryType),
            }),
            area,
            href,
            isDetailSafe: Boolean(detailHref),
            timeLabel: t("common.states.saved_locally"),
            sourceLabel,
            canAddToPlan: Boolean(actionableSource),
            lat: itineraryMatch?.lat ?? fallbackItem?.lat,
            lng: itineraryMatch?.lng ?? fallbackItem?.lng,
            type: itineraryMatch?.type ?? fallbackItem?.type ?? inferSavedItemType(id),
            price:
                itineraryMatch?.price ||
                translatedPrice ||
                (typeof fallbackItem?.price === "string"
                    ? fallbackItem.price
                    : fallbackItem?.price?.toString()),
        };
    });

    const latestPlanRecent = recentEntries.find((entry) => entry.type === "plan");
    const areaPool = Array.from(
        new Set(
            itinerary
                .map((item) => (item as ItineraryItem & { area?: string }).area || "")
                .filter(Boolean)
        )
    );

    const plans: SavedPlanItem[] =
        itinerary.length > 0
            ? [
                  {
                      id: "current-plan",
                      title: t("common.states.current_trip_plan"),
                      stopsLabel: formatCountLabel(t, itinerary.length, "stops"),
                      areaLabel:
                          areaPool.slice(0, 3).join(" · ") ||
                          t("common.states.planner_draft"),
                      updatedLabel: latestPlanRecent
                          ? formatRelativeTime(t, latestPlanRecent.viewedAt, {
                                fallbackKey: "common.states.saved_locally",
                            })
                          : t("my_page.saved.plans.synced"),
                      href: "/planner",
                  },
              ]
            : [];

    const handleTabChange = (tab: SavedTab) => {
        setActiveTab(tab);

        const nextParams = new URLSearchParams(searchParams.toString());
        nextParams.set("tab", tab);
        router.replace(buildSavedUrl(nextParams), { scroll: false });
    };

    const handleAddToPlan = (place: SavedPlaceItem) => {
        if (!place.canAddToPlan) return;

        addItineraryItem({
            id: `saved_${place.id}_${Date.now()}`,
            name: place.title,
            time: "12:00",
            status: "draft",
            lat: place.lat ?? 37.5665,
            lng: place.lng ?? 126.978,
            day: itinerary[0]?.day ?? 1,
            slot: "pm",
            type: place.type || "attraction",
        });

        setToast(
            t("my_page.saved.places.added")
        );
    };

    const summaryCards = [
        {
            id: "places",
            label: t("my_page.saved.summary.places"),
            value: places.length,
        },
        {
            id: "plans",
            label: t("my_page.saved.summary.plans"),
            value: plans.length,
        },
        {
            id: "recent",
            label: t("my_page.saved.summary.recent"),
            value: recentEntries.length,
        },
    ];

    const normalizedRecentEntries = recentEntries.map(normalizeSavedHubRecentEntry);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button className={styles.backLink} onClick={() => router.push("/my")}>
                    {t("common.back")}
                </button>

                <div className={styles.headerRow}>
                    <div>
                        <p className={styles.eyebrow}>
                            {t("my_page.saved.eyebrow")}
                        </p>
                        <h1 className={styles.title}>
                            {t("my_page.saved.title")}
                        </h1>
                        <p className={styles.subtitle}>
                            {t("my_page.saved.subtitle")}
                        </p>
                    </div>

                    <button
                        className={styles.headerButton}
                        onClick={() => router.push("/explore")}
                    >
                        {t("my_page.saved.header_cta")}
                    </button>
                </div>
            </header>

            <section className={styles.summarySection}>
                <div className={styles.summaryGrid}>
                    {summaryCards.map((card) => (
                        <button
                            key={card.id}
                            className={styles.summaryCard}
                            onClick={() => handleTabChange(card.id as SavedTab)}
                        >
                            <span className={styles.summaryLabel}>{card.label}</span>
                            <strong className={styles.summaryValue}>{card.value}</strong>
                        </button>
                    ))}
                </div>
                <p className={styles.summaryHint}>
                    {t("my_page.saved.summary_hint")}
                </p>
            </section>

            <nav className={styles.tabBar}>
                {TABS.map((tab) => (
                    <button
                        key={tab}
                        className={`${styles.tabButton} ${activeTab === tab ? styles.activeTab : ""}`}
                        onClick={() => handleTabChange(tab)}
                    >
                        {t(`my_page.saved.tabs.${tab}`)}
                    </button>
                ))}
            </nav>

            {activeTab === "places" && (
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <div>
                            <h2 className={styles.sectionTitle}>
                                {t("my_page.saved.places.title")}
                            </h2>
                            <p className={styles.sectionText}>
                                {t("my_page.saved.places.desc")}
                            </p>
                        </div>
                        <span className={styles.countPill}>{places.length}</span>
                    </div>

                    {places.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>SAVE</div>
                            <h3 className={styles.emptyTitle}>
                                {t("my_page.saved.places.empty.title")}
                            </h3>
                            <p className={styles.emptyText}>
                                {t("my_page.saved.places.empty.desc")}
                            </p>
                            <button
                                className={styles.primaryButton}
                                onClick={() => router.push("/explore")}
                            >
                                {t("my_page.saved.places.empty.cta")}
                            </button>
                        </div>
                    ) : (
                        <div className={styles.cardList}>
                            {places.map((place) => (
                                <article key={place.id} className={styles.savedCard}>
                                    <div className={styles.cardTop}>
                                        <span className={styles.typeBadge}>{place.category}</span>
                                        <span className={styles.metaText}>{place.timeLabel}</span>
                                    </div>

                                    <h3 className={styles.cardTitle}>{place.title}</h3>
                                    <p className={styles.cardText}>{place.area}</p>

                                    <div className={styles.metaRow}>
                                        <span className={styles.metaChip}>{place.sourceLabel}</span>
                                        {place.price && (
                                            <span className={styles.metaChip}>{place.price}</span>
                                        )}
                                    </div>

                                    <div className={styles.cardActions}>
                                        <button
                                            className={styles.secondaryButton}
                                            onClick={() => router.push(place.href)}
                                        >
                                            {t(
                                                place.isDetailSafe
                                                    ? "common.actions.view_details"
                                                    : "common.actions.explore_places"
                                            )}
                                        </button>
                                        <button
                                            className={styles.softButton}
                                            onClick={() => handleAddToPlan(place)}
                                            disabled={!place.canAddToPlan}
                                        >
                                            {t("common.actions.add_to_plan")}
                                        </button>
                                        <button
                                            className={styles.softButton}
                                            onClick={() => router.push("/explore")}
                                        >
                                            {t("common.actions.explore")}
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {activeTab === "plans" && (
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <div>
                            <h2 className={styles.sectionTitle}>
                                {t("my_page.saved.plans.title")}
                            </h2>
                            <p className={styles.sectionText}>
                                {t("my_page.saved.plans.desc")}
                            </p>
                        </div>
                        <span className={styles.countPill}>{plans.length}</span>
                    </div>

                    {plans.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>PLAN</div>
                            <h3 className={styles.emptyTitle}>
                                {t("my_page.saved.plans.empty.title")}
                            </h3>
                            <p className={styles.emptyText}>
                                {t("my_page.saved.plans.empty.desc")}
                            </p>
                            <button
                                className={styles.primaryButton}
                                onClick={() => router.push("/planner")}
                            >
                                    {t("common.actions.create_plan")}
                                </button>
                        </div>
                    ) : (
                        <div className={styles.cardList}>
                            {plans.map((plan) => (
                                <article key={plan.id} className={styles.savedCard}>
                                    <div className={styles.cardTop}>
                                        <span className={styles.typeBadge}>
                                            {t("common.states.planner_draft")}
                                        </span>
                                        <span className={styles.metaText}>{plan.updatedLabel}</span>
                                    </div>

                                    <h3 className={styles.cardTitle}>{plan.title}</h3>
                                    <p className={styles.cardText}>{plan.areaLabel}</p>

                                    <div className={styles.metaRow}>
                                        <span className={styles.metaChip}>{plan.stopsLabel}</span>
                                        <span className={styles.metaChip}>
                                            {formatCountLabel(
                                                t,
                                                Math.max(1, ...itinerary.map((item) => item.day ?? 1)),
                                                "days"
                                            )}
                                        </span>
                                    </div>

                                    <div className={styles.cardActions}>
                                        <button
                                            className={styles.secondaryButton}
                                            onClick={() => router.push(plan.href)}
                                        >
                                            {t("common.actions.view_plan")}
                                        </button>
                                        <button
                                            className={styles.primaryButton}
                                            onClick={() => router.push("/planner")}
                                        >
                                            {t("common.actions.continue_editing")}
                                        </button>
                                        <button
                                            className={styles.softButton}
                                            onClick={() => router.push("/planner")}
                                        >
                                            {t("common.actions.use_this_plan")}
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {activeTab === "recent" && (
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <div>
                            <h2 className={styles.sectionTitle}>
                                {t("my_page.saved.recent.title")}
                            </h2>
                            <p className={styles.sectionText}>
                                {t("my_page.saved.recent.desc")}
                            </p>
                        </div>
                        <span className={styles.countPill}>{recentEntries.length}</span>
                    </div>

                    {recentEntries.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>RECENT</div>
                            <h3 className={styles.emptyTitle}>
                                {t("my_page.saved.recent.empty.title")}
                            </h3>
                            <p className={styles.emptyText}>
                                {recentStorageAvailable
                                    ? t("my_page.saved.recent.empty.desc")
                                    : t("my_page.saved.recent.empty.fallback")}
                            </p>
                            <button
                                className={styles.secondaryButton}
                                onClick={() => router.push("/explore")}
                            >
                                {t("my_page.saved.recent.empty.cta")}
                            </button>
                        </div>
                    ) : (
                        <div className={styles.cardList}>
                            {normalizedRecentEntries.map((entry) => (
                                <article key={`${entry.type}-${entry.id}`} className={styles.savedCard}>
                                    <div className={styles.cardTop}>
                                        <span className={styles.typeBadge}>
                                            {entry.type === "place"
                                                ? t("my_page.saved.recent.type.place")
                                                : entry.type === "plan"
                                                  ? t("my_page.saved.recent.type.plan")
                                                  : entry.type === "community"
                                                    ? t("my_page.saved.recent.type.community")
                                                    : titleCase(entry.type)}
                                        </span>
                                        <span className={styles.metaText}>
                                            {formatRelativeTime(t, entry.viewedAt, {
                                                fallbackKey: "common.states.saved_locally",
                                            })}
                                        </span>
                                    </div>

                                    <h3 className={styles.cardTitle}>{entry.title}</h3>
                                    <p className={styles.cardText}>
                                        {entry.subtitle ||
                                            t("common.states.recently_viewed")}
                                    </p>

                                    <div className={styles.cardActions}>
                                        <button
                                            className={styles.primaryButton}
                                            onClick={() => router.push(entry.href)}
                                        >
                                            {t(
                                                entry.type === "place" && !entry.isSafePlaceDetail
                                                    ? "common.actions.explore_places"
                                                    : "common.actions.view_again"
                                            )}
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {toast && <div className={styles.toast}>{toast}</div>}
            <div className={styles.bottomSpacer} />
        </div>
    );
}

export default function MySavedPage() {
    return (
        <Suspense fallback={<div style={{ padding: 24 }}>Loading...</div>}>
            <SavedHubContent />
        </Suspense>
    );
}
