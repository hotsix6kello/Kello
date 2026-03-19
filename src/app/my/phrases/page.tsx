"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useTrip } from "@/lib/contexts/TripContext";
import {
    appendBookingQueryContext,
    buildPathWithParams,
    getBookingContextChips,
    readBookingQueryContext,
    resolveBookingQueryContext,
} from "@/lib/bookingContext";
import styles from "./phrases.module.css";

type PhraseCategory =
    | "booking"
    | "transport"
    | "restaurant"
    | "beauty"
    | "emergency";

interface PhraseItem {
    id: string;
    category: PhraseCategory;
    label: string;
    english: string;
    korean: string;
    note?: string;
    emphasis?: boolean;
}

const FAVORITES_KEY = "my_phrases_favorites";
const RECENTS_KEY = "my_phrases_recent";

const CATEGORY_ORDER: PhraseCategory[] = [
    "booking",
    "transport",
    "restaurant",
    "beauty",
    "emergency",
];

function buildCategoryMeta(
    t: (key: string, options?: Record<string, unknown>) => string
): Record<PhraseCategory, { label: string; description: string; helper: string }> {
    return {
        booking: {
            label: t("my_page.phrases.categories.booking.label"),
            description: t("my_page.phrases.categories.booking.description"),
            helper: t("my_page.phrases.categories.booking.helper"),
        },
        transport: {
            label: t("my_page.phrases.categories.transport.label"),
            description: t("my_page.phrases.categories.transport.description"),
            helper: t("my_page.phrases.categories.transport.helper"),
        },
        restaurant: {
            label: t("my_page.phrases.categories.restaurant.label"),
            description: t("my_page.phrases.categories.restaurant.description"),
            helper: t("my_page.phrases.categories.restaurant.helper"),
        },
        beauty: {
            label: t("my_page.phrases.categories.beauty.label"),
            description: t("my_page.phrases.categories.beauty.description"),
            helper: t("my_page.phrases.categories.beauty.helper"),
        },
        emergency: {
            label: t("my_page.phrases.categories.emergency.label"),
            description: t("my_page.phrases.categories.emergency.description"),
            helper: t("my_page.phrases.categories.emergency.helper"),
        },
    };
}

