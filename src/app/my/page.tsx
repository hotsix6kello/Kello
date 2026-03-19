"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useTrip, ItineraryItem } from "@/lib/contexts/TripContext";
import { supabase } from "@/lib/supabaseClient";
import { readSavedHubRecentEntries, readSavedItemIds } from "@/lib/savedHub";
import {
    formatCountLabel,
    formatItineraryStatusLabel,
    formatTripDayTimeLabel,
} from "@/lib/i18n/runtimeFormatters";
import styles from "./my.module.css";

type PartnerStatus = "none" | "pending" | "approved" | "rejected";

interface BookingCard {
    id: string;
    title: string;
    date: string;
    category: string;
    status: string;
    area?: string;
    price?: string;
    isNew: boolean;
    lat?: number;
    lng?: number;
}

interface CommunityPost {
    id: string;
    type: string;
    time: string;
    title: string;
    desc: string;
    comments: number;
}

interface DashboardProfileRecord {
    nickname: string | null;
    is_admin: boolean | null;
}

const SSR_SAFE_FALLBACK_NAME = "Traveler";
const SSR_SAFE_FALLBACK_SUBTITLE = "Account & preferences";

function pickString(...values: unknown[]): string {
    for (const value of values) {
        if (typeof value === "string" && value.trim()) {
            return value.trim();
        }
    }

    return "";
}

function ProfileSummaryCard({
    userName,
    subtitle,
    onOpenSettings,
}: {
    userName: string;
    subtitle?: string;
    onOpenSettings: () => void;
}) {
    const { t } = useTranslation("common");
    const initials = userName
        .split(" ")
        .map((part) => part[0] || "")
        .join("")
        .toUpperCase()
        .slice(0, 2);

    return (
        <div className={styles.profileCard}>
            <div className={styles.profileAvatarWrap}>
                <div className={styles.profileAvatar}>
                    <span className={styles.profileInitials}>{initials || "TR"}</span>
                </div>
            </div>

            <div className={styles.profileInfo}>
                <div className={styles.profileTopRow}>
                    <div>
                        <h1 className={styles.profileName}>{userName}</h1>
                        <div className={styles.profileSubtext}>
                            {subtitle || t("my_page.profile.account_hint")}
                        </div>
                    </div>

                    <button
                        className={styles.profileSettingsButton}
                        onClick={onOpenSettings}
                    >
                        {t("my_page.settings.short")}
                    </button>
                </div>
            </div>
        </div>
    );
}

function QuickActionBar() {
    const router = useRouter();
    const { t } = useTranslation("common");

    const actions = [
        {
            icon: "N",
            label: t("common.move"),
            onClick: () => router.push("/navigation"),
        },
        {
            icon: "T",
            label: t("common.today_nav"),
            onClick: () => router.push("/navigation"),
        },
        {
            icon: "S",
            label: t("my_page.support.short"),
            onClick: () => router.push("/my/support"),
        },
        {
            icon: "KO",
            label: t("my_page.phrases.quick"),
            onClick: () => router.push("/my/phrases"),
        },
    ];

    return (
        <div className={styles.quickActionBar}>
            {actions.map((action) => (
                <button
                    key={action.label}
                    className={styles.quickActionBtn}
                    onClick={action.onClick}
                >
                    <span className={styles.quickActionIcon}>{action.icon}</span>
                    <span className={styles.quickActionLabel}>{action.label}</span>
                </button>
            ))}
        </div>
    );
}

