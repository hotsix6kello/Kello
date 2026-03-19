"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ItineraryItem, useTrip } from "@/lib/contexts/TripContext";
import {
    appendBookingQueryContext,
    buildPathWithParams,
    createBookingQueryContext,
    formatBookingReferenceValue,
} from "@/lib/bookingContext";
import {
    formatItineraryStatusLabel,
    formatTripDayTimeLabel,
} from "@/lib/i18n/runtimeFormatters";
import styles from "./bookings.module.css";

type TabType = "upcoming" | "completed" | "other";

interface StatusMeta {
    label: string;
    className: string;
}

interface BookingCardAction {
    id: string;
    label: string;
    tone: "primary" | "secondary" | "soft";
    onClick: () => void;
}

const TABS: TabType[] = ["upcoming", "completed", "other"];

function BookingsPageContent() {
    const { t } = useTranslation("common");
    const router = useRouter();
    const { itinerary } = useTrip();

    const [activeTab, setActiveTab] = useState<TabType>("upcoming");

    const categorizedData = useMemo(() => {
        const upcoming: ItineraryItem[] = [];
        const completed: ItineraryItem[] = [];
        const other: ItineraryItem[] = [];

        itinerary.forEach((item) => {
            switch (item.status) {
                case "confirmed":
                case "submitted":
                case "in_progress":
                    upcoming.push(item);
                    break;
                case "completed":
                    completed.push(item);
                    break;
                case "draft":
                case "canceled":
                case "unavailable":
                default:
                    other.push(item);
                    break;
            }
        });

        return { upcoming, completed, other };
    }, [itinerary]);

    const currentList = categorizedData[activeTab];

    const getStatusMeta = (status: ItineraryItem["status"]): StatusMeta => {
        const label = formatItineraryStatusLabel(t, status);

        switch (status) {
            case "confirmed":
            case "submitted":
            case "in_progress":
                return {
                    label,
                    className: styles.statusUpcoming,
                };
            case "completed":
                return {
                    label,
                    className: styles.statusCompleted,
                };
            case "canceled":
            case "unavailable":
                return {
                    label,
                    className: styles.statusCancelled,
                };
            case "draft":
            default:
                return {
                    label,
                    className: "",
                };
        }
    };

    const renderBookingCard = (item: ItineraryItem) => {
        const meta = getStatusMeta(item.status);
        const isCompleted = item.status === "completed";
        const isIssueState = ["draft", "canceled", "unavailable"].includes(item.status);
        const categoryLabel = t(`common.categories.${item.type || "attraction"}`, {
            defaultValue: item.type || "Attraction",
        });
        const area = (item as ItineraryItem & { area?: string }).area || t("common.cities.seoul");
        const price = (item as ItineraryItem & { price?: string }).price;
        const bookingReference = formatBookingReferenceValue(item.id);
        const bookingContext = createBookingQueryContext(item, t);
        const bookingHelpParams = new URLSearchParams({
            source: "booking",
            tab: "booking",
        });
        appendBookingQueryContext(bookingHelpParams, bookingContext, {
            includeIdParam: true,
            includeBookingIdParam: false,
        });

        const reportIssueParams = new URLSearchParams({
            source: "booking",
            tab: "general",
            mode: "report",
        });
        appendBookingQueryContext(reportIssueParams, bookingContext, {
            includeIdParam: true,
            includeBookingIdParam: false,
        });

        const phrasesParams = new URLSearchParams({
            category: "booking",
            source: "booking",
        });
        appendBookingQueryContext(phrasesParams, bookingContext, {
            includeBookingIdParam: true,
        });

        const bookingHelpUrl = buildPathWithParams("/my/support", bookingHelpParams);
        const reportIssueUrl = buildPathWithParams("/my/support", reportIssueParams);
        const phrasesUrl = buildPathWithParams("/my/phrases", phrasesParams);
        const plannerParams = new URLSearchParams();
        appendBookingQueryContext(plannerParams, bookingContext, {
            includeBookingIdParam: true,
        });
        const plannerUrl = buildPathWithParams("/planner", plannerParams);
        const openPlanner = () => router.push(plannerUrl);
        const openMap = () => {
            if (!item.lat || !item.lng) return;
            const url = `https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}&travelmode=transit`;
            window.open(url, "_blank");
        };

        const actions: BookingCardAction[] = isCompleted
            ? [
                  {
                      id: "review",
                      label: t("common.actions.write_review"),
                      tone: "primary",
                      onClick: () => router.push("/my/community?tab=reviews"),
                  },
                  {
                      id: "view",
                      label: t("common.actions.view_in_plan", {
                          defaultValue: "View in Plan",
                      }),
                      tone: "secondary",
                      onClick: openPlanner,
                  },
                  ...(item.lat && item.lng
                      ? [
                            {
                                id: "map",
                                label: t("common.actions.map"),
                                tone: "soft" as const,
                                onClick: openMap,
                            },
                        ]
                      : []),
              ]
            : isIssueState
              ? [
                    {
                        id: "report",
                        label: t("common.actions.report_issue"),
                        tone: "primary",
                        onClick: () => router.push(reportIssueUrl),
                    },
                    {
                        id: "help",
                        label: t("common.actions.booking_help"),
                        tone: "secondary",
                        onClick: () => router.push(bookingHelpUrl),
                    },
                    {
                        id: "view",
                        label: t("common.actions.view_in_plan", {
                            defaultValue: "View in Plan",
                        }),
                        tone: "soft",
                        onClick: openPlanner,
                    },
                    {
                        id: "phrases",
                        label: t("common.actions.show_booking_phrases", {
                            defaultValue: "Show booking phrases",
                        }),
                        tone: "soft",
                        onClick: () => router.push(phrasesUrl),
                    },
                ]
              : [
                    {
                        id: "help",
                        label: t("common.actions.booking_help"),
                        tone: "primary",
                        onClick: () => router.push(bookingHelpUrl),
                    },
                    {
                        id: "phrases",
                        label: t("common.actions.show_booking_phrases", {
                            defaultValue: "Show booking phrases",
                        }),
                        tone: "secondary",
                        onClick: () => router.push(phrasesUrl),
                    },
                    {
                        id: "view",
                        label: t("common.actions.view_in_plan", {
                            defaultValue: "View in Plan",
                        }),
                        tone: "soft",
                        onClick: openPlanner,
                    },
                    ...(item.lat && item.lng
                        ? [
                              {
                                  id: "map",
                                  label: t("common.actions.map"),
                                  tone: "soft" as const,
                                  onClick: openMap,
                              },
                          ]
                        : []),
                ];

        return (
            <div key={item.id} className={styles.bookingCard}>
                <div className={styles.cardTop}>
                    <div className={styles.cardLeft}>
                        <span className={styles.category}>{categoryLabel}</span>
                        <span className={`${styles.statusBadge} ${meta.className}`}>
                            {meta.label}
                        </span>
                    </div>
                    <div className={styles.qrIcon}>QR</div>
                </div>

                <div className={styles.cardBody}>
                    <h3 className={styles.placeTitle}>{item.name}</h3>

                    <div className={styles.metaGrid}>
                        <div className={styles.metaItem}>
                            <span className={styles.metaIcon}>
                                {t("my_page.bookings_hub.meta.time")}
                            </span>
                            <span>
                                {formatTripDayTimeLabel(t, item.day, item.time, {
                                    separator: "dash",
                                })}
                            </span>
                        </div>
                        <div className={styles.metaItem}>
                            <span className={styles.metaIcon}>
                                {t("my_page.bookings_hub.meta.area")}
                            </span>
                            <span>{area}</span>
                        </div>
                    </div>

                    {price && (
                        <div className={styles.priceRow}>
                            <span className={styles.priceLabel}>
                                {t("my_page.bookings_hub.meta.total_price")}
                            </span>
                            <span className={styles.priceValue}>{price}</span>
                        </div>
                    )}
                </div>

                <div className={styles.cardFooter}>
                    {actions.map((action) => (
                        <button
                            key={action.id}
                            className={`${styles.actionBtn} ${
                                action.tone === "primary"
                                    ? styles.primaryAction
                                    : action.tone === "secondary"
                                      ? styles.secondaryAction
                                      : styles.softAction
                            }`}
                            onClick={action.onClick}
                        >
                            {action.label}
                        </button>
                    ))}
                </div>

                <div className={styles.bookingId}>
                    {t("my_page.bookings_hub.meta.reference", {
                        defaultValue: "Reference",
                    })}
                    : {bookingReference}
                </div>
            </div>
        );
    };

    const renderEmptyState = () => {
        const configs: Record<
            TabType,
            { icon: string; title: string; desc: string; cta?: string; href?: string }
        > = {
            upcoming: {
                icon: "UP",
                title: t("my_page.bookings_hub.empty.upcoming.title"),
                desc: t("my_page.bookings_hub.empty.upcoming.desc"),
                cta: t("common.actions.explore_places"),
                href: "/explore",
            },
            completed: {
                icon: "DONE",
                title: t("my_page.bookings_hub.empty.completed.title"),
                desc: t("my_page.bookings_hub.empty.completed.desc"),
            },
            other: {
                icon: "LOG",
                title: t("my_page.bookings_hub.empty.other.title"),
                desc: t("my_page.bookings_hub.empty.other.desc"),
            },
        };

        const config = configs[activeTab];

        return (
            <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>{config.icon}</div>
                <h3 className={styles.emptyTitle}>{config.title}</h3>
                <p className={styles.emptyDesc}>{config.desc}</p>
                {config.cta && config.href && (
                    <button
                        className={styles.exploreBtn}
                        onClick={() => {
                            if (config.href) {
                                router.push(config.href);
                            }
                        }}
                    >
                        {config.cta}
                    </button>
                )}
            </div>
        );
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button
                    onClick={() => router.push("/my")}
                    style={{
                        width: "fit-content",
                        fontSize: "0.82rem",
                        color: "var(--primary)",
                        fontWeight: 700,
                    }}
                >
                    {t("common.back")}
                </button>

                <h1 className={styles.title}>{t("my_page.bookings_hub.title")}</h1>

                <div className={styles.summary}>
                    <div className={styles.summaryItem}>
                        {t("my_page.bookings_hub.summary.upcoming")}
                        <span className={styles.summaryCount}>
                            {categorizedData.upcoming.length}
                        </span>
                    </div>
                    <div className={styles.summaryItem}>
                        {t("my_page.bookings_hub.summary.history")}
                        <span className={styles.summaryCount}>
                            {categorizedData.completed.length}
                        </span>
                    </div>
                </div>
            </header>

            <nav className={styles.tabContainer}>
                {TABS.map((tab) => (
                    <button
                        key={tab}
                        className={`${styles.tab} ${activeTab === tab ? styles.activeTab : ""}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {t(`my_page.bookings_hub.tabs.${tab}`)}
                    </button>
                ))}
            </nav>

            <div className={styles.list}>
                {currentList.length > 0 ? currentList.map(renderBookingCard) : renderEmptyState()}
            </div>
        </div>
    );
}

export default function BookingsPage() {
    return (
        <Suspense fallback={<div style={{ padding: 24 }}>Loading...</div>}>
            <BookingsPageContent />
        </Suspense>
    );
}
