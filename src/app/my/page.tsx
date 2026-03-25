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

type PartnerStatus = "none" | "pending" | "approved" | "rejected";



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
            icon: "🎧",
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
                    <span className={styles.emptyIcon}>📅</span>
                    <p className={styles.emptyText}>{t("my_page.dashboard.bookings_empty", "아직 예정된 예약이 없습니다")}</p>
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
                                    {booking.area && <span> • {booking.area}</span>}
                                    {booking.price && <span> • {booking.price}</span>}
                                </div>

                                {booking.isNew && (
                                    <div className={styles.newBadge}>
                                        {t("my_page.bookings.new_added")}
                                    </div>
                                )}
                            </div>

                            <div className={styles.ticketActions}>
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

    return (
        <section style={{ padding: '0 20px', marginBottom: 32 }}>
            <div style={{ 
                background: 'white', 
                borderRadius: 24, 
                padding: 24,
                boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
                border: '1px solid rgba(0,0,0,0.03)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                     <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#111827' }}>
                         {t("my_page.saved.title")}
                     </h2>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
                    <div style={{ background: '#f8fafc', borderRadius: 16, padding: '16px 8px', textAlign: 'center', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.01)' }}>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#3b82f6', marginBottom: 6 }}>{savedPlacesCount}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>{t("my_page.saved.summary.places")}</div>
                    </div>
                    <div style={{ background: '#f8fafc', borderRadius: 16, padding: '16px 8px', textAlign: 'center', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.01)' }}>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981', marginBottom: 6 }}>{savedPlansCount}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>{t("my_page.saved.summary.plans")}</div>
                    </div>
                    <div style={{ background: '#f8fafc', borderRadius: 16, padding: '16px 8px', textAlign: 'center', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.01)' }}>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b', marginBottom: 6 }}>{savedRecentCount}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>{t("my_page.saved.summary.recent")}</div>
                    </div>
                </div>

                <button
                    onClick={() => router.push('/my/saved')}
                    style={{
                        width: '100%',
                        background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 16,
                        padding: '16px',
                        fontWeight: 700,
                        fontSize: '1rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(124,58,237,0.25)',
                        transition: 'transform 0.1s'
                    }}
                    onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
                    onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                    <span>{t("my_page.saved.dashboard_title")}</span>
                    <span style={{ fontSize: '1.2rem' }}>→</span>
                </button>
            </div>
        </section>
    );
}

function CommunityHubSection() {
    const router = useRouter();
    const { t } = useTranslation("common");
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        let resolvedUserName = "Jessie Kim";

        try {
            const storedUser = localStorage.getItem("user");
            if (storedUser) {
                const parsed = JSON.parse(storedUser) as { name?: string };
                if (parsed.name?.trim()) {
                    resolvedUserName = parsed.name.trim();
                }
            }
        } catch {}

        const fetchPosts = async () => {
            const { data, error } = await supabase
                .from("community_posts")
                .select("id, type, title, desc, created_at, time")
                .eq("author", resolvedUserName)
                .order("created_at", { ascending: false })
                .limit(3);

            if (isMounted) {
                if (data) {
                    setPosts(data);
                }
                setLoading(false);
            }
        };

        void fetchPosts();

        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <section style={{ padding: '0 20px', marginBottom: 32 }}>
            <div style={{ 
                background: 'white', 
                borderRadius: 24, 
                padding: 24,
                boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
                border: '1px solid rgba(0,0,0,0.03)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                     <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#111827' }}>
                         내 커뮤니티
                     </h2>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: '0.9rem', fontWeight: 600 }}>
                        불러오는 중...
                    </div>
                ) : posts.length === 0 ? (
                    <div style={{ 
                        textAlign: 'center', 
                        padding: '32px 0px',
                        background: '#f8fafc',
                        borderRadius: 16
                    }}>
                        <div style={{ fontSize: '2rem', marginBottom: 8 }}>💬</div>
                        <div style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 16, fontWeight: 600 }}>작성한 글이 없습니다</div>
                        <button 
                            onClick={() => router.push("/community")}
                            style={{
                                background: 'white',
                                border: '1px solid #e2e8f0',
                                padding: '10px 20px',
                                borderRadius: 12,
                                fontSize: '0.85rem',
                                color: '#334155',
                                fontWeight: 600,
                                cursor: 'pointer',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                            }}
                        >
                            커뮤니티 둘러보기
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {posts.map(post => (
                            <div 
                                key={post.id}
                                onClick={() => router.push(`/community/${post.id}`)}
                                style={{
                                    padding: '16px',
                                    borderRadius: 16,
                                    background: '#f8fafc',
                                    cursor: 'pointer',
                                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.01)',
                                    transition: 'transform 0.1s'
                                }}
                                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
                                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                    <span style={{ 
                                        padding: '4px 8px', 
                                        borderRadius: 6, 
                                        background: 'rgba(124,58,237,0.1)', 
                                        color: '#7c3aed', 
                                        fontSize: '0.7rem', 
                                        fontWeight: 800,
                                        textTransform: 'uppercase'
                                    }}>
                                        {post.type || 'post'}
                                    </span>
                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                                        {post.created_at ? new Date(post.created_at).toLocaleDateString() : (post.time || '')}
                                    </span>
                                </div>
                                <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {post.title}
                                </div>
                                <div style={{ fontSize: '0.85rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {post.desc}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
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
                // [Production Logic]
                router.push("/auth/login?redirect=/my");
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
            setUserName(displayName);
            setProfileSubtitle(email || fallbackSubtitle);
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

            setPartnerStatus((partner?.status as PartnerStatus) || "none");
        };

        void loadDashboardUser();

        return () => {
            isMounted = false;
        };
    }, [t]);

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
                        >{t('my_page.notifications.settings', { defaultValue: 'Notifications' })}</button>
                        <button
                            onClick={() => router.push('/my/notifications')}
                            className={styles.notificationBtn}
                        >{t('my_page.notifications.inbox', { defaultValue: 'Inbox' })}</button>
                    </div>
                </div>

                {/* Beauty Booking Quick Link */}
                <div
                    onClick={() => router.push('/my/bookings/beauty')}
                    className={styles.beautyQuickLink}
                >
                    <div className={styles.beautyQuickIcon}>💇</div>
                    <div style={{ flex: 1 }}>
                        <div className={styles.beautyQuickTitle}>{t('my_page.beauty_booking_link.title', { defaultValue: 'Beauty Booking' })}</div>
                        <div className={styles.beautyQuickDesc}>
                            {t('my_page.beauty_booking_link.desc', { defaultValue: 'Quickly browse and book beauty services.' })}
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

            <CommunityHubSection />

            {/* Support Action Button */}
            <section style={{ padding: '0 20px', marginBottom: 32 }}>
                <button
                    onClick={() => router.push('/my/support')}
                    style={{
                        width: '100%', padding: '24px', borderRadius: 24, border: '1px solid rgba(0,0,0,0.03)', background: 'white',
                        display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.04)', transition: 'transform 0.1s'
                    }}
                    onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
                    onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                    <div style={{
                        width: 48, height: 48, borderRadius: 16,
                        background: '#f8fafc',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.6rem', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.01)'
                    }}>🎧</div>
                    <div style={{ textAlign: 'left', flex: 1 }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827' }}>{t('my_page.support.short')}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, marginTop: 4 }}>고객센터 및 문의사항</div>
                    </div>
                    <span style={{ color: '#7c3aed', fontSize: '1.5rem', fontWeight: 700 }}>›</span>
                </button>
            </section>

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
