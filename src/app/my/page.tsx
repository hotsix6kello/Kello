"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useTrip, ItineraryItem } from "@/lib/contexts/TripContext";
import { supabase } from "@/lib/supabaseClient";
import { readSavedHubRecentEntries, readSavedItemIds } from "@/lib/savedHub";
import styles from "./my.module.css";


type PartnerStatus = "none" | "pending" | "approved" | "rejected";



interface DashboardProfileRecord {
    nickname: string | null;
    is_admin: boolean | null;
    avatar_url: string | null;
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

            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            let { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
            const publicUrl = data.publicUrl;

            // 1. Update Profile in DB
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', (await supabase.auth.getUser()).data.user?.id);

            if (updateError) throw updateError;

            // 2. Callback
            if (onAvatarUpdate) onAvatarUpdate(publicUrl);
            
            alert(t('common.messages.upload_success', '프로필 사진이 업데이트되었습니다.'));
        } catch (error) {
            console.error('Error uploading avatar:', error);
            alert(t('common.messages.upload_failed', '업로드에 실패했습니다.'));
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
                            <img src={avatarUrl} alt={userName} className={styles.avatarImg} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                            <span className={styles.profileInitials}>{initials || "TR"}</span>
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
    const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);

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
                // [Mock Mode for Development]
                // 로컬 개발 환경에서 로그인 없이 화면을 볼 수 있도록 더미 데이터를 설정합니다.
                if (process.env.NODE_ENV === "development") {
                    setUserName("게스트 (테스트)");
                    setProfileSubtitle("guest@localhost");
                    setIsAdmin(true);
                    setPartnerStatus("approved");
                    return;
                }

                router.push("/auth/login?redirect=/my");
                return;
            }

            const { data: profile } = await supabase
                .from("profiles")
                .select("nickname, is_admin, avatar_url")
                .eq("id", user.id)
                .maybeSingle();

            if (!isMounted) {
                return;
            }

            const nextProfile = (profile as DashboardProfileRecord | null) ?? null;
            if (nextProfile?.avatar_url) {
                setAvatarUrl(nextProfile.avatar_url);
            }
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
                avatarUrl={avatarUrl}
                onOpenSettings={() => router.push("/my/settings")}
                onAvatarUpdate={(url) => setAvatarUrl(url)}
            />


<<<<<<< HEAD

=======
>>>>>>> origin/develop
            <SavedHubSection
                savedPlacesCount={savedPlacesCount}
                savedPlansCount={itinerary.length > 0 ? 1 : 0}
                savedRecentCount={savedRecentCount}
            />

            <CommunityHubSection />

<<<<<<< HEAD
=======

>>>>>>> origin/develop
            {/* Standard Partner Banner */}
            <PartnerStatusBanner status={partnerStatus} />

            {/* 관리자 메뉴 전용 하단 여백 확보 (100px) */}
            {(isAdmin || process.env.NODE_ENV === "development") && (
                <section style={{ padding: '0 20px 100px', marginTop: 16, marginBottom: 0 }}>
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
                    ].map((item) => (
                        <div
                            key={item.path}
                            onClick={() => router.push(item.path)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 14,
                                background: 'white', borderRadius: 16,
                                border: '1px solid rgba(124,58,237,0.12)',
                                padding: '14px 18px', marginBottom: 16,
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

            {/* 하단 네비게이션 가림 방지용 대용량 스페이서 (160px 확보) */}
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
