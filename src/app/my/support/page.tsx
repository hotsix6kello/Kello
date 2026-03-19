"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import BookingContextBanner from "@/components/booking/BookingContextBanner";
import { ItineraryItem, useTrip } from "@/lib/contexts/TripContext";
import {
    appendBookingQueryContext,
    buildPathWithParams,
    createBookingQueryContext,
    getBookingContextChips,
    readBookingQueryContext,
    resolveBookingQueryContext,
} from "@/lib/bookingContext";
import {
    formatItineraryStatusLabel,
    formatTripDayTimeLabel,
} from "@/lib/i18n/runtimeFormatters";
import styles from "./support.module.css";

type SupportTab = "booking" | "general" | "faq" | "emergency";

interface SupportBookingItem {
    id: string;
    name: string;
    status: ItineraryItem["status"];
    statusLabel: string;
    categoryLabel: string;
    timeLabel: string;
    areaLabel?: string;
    isOtherState: boolean;
}

interface GuideItem {
    id: string;
    question: string;
    answer: string;
    ctaLabel?: string;
    href?: string;
}

const TABS: SupportTab[] = ["booking", "general", "faq", "emergency"];

function buildSupportUrl(params: URLSearchParams): string {
    const query = params.toString();
    return query ? `/my/support?${query}` : "/my/support";
}

function parseTab(
    requestedTab: string | null,
    source: string | null,
    focus: string | null
): SupportTab {
    if (TABS.includes(requestedTab as SupportTab)) {
        return requestedTab as SupportTab;
    }

    if (focus === "interpreter" || focus === "emergency") {
        return "emergency";
    }

    if (source === "booking") {
        return "booking";
    }

    return "general";
}

function SupportPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useTranslation("common");
    const { itinerary } = useTrip();

    const source = searchParams.get("source");
    const bookingQueryContext = readBookingQueryContext(searchParams);
    const selectedBookingId = bookingQueryContext?.bookingId ?? searchParams.get("id");
    const focus = searchParams.get("focus");
    const mode = searchParams.get("mode");

    const [activeTab, setActiveTab] = useState<SupportTab>(
        parseTab(searchParams.get("tab"), source, focus)
    );
    const [openGuideId, setOpenGuideId] = useState<string>("find-booking");

    useEffect(() => {
        setActiveTab(parseTab(searchParams.get("tab"), source, focus));
    }, [focus, searchParams, source]);

    const bookingHelpItems = useMemo<SupportBookingItem[]>(() => {
        const rank: Record<ItineraryItem["status"], number> = {
            in_progress: 0,
            confirmed: 1,
            submitted: 2,
            unavailable: 3,
            canceled: 4,
            draft: 5,
            completed: 6,
        };

        return itinerary
            .filter((item) =>
                ["confirmed", "submitted", "in_progress", "draft", "canceled", "unavailable"].includes(
                    item.status
                )
            )
            .sort((a, b) => {
                const selectedA = a.id === selectedBookingId ? -1 : 0;
                const selectedB = b.id === selectedBookingId ? -1 : 0;

                if (selectedA !== selectedB) {
                    return selectedA - selectedB;
                }

                return rank[a.status] - rank[b.status];
            })
            .slice(0, 4)
            .map((item) => ({
                id: item.id,
                name: item.name,
                status: item.status,
                statusLabel: formatItineraryStatusLabel(t, item.status),
                categoryLabel: t(`common.categories.${item.type || "attraction"}`, {
                    defaultValue: item.type || "Attraction",
                }),
                timeLabel: formatTripDayTimeLabel(t, item.day, item.time, {
                    separator: "dash",
                }),
                areaLabel: (item as ItineraryItem & { area?: string }).area || undefined,
                isOtherState: ["draft", "canceled", "unavailable"].includes(item.status),
            }));
    }, [itinerary, selectedBookingId, t]);

    const selectedBooking = useMemo(
        () => bookingHelpItems.find((item) => item.id === selectedBookingId),
        [bookingHelpItems, selectedBookingId]
    );

    const selectedBookingContext = useMemo(
        () =>
            bookingQueryContext ??
            (selectedBookingId
                ? {
                      bookingId: selectedBookingId,
                  }
                : null),
        [bookingQueryContext, selectedBookingId]
    );

    const resolvedBookingContext = useMemo(() => {
        return resolveBookingQueryContext(itinerary, selectedBookingContext, t);
    }, [itinerary, selectedBookingContext, t]);

    const hasBookingContext = source === "booking" || Boolean(resolvedBookingContext?.bookingId);
    const bookingContextChips = getBookingContextChips(resolvedBookingContext, t);

    const buildSupportRoute = (
        tab: SupportTab,
        extraParams?: Record<string, string | undefined>
    ) => {
        const params = new URLSearchParams({
            tab,
            source: hasBookingContext ? "booking" : "support",
        });

        Object.entries(extraParams ?? {}).forEach(([key, value]) => {
            if (value) params.set(key, value);
        });

        appendBookingQueryContext(params, resolvedBookingContext, {
            includeIdParam: hasBookingContext,
            includeBookingIdParam: false,
        });

        return buildPathWithParams("/my/support", params);
    };

    const interpretationParams = new URLSearchParams({
        source: hasBookingContext ? "booking" : "support",
        focus: "interpreter",
    });
    appendBookingQueryContext(interpretationParams, resolvedBookingContext, {
        includeIdParam: false,
        includeBookingIdParam: true,
    });
    const interpretationUrl = buildPathWithParams("/help/interpretation", interpretationParams);

    const phrasesParams = new URLSearchParams({
        category: hasBookingContext ? "booking" : "emergency",
        source: hasBookingContext ? "booking" : "support",
        ...(focus === "interpreter" ? { focus: "interpreter" } : {}),
    });
    appendBookingQueryContext(phrasesParams, resolvedBookingContext, {
        includeBookingIdParam: true,
    });
    const contextPhrasesUrl = buildPathWithParams("/my/phrases", phrasesParams);

    const emergencyDetailParams = new URLSearchParams({
        source: hasBookingContext ? "booking" : "help",
        focus: "emergency",
    });
    appendBookingQueryContext(emergencyDetailParams, resolvedBookingContext, {
        includeBookingIdParam: true,
    });
    const emergencyDetailQuery = emergencyDetailParams.toString();
    const medicalUrl = emergencyDetailQuery
        ? `/help/medical?${emergencyDetailQuery}`
        : "/help/medical";
    const policeUrl = emergencyDetailQuery
        ? `/help/police?${emergencyDetailQuery}`
        : "/help/police";

    const handleTabChange = (tab: SupportTab) => {
        setActiveTab(tab);

        const nextParams = new URLSearchParams(searchParams.toString());
        nextParams.set("tab", tab);
        router.replace(buildSupportUrl(nextParams), { scroll: false });
    };

    const summaryCards = [
        {
            id: "booking",
            label: t("my_page.support.summary.booking.label"),
            desc: t("my_page.support.summary.booking.desc"),
            onClick: () => handleTabChange("booking"),
        },
        {
            id: "general",
            label: t("my_page.support.summary.general.label"),
            desc: t("my_page.support.summary.general.desc"),
            onClick: () => handleTabChange("general"),
        },
        {
            id: "emergency",
            label: t("my_page.support.summary.emergency.label"),
            desc: t("my_page.support.summary.emergency.desc"),
            onClick: () => handleTabChange("emergency"),
        },
    ];

    const guideItems: GuideItem[] = [
        {
            id: "find-booking",
            question: t("my_page.support.guides.find_booking.q"),
            answer: t("my_page.support.guides.find_booking.a"),
            ctaLabel: t("common.actions.my_bookings"),
            href: "/my/bookings",
        },
        {
            id: "staff-talk",
            question: t("my_page.support.guides.staff_talk.q"),
            answer: t("my_page.support.guides.staff_talk.a"),
            ctaLabel: hasBookingContext
                ? t("common.actions.interpreter_for_booking")
                : t("common.actions.interpreter_help"),
            href: interpretationUrl,
        },
        {
            id: "change-time",
            question: t("my_page.support.guides.change_time.q"),
            answer: t("my_page.support.guides.change_time.a"),
            ctaLabel: t("common.actions.booking_help"),
            href: buildSupportRoute("booking"),
        },
        {
            id: "cancel-refund",
            question: t("my_page.support.guides.cancel_refund.q"),
            answer: t("my_page.support.guides.cancel_refund.a"),
            ctaLabel: t("common.actions.open_help_center"),
            href: "/help",
        },
        {
            id: "write-review",
            question: t("my_page.support.guides.write_review.q"),
            answer: t("my_page.support.guides.write_review.a"),
            ctaLabel: t("common.actions.go_to_reviews"),
            href: "/my/community?tab=reviews",
        },
        {
            id: "community-safety",
            question: t("my_page.support.guides.community_safety.q"),
            answer: t("my_page.support.guides.community_safety.a"),
            ctaLabel: t("my_page.support.guides.community_safety.cta"),
            href: "/help/police",
        },
    ];

    const generalHelpCards = [
        {
            id: "help-center",
            label: t("my_page.support.general.help_center.label"),
            desc: t("my_page.support.general.help_center.desc"),
            href: "/help",
            ctaLabel: t("common.actions.open_help_center"),
        },
        {
            id: "booking-cancel",
            label: t("my_page.support.general.booking_cancel.label"),
            desc: t("my_page.support.general.booking_cancel.desc"),
            href: buildSupportRoute("booking"),
            ctaLabel: t("my_page.support.general.booking_cancel.cta"),
        },
        {
            id: "community-safety",
            label: t("my_page.support.general.community_safety.label"),
            desc: t("my_page.support.general.community_safety.desc"),
            href: "/help/police",
            ctaLabel: t("my_page.support.general.community_safety.cta"),
        },
        {
            id: "partner",
            label: t("my_page.support.general.partner.label"),
            desc: t("my_page.support.general.partner.desc"),
            href: "/auth/partner-signup",
            ctaLabel: t("common.actions.partner_inquiry"),
        },
    ];

    const emergencyCards = [
        {
            id: "overview",
            label: t("my_page.support.emergency.overview.label"),
            desc: t("my_page.support.emergency.overview.desc"),
            href: "/help",
            ctaLabel: t("my_page.support.emergency.overview.cta"),
        },
        {
            id: "interp",
            label: hasBookingContext
                ? t("common.actions.interpreter_for_booking")
                : t("my_page.support.emergency.interp.label"),
            desc: hasBookingContext
                ? t("my_page.support.emergency.interp.booking_desc")
                : t("my_page.support.emergency.interp.desc"),
            href: interpretationUrl,
            ctaLabel: hasBookingContext
                ? t("common.actions.interpreter_for_booking")
                : t("my_page.support.emergency.interp.cta"),
        },
        {
            id: "phrases",
            label: hasBookingContext
                ? t("my_page.support.emergency.phrases.booking_label")
                : t("my_page.support.emergency.phrases.label"),
            desc: hasBookingContext
                ? t("my_page.support.emergency.phrases.booking_desc")
                : t("my_page.support.emergency.phrases.desc"),
            href: contextPhrasesUrl,
            ctaLabel: hasBookingContext
                ? t("common.actions.show_booking_phrases")
                : t("my_page.support.emergency.phrases.cta"),
        },
        {
            id: "medical",
            label: t("my_page.support.emergency.medical.label"),
            desc: t("my_page.support.emergency.medical.desc"),
            href: medicalUrl,
            ctaLabel: t("my_page.support.emergency.medical.cta"),
        },
        {
            id: "police",
            label: t("my_page.support.emergency.police.label"),
            desc: t("my_page.support.emergency.police.desc"),
            href: policeUrl,
            ctaLabel: t("my_page.support.emergency.police.cta"),
        },
    ];

    const bookingDisplayName = resolvedBookingContext?.title || selectedBooking?.name;

    const bookingBannerText = bookingDisplayName
        ? mode === "report"
            ? t("my_page.support.booking.banner_report", {
                  bookingName: bookingDisplayName,
              })
            : focus === "interpreter"
              ? t("my_page.support.booking.banner_interpreter", {
                    bookingName: bookingDisplayName,
                })
              : t("my_page.support.booking.banner_default", {
                    bookingName: bookingDisplayName,
                })
        : source === "booking"
          ? t("my_page.support.booking.banner_fallback")
          : "";

    const bookingContextActions = [
        {
            href: buildSupportRoute("booking"),
            label: t("common.actions.booking_help"),
            tone: "primary" as const,
        },
        ...(hasBookingContext
            ? [
                  {
                      href: contextPhrasesUrl,
                      label: t("common.actions.show_booking_phrases"),
                      tone: "secondary" as const,
                  },
              ]
            : []),
        {
            href: hasBookingContext ? interpretationUrl : buildSupportRoute("general"),
            label: hasBookingContext
                ? t("common.actions.interpreter_for_booking")
                : focus === "interpreter"
                  ? t("common.actions.interpreter_help")
                  : t("common.actions.general_help"),
            tone: "soft" as const,
        },
    ];

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button className={styles.backLink} onClick={() => router.push("/my")}>
                    {t("common.back")}
                </button>

                <div className={styles.headerRow}>
                    <div>
                        <p className={styles.eyebrow}>
                            {t("my_page.support.eyebrow")}
                        </p>
                        <h1 className={styles.title}>
                            {t("my_page.support.title")}
                        </h1>
                        <p className={styles.subtitle}>{t("my_page.support.subtitle")}</p>
                    </div>

                    <button
                        className={styles.headerButton}
                        onClick={() => router.push("/help")}
                    >
                        {t("my_page.support.header_cta")}
                    </button>
                </div>
            </header>

            <section className={styles.summarySection}>
                <div className={styles.summaryGrid}>
                    {summaryCards.map((card) => (
                        <button
                            key={card.id}
                            className={styles.summaryCard}
                            onClick={card.onClick}
                        >
                            <span className={styles.summaryLabel}>{card.label}</span>
                            <span className={styles.summaryDesc}>{card.desc}</span>
                        </button>
                    ))}
                </div>
            </section>

            <nav className={styles.tabBar}>
                {TABS.map((tab) => (
                    <button
                        key={tab}
                        className={`${styles.tabButton} ${activeTab === tab ? styles.activeTab : ""}`}
                        onClick={() => handleTabChange(tab)}
                    >
                        {t(`my_page.support.tabs.${tab}`)}
                    </button>
                ))}
            </nav>

            {(bookingBannerText || hasBookingContext) && (
                <BookingContextBanner
                    title={t("my_page.support.booking.context_title")}
                    description={t("my_page.support.booking.context_desc")}
                    detailText={bookingBannerText || undefined}
                    chips={bookingContextChips}
                    actions={bookingContextActions}
                />
            )}

            {activeTab === "booking" && (
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <div>
                            <h2 className={styles.sectionTitle}>{t("my_page.support.booking.title")}</h2>
                            <p className={styles.sectionText}>{t("my_page.support.booking.desc")}</p>
                        </div>
                        <button
                            className={styles.inlineLink}
                            onClick={() => router.push("/my/bookings")}
                        >
                            {t("common.actions.view_bookings")}
                        </button>
                    </div>

                    {bookingHelpItems.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>BOOK</div>
                            <h3 className={styles.emptyTitle}>{t("my_page.support.booking.empty.title")}</h3>
                            <p className={styles.emptyText}>{t("my_page.support.booking.empty.desc")}</p>
                            <div className={styles.emptyActions}>
                                <button
                                    className={styles.primaryButton}
                                    onClick={() => router.push("/my/bookings")}
                                >
                                    {t("common.actions.my_bookings")}
                                </button>
                                <button
                                    className={styles.secondaryButton}
                                    onClick={() => router.push("/explore")}
                                >
                                    {t("common.actions.explore_places")}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className={styles.bookingList}>
                            {bookingHelpItems.map((item) => {
                                const rawItem = itinerary.find((entry) => entry.id === item.id);
                                const bookingContext = rawItem
                                    ? createBookingQueryContext(rawItem, t)
                                    : {
                                          bookingId: item.id,
                                          title: item.name,
                                          area: item.areaLabel,
                                          time: item.timeLabel,
                                          status: item.status,
                                      };

                                const bookingParams = new URLSearchParams({
                                    source: "booking",
                                    tab: "booking",
                                });
                                appendBookingQueryContext(bookingParams, bookingContext, {
                                    includeIdParam: true,
                                    includeBookingIdParam: false,
                                });

                                const reportParams = new URLSearchParams({
                                    source: "booking",
                                    tab: "general",
                                    mode: "report",
                                });
                                appendBookingQueryContext(reportParams, bookingContext, {
                                    includeIdParam: true,
                                    includeBookingIdParam: false,
                                });

                                const phraseParams = new URLSearchParams({
                                    category: "booking",
                                    source: "booking",
                                });
                                appendBookingQueryContext(phraseParams, bookingContext, {
                                    includeBookingIdParam: true,
                                });

                                const bookingHelpUrl = buildPathWithParams("/my/support", bookingParams);
                                const reportUrl = buildPathWithParams("/my/support", reportParams);
                                const phrasesUrl = buildPathWithParams("/my/phrases", phraseParams);

                                return (
                                    <article
                                        key={item.id}
                                        className={`${styles.bookingCard} ${
                                            item.id === selectedBookingId ? styles.bookingCardActive : ""
                                        }`}
                                    >
                                        <div className={styles.cardTop}>
                                            <span
                                                className={`${styles.statusBadge} ${
                                                    item.isOtherState ? styles.statusOther : styles.statusUpcoming
                                                }`}
                                            >
                                                {item.statusLabel}
                                            </span>
                                            <span className={styles.cardCategory}>{item.categoryLabel}</span>
                                        </div>

                                        <h3 className={styles.cardTitle}>{item.name}</h3>
                                        <div className={styles.metaRow}>
                                            <span className={styles.metaChip}>{item.timeLabel}</span>
                                            {item.areaLabel && (
                                                <span className={styles.metaChip}>{item.areaLabel}</span>
                                            )}
                                        </div>

                                        <div className={styles.cardActions}>
                                            <button
                                                className={styles.primaryButton}
                                                onClick={() => router.push("/my/bookings")}
                                            >
                                                {t("common.actions.view_booking")}
                                            </button>
                                            <button
                                                className={styles.secondaryButton}
                                                onClick={() => router.push(bookingHelpUrl)}
                                            >
                                                {t("common.actions.get_help")}
                                            </button>
                                            <button
                                                className={styles.secondaryButton}
                                                onClick={() => router.push(phrasesUrl)}
                                            >
                                                {t("common.actions.travel_phrases")}
                                            </button>
                                            <button
                                                className={styles.softButton}
                                                onClick={() => router.push(reportUrl)}
                                            >
                                                {t("common.actions.report_issue")}
                                            </button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>
            )}

            {activeTab === "general" && (
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <div>
                            <h2 className={styles.sectionTitle}>{t("my_page.support.general.title")}</h2>
                            <p className={styles.sectionText}>{t("my_page.support.general.desc")}</p>
                        </div>
                    </div>

                    {mode === "report" && selectedBooking && (
                        <div className={styles.inlineNotice}>{t("my_page.support.general.report_notice")}</div>
                    )}

                    <div className={styles.helpGrid}>
                        {generalHelpCards.map((card) => (
                            <article key={card.id} className={styles.helpCard}>
                                <h3 className={styles.helpCardTitle}>{card.label}</h3>
                                <p className={styles.helpCardDesc}>{card.desc}</p>
                                <button
                                    className={styles.secondaryButton}
                                    onClick={() => router.push(card.href)}
                                >
                                    {card.ctaLabel}
                                </button>
                            </article>
                        ))}
                    </div>
                </section>
            )}

            {activeTab === "faq" && (
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <div>
                            <h2 className={styles.sectionTitle}>{t("my_page.support.faq.title")}</h2>
                            <p className={styles.sectionText}>{t("my_page.support.faq.desc")}</p>
                        </div>
                    </div>

                    <div className={styles.guideList}>
                        {guideItems.map((item) => {
                            const expanded = openGuideId === item.id;
                            return (
                                <article key={item.id} className={styles.guideItem}>
                                    <button
                                        className={styles.guideTrigger}
                                        onClick={() => setOpenGuideId(expanded ? "" : item.id)}
                                    >
                                        <span className={styles.guideQuestion}>{item.question}</span>
                                        <span className={styles.guideChevron}>
                                            {expanded ? "-" : "+"}
                                        </span>
                                    </button>

                                    {expanded && (
                                        <div className={styles.guideAnswerWrap}>
                                            <p className={styles.guideAnswer}>{item.answer}</p>
                                            {item.href && item.ctaLabel && (
                                                <button
                                                    className={styles.softButton}
                                                    onClick={() => {
                                                        if (item.href) {
                                                            router.push(item.href);
                                                        }
                                                    }}
                                                >
                                                    {item.ctaLabel}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                </section>
            )}

            {activeTab === "emergency" && (
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <div>
                            <h2 className={styles.sectionTitle}>{t("my_page.support.emergency.title")}</h2>
                            <p className={styles.sectionText}>{t("my_page.support.emergency.desc")}</p>
                        </div>
                    </div>

                    {(focus === "interpreter" || source === "help") && (
                        <div className={styles.inlineNotice}>
                            {focus === "interpreter"
                                ? t("my_page.support.emergency.interpreter_notice")
                                : t("my_page.support.emergency.hub_notice")}
                        </div>
                    )}

                    <div className={styles.hotlineRow}>
                        <a href="tel:1330" className={styles.hotlineChip}>
                            {t("common.actions.call_1330")}
                        </a>
                        <a href="tel:119" className={styles.hotlineChip}>
                            {t("common.actions.call_119")}
                        </a>
                        <a href="tel:112" className={styles.hotlineChip}>
                            {t("common.actions.call_112")}
                        </a>
                    </div>

                    <div className={styles.helpGrid}>
                        {emergencyCards.map((card) => (
                            <article key={card.id} className={styles.helpCard}>
                                <h3 className={styles.helpCardTitle}>{card.label}</h3>
                                <p className={styles.helpCardDesc}>{card.desc}</p>
                                <button
                                    className={styles.secondaryButton}
                                    onClick={() => router.push(card.href)}
                                >
                                    {card.ctaLabel}
                                </button>
                            </article>
                        ))}
                    </div>
                </section>
            )}

            <div className={styles.bottomSpacer} />
        </div>
    );
}

export default function MySupportPage() {
    return (
        <Suspense fallback={<div style={{ padding: 24 }}>Loading...</div>}>
            <SupportPageContent />
        </Suspense>
    );
}
