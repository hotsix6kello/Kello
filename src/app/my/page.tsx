"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { getMyPageCapabilities, type PartnerStatus } from "./pagePermissions";
import styles from "./my.module.css";
import {
    type BeautyBookingAdminRecord,
} from "@/lib/bookings/beautyBookingAdmin";

interface DashboardProfileRecord {
    display_name: string | null;
    nickname: string | null;
    nickname_updated_at: string | null;
    role: string | null;
    created_at: string | null;
    avatar_url: string | null;
}

interface PartnerStatusRouteResponse {
    ok: boolean;
    partnerStatus?: PartnerStatus;
}

interface CommunityPost {
    id: string;
    type: string;
    title: string;
    desc: string;
    created_at: string;
    time: string;
}

type MyBookingCardRecord = Pick<
    BeautyBookingAdminRecord,
    "id" | "status" | "storeName" | "primaryServiceName" | "beautyCategory" | "bookingDate" | "bookingTime" | "totalPrice"
>;

const SSR_SAFE_FALLBACK_NAME = "고객님";
const SSR_SAFE_FALLBACK_SUBTITLE = "계정 및 설정";

function buildCategoryTitle(t: ReturnType<typeof useTranslation>['t'], category: string | null | undefined, serviceName: string | null | undefined): string {
    const parts = [category, serviceName].filter((part) => {
        return part && part !== 'null' && part !== 'undefined' && part.trim() !== '';
    });
    if (parts.length === 0) {
        return t('my_page.bookings.pending_service');
    }
    return parts.join(' · ');
}

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
    avatarUrl,
    onOpenSettings,
    onAvatarUpdate,
}: {
    userName: string;
    subtitle?: string;
    avatarUrl?: string;
    onOpenSettings: () => void;
    onAvatarUpdate?: (url: string) => void;
}) {
    const { t } = useTranslation("common");
    const [uploading, setUploading] = useState(false);
    
    const initials = userName
        .split(" ")
        .map((part) => part[0] || "")
        .join("")
        .toUpperCase()
        .slice(0, 2);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            const file = e.target.files?.[0];
            if (!file) return;

            const { data: userData } = await supabase.auth.getUser();
            const user = userData.user;
            if (!user) throw new Error("Not authenticated");

            const fileExt = file.name.split('.').pop() || 'jpg';
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
            const filePath = `${user.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
            const publicUrl = data.publicUrl;

            // 1. Update Profile in DB
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id);

            if (updateError) throw updateError;

            // 2. Callback
            if (onAvatarUpdate) onAvatarUpdate(publicUrl);
            
            alert(t('my_page.messages.upload_success'));
        } catch (error) {
            console.error('Error uploading avatar:', error);
            alert(t('my_page.messages.upload_failed'));
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className={styles.profileCard}>
            <div className={styles.profileAvatarWrap} style={{ position: 'relative', cursor: 'pointer' }}>
                <label style={{ cursor: 'pointer' }}>
                    <div className={styles.profileAvatar}>
                        {avatarUrl ? (
                            <Image 
                                src={avatarUrl} 
                                alt={userName} 
                                fill
                                className={styles.avatarImg} 
                                style={{ borderRadius: '50%', objectFit: 'cover' }} 
                            />
                        ) : (
                            <span className={styles.profileInitials}>{initials || "내"}</span>
                        )}
                        <div className={styles.avatarEditOverlay} style={{
                            position: 'absolute', bottom: 0, right: 0, 
                            background: 'var(--primary)', padding: 6, borderRadius: '50%',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.2)', border: '2px solid white'
                        }}>
                            📸
                        </div>
                    </div>
                    <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileChange} 
                        style={{ display: 'none' }} 
                        disabled={uploading}
                    />
                </label>
                {uploading && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.7)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>...</div>}
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

const BOOKING_STATUS_KO_KEY: Record<BeautyBookingAdminRecord['status'], string> = {
    requested: 'beauty_bookings.status_requested',
    confirmed: 'beauty_bookings.status_confirmed',
    completed: 'beauty_bookings.status_completed',
    canceled: 'beauty_bookings.status_canceled',
    failed: 'beauty_bookings.status_failed',
    change_requested: 'beauty_bookings.status_change_requested',
};

const BOOKING_STATUS_DESC_KEY: Record<BeautyBookingAdminRecord['status'], string> = {
    requested: 'beauty_bookings.status_desc_requested',
    confirmed: 'beauty_bookings.status_desc_confirmed',
    completed: 'beauty_bookings.status_desc_completed',
    canceled: 'beauty_bookings.status_desc_canceled',
    failed: 'beauty_bookings.status_desc_failed',
    change_requested: 'beauty_bookings.status_desc_change_requested',
};

const BOOKING_STATUS_COLOR: Record<BeautyBookingAdminRecord['status'], string> = {
    requested: '#d97706',
    confirmed: '#16a34a',
    completed: '#6b7280',
    canceled: '#dc2626',
    failed: '#dc2626',
    change_requested: '#7c3aed',
};



function isStoreMatched(status: BeautyBookingAdminRecord['status']): boolean {
    return status === 'confirmed' || status === 'completed';
}



function SectionCardSkeleton({ rows = 2 }: { rows?: number }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Array.from({ length: rows }).map((_, index) => (
                <div
                    key={index}
                    style={{
                        background: '#f8fafc',
                        borderRadius: 14,
                        border: '1px solid #e2e8f0',
                        padding: '14px 16px',
                    }}
                >
                    <div style={{ width: '42%', height: 14, borderRadius: 999, background: '#e2e8f0', marginBottom: 10 }} />
                    <div style={{ width: '68%', height: 12, borderRadius: 999, background: '#e2e8f0', marginBottom: 8 }} />
                    <div style={{ width: '56%', height: 12, borderRadius: 999, background: '#e2e8f0', marginBottom: 14 }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                        <div style={{ flex: 1, height: 34, borderRadius: 10, background: '#e2e8f0' }} />
                        <div style={{ flex: 1, height: 34, borderRadius: 10, background: '#e2e8f0' }} />
                    </div>
                </div>
            ))}
        </div>
    );
}

function MyBookingsSection({
    accessToken,
    authReady,
}: {
    accessToken: string;
    authReady: boolean;
}) {
    const { t } = useTranslation("common");
    const router = useRouter();
    const [bookings, setBookings] = useState<MyBookingCardRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            if (!authReady) {
                return;
            }

            if (!accessToken) {
                if (!cancelled) {
                    setBookings([]);
                    setFetchError(null);
                    setLoading(false);
                }
                return;
            }

            try {
                if (!cancelled) {
                    setFetchError(null);
                    setLoading(true);
                }

                const res = await fetch('/api/bookings/beauty/mine?view=summary', {
                    headers: { Authorization: `Bearer ${accessToken}` },
                    cache: 'no-store',
                });
                const body = await res.json().catch(() => null) as
                    | { ok?: boolean; items?: MyBookingCardRecord[] }
                    | null;

                if (!res.ok || body?.ok !== true || !Array.isArray(body.items)) {
                    throw new Error(t('my_page.bookings.error_fetch'));
                }

                if (!cancelled) {
                    setBookings(body.items);
                }
            } catch {
                if (!cancelled) setFetchError(t('my_page.bookings.error_fetch'));
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        void load();
        return () => { cancelled = true; };
    }, [accessToken, authReady, t]);

    return (
        <section className={styles.section}>
            <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>{t('my_page.bookings.title')}</h2>
                <button
                    className={styles.sectionMore}
                    onClick={() => router.push('/my/bookings/beauty')}
                >
                    {t('common.actions.view_all')}
                </button>
            </div>

            {loading && <SectionCardSkeleton />}
            {!loading && fetchError && (
                <div style={{ textAlign: 'center', padding: '12px 0', color: '#ef4444', fontSize: '0.85rem' }}>
                    {fetchError}
                </div>
            )}
            {!loading && !fetchError && bookings.length === 0 && (
                <div style={{ textAlign: 'center', padding: '32px 0', background: '#f8fafc', borderRadius: 16 }}>
                    <div style={{ fontSize: '2rem', marginBottom: 8 }}>📅</div>
                    <div style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 16, fontWeight: 600 }}>{t('my_page.dashboard.bookings_empty')}</div>
                    <button
                        onClick={() => router.push('/beauty')}
                        style={{
                            background: 'white', border: '1px solid #e2e8f0',
                            padding: '10px 20px', borderRadius: 12,
                            fontSize: '0.85rem', color: '#334155',
                            fontWeight: 600, cursor: 'pointer',
                        }}
                    >
                        {t('my_page.bookings.browse_beauty_cta')}
                    </button>
                </div>
            )}
            {!loading && bookings.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {bookings.slice(0, 2).map(b => {
                        const isMatched = isStoreMatched(b.status);
                        const categoryLabel = b.beautyCategory ? t(`beauty_bookings.category_${b.beautyCategory}`) : '';
                        const displayCategory = categoryLabel.startsWith('beauty_bookings.') ? b.beautyCategory : categoryLabel;
                        const title = !isMatched 
                                      ? buildCategoryTitle(t, displayCategory, b.primaryServiceName)
                                      : b.storeName;

                        return (
                        <div
                            key={b.id}
                            style={{
                                background: '#f8fafc', borderRadius: 14,
                                border: '1px solid #e2e8f0', padding: '14px 16px',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>
                                    {title}
                                </span>
                                <span style={{
                                    fontSize: '0.7rem', fontWeight: 700,
                                    padding: '3px 8px', borderRadius: 20,
                                    background: `${BOOKING_STATUS_COLOR[b.status]}18`,
                                    color: BOOKING_STATUS_COLOR[b.status],
                                    border: `1px solid ${BOOKING_STATUS_COLOR[b.status]}40`,
                                }}>
                                    {t(BOOKING_STATUS_KO_KEY[b.status])}
                                </span>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: 4 }}>
                                📅 {b.bookingDate} · {b.bookingTime}
                            </div>
                            <div style={{ fontSize: '0.82rem', color: !isMatched ? '#db2777' : '#64748b', fontWeight: !isMatched ? 600 : 400, marginBottom: 4 }}>
                                {!isMatched ? t('my_page.bookings.matching_status') : (t(BOOKING_STATUS_DESC_KEY[b.status]) || '')}
                            </div>
                            <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                                💰 {!isMatched || b.totalPrice === 0 
                                      ? t('my_page.bookings.price_pending') 
                                      : `${b.totalPrice.toLocaleString('ko-KR')}${t('beauty_explore.label_booking_unit')}`}
                            </div>
                        </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}


function CommunityHubSection({ authorName }: { authorName: string }) {
    const { t } = useTranslation("common");
    const router = useRouter();
    const [posts, setPosts] = useState<CommunityPost[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const fetchPosts = async () => {
            if (!authorName) {
                if (isMounted) {
                    setPosts([]);
                    setLoading(false);
                }
                return;
            }

            setLoading(true);

            const { data } = await supabase
                .from("community_posts")
                .select("id, type, title, desc, created_at, time")
                .eq("author", authorName)
                .order("created_at", { ascending: false })
                .limit(2);

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
    }, [authorName]);

    return (
        <>
            <div className={styles.sectionHeader}>
                 <h2 className={styles.sectionTitle}>
                     {t('my_page.community_hub.title')}
                 </h2>
                 <button
                     className={styles.sectionMore}
                     onClick={() => router.push('/my/community')}
                 >
                     {t('common.actions.view_all')}
                 </button>
            </div>

                {loading ? (
                    <SectionCardSkeleton rows={2} />
                ) : posts.length === 0 ? (
                    <div style={{ 
                        textAlign: 'center', 
                        padding: '32px 0px',
                        background: '#f8fafc',
                        borderRadius: 16
                    }}>
                        <div style={{ fontSize: '2rem', marginBottom: 8 }}>💬</div>
                        <div style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 16, fontWeight: 600 }}>{t('my_page.community.empty_simple')}</div>
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
                            {t('common.actions.browse_community')}
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
                                        {post.type || t('common.states.posts')}
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
        </>
    );
}

function PartnerStatusBanner({
    status,
    canApplyForPartner,
}: {
    status: PartnerStatus | null;
    canApplyForPartner: boolean;
}) {
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

            {canApplyForPartner && config.buttonLabel && config.onClick && (
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
    const [hasHydrated, setHasHydrated] = useState(false);
    const [cachedUserName, setCachedUserName] = useState("");
    const [userName, setUserName] = useState("");
    const [profileSubtitle, setProfileSubtitle] = useState("");
    const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
    const [authReady, setAuthReady] = useState(false);
    const [accessToken, setAccessToken] = useState("");
    const [permissionsResolved, setPermissionsResolved] = useState(false);
    const [profileRole, setProfileRole] = useState<string | null>(null);
    const [partnerStatus, setPartnerStatus] = useState<PartnerStatus | null>(null);

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

        try {
            const storedUser = JSON.parse(localStorage.getItem("user") || "{}") as { name?: string };
            setCachedUserName(pickString(storedUser.name));
        } catch {
            setCachedUserName("");
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        const loadDashboardUser = async () => {
            const fallbackName = t("my_page.settings.account.default_name");
            const fallbackSubtitle = t("my_page.profile.account_hint");
            const [
                {
                    data: { session },
                },
                {
                    data: { user },
                },
            ] = await Promise.all([supabase.auth.getSession(), supabase.auth.getUser()]);

            if (!isMounted) {
                return;
            }

            setAccessToken(session?.access_token ?? "");
            setAuthReady(true);
            setPermissionsResolved(false);
            setProfileRole(null);
            setPartnerStatus(null);

            if (!user) {
                router.push("/auth/login?redirect=/my");
                return;
            }

            const { data: profileData } = await supabase
                .from("profiles")
                .select("display_name, nickname, nickname_updated_at, role, created_at, avatar_url")
                .eq("id", user.id)
                .maybeSingle();

            if (!isMounted) {
                return;
            }

            const nextProfile = (profileData as DashboardProfileRecord | null) ?? null;
            setAvatarUrl(nextProfile?.avatar_url ?? undefined);
            const email = pickString(user.email);
            const displayName = pickString(
                nextProfile?.nickname,
                nextProfile?.display_name,
                user.user_metadata?.full_name,
                user.user_metadata?.name,
                email ? email.split("@")[0] : "",
                fallbackName
            );
            setUserName(displayName);
            setProfileSubtitle(email || fallbackSubtitle);
            setProfileRole(nextProfile?.role ?? null);

            if (!email) {
                setPartnerStatus("none");
                setPermissionsResolved(true);
                return;
            }

            let nextPartnerStatus: PartnerStatus = "none";

            if (session?.access_token) {
                try {
                    const response = await fetch("/api/my/partner-status", {
                        headers: {
                            Authorization: `Bearer ${session.access_token}`,
                        },
                        cache: "no-store",
                    });
                    const body = (await response.json()) as PartnerStatusRouteResponse;

                    if (response.ok && body.ok && body.partnerStatus) {
                        nextPartnerStatus = body.partnerStatus;
                    }
                } catch {
                    nextPartnerStatus = "none";
                }
            }

            if (!isMounted) {
                return;
            }

            setPartnerStatus(nextPartnerStatus);
            setPermissionsResolved(true);
        };

        void loadDashboardUser();

        return () => {
            isMounted = false;
        };
    }, [t, router]);

    const communityAuthorName = cachedUserName || userName;
    const capabilities = getMyPageCapabilities({
        permissionsResolved,
        profileRole,
        partnerStatus,
    });




    if (!hasHydrated) {
        return (
            <div className={styles.container}>
                <div style={{ padding: 24, textAlign: "center", color: "var(--soft-ink)" }}>
                    {t('common.loading')}
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <ProfileSummaryCard
                userName={displayUserName}
                subtitle={displayProfileSubtitle}
                avatarUrl={avatarUrl}
                onOpenSettings={() => router.push("/my/settings")}
                onAvatarUpdate={(url) => setAvatarUrl(url)}
            />

            <MyBookingsSection accessToken={accessToken} authReady={authReady} />

            <section className={styles.section}>
                <CommunityHubSection authorName={communityAuthorName} />
            </section>

            {/* Standard Partner Banner */}
            {capabilities.showPartnerBanner && (
                <PartnerStatusBanner
                    status={partnerStatus}
                    canApplyForPartner={capabilities.canApplyForPartner}
                />
            )}

            {/* Admin Section with Shell consistency */}
            {capabilities.canViewAdminConsole && (
                <section className={styles.section} style={{ marginBottom: 0, paddingBottom: 100 }}>
                    <div className={styles.sectionHeader} style={{ justifyContent: 'flex-start', gap: 8 }}>
                        <h2 className={styles.sectionTitle} style={{ margin: 0 }}>⚙️ {t('my_page.dashboard.admin_title')}</h2>
                        <span style={{
                            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                            color: 'white', fontSize: '0.65rem', fontWeight: 800,
                            padding: '2px 8px', borderRadius: 99, textTransform: 'uppercase'
                        }}>{t('my_page.settings.admin.enabled')}</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
                        {[
                            { icon: '📊', label: t('my_page.dashboard.admin_menu.dashboard'), desc: t('my_page.dashboard.admin_menu.dashboard_desc'), path: '/admin' },
                            { icon: '💼', label: t('my_page.dashboard.admin_menu.bookings'), desc: t('my_page.dashboard.admin_menu.bookings_desc'), path: '/admin/bookings/beauty' },
                            { icon: '🤝', label: t('my_page.dashboard.admin_menu.partners'), desc: t('my_page.dashboard.admin_menu.partners_desc'), path: '/admin/partners' },
                            { icon: '🛡️', label: t('my_page.dashboard.admin_menu.users'), desc: t('my_page.dashboard.admin_menu.users_desc'), path: '/admin/users' },
                        ].map((item) => (
                            <div
                                key={item.path}
                                onClick={() => router.push(item.path)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 14,
                                    background: 'var(--hanji-ivory)', borderRadius: 16,
                                    border: '1px solid var(--warm-sand)',
                                    padding: '14px 18px',
                                    cursor: 'pointer', boxShadow: 'var(--shadow-sm)',
                                    transition: 'transform 0.15s'
                                }}
                                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.985)'}
                                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                <div style={{
                                    width: 42, height: 42, borderRadius: 12,
                                    background: 'var(--primary-glow)',
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
                    </div>
                </section>
            )}

            {/* Bottom Spacer */}
            <div style={{ height: '160px', minHeight: '160px', flexShrink: 0, width: '100%', pointerEvents: 'none' }} />
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
