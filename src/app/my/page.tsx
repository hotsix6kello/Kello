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
            icon: string;
            title: string;
            desc: string;
            buttonLabel?: string;
            onClick?: () => void;
            isRejected?: boolean;
        }
    > = {
        none: {
            icon: "P",
            title: t("my_page.dashboard.partner.none_title"),
            desc: t("my_page.dashboard.partner.none_desc"),
            buttonLabel: t("my_page.dashboard.partner.none_cta"),
            onClick: () => router.push("/auth/partner-signup"),
        },
        pending: {
            icon: "...",
            title: t("my_page.dashboard.partner.pending_title"),
            desc: t("my_page.dashboard.partner.pending_desc"),
        },
        approved: {
            icon: "OK",
            title: t("my_page.dashboard.partner.approved_title"),
            desc: t("my_page.dashboard.partner.approved_desc"),
        },
        rejected: {
            icon: "!",
            title: t("my_page.dashboard.partner.rejected_title"),
            desc: t("my_page.dashboard.partner.rejected_desc"),
            buttonLabel: t("my_page.dashboard.partner.rejected_cta"),
            onClick: () => router.push("/auth/partner-signup"),
            isRejected: true,
        },
    };

    const config = bannerConfig[status];

    return (
        <div className={styles.partnerBanner}>
            <span
                className={styles.partnerBannerIcon}
                style={{ color: config.isRejected ? "var(--korean-red)" : "var(--secondary)" }}
            >
                {config.icon}
            </span>
            <div className={styles.partnerBannerBody}>
                <div className={styles.partnerBannerTitle}>{config.title}</div>
                <div className={styles.partnerBannerDesc}>{config.desc}</div>
            </div>

            {config.buttonLabel && config.onClick && (
                <button
                    className={styles.partnerBannerBtn}
                    style={{ background: config.isRejected ? "var(--korean-red)" : "var(--secondary)" }}
                    onClick={config.onClick}
                >
                    {config.buttonLabel}
                </button>
            )}
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
                // ---------- [ UI Test Mode ] ----------
                // 원래는 게스트 로그인 시 관리자 UI를 안보여주지만, 임시로 설정합니다.
                setUserName("최고 관리자 (테스트)");
                setProfileSubtitle("admin@kello.local");
                setCommunityAuthor("");
                setIsAdmin(true);
                setPartnerStatus("approved");
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

            // ---------- [ UI Test Mode ] ----------
            setPartnerStatus("approved");
            setIsAdmin(true);
            // --------------------------------------
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
                <div style={{ padding: 24, textAlign: "center", color: "var(--soft-ink)" }}>
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
            <section className={styles.section} style={{ marginBottom: 20 }}>
                <div className={styles.adminTitleRow}>
                    <h2 className={styles.sectionTitle} style={{ margin: 0 }}>{t('my_page.bookings.title')}</h2>
                    <div className={styles.notificationBtnRow}>
                        <button
                            onClick={() => router.push('/my/settings/notifications')}
                            className={styles.notificationBtn}
                        >{t('my_page.notifications.settings')}</button>
                        <button
                            onClick={() => router.push('/my/notifications')}
                            className={styles.notificationBtn}
                        >{t('my_page.notifications.inbox')}</button>
                    </div>
                </div>

                {/* Beauty Booking Quick Link */}
                <div
                    onClick={() => router.push('/my/bookings/beauty')}
                    className={styles.beautyQuickLink}
                >
                    <div className={styles.beautyQuickIcon}>💇</div>
                    <div style={{ flex: 1 }}>
                        <div className={styles.beautyQuickTitle}>{t('my_page.beauty_booking_link.title')}</div>
                        <div className={styles.beautyQuickDesc}>
                            {t('my_page.beauty_booking_link.desc')}
                        </div>
                    </div>
                    <span className={styles.beautyQuickArrow}>›</span>
                </div>
            </section>

            <UpcomingBookingsSection bookings={realBookings} />


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
                <section className={styles.section} style={{ marginTop: 20 }}>
                    <div className={styles.adminTitleRow}>
                        <h2 className={styles.sectionTitle} style={{ margin: 0 }}>⚙️ {t('my_page.dashboard.admin_title')}</h2>
                        <span className={styles.adminBadge}>Admin</span>
                    </div>

                    <div className={styles.adminMenuGrid}>
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
                                className={styles.adminMenuCard}
                            >
                                <div className={styles.adminMenuIconWrap}>{item.icon}</div>
                                <div style={{ flex: 1 }}>
                                    <div className={styles.adminMenuLabel}>{item.label}</div>
                                    <div className={styles.adminMenuDesc}>{item.desc}</div>
                                </div>
                                <span className={styles.adminMenuArrow}>›</span>
                            </div>
                        ))}
                    </div>
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