function UpcomingBookingsSection({ bookings }: { bookings: BookingCard[] }) {
    const router = useRouter();
    const { t } = useTranslation("common");

    const displayed = bookings
        .filter((item) => item.status === "confirmed" || item.status === "submitted")
        .slice(0, 3);

    return (
        <section className={styles.section}>
            <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>{t("my_page.bookings.title")}</h2>
                {bookings.length > 0 && (
                    <button
                        className={styles.sectionMore}
                        onClick={() => router.push("/my/bookings")}
                    >
                        {t("common.actions.view_all")}
                    </button>
                )}
            </div>

            {displayed.length === 0 ? (
                <div className={styles.emptyCard}>
                    <span className={styles.emptyIcon}>BOOK</span>
                    <p className={styles.emptyText}>{t("my_page.dashboard.bookings_empty")}</p>
                    <button
                        className={styles.emptyBtn}
                        onClick={() => router.push("/explore")}
                    >
                        {t("common.actions.explore_places")}
                    </button>
                </div>
            ) : (
                <div className={styles.bookingList}>
                    {displayed.map((booking) => (
                        <div key={booking.id} className={styles.bookingTicket}>
                            <div className={styles.ticketLeft}>
                                <div className={styles.ticketCatRow}>
                                    <span className={styles.ticketCat}>{booking.category}</span>
                                    <span
                                        className={`${styles.ticketStatus} ${
                                            booking.status === "confirmed"
                                                ? styles.statusConfirmed
                                                : ""
                                        }`}
                                    >
                                        {formatItineraryStatusLabel(t, booking.status)}
                                    </span>
                                </div>

                                <div className={styles.ticketTitle}>{booking.title}</div>
                                <div className={styles.ticketMeta}>
                                    {booking.date}
                                    {booking.area && <span> · {booking.area}</span>}
                                    {booking.price && <span> · {booking.price}</span>}
                                </div>

                                {booking.isNew && (
                                    <div className={styles.newBadge}>
                                        {t("my_page.bookings.new_added")}
                                    </div>
                                )}
                            </div>

                            <div className={styles.ticketActions}>
                                <button
                                    className={styles.ticketActionBtn}
                                    onClick={() => router.push("/planner")}
                                >
                                    {t("common.actions.details")}
                                </button>

                                {booking.lat && booking.lng && (
                                    <button
                                        className={styles.ticketActionBtn}
                                        onClick={() => {
                                            const url = `https://www.google.com/maps/dir/?api=1&destination=${booking.lat},${booking.lng}&travelmode=transit`;
                                            window.open(url, "_blank");
                                        }}
                                    >
                                        {t("common.actions.map")}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

function TodayPlanSection({ itinerary }: { itinerary: ItineraryItem[] }) {
    const router = useRouter();
    const { t } = useTranslation("common");

    const todayItems = useMemo(() => {
        return [...itinerary]
            .sort((left, right) => {
                const toMinutes = (value: string) => {
                    const [hours, minutes] = value.split(":").map(Number);
                    return hours * 60 + minutes;
                };

                return toMinutes(left.time) - toMinutes(right.time);
            })
            .slice(0, 4);
    }, [itinerary]);

    const typeIcon: Record<string, string> = {
        beauty: "B",
        food: "F",
        attraction: "A",
        transport: "T",
        event: "E",
    };

    return (
        <section className={styles.section}>
            <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>{t("today_page.title")}</h2>
                <button
                    className={styles.sectionMore}
                    onClick={() => router.push("/navigation")}
                >
                    {t("today_page.timeline", { defaultValue: t("common.actions.view_all") })}
                </button>
            </div>

            {todayItems.length === 0 ? (
                <div className={styles.emptyCard}>
                    <span className={styles.emptyIcon}>TODAY</span>
                    <p className={styles.emptyText}>{t("today_page.empty.title")}</p>
                    <button
                        className={styles.emptyBtn}
                        onClick={() => router.push("/explore")}
                    >
                        {t("today_page.empty.cta")}
                    </button>
                </div>
            ) : (
                <div className={styles.todayList}>
                    {todayItems.map((item) => (
                        <div key={item.id} className={styles.todayItem}>
                            <div className={styles.todayTimeCol}>
                                <span className={styles.todayTime}>{item.time}</span>
                            </div>
                            <div className={styles.todayDot} />
                            <div className={styles.todayContent}>
                                <span className={styles.todayIcon}>
                                    {typeIcon[item.type || "attraction"] || "A"}
                                </span>
                                <div>
                                    <div className={styles.todayTitle}>{item.name}</div>
                                    <div className={styles.todayStatus}>
                                        {formatItineraryStatusLabel(t, item.status)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

function CommunitySummarySection({ posts }: { posts: CommunityPost[] }) {
    const router = useRouter();
    const { t } = useTranslation("common");
    const recent = posts.slice(0, 2);

    return (
        <section className={styles.section}>
            <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>{t("my_page.community.title")}</h2>
                <button
                    className={styles.sectionMore}
                    onClick={() => router.push("/my/community")}
                >
                    {t("common.actions.view_all")}
                </button>
            </div>

            {recent.length === 0 ? (
                <div className={styles.emptyCard}>
                    <span className={styles.emptyIcon}>POST</span>
                    <p className={styles.emptyText}>{t("my_page.community.empty")}</p>
                </div>
            ) : (
                <div className={styles.communityList}>
                    {recent.map((post) => (
                        <div
                            key={post.id}
                            className={styles.communityCard}
                            onClick={() => router.push(`/community/${post.id}`)}
                        >
                            <div className={styles.communityCardTop}>
                                <span
                                    className={`${styles.communityBadge} ${
                                        styles[`badge_${post.type}`] || ""
                                    }`}
                                >
                                    {t(`community_page.type.${post.type.toUpperCase()}`, {
                                        defaultValue: post.type,
                                    })}
                                </span>
                                <span className={styles.communityTime}>{post.time}</span>
                            </div>
                            <div className={styles.communityTitle}>{post.title}</div>
                            <div className={styles.communityDesc}>{post.desc}</div>
                            <div className={styles.communityFooter}>
                                {formatCountLabel(t, post.comments, "comments")}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

function SavedHubSection({
    savedPlacesCount,
    savedPlansCount,
    savedRecentCount,
}: {
    savedPlacesCount: number;
    savedPlansCount: number;
    savedRecentCount: number;
}) {
    const router = useRouter();
    const { t } = useTranslation("common");

    const summaryItems = [
        {
            id: "places",
            label: t("my_page.saved.summary.places"),
            value: savedPlacesCount,
        },
        {
            id: "plans",
            label: t("my_page.saved.summary.plans"),
            value: savedPlansCount,
        },
        {
            id: "recent",
            label: t("my_page.saved.summary.recent"),
            value: savedRecentCount,
        },
    ];

    return (
        <section className={styles.section}>
            <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>{t("my_page.saved.title")}</h2>
                <button
                    className={styles.sectionMore}
                    onClick={() => router.push("/my/saved")}
                >
                    {t("my_page.saved.view_all")}
                </button>
            </div>

            <div className={styles.savedSummaryRow}>
                {summaryItems.map((item) => (
                    <div key={item.id} className={styles.savedSummaryCard}>
                        <span className={styles.savedSummaryLabel}>{item.label}</span>
                        <strong className={styles.savedSummaryValue}>{item.value}</strong>
                    </div>
                ))}
            </div>

            <button
                className={styles.savedHubCard}
                onClick={() => router.push("/my/saved")}
            >
                <div className={styles.savedHubText}>
                    <div className={styles.savedHubTitle}>
                        {t("my_page.saved.dashboard_title")}
                    </div>
                    <div className={styles.savedHubDesc}>
                        {t("my_page.saved.dashboard_desc")}
                    </div>
                </div>
                <div className={styles.savedHubArrow}>{">"}</div>
            </button>
        </section>
    );
}

function PartnerStatusBanner({ status }: { status: PartnerStatus | null }) {
    const router = useRouter();
    const { t } = useTranslation("common");

    if (status === null) {
        return null;
    }

    const bannerConfig: Record<
        PartnerStatus,
        {
            bg: string;
            border: string;
            icon: string;
            title: string;
            desc: string;
            buttonLabel?: string;
            buttonColor?: string;
            onClick?: () => void;
        }
    > = {
        none: {
            bg: "rgba(245,158,11,0.07)",
            border: "rgba(245,158,11,0.25)",
            icon: "P",
            title: t("my_page.dashboard.partner.none_title"),
            desc: t("my_page.dashboard.partner.none_desc"),
            buttonLabel: t("my_page.dashboard.partner.none_cta"),
            buttonColor: "#f59e0b",
            onClick: () => router.push("/auth/partner-signup"),
        },
        pending: {
            bg: "rgba(245,158,11,0.05)",
            border: "rgba(245,158,11,0.18)",
            icon: "...",
            title: t("my_page.dashboard.partner.pending_title"),
            desc: t("my_page.dashboard.partner.pending_desc"),
        },
        approved: {
            bg: "rgba(16,185,129,0.05)",
            border: "rgba(16,185,129,0.2)",
            icon: "OK",
            title: t("my_page.dashboard.partner.approved_title"),
            desc: t("my_page.dashboard.partner.approved_desc"),
        },
        rejected: {
            bg: "rgba(239,68,68,0.05)",
            border: "rgba(239,68,68,0.18)",
            icon: "!",
            title: t("my_page.dashboard.partner.rejected_title"),
            desc: t("my_page.dashboard.partner.rejected_desc"),
            buttonLabel: t("my_page.dashboard.partner.rejected_cta"),
            buttonColor: "#ef4444",
            onClick: () => router.push("/auth/partner-signup"),
        },
    };

    const config = bannerConfig[status];

    return (
        <div
            className={styles.partnerBanner}
            style={{ background: config.bg, borderColor: config.border }}
        >
            <span className={styles.partnerBannerIcon}>{config.icon}</span>
            <div className={styles.partnerBannerBody}>
                <div className={styles.partnerBannerTitle}>{config.title}</div>
                <div className={styles.partnerBannerDesc}>{config.desc}</div>
            </div>

            {config.buttonLabel && config.onClick && (
                <button
                    className={styles.partnerBannerBtn}
                    style={{ background: config.buttonColor }}
                    onClick={config.onClick}
                >
                    {config.buttonLabel}
                </button>
            )}
        </div>
    );
}

function AdminShortcutCard() {
    const router = useRouter();
    const { t } = useTranslation("common");

    return (
        <div className={styles.adminShortcut} onClick={() => router.push("/admin")}>
            <div className={styles.adminShortcutLeft}>
                <div className={styles.adminShortcutIcon}>ADMIN</div>
                <div>
                    <div className={styles.adminShortcutTitle}>
                        {t("my_page.dashboard.admin_title")}
                    </div>
                    <div className={styles.adminShortcutDesc}>
                        {t("my_page.dashboard.admin_desc")}
                    </div>
                </div>
            </div>
            <div className={styles.adminShortcutChevron}>{">"}</div>
        </div>
    );
}

function MyPageContent() {
    const { t } = useTranslation("common");
    const router = useRouter();
    const { itinerary } = useTrip();
    const [hasHydrated, setHasHydrated] = useState(false);
    const [userName, setUserName] = useState("");
    const [profileSubtitle, setProfileSubtitle] = useState("");
    const [communityAuthor, setCommunityAuthor] = useState("");
    const [myPosts, setMyPosts] = useState<CommunityPost[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [partnerStatus, setPartnerStatus] = useState<PartnerStatus | null>(null);
    const [savedPlacesCount, setSavedPlacesCount] = useState(0);
    const [savedRecentCount, setSavedRecentCount] = useState(0);

    const fallbackUserName = hasHydrated
        ? t("my_page.settings.account.default_name")
        : SSR_SAFE_FALLBACK_NAME;
    const fallbackProfileSubtitle = hasHydrated
        ? t("my_page.profile.account_hint")
        : SSR_SAFE_FALLBACK_SUBTITLE;
    const displayUserName = userName || fallbackUserName;
    const displayProfileSubtitle = profileSubtitle || fallbackProfileSubtitle;

    useEffect(() => {
        setHasHydrated(true);
    }, []);

    useEffect(() => {
        let isMounted = true;

        setSavedPlacesCount(readSavedItemIds().length);
        setSavedRecentCount(readSavedHubRecentEntries().length);

        const loadDashboardUser = async () => {
            const fallbackName = t("my_page.settings.account.default_name");
            const fallbackSubtitle = t("my_page.profile.account_hint");
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!isMounted) {
                return;
            }

            if (!user) {
                setUserName(fallbackName);
                setProfileSubtitle(fallbackSubtitle);
                setCommunityAuthor("");
                setIsAdmin(false);
                setPartnerStatus(null);
                return;
            }

            const { data: profile } = await supabase
                .from("profiles")
                .select("nickname, is_admin")
                .eq("id", user.id)
                .maybeSingle();

            if (!isMounted) {
                return;
            }

            const nextProfile = (profile as DashboardProfileRecord | null) ?? null;
            const email = pickString(user.email);
            const displayName = pickString(
                nextProfile?.nickname,
                user.user_metadata?.full_name,
                user.user_metadata?.name,
                email ? email.split("@")[0] : "",
                fallbackName
            );
            const nextCommunityAuthor = pickString(
                nextProfile?.nickname,
                user.user_metadata?.full_name,
                user.user_metadata?.name,
                email ? email.split("@")[0] : ""
            );

            setUserName(displayName);
            setProfileSubtitle(email || fallbackSubtitle);
            setCommunityAuthor(nextCommunityAuthor);
            setIsAdmin(Boolean(nextProfile?.is_admin));

            if (!email) {
                setPartnerStatus("none");
                return;
            }

            const { data: partner } = await supabase
                .from("partners")
                .select("status")
                .eq("email", email)
                .maybeSingle();

            if (!isMounted) {
                return;
            }

            setPartnerStatus(partner ? (partner.status as PartnerStatus) : "none");
        };

        void loadDashboardUser();

        return () => {
            isMounted = false;
        };
    }, [t]);

    useEffect(() => {
        let isMounted = true;

        const fetchPosts = async () => {
            if (!communityAuthor) {
                setMyPosts([]);
                return;
            }

            const { data, error } = await supabase
                .from("community_posts")
                .select("*")
                .eq("author", communityAuthor)
                .order("created_at", { ascending: false });

            if (isMounted && data && !error) {
                setMyPosts(data as CommunityPost[]);
            }
        };

        void fetchPosts();

        return () => {
            isMounted = false;
        };
    }, [communityAuthor]);

    const realBookings = useMemo<BookingCard[]>(() => {
        return itinerary
            .filter((item) => item.status === "confirmed" || item.status === "submitted")
            .map((item) => {
                const extendedItem = item as ItineraryItem & {
                    area?: string;
                    price?: string;
                };

                return {
                    id: item.id,
                    title: item.name,
                    date: formatTripDayTimeLabel(t, item.day, item.time, {
                        separator: "dot",
                    }),
                    category: t(`common.categories.${item.type || "attraction"}`, {
                        defaultValue: item.type || "Attraction",
                    }),
                    status: item.status,
                    area: extendedItem.area,
                    price: extendedItem.price,
                    isNew: false,
                    lat: item.lat,
                    lng: item.lng,
                };
            });
    }, [itinerary, t]);

    if (!hasHydrated) {
        return (
            <div className={styles.container}>
                <div style={{ padding: 24, textAlign: "center", color: "var(--gray-500)" }}>
                    Loading...
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <ProfileSummaryCard
                userName={displayUserName}
                subtitle={displayProfileSubtitle}
                onOpenSettings={() => router.push("/my/settings")}
            />

            <QuickActionBar />

            {/* Special Beauty Section & Notification Hub Header */}
            <section style={{ padding: '0 20px', marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h2 className={styles.sectionTitle} style={{ margin: 0 }}>{t('my_page.bookings.title')}</h2>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button
                            onClick={() => router.push('/my/settings/notifications')}
                            style={{
                                border: '1px solid #7c3aed33',
                                background: '#7c3aed11',
                                color: '#7c3aed',
                                borderRadius: 99,
                                padding: '6px 12px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                            }}
                        >알림 설정</button>
                        <button
                            onClick={() => router.push('/my/notifications')}
                            style={{
                                border: '1px solid #9333ea33',
                                background: '#9333ea11',
                                color: '#9333ea',
                                borderRadius: 99,
                                padding: '6px 12px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                            }}
                        >알림함</button>
                    </div>
                </div>

                {/* Beauty Booking Quick Link */}
                <div
                    onClick={() => router.push('/my/bookings/beauty')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        background: 'linear-gradient(135deg, rgba(236,72,153,0.08), rgba(244,114,182,0.05))',
                        border: '1.5px solid rgba(236,72,153,0.18)',
                        borderRadius: 16,
                        padding: '16px',
                        cursor: 'pointer',
                        transition: 'transform 0.1s'
                    }}
                    onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
                    onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                    <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: 'rgba(236,72,153,0.12)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.4rem', flexShrink: 0
                    }}>💇</div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#be185d' }}>내 뷰티 예약 보기</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: 2 }}>
                            예약 상태 및 시술 내용을 한 화면에서 확인하세요.
                        </div>
                    </div>
                    <span style={{ color: '#ec4899', fontSize: '1.2rem' }}>›</span>
                </div>
            </section>

            <UpcomingBookingsSection bookings={realBookings} />

            <TodayPlanSection itinerary={itinerary} />

            <SavedHubSection
                savedPlacesCount={savedPlacesCount}
                savedPlansCount={itinerary.length > 0 ? 1 : 0}
                savedRecentCount={savedRecentCount}
            />

            <CommunitySummarySection posts={myPosts} />

            {/* Standard Partner Banner */}
            <PartnerStatusBanner status={partnerStatus} />

            {/* Detailed Admin Menu (from HEAD) if Admin */}
            {isAdmin && (
                <section style={{ padding: '0 20px', marginTop: 28, marginBottom: 40 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                        <h2 className={styles.sectionTitle} style={{ margin: 0 }}>⚙️ {t('my_page.dashboard.admin_title')}</h2>
                        <span style={{
                            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                            color: 'white', fontSize: '0.65rem', fontWeight: 800,
                            padding: '2px 8px', borderRadius: 99, textTransform: 'uppercase'
                        }}>Admin</span>
                    </div>

                    {[
                        { icon: '📊', label: '관리자 대시보드', desc: '통계 및 전체 메뉴', path: '/admin' },
                        { icon: '💼', label: '뷰티 예약 관리', desc: '예약 요청 및 상태 변경', path: '/admin/bookings/beauty' },
                        { icon: '🤝', label: '협력업체 관리', desc: '가입 신청 승인 관리', path: '/admin/partners' },
                        { icon: '🛡️', label: '관리자 계정 관리', desc: '권한 부여 및 상태 해제', path: '/admin/users' },
                        { icon: '🗂️', label: '번역 용어집', desc: '뷰티 번역 우선순위 관리', path: '/admin/glossary' },
                    ].map((item) => (
                        <div
                            key={item.path}
                            onClick={() => router.push(item.path)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 14,
                                background: 'white', borderRadius: 16,
                                border: '1px solid rgba(124,58,237,0.12)',
                                padding: '14px 18px', marginBottom: 10,
                                cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                                transition: 'transform 0.15s'
                            }}
                            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.985)'}
                            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            <div style={{
                                width: 42, height: 42, borderRadius: 12,
                                background: 'rgba(124,58,237,0.07)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '1.25rem', flexShrink: 0
                            }}>{item.icon}</div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{item.label}</div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--gray-400)', marginTop: 2 }}>{item.desc}</div>
                            </div>
                            <span style={{ color: 'var(--gray-300)', fontSize: '1.1rem' }}>›</span>
                        </div>
                    ))}
                </section>
            )}

            {!isAdmin && <div style={{ height: 40 }} />}
        </div>
    );
}

export default function MyPage() {
    return (
        <Suspense fallback={<div style={{ padding: 24 }}>Loading...</div>}>
            <MyPageContent />
        </Suspense>
    );
}