const PHRASES: PhraseItem[] = [
    {
        id: "booking-reservation",
        category: "booking",
        label: "Check-in / reservation",
        english: "I have a reservation.",
        korean: "예약했습니다.",
        note: "Show your booking name or confirmation screen together.",
        emphasis: true,
    },
    {
        id: "booking-check",
        category: "booking",
        label: "Booking confirmation",
        english: "Can you check my booking?",
        korean: "예약 확인 부탁드립니다.",
        emphasis: true,
    },
    {
        id: "booking-late",
        category: "booking",
        label: "Running late",
        english: "I may be about 10 minutes late.",
        korean: "10분 정도 늦을 것 같습니다.",
    },
    {
        id: "booking-change",
        category: "booking",
        label: "Change request",
        english: "Can I change my option?",
        korean: "옵션을 변경할 수 있을까요?",
    },
    {
        id: "booking-checkin-desk",
        category: "booking",
        label: "Where to go",
        english: "Where should I check in?",
        korean: "어디에서 체크인하면 될까요?",
    },
    {
        id: "transport-address",
        category: "transport",
        label: "Destination address",
        english: "Please take me to this address.",
        korean: "이 주소로 가 주세요.",
        emphasis: true,
    },
    {
        id: "transport-dropoff",
        category: "transport",
        label: "Stop here",
        english: "Please drop me off here.",
        korean: "여기에서 내려 주세요.",
    },
    {
        id: "transport-time",
        category: "transport",
        label: "Travel time",
        english: "How long will it take?",
        korean: "얼마나 걸릴까요?",
    },
    {
        id: "transport-map",
        category: "transport",
        label: "Use the map",
        english: "Please use the map.",
        korean: "지도를 봐 주세요.",
        note: "Useful when pronunciation or landmarks are difficult.",
    },
    {
        id: "transport-platform",
        category: "transport",
        label: "Platform check",
        english: "Is this the right platform?",
        korean: "이곳이 맞는 승강장인가요?",
    },
    {
        id: "restaurant-allergy",
        category: "restaurant",
        label: "Seafood allergy",
        english: "I have a seafood allergy.",
        korean: "해산물 알레르기가 있습니다.",
        emphasis: true,
    },
    {
        id: "restaurant-spicy",
        category: "restaurant",
        label: "No spicy food",
        english: "I cannot eat spicy food.",
        korean: "매운 음식을 먹지 못합니다.",
        emphasis: true,
    },
    {
        id: "restaurant-recommend",
        category: "restaurant",
        label: "Popular menu",
        english: "Can you recommend a popular menu?",
        korean: "인기 메뉴를 추천해 주세요.",
    },
    {
        id: "restaurant-less-spicy",
        category: "restaurant",
        label: "Less spicy request",
        english: "Please make it less spicy.",
        korean: "덜 맵게 부탁드립니다.",
    },
    {
        id: "restaurant-split",
        category: "restaurant",
        label: "Split the bill",
        english: "Can we split the bill?",
        korean: "계산을 나눠서 할 수 있을까요?",
    },
    {
        id: "beauty-reservation",
        category: "beauty",
        label: "Treatment booking",
        english: "I have a reservation for a treatment.",
        korean: "예약한 시술이 있습니다.",
        emphasis: true,
    },
    {
        id: "beauty-natural",
        category: "beauty",
        label: "Natural style",
        english: "I want a natural style.",
        korean: "자연스러운 스타일로 부탁드립니다.",
        emphasis: true,
    },
    {
        id: "beauty-price",
        category: "beauty",
        label: "Price check first",
        english: "Please show me the total price first.",
        korean: "총 금액을 먼저 알려 주세요.",
    },
    {
        id: "beauty-slowly",
        category: "beauty",
        label: "Explain slowly",
        english: "Can you explain the options slowly?",
        korean: "옵션을 천천히 설명해 주실 수 있을까요?",
    },
    {
        id: "beauty-before-start",
        category: "beauty",
        label: "Confirm before start",
        english: "Please show me before you start.",
        korean: "시작 전에 먼저 보여 주세요.",
    },
    {
        id: "emergency-help",
        category: "emergency",
        label: "Need help now",
        english: "Please help me.",
        korean: "도와주세요.",
        emphasis: true,
    },
    {
        id: "emergency-interpreter",
        category: "emergency",
        label: "Need an interpreter",
        english: "I need an interpreter.",
        korean: "통역이 필요합니다.",
        emphasis: true,
    },
    {
        id: "emergency-lost",
        category: "emergency",
        label: "Lost",
        english: "I am lost.",
        korean: "길을 잃었습니다.",
    },
    {
        id: "emergency-1330",
        category: "emergency",
        label: "Tourist helpline",
        english: "Please call the tourist helpline.",
        korean: "관광안내 1330에 연락해 주세요.",
        note: "1330 is the Korea Travel Helpline.",
    },
    {
        id: "emergency-police",
        category: "emergency",
        label: "Police help",
        english: "Please help me contact the police.",
        korean: "경찰에 연락할 수 있게 도와주세요.",
    },
];

function isPhraseCategory(value: string | null): value is PhraseCategory {
    return CATEGORY_ORDER.includes(value as PhraseCategory);
}

function parseCategory(
    requestedCategory: string | null,
    source: string | null,
    focus: string | null
): PhraseCategory {
    if (isPhraseCategory(requestedCategory)) {
        return requestedCategory;
    }

    if (source === "booking") {
        return "booking";
    }

    if (focus === "interpreter" || focus === "emergency") {
        return "emergency";
    }

    return "booking";
}

function buildPhrasesUrl(params: URLSearchParams): string {
    const query = params.toString();
    return query ? `/my/phrases?${query}` : "/my/phrases";
}

function readStoredList(key: string): string[] {
    if (typeof window === "undefined") return [];

    try {
        const raw = localStorage.getItem(key);
        if (!raw) return [];

        const parsed = JSON.parse(raw) as unknown;
        return Array.isArray(parsed)
            ? parsed.filter((item): item is string => typeof item === "string")
            : [];
    } catch {
        return [];
    }
}

function writeStoredList(key: string, value: string[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(key, JSON.stringify(value));
}

async function copyPhraseText(text: string) {
    if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function"
    ) {
        await navigator.clipboard.writeText(text);
        return;
    }

    if (typeof document === "undefined") return;

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
}

function PhrasebookContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useTranslation("common");
    const { itinerary } = useTrip();
    const categoryMeta = buildCategoryMeta(t);

    const source = searchParams.get("source");
    const focus = searchParams.get("focus");
    const bookingQueryContext = readBookingQueryContext(searchParams);
    const bookingId = bookingQueryContext?.bookingId ?? searchParams.get("bookingId") ?? searchParams.get("id");

    const [activeCategory, setActiveCategory] = useState<PhraseCategory>(
        parseCategory(searchParams.get("category"), source, focus)
    );
    const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
    const [recentIds, setRecentIds] = useState<string[]>([]);
    const [selectedPhrase, setSelectedPhrase] = useState<PhraseItem | null>(null);
    const [copiedId, setCopiedId] = useState("");

    useEffect(() => {
        setActiveCategory(parseCategory(searchParams.get("category"), source, focus));
    }, [focus, searchParams, source]);

    useEffect(() => {
        setFavoriteIds(readStoredList(FAVORITES_KEY));
        setRecentIds(readStoredList(RECENTS_KEY));
    }, []);

    useEffect(() => {
        if (!selectedPhrase || typeof document === "undefined") return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [selectedPhrase]);

    const currentCategoryMeta = categoryMeta[activeCategory];
    const currentPhrases = PHRASES.filter((phrase) => phrase.category === activeCategory);
    const favoritePhrases = favoriteIds
        .map((id) => PHRASES.find((phrase) => phrase.id === id))
        .filter((phrase): phrase is PhraseItem => Boolean(phrase));
    const recentPhrases = recentIds
        .map((id) => PHRASES.find((phrase) => phrase.id === id))
        .filter((phrase): phrase is PhraseItem => Boolean(phrase));
    const fallbackBookingContext = bookingQueryContext ?? (bookingId ? { bookingId } : null);
    const resolvedBookingContext = resolveBookingQueryContext(
        itinerary,
        fallbackBookingContext,
        t
    );
    const hasBookingContext = Boolean(resolvedBookingContext?.bookingId);
    const contextChips = getBookingContextChips(resolvedBookingContext, t);

    const bookingSupportParams = new URLSearchParams({
        tab: "booking",
        source: hasBookingContext ? "booking" : "phrases",
    });
    appendBookingQueryContext(bookingSupportParams, resolvedBookingContext, {
        includeIdParam: hasBookingContext,
        includeBookingIdParam: false,
    });
    const bookingHelpUrl = buildPathWithParams("/my/support", bookingSupportParams);

    const generalSupportParams = new URLSearchParams({
        tab: "general",
        source: hasBookingContext ? "booking" : "phrases",
    });
    appendBookingQueryContext(generalSupportParams, resolvedBookingContext, {
        includeIdParam: hasBookingContext,
        includeBookingIdParam: false,
    });
    const generalSupportUrl = buildPathWithParams("/my/support", generalSupportParams);

    const interpreterParams = new URLSearchParams({
        source: hasBookingContext ? "booking" : "phrases",
        focus: "interpreter",
    });
    appendBookingQueryContext(interpreterParams, resolvedBookingContext, {
        includeBookingIdParam: true,
    });
    const interpreterUrl = buildPathWithParams("/help/interpretation", interpreterParams);

    const emergencySupportParams = new URLSearchParams({
        tab: "emergency",
        source: hasBookingContext ? "booking" : "phrases",
    });
    appendBookingQueryContext(emergencySupportParams, resolvedBookingContext, {
        includeIdParam: hasBookingContext,
        includeBookingIdParam: false,
    });
    const emergencyUrl = buildPathWithParams("/my/support", emergencySupportParams);

    const backHref =
        hasBookingContext && focus === "interpreter"
            ? interpreterUrl
            : hasBookingContext && focus === "emergency"
              ? emergencyUrl
              : hasBookingContext
                ? bookingHelpUrl
                : source === "help"
                  ? "/help"
                  : source === "support" || focus === "interpreter" || focus === "emergency"
                    ? emergencyUrl
                    : source === "booking"
                      ? "/my/bookings"
                      : "/my";

    const updateCategory = (category: PhraseCategory) => {
        setActiveCategory(category);

        const nextParams = new URLSearchParams(searchParams.toString());
        nextParams.set("category", category);
        router.replace(buildPhrasesUrl(nextParams), { scroll: false });
    };

    const pushRecent = (phraseId: string) => {
        setRecentIds((prev) => {
            const next = [phraseId, ...prev.filter((item) => item !== phraseId)].slice(0, 6);
            writeStoredList(RECENTS_KEY, next);
            return next;
        });
    };

    const toggleFavorite = (phraseId: string) => {
        setFavoriteIds((prev) => {
            const next = prev.includes(phraseId)
                ? prev.filter((item) => item !== phraseId)
                : [phraseId, ...prev].slice(0, 10);
            writeStoredList(FAVORITES_KEY, next);
            return next;
        });
    };

    const openLargeView = (phrase: PhraseItem) => {
        pushRecent(phrase.id);
        setSelectedPhrase(phrase);
    };

    const handleCopy = async (phrase: PhraseItem) => {
        pushRecent(phrase.id);

        try {
            await copyPhraseText(`${phrase.korean}\n${phrase.english}`);
            setCopiedId(phrase.id);
            window.setTimeout(() => {
                setCopiedId((current) => (current === phrase.id ? "" : current));
            }, 1400);
        } catch {
            setCopiedId("");
        }
    };

    const renderMiniPhraseCard = (phrase: PhraseItem) => (
        <button
            key={phrase.id}
            className={styles.miniPhraseCard}
            onClick={() => {
                updateCategory(phrase.category);
                openLargeView(phrase);
            }}
        >
            <span className={styles.miniCategory}>{categoryMeta[phrase.category].label}</span>
            <span className={styles.miniKorean}>{phrase.korean}</span>
            <span className={styles.miniEnglish}>{phrase.english}</span>
        </button>
    );

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button className={styles.backLink} onClick={() => router.push(backHref)}>
                    {t("common.back")}
                </button>

                <div className={styles.headerRow}>
                    <div>
                        <p className={styles.eyebrow}>
                            {t("my_page.phrases.eyebrow")}
                        </p>
                        <h1 className={styles.title}>
                            {t("my_page.phrases.title")}
                        </h1>
                        <p className={styles.subtitle}>{t("my_page.phrases.subtitle")}</p>
                    </div>
                </div>
            </header>

            <section className={styles.heroCard}>
                <div className={styles.heroTop}>
                    <span className={styles.heroBadge}>
                        {t("my_page.phrases.hero.badge")}
                    </span>
                    <span className={styles.heroCount}>
                        {currentPhrases.length}{" "}
                        {t("my_page.phrases.hero.count")}
                    </span>
                </div>

                <h2 className={styles.heroTitle}>{currentCategoryMeta.label}</h2>
                <p className={styles.heroText}>{currentCategoryMeta.description}</p>
                <p className={styles.heroHint}>{currentCategoryMeta.helper}</p>

                <div className={styles.heroActions}>
                    <button
                        className={styles.primaryButton}
                        onClick={() => router.push(hasBookingContext ? bookingHelpUrl : generalSupportUrl)}
                    >
                        {hasBookingContext
                            ? t("common.actions.booking_help")
                            : t("common.actions.open_support")}
                    </button>
                    <button
                        className={styles.secondaryButton}
                        onClick={() => router.push(interpreterUrl)}
                    >
                        {hasBookingContext
                            ? t("common.actions.interpreter_for_booking")
                            : t("common.actions.interpreter_help")}
                    </button>
                    <button
                        className={styles.softButton}
                        onClick={() => router.push(hasBookingContext ? generalSupportUrl : bookingHelpUrl)}
                    >
                        {hasBookingContext
                            ? t("common.actions.open_support")
                            : t("common.actions.booking_help")}
                    </button>
                </div>
            </section>

            {(hasBookingContext || source === "support" || focus === "interpreter") && (
                <section className={styles.contextCard}>
                    <div className={styles.sectionHeader}>
                        <div>
                            <h2 className={styles.sectionTitle}>
                                {t("my_page.phrases.context.title")}
                            </h2>
                            <p className={styles.sectionText}>
                                {hasBookingContext
                                    ? t("my_page.phrases.context.booking")
                                    : focus === "interpreter"
                                      ? t("my_page.phrases.context.interpreter")
                                      : t("my_page.phrases.context.support")}
                            </p>
                        </div>
                        <span className={styles.contextTag}>
                            {hasBookingContext
                                ? categoryMeta.booking.label
                                : focus === "interpreter"
                                  ? categoryMeta.emergency.label
                                  : categoryMeta[activeCategory].label}
                        </span>
                    </div>

                    {hasBookingContext && contextChips.length > 0 && (
                        <div className={styles.contextMetaRow}>
                            {contextChips.map((chip) => (
                                <span key={chip} className={styles.contextMetaChip}>
                                    {chip}
                                </span>
                            ))}
                        </div>
                    )}

                    {hasBookingContext && (
                        <div className={styles.contextActions}>
                            <button
                                className={styles.secondaryButton}
                                onClick={() => router.push(bookingHelpUrl)}
                            >
                                {t("common.actions.booking_help")}
                            </button>
                            <button
                                className={styles.softButton}
                                onClick={() => router.push(interpreterUrl)}
                            >
                                {t("common.actions.interpreter_for_booking")}
                            </button>
                        </div>
                    )}
                </section>
            )}

            <section className={styles.memorySection}>
                <div className={styles.sectionHeader}>
                    <div>
                        <h2 className={styles.sectionTitle}>
                            {t("common.states.favorites")}
                        </h2>
                        <p className={styles.sectionText}>
                            {t("my_page.phrases.favorites.desc")}
                        </p>
                    </div>
                    <span className={styles.countPill}>{favoritePhrases.length}</span>
                </div>

                {favoritePhrases.length > 0 ? (
                    <div className={styles.miniPhraseList}>
                        {favoritePhrases.slice(0, 4).map(renderMiniPhraseCard)}
                    </div>
                ) : (
                    <div className={styles.emptyMemory}>
                        {t("my_page.phrases.favorites.empty")}
                    </div>
                )}

                {recentPhrases.length > 0 && (
                    <>
                        <div className={styles.memoryDivider} />
                        <div className={styles.sectionHeader}>
                            <div>
                                <h3 className={styles.sectionTitle}>
                                    {t("common.states.recent")}
                                </h3>
                                <p className={styles.sectionText}>
                                    {t("my_page.phrases.recent.desc")}
                                </p>
                            </div>
                            <span className={styles.countPill}>{recentPhrases.length}</span>
                        </div>

                        <div className={styles.miniPhraseList}>
                            {recentPhrases.slice(0, 4).map(renderMiniPhraseCard)}
                        </div>
                    </>
                )}
            </section>

            <nav className={styles.categoryBar}>
                {CATEGORY_ORDER.map((category) => {
                    const count = PHRASES.filter((phrase) => phrase.category === category).length;
                    const isActive = activeCategory === category;

                    return (
                        <button
                            key={category}
                            className={`${styles.categoryChip} ${
                                isActive ? styles.activeCategoryChip : ""
                            }`}
                            onClick={() => updateCategory(category)}
                        >
                            <span className={styles.categoryLabel}>
                                {categoryMeta[category].label}
                            </span>
                            <span className={styles.categoryCount}>{count}</span>
                        </button>
                    );
                })}
            </nav>

            <section className={styles.listSection}>
                <div className={styles.sectionHeader}>
                    <div>
                        <h2 className={styles.sectionTitle}>
                            {t("my_page.phrases.category.title", {
                                category: currentCategoryMeta.label,
                            })}
                        </h2>
                        <p className={styles.sectionText}>{currentCategoryMeta.description}</p>
                    </div>
                    <span className={styles.countPill}>{currentPhrases.length}</span>
                </div>

                {currentPhrases.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>PH</div>
                        <h3 className={styles.emptyTitle}>
                            {t("my_page.phrases.empty.title")}
                        </h3>
                        <p className={styles.emptyText}>
                            {t("my_page.phrases.empty.desc")}
                        </p>
                    </div>
                ) : (
                    <div className={styles.phraseList}>
                        {currentPhrases.map((phrase) => {
                            const isFavorite = favoriteIds.includes(phrase.id);
                            const assistanceLabel =
                                phrase.category === "booking"
                                    ? hasBookingContext
                                        ? t("common.actions.booking_help")
                                        : t("common.actions.booking_help")
                                    : phrase.category === "emergency"
                                      ? t("common.actions.emergency_help")
                                      : t("common.actions.support");

                            const assistanceHref =
                                phrase.category === "booking"
                                    ? bookingHelpUrl
                                    : phrase.category === "emergency"
                                      ? emergencyUrl
                                      : generalSupportUrl;

                            return (
                                <article
                                    key={phrase.id}
                                    className={`${styles.phraseCard} ${
                                        phrase.emphasis ? styles.emphasisCard : ""
                                    }`}
                                    onClick={() => openLargeView(phrase)}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter" || event.key === " ") {
                                            event.preventDefault();
                                            openLargeView(phrase);
                                        }
                                    }}
                                    role="button"
                                    tabIndex={0}
                                >
                                    <div className={styles.cardHeader}>
                                        <div>
                                            <div className={styles.cardMeta}>
                                                <span className={styles.cardCategory}>
                                                    {categoryMeta[phrase.category].label}
                                                </span>
                                                {phrase.emphasis && (
                                                    <span className={styles.emphasisBadge}>
                                                        {t("common.states.frequent")}
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className={styles.cardTitle}>{phrase.label}</h3>
                                        </div>

                                        <button
                                            className={`${styles.favoriteButton} ${
                                                isFavorite ? styles.favoriteButtonActive : ""
                                            }`}
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                toggleFavorite(phrase.id);
                                            }}
                                        >
                                            {isFavorite
                                                ? t("common.actions.saved")
                                                : t("common.actions.save")}
                                        </button>
                                    </div>

                                    <p className={styles.englishText}>{phrase.english}</p>

                                    <div className={styles.koreanPanel}>
                                        <span className={styles.koreanLabel}>
                                            {t("common.actions.show_in_korean")}
                                        </span>
                                        <p className={styles.koreanText}>{phrase.korean}</p>
                                    </div>

                                    {phrase.note && <p className={styles.cardNote}>{phrase.note}</p>}

                                    <div className={styles.cardActions}>
                                        <button
                                            className={styles.primaryButton}
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                openLargeView(phrase);
                                            }}
                                        >
                                            {t("common.actions.large_view")}
                                        </button>
                                        <button
                                            className={styles.secondaryButton}
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                void handleCopy(phrase);
                                            }}
                                        >
                                                {copiedId === phrase.id
                                                    ? t("common.actions.copied")
                                                    : t("common.actions.copy")}
                                        </button>
                                        <button
                                            className={styles.softButton}
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                router.push(assistanceHref);
                                            }}
                                        >
                                            {assistanceLabel}
                                        </button>
                                        <button
                                            className={styles.softButton}
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                router.push(interpreterUrl);
                                            }}
                                        >
                                            {t("common.actions.interpreter_help")}
                                        </button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>

            {selectedPhrase && (
                <div
                    className={styles.modalOverlay}
                    onClick={() => setSelectedPhrase(null)}
                    role="presentation"
                >
                    <div
                        className={styles.modalCard}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className={styles.modalTop}>
                            <div>
                                <span className={styles.modalCategory}>
                                    {categoryMeta[selectedPhrase.category].label}
                                </span>
                                <h2 className={styles.modalTitle}>{selectedPhrase.label}</h2>
                            </div>
                            <button
                                className={styles.modalClose}
                                onClick={() => setSelectedPhrase(null)}
                            >
                                {t("common.actions.close")}
                            </button>
                        </div>

                        <div className={styles.modalPhraseWrap}>
                            <p className={styles.modalKorean}>{selectedPhrase.korean}</p>
                            <p className={styles.modalEnglish}>{selectedPhrase.english}</p>
                            {selectedPhrase.note && (
                                <p className={styles.modalNote}>{selectedPhrase.note}</p>
                            )}
                        </div>

                        <div className={styles.modalActions}>
                            <button
                                className={styles.primaryButton}
                                onClick={() => void handleCopy(selectedPhrase)}
                            >
                                {copiedId === selectedPhrase.id
                                    ? t("common.actions.copied")
                                    : t("common.actions.copy")}
                            </button>
                            <button
                                className={styles.secondaryButton}
                                onClick={() =>
                                    router.push(
                                        selectedPhrase.category === "booking"
                                            ? bookingHelpUrl
                                            : selectedPhrase.category === "emergency"
                                              ? emergencyUrl
                                              : generalSupportUrl
                                    )
                                }
                            >
                                {selectedPhrase.category === "booking"
                                    ? t("common.actions.booking_help")
                                    : selectedPhrase.category === "emergency"
                                      ? t("common.actions.emergency_help")
                                      : t("common.actions.support")}
                            </button>
                            <button
                                className={styles.softButton}
                                onClick={() => router.push(interpreterUrl)}
                            >
                                {t("common.actions.interpreter_help")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className={styles.bottomSpacer} />
        </div>
    );
}

export default function MyPhrasesPage() {
    return (
        <Suspense fallback={<div style={{ padding: 24 }}>Loading...</div>}>
            <PhrasebookContent />
        </Suspense>
    );
}
