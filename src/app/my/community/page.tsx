"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabaseClient";
import { ItineraryItem, useTrip } from "@/lib/contexts/TripContext";
import {
    formatCountLabel,
    formatRelativeTime,
    formatTripDayLabel,
    titleCase,
} from "@/lib/i18n/runtimeFormatters";
import styles from "./community.module.css";

type ActivityTab = "posts" | "reviews" | "meetups";

interface CommunityPostRecord {
    id: number;
    author: string;
    flag?: string | null;
    type: string;
    title: string;
    desc: string;
    time?: string | null;
    comments?: number | null;
    created_at?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    place_name?: string | null;
    place_lat?: number | null;
    place_lng?: number | null;
}

interface ActivityCardItem {
    id: number;
    type: string;
    typeLabel: string;
    title: string;
    excerpt: string;
    timeLabel: string;
    commentCount: number;
    href: string;
    scheduleLabel?: string;
    locationLabel?: string;
}

const HUB_TABS: ActivityTab[] = ["posts", "reviews", "meetups"];
const MEETUP_TYPES = new Set(["meetup", "travel"]);

function parseTab(value: string | null): ActivityTab {
    return HUB_TABS.includes(value as ActivityTab) ? (value as ActivityTab) : "posts";
}

function formatScheduleLabel(startTime?: string | null, endTime?: string | null): string | undefined {
    if (!startTime) return undefined;
    return endTime ? `${startTime} - ${endTime}` : startTime;
}

function CommunityHubContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useTranslation("common");
    const { itinerary } = useTrip();

    const [activeTab, setActiveTab] = useState<ActivityTab>(parseTab(searchParams.get("tab")));
    const [userName, setUserName] = useState("");
    const [posts, setPosts] = useState<CommunityPostRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(false);

    useEffect(() => {
        setActiveTab(parseTab(searchParams.get("tab")));
    }, [searchParams]);

    useEffect(() => {
        let resolvedUserName = "Jessie Kim";

        try {
            const storedUser = localStorage.getItem("user");
            if (storedUser) {
                const parsed = JSON.parse(storedUser) as { name?: string };
                if (parsed.name?.trim()) {
                    resolvedUserName = parsed.name.trim();
                }
            }
        } catch {
            // Ignore malformed local user payloads.
        }

        setUserName(resolvedUserName);
    }, []);

    useEffect(() => {
        let cancelled = false;

        const fetchMyPosts = async () => {
            if (!userName) return;

            setLoading(true);
            setFetchError(false);

            const { data, error } = await supabase
                .from("community_posts")
                .select("*")
                .eq("author", userName)
                .order("created_at", { ascending: false });

            if (cancelled) return;

            if (error || !data) {
                setPosts([]);
                setFetchError(true);
            } else {
                setPosts(data as CommunityPostRecord[]);
            }

            setLoading(false);
        };

        void fetchMyPosts();

        return () => {
            cancelled = true;
        };
    }, [userName]);

    const normalizedActivities = useMemo<Record<ActivityTab, ActivityCardItem[]>>(() => {
        const grouped: Record<ActivityTab, ActivityCardItem[]> = {
            posts: [],
            reviews: [],
            meetups: [],
        };

        posts.forEach((post) => {
            const normalizedType = (post.type || "post").trim().toLowerCase();
            const isReview = normalizedType === "review";
            const isMeetup =
                MEETUP_TYPES.has(normalizedType) ||
                Boolean(post.start_time?.trim() || post.place_name?.trim());

            const typeLabel = t(`community_page.type.${normalizedType.toUpperCase()}`, {
                defaultValue:
                    normalizedType === "travel"
                        ? t("my_page.community_hub.type.travel")
                        : normalizedType === "meetup"
                          ? t("my_page.community_hub.type.meetup")
                          : titleCase(normalizedType),
            });

            const activityCard: ActivityCardItem = {
                id: post.id,
                type: normalizedType,
                typeLabel,
                title: post.title,
                excerpt: post.desc,
                timeLabel: formatRelativeTime(t, post.created_at, {
                    fallback: post.time,
                    fallbackKey: "common.states.recently_viewed",
                }),
                commentCount: post.comments ?? 0,
                href: `/community/${post.id}`,
                scheduleLabel: formatScheduleLabel(post.start_time, post.end_time),
                locationLabel: post.place_name?.trim() || undefined,
            };

            if (isReview) {
                grouped.reviews.push(activityCard);
                return;
            }

            if (isMeetup) {
                grouped.meetups.push(activityCard);
                return;
            }

            grouped.posts.push(activityCard);
        });

        return grouped;
    }, [posts, t]);

    const completedBookings = useMemo(() => {
        return itinerary.filter((item) => item.status === "completed").slice(0, 3);
    }, [itinerary]);

    const summaryItems = useMemo(
        () => [
            {
                key: "posts",
                label: t("my_page.community_hub.summary.posts"),
                value: normalizedActivities.posts.length,
            },
            {
                key: "reviews",
                label: t("my_page.community_hub.summary.reviews"),
                value: normalizedActivities.reviews.length,
            },
            {
                key: "meetups",
                label: t("my_page.community_hub.summary.meetups"),
                value: normalizedActivities.meetups.length,
            },
        ],
        [normalizedActivities, t]
    );

    const currentItems = normalizedActivities[activeTab];

    const handleTabChange = (tab: ActivityTab) => {
        setActiveTab(tab);

        const nextParams = new URLSearchParams(searchParams.toString());
        nextParams.set("tab", tab);
        router.replace(`/my/community?${nextParams.toString()}`, { scroll: false });
    };

    const renderEmptyState = () => {
        if (activeTab === "reviews") {
            const hasCompletedBookings = completedBookings.length > 0;

            return (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>{t("common.states.reviews")}</div>
                    <h3 className={styles.emptyTitle}>
                        {t("my_page.community_hub.empty.reviews.title")}
                    </h3>
                    <p className={styles.emptyText}>
                        {hasCompletedBookings
                            ? t("my_page.community_hub.empty.reviews.desc")
                            : t("my_page.community_hub.empty.reviews.no_completed")}
                    </p>
                    <button
                        className={styles.emptyButton}
                        onClick={() =>
                            router.push(hasCompletedBookings ? "/my/bookings" : "/explore")
                        }
                    >
                        {hasCompletedBookings
                            ? t("my_page.community_hub.empty.reviews.cta")
                            : t("common.actions.explore_places")}
                    </button>
                </div>
            );
        }

        if (activeTab === "meetups") {
            return (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>{t("common.states.meetups")}</div>
                    <h3 className={styles.emptyTitle}>
                        {t("my_page.community_hub.empty.meetups.title")}
                    </h3>
                    <p className={styles.emptyText}>
                        {t("my_page.community_hub.empty.meetups.desc")}
                    </p>
                    <button
                        className={styles.emptyButton}
                        onClick={() => router.push("/community")}
                    >
                        {t("common.actions.browse_meetups")}
                    </button>
                </div>
            );
        }

        return (
            <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>{t("common.states.posts")}</div>
                <h3 className={styles.emptyTitle}>
                    {t("my_page.community_hub.empty.posts.title")}
                </h3>
                <p className={styles.emptyText}>
                    {t("my_page.community_hub.empty.posts.desc")}
                </p>
                <button
                    className={styles.emptyButton}
                    onClick={() => router.push("/community")}
                >
                    {t("common.actions.browse_community")}
                </button>
            </div>
        );
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button className={styles.backLink} onClick={() => router.push("/my")}>
                    {t("common.back")}
                </button>

                <div className={styles.headerRow}>
                    <div>
                        <p className={styles.eyebrow}>
                            {t("my_page.community_hub.eyebrow")}
                        </p>
                        <h1 className={styles.title}>
                            {t("my_page.community_hub.title")}
                        </h1>
                        <p className={styles.subtitle}>
                            {t("my_page.community_hub.subtitle")}
                        </p>
                    </div>

                    <button
                        className={styles.headerButton}
                        onClick={() => router.push("/community")}
                    >
                        {t("my_page.community_hub.browse")}
                    </button>
                </div>
            </header>

            <section className={styles.summarySection}>
                <div className={styles.summaryGrid}>
                    {summaryItems.map((item) => (
                        <div key={item.key} className={styles.summaryCard}>
                            <span className={styles.summaryLabel}>{item.label}</span>
                            <strong className={styles.summaryValue}>{item.value}</strong>
                        </div>
                    ))}
                </div>

                <p className={styles.summaryHint}>
                    {t("my_page.community_hub.summary_hint")}
                </p>

                {fetchError && (
                    <div className={styles.syncNote}>
                        {t("my_page.community_hub.sync_error")}
                    </div>
                )}
            </section>

            <nav className={styles.tabBar}>
                {HUB_TABS.map((tab) => (
                    <button
                        key={tab}
                        className={`${styles.tabButton} ${
                            activeTab === tab ? styles.activeTab : ""
                        }`}
                        onClick={() => handleTabChange(tab)}
                    >
                        {t(`my_page.community_hub.tabs.${tab}`)}
                    </button>
                ))}
            </nav>

            {activeTab === "reviews" && completedBookings.length > 0 && (
                <section className={styles.promptSection}>
                    <div className={styles.sectionHeader}>
                        <div>
                            <h2 className={styles.sectionTitle}>
                                {t("my_page.community_hub.review_prompts.title")}
                            </h2>
                            <p className={styles.sectionText}>
                                {t("my_page.community_hub.review_prompts.desc")}
                            </p>
                        </div>

                        <button
                            className={styles.inlineLink}
                            onClick={() => router.push("/my/bookings")}
                        >
                            {t("common.actions.view_bookings")}
                        </button>
                    </div>

                    <div className={styles.promptList}>
                        {completedBookings.map((item) => (
                            <div key={item.id} className={styles.promptCard}>
                                <div className={styles.promptTop}>
                                    <span className={styles.promptBadge}>
                                        {t("planner_page.status.completed")}
                                    </span>
                                    <span className={styles.promptMeta}>
                                        {item.day
                                            ? `${formatTripDayLabel(t, item.day)} - ${item.time}`
                                            : `${t("planner_page.status.completed")} - ${item.time}`}
                                    </span>
                                </div>

                                <h3 className={styles.promptTitle}>{item.name}</h3>
                                <p className={styles.promptText}>
                                    {t(`common.categories.${item.type || "attraction"}`, {
                                        defaultValue: item.type || "Attraction",
                                    })}
                                </p>

                                <div className={styles.promptActions}>
                                    <button
                                        className={styles.secondaryButton}
                                        onClick={() => router.push("/my/bookings")}
                                    >
                                        {t("common.actions.view_booking")}
                                    </button>
                                    <button
                                        className={styles.primaryButton}
                                        onClick={() => router.push("/community")}
                                    >
                                        {t("common.actions.write_review")}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <section className={styles.contentSection}>
                <div className={styles.sectionHeader}>
                    <div>
                        <h2 className={styles.sectionTitle}>
                            {t(`my_page.community_hub.tabs.${activeTab}`)}
                        </h2>
                        <p className={styles.sectionText}>
                            {activeTab === "posts"
                                ? t("my_page.community_hub.posts_desc")
                                : activeTab === "reviews"
                                  ? t("my_page.community_hub.reviews_desc")
                                  : t("my_page.community_hub.meetups_desc")}
                        </p>
                    </div>
                    <span className={styles.countPill}>{currentItems.length}</span>
                </div>

                {loading ? (
                    <div className={styles.loadingState}>
                        {t("my_page.community_hub.loading")}
                    </div>
                ) : currentItems.length === 0 ? (
                    renderEmptyState()
                ) : (
                    <div className={styles.cardList}>
                        {currentItems.map((item) => (
                            <article key={item.id} className={styles.activityCard}>
                                <div className={styles.cardTop}>
                                    <span
                                        className={`${styles.typeBadge} ${
                                            styles[`type_${item.type}`] || ""
                                        }`}
                                    >
                                        {item.typeLabel}
                                    </span>
                                    <span className={styles.cardTime}>{item.timeLabel}</span>
                                </div>

                                {(item.scheduleLabel || item.locationLabel) && (
                                    <div className={styles.metaRow}>
                                        {item.scheduleLabel && (
                                            <span className={styles.metaChip}>
                                                {item.scheduleLabel}
                                            </span>
                                        )}
                                        {item.locationLabel && (
                                            <span className={styles.metaChip}>
                                                {item.locationLabel}
                                            </span>
                                        )}
                                    </div>
                                )}

                                <h3 className={styles.cardTitle}>{item.title}</h3>
                                <p className={styles.cardExcerpt}>{item.excerpt}</p>

                                <div className={styles.cardBottom}>
                                    <span className={styles.cardStat}>
                                        {item.commentCount > 0
                                            ? formatCountLabel(t, item.commentCount, "comments")
                                            : t("my_page.community_hub.no_comments")}
                                    </span>

                                    <div className={styles.cardActions}>
                                        <button
                                            className={styles.secondaryButton}
                                            onClick={() => router.push(item.href)}
                                        >
                                            {t("common.actions.view")}
                                        </button>
                                        <button
                                            className={styles.softButton}
                                            onClick={() => router.push("/community")}
                                        >
                                            {t("common.actions.manage")}
                                        </button>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            <div className={styles.bottomSpacer} />
        </div>
    );
}

export default function MyCommunityPage() {
    return (
        <Suspense fallback={<div style={{ padding: 24 }}>Loading...</div>}>
            <CommunityHubContent />
        </Suspense>
    );
}
