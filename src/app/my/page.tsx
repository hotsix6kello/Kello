"use client";

import { Suspense, useEffect, useState, useRef } from "react";
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
    referral_code: string | null;
}

interface CouponRecord {
    id: string;
    discount_type: string;
    discount_value: number;
    issue_reason: string;
    is_used: boolean;
    created_at: string;
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

const SSR_SAFE_FALLBACK_NAME = "";
const SSR_SAFE_FALLBACK_SUBTITLE = "";

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
    onAvatarUpdate,
    noBorder = false,
}: {
    userName: string;
    subtitle?: string;
    avatarUrl?: string;
    onAvatarUpdate?: (url: string) => void;
    noBorder?: boolean;
}) {
    const { t } = useTranslation("common");
    const [uploading, setUploading] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id);

            if (updateError) throw updateError;

            if (onAvatarUpdate) onAvatarUpdate(publicUrl);
            alert(t('my_page.messages.upload_success', { defaultValue: '프로필 사진이 업데이트 되었습니다.' }));
        } catch (error) {
            console.error('Error uploading avatar:', error);
            alert(t('my_page.messages.upload_failed', { defaultValue: '업로드에 실패했습니다.' }));
        } finally {
            setUploading(false);
        }
    };

    const handleRemoveAvatar = async () => {
        try {
            setUploading(true);
            const { data: userData } = await supabase.auth.getUser();
            const user = userData.user;
            if (!user) throw new Error("Not authenticated");

            const { error } = await supabase
                .from('profiles')
                .update({ avatar_url: null })
                .eq('id', user.id);

            if (error) throw error;
            if (onAvatarUpdate) onAvatarUpdate('');
            alert(t('my_page.messages.avatar_removed', { defaultValue: '프로필 이미지가 삭제되었습니다.' }));
        } catch (err) {
            console.error('Error removing avatar:', err);
            alert(t('my_page.messages.remove_failed', { defaultValue: '이미지 제거에 실패했습니다.' }));
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className={styles.profileCard} style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: noBorder ? 'transparent' : 'white', borderRadius: noBorder ? 0 : 16, border: noBorder ? 'none' : '1px solid var(--warm-sand, #E8E3D9)', boxShadow: noBorder ? 'none' : '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div 
                    onClick={() => setShowMenu(true)} 
                    style={{ position: 'relative', width: 64, height: 64, cursor: 'pointer', borderRadius: '50%', overflow: 'visible' }}
                >
                    <div style={{ width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', background: '#F1F5F9', border: '1.5px solid var(--warm-sand, #E8E3D9)' }}>
                        {avatarUrl ? (
                            <Image 
                                src={avatarUrl} 
                                alt={userName} 
                                width={64}
                                height={64}
                                className={styles.avatarImg} 
                                style={{ borderRadius: '50%', objectFit: 'cover' }} 
                            />
                        ) : (
                            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="32" cy="32" r="32" fill="#E2E8F0"/>
                                <path d="M32 36C38.6274 36 44 30.6274 44 24C44 17.3726 38.6274 12 32 12C25.3726 12 20 17.3726 20 24C20 30.6274 25.3726 36 32 36Z" fill="#94A3B8"/>
                                <path d="M32 40C20.9543 40 12 48.9543 12 60H52C52 48.9543 43.0457 40 32 40Z" fill="#94A3B8"/>
                            </svg>
                        )}
                    </div>
                    {uploading && (
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.7)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>
                            ...
                        </div>
                    )}
                </div>

                <div className={styles.profileInfo}>
                    <h1 className={styles.profileName} style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--foreground, #2A2624)' }}>{userName}</h1>
                    <div className={styles.profileSubtext} style={{ fontSize: '0.75rem', color: 'var(--soft-ink, #8A847F)' }}>
                        {subtitle}
                    </div>
                </div>
            </div>

            <div style={{ color: 'var(--soft-ink, #8A847F)', fontSize: '1.2rem', paddingRight: 4, pointerEvents: 'none' }}>
                &gt;
            </div>

            <input 
                type="file" 
                ref={fileInputRef}
                accept="image/*" 
                onChange={handleFileChange} 
                style={{ display: 'none' }} 
                disabled={uploading}
            />

            {showMenu && (
                <>
                    <div 
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(false);
                        }}
                        style={{
                            position: 'fixed',
                            top: 0, left: 0, right: 0, bottom: 0,
                            zIndex: 999,
                            background: 'transparent'
                        }}
                    />
                    <div style={{
                        position: 'absolute',
                        top: 70,
                        left: 16,
                        background: 'white',
                        border: '1px solid var(--warm-sand, #E8E3D9)',
                        borderRadius: 12,
                        padding: '6px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        zIndex: 1000
                    }}>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowMenu(false);
                                fileInputRef.current?.click();
                            }}
                            style={{
                                background: 'none', border: 'none', padding: '8px 16px',
                                textAlign: 'left', fontSize: '0.8rem', fontWeight: 700,
                                color: '#334155', cursor: 'pointer', borderRadius: 8,
                                display: 'flex', alignItems: 'center', gap: 6
                            }}
                        >
                            📷 이미지 변경
                        </button>
                        <button 
                            onClick={async (e) => {
                                e.stopPropagation();
                                setShowMenu(false);
                                await handleRemoveAvatar();
                            }}
                            style={{
                                background: 'none', border: 'none', padding: '8px 16px',
                                textAlign: 'left', fontSize: '0.8rem', fontWeight: 700,
                                color: '#EF4444', cursor: 'pointer', borderRadius: 8,
                                display: 'flex', alignItems: 'center', gap: 6
                            }}
                        >
                            🗑️ 이미지 없음
                        </button>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowMenu(false);
                            }}
                            style={{
                                background: 'none', border: 'none', padding: '8px 16px',
                                textAlign: 'left', fontSize: '0.8rem', fontWeight: 500,
                                color: '#64748B', cursor: 'pointer', borderRadius: 8,
                                display: 'flex', alignItems: 'center', gap: 6
                            }}
                        >
                            취소
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

function ReferralSection({
    referralCode,
    coupons,
}: {
    referralCode: string | null;
    coupons: CouponRecord[];
}) {
    const { t, i18n } = useTranslation("common");
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        if (!referralCode) return;
        await navigator.clipboard.writeText(referralCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    const reasonKey = (reason: string) => {
        const map: Record<string, string> = {
            signup: t("my_page.referral.reason_signup_new", { defaultValue: '가입 환영 쿠폰' }),
            referred: t("my_page.referral.reason_referred_new", { defaultValue: '추천인 입력 쿠폰' }),
            referrer: t("my_page.referral.reason_referrer_new", { defaultValue: '친구 추천 쿠폰' }),
        };
        return map[reason] ?? reason;
    };

    return (
        <div style={{ 
            background: 'white', 
            borderRadius: 16, 
            border: '1px solid var(--warm-sand, #E8E3D9)', 
            padding: '16px', 
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12
        }}>
            {referralCode ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary, #B8913A)', letterSpacing: 0.5 }}>{referralCode}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--soft-ink, #8A847F)', marginTop: 2 }}>{t("my_page.referral.share_msg_new", { defaultValue: '친구에게 공유하고 5% 쿠폰을 받으세요!' })}</div>
                    </div>
                    <button 
                        onClick={handleCopy}
                        style={{
                            background: 'var(--primary, #B8913A)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 10,
                            padding: '8px 16px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }}
                    >
                        {copied ? t("my_page.referral.copied_new", { defaultValue: '복사됨!' }) : t("my_page.referral.copy_new", { defaultValue: '복사' })}
                    </button>
                </div>
            ) : (
                <div style={{ fontSize: "0.82rem", color: "var(--soft-ink)", padding: "4px 0" }}>
                    {t("common.loading")}
                </div>
            )}

            {coupons.length > 0 && (
                <div style={{ borderTop: '1px dashed var(--warm-sand, #E8E3D9)', paddingTop: 12, marginTop: 4 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--foreground, #2A2624)', marginBottom: 8 }}>
                        {t("my_page.referral.coupons_title_new", { defaultValue: '내 쿠폰' })}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {coupons.map((c) => (
                            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#FDFBF7', borderRadius: 10, border: '1px solid var(--warm-sand, #E8E3D9)' }}>
                                <div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--foreground, #2A2624)' }}>{c.discount_value}%{c.discount_type === "percent" ? " OFF" : ""}</div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--soft-ink, #8A847F)' }}>{reasonKey(c.issue_reason)}</div>
                                    <div style={{ fontSize: '0.68rem', color: 'var(--soft-ink, #8A847F)', opacity: 0.8 }}>
                                        {new Date(c.created_at).toLocaleDateString(i18n.language === "ko" ? "ko-KR" : "en-US")}
                                    </div>
                                </div>
                                <span style={{
                                    fontSize: '0.68rem', fontWeight: 700,
                                    padding: '2px 6px', borderRadius: 4,
                                    background: c.is_used ? 'none' : 'rgba(184,145,58,0.1)',
                                    color: c.is_used ? 'var(--soft-ink, #8A847F)' : '#B8913A',
                                    border: c.is_used ? '1px solid var(--warm-sand, #E8E3D9)' : '1px solid rgba(184,145,58,0.2)'
                                }}>
                                    {c.is_used ? t("my_page.referral.coupon_used_new", { defaultValue: '사용완료' }) : t("my_page.referral.coupon_available_new", { defaultValue: '사용가능' })}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {loading && <SectionCardSkeleton />}
            {!loading && fetchError && (
                <div style={{ textAlign: 'center', padding: '16px', background: 'white', borderRadius: 16, border: '1px solid var(--warm-sand, #E8E3D9)', color: '#ef4444', fontSize: '0.85rem' }}>
                    {fetchError}
                </div>
            )}
            {!loading && !fetchError && bookings.length === 0 && (
                <div style={{ textAlign: 'center', padding: '32px 16px', background: 'white', border: '1px solid var(--warm-sand, #E8E3D9)', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: 8 }}>📅</div>
                    <div style={{ color: 'var(--soft-ink, #8A847F)', fontSize: '0.85rem', marginBottom: 16, fontWeight: 700 }}>
                        {t('my_page.bookings.empty_text', { defaultValue: '아직 예약 내역이 없습니다.' })}
                    </div>
                    <button
                        onClick={() => router.push('/')}
                        style={{
                            background: 'white', border: '1px solid var(--warm-sand, #E8E3D9)',
                            padding: '10px 20px', borderRadius: 12,
                            fontSize: '0.8rem', color: 'var(--foreground, #2A2624)',
                            fontWeight: 700, cursor: 'pointer',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                            transition: 'background 0.1s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#FDFBF7'}
                        onMouseLeave={e => e.currentTarget.style.background = 'white'}
                    >
                        {t('my_page.bookings.browse_beauty_cta_new', { defaultValue: '예약하러 가기' })}
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
                                    background: 'white', borderRadius: 16,
                                    border: '1px solid var(--warm-sand, #E8E3D9)', padding: '16px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--foreground, #2A2624)' }}>
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
                                <div style={{ fontSize: '0.75rem', color: 'var(--soft-ink, #8A847F)', marginBottom: 4 }}>
                                    📅 {b.bookingDate} · {b.bookingTime}
                                </div>
                                <div style={{ fontSize: '0.78rem', color: !isMatched ? '#B8913A' : 'var(--soft-ink, #8A847F)', fontWeight: !isMatched ? 700 : 500, marginBottom: 4 }}>
                                 </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function CommunityHubSection({ authorName }: { authorName: string }) {
    const { t, i18n } = useTranslation("common");
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {loading ? (
                <SectionCardSkeleton rows={2} />
            ) : posts.length === 0 ? (
                <div style={{ 
                    textAlign: 'center', 
                    padding: '32px 16px',
                    background: 'white',
                    border: '1px solid var(--warm-sand, #E8E3D9)',
                    borderRadius: 16,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                }}>
                    <div style={{ fontSize: '2rem', marginBottom: 8 }}>💬</div>
                    <div style={{ color: 'var(--soft-ink, #8A847F)', fontSize: '0.85rem', marginBottom: 16, fontWeight: 700 }}>
                        {t('my_page.community.empty_simple', { defaultValue: '아직 커뮤니티 작성글이 없습니다.' })}
                    </div>
                    <button 
                        onClick={() => router.push("/community")}
                        style={{
                            background: 'white',
                            border: '1px solid var(--warm-sand, #E8E3D9)',
                            padding: '10px 20px',
                            borderRadius: 12,
                            fontSize: '0.8rem',
                            color: 'var(--foreground, #2A2624)',
                            fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                        }}
                    >
                        {t('common.actions.browse_community', { defaultValue: '커뮤니티 둘러보기' })}
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
                                background: 'white',
                                border: '1px solid var(--warm-sand, #E8E3D9)',
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                                transition: 'transform 0.1s'
                            }}
                            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
                            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <span style={{ 
                                    padding: '4px 8px', 
                                    borderRadius: 6, 
                                    background: 'rgba(184,145,58,0.1)', 
                                    color: '#B8913A', 
                                    fontSize: '0.7rem', 
                                    fontWeight: 800,
                                    textTransform: 'uppercase'
                                }}>
                                    {post.type ? (t(`common.states.${post.type.toLowerCase()}`, { defaultValue: post.type })) : t('common.states.posts')}
                                </span>
                                <span style={{ fontSize: '0.72rem', color: 'var(--soft-ink, #8A847F)', fontWeight: 600 }}>
                                    {post.created_at ? new Date(post.created_at).toLocaleDateString(i18n.language === 'ko' ? 'ko-KR' : (i18n.language === 'ja' ? 'ja-JP' : 'en-US')) : (post.time || '')}
                                </span>
                            </div>
                            <div style={{ fontWeight: 800, color: 'var(--foreground, #2A2624)', fontSize: '0.9rem', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {post.title}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--soft-ink, #8A847F)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {post.desc}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
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
    const [referralCode, setReferralCode] = useState<string | null>(null);
    const [coupons, setCoupons] = useState<CouponRecord[]>([]);

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
                setAccessToken("");
                setAuthReady(true);
                setPermissionsResolved(true);
                setUserName("");
                setProfileSubtitle("");
                setAvatarUrl(undefined);
                setReferralCode(null);
                setCoupons([]);
                return;
            }

            const [{ data: profileData, error: profileError }, { data: couponsData }] = await Promise.all([
                supabase
                    .from("profiles")
                    .select("display_name, nickname, nickname_updated_at, role, created_at, avatar_url, referral_code")
                    .eq("id", user.id)
                    .maybeSingle(),
                supabase
                    .from("coupons")
                    .select("*")
                    .eq("user_id", user.id)
                    .order("created_at", { ascending: false }),
            ]);

            if (profileError) {
                console.debug('[my] profiles query error (RLS?):', profileError);
            }

            if (!isMounted) {
                return;
            }

            const nextProfile = (profileData as DashboardProfileRecord | null) ?? null;
            setAvatarUrl(nextProfile?.avatar_url ?? undefined);
            setReferralCode(nextProfile?.referral_code ?? null);
            setCoupons((couponsData as CouponRecord[] | null) ?? []);
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
            setProfileRole(nextProfile?.role ?? (user.user_metadata?.role as string | undefined) ?? null);

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

    const handleLogout = async () => {
        await supabase.auth.signOut();
        localStorage.removeItem("user");
        router.refresh();
    };

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
            {/* Upper Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, padding: '0 4px' }}>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--foreground, #2A2624)', margin: 0, letterSpacing: '-0.5px' }}>나의 Kello</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {/* Settings Cog Button */}
                    <button
                        onClick={() => router.push("/my/settings")}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 6,
                            color: 'var(--foreground, #2A2624)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '50%',
                            transition: 'background 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        aria-label="Settings"
                    >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                    </button>

                    {/* Logout / Login Button */}
                    {accessToken ? (
                        <button
                            onClick={handleLogout}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 6,
                                color: 'var(--foreground, #2A2624)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '50%',
                                transition: 'background 0.15s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                            aria-label="Logout"
                            title="로그아웃"
                        >
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                <polyline points="16 17 21 12 16 7"></polyline>
                                <line x1="21" y1="12" x2="9" y2="12"></line>
                            </svg>
                        </button>
                    ) : (
                        <button
                            onClick={() => router.push("/auth/login?redirect=/my")}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 6,
                                color: 'var(--foreground, #2A2624)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '50%',
                                transition: 'background 0.15s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                            aria-label="Login"
                            title="로그인"
                        >
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                                <polyline points="10 17 15 12 10 7"></polyline>
                                <line x1="15" y1="12" x2="3" y2="12"></line>
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Account & Help Center Combined Card Container */}
            <div style={{ 
                background: 'white', 
                borderRadius: 16, 
                border: '1px solid var(--warm-sand, #E8E3D9)', 
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
                marginBottom: 12
            }}>
                {/* ProfileCard */}
                {accessToken ? (
                    <div style={{ borderBottom: '1px solid var(--warm-sand, #E8E3D9)' }}>
                        <ProfileSummaryCard
                            userName={displayUserName}
                            subtitle={displayProfileSubtitle}
                            avatarUrl={avatarUrl}
                            onAvatarUpdate={(url) => setAvatarUrl(url)}
                            noBorder
                        />
                    </div>
                ) : (
                    <div style={{ borderBottom: '1px solid var(--warm-sand, #E8E3D9)', display: 'flex', alignItems: 'center', padding: '16px', gap: 16 }}>
                        <div style={{ width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', background: '#F1F5F9', border: '1.5px solid var(--warm-sand, #E8E3D9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="32" cy="32" r="32" fill="#E2E8F0"/>
                                <path d="M32 36C38.6274 36 44 30.6274 44 24C44 17.3726 38.6274 12 32 12C25.3726 12 20 17.3726 20 24C20 30.6274 25.3726 36 32 36Z" fill="#94A3B8"/>
                                <path d="M32 40C20.9543 40 12 48.9543 12 60H52C52 48.9543 43.0457 40 32 40Z" fill="#94A3B8"/>
                            </svg>
                        </div>
                        <div style={{ flex: 1, display: 'flex' }}>
                            <button
                                onClick={() => router.push("/auth/login?redirect=/my")}
                                style={{
                                    width: '100%',
                                    background: 'var(--primary, #B8913A)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 10,
                                    padding: '12px 16px',
                                    fontSize: '0.9rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                    transition: 'background 0.1s',
                                    textAlign: 'center'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#A57F2F'}
                                onMouseLeave={e => e.currentTarget.style.background = 'var(--primary, #B8913A)'}
                            >
                                {t('common.actions.login', { defaultValue: '로그인' })}
                            </button>
                        </div>
                    </div>
                )}

                {/* Help Center Section */}
                <div style={{ 
                    padding: '16px 12px 12px 12px', 
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 8
                }}>
                    {/* Medical */}
                    <div 
                        onClick={() => router.push('/help/medical')}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', gap: 6 }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 12, background: '#FFF5F5', border: '1px solid #FEE2E2' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="9.5" y="3" width="5" height="18" fill="#EF4444" rx="1.5"/>
                                <rect x="3" y="9.5" width="18" height="5" fill="#EF4444" rx="1.5"/>
                            </svg>
                        </div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#000000', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            {t('my_page.help_medical', { defaultValue: '의료' })}
                        </div>
                    </div>

                    {/* Interpreter */}
                    <div 
                        onClick={() => router.push('/help/interpretation')}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', gap: 6 }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 12, background: '#F0FDF4', border: '1px solid #DCFCE7' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h5.75L22 22h2l-5.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z" fill="#10B981" />
                            </svg>
                        </div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#000000', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            {t('my_page.help_interpreter', { defaultValue: '통역' })}
                        </div>
                    </div>

                    {/* Police */}
                    <div 
                        onClick={() => router.push('/help/police')}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', gap: 6 }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 12, background: '#EFF6FF', border: '1px solid #DBEAFE' }}>
                            <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>🚨</span>
                        </div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#000000', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            {t('my_page.help_police', { defaultValue: '경찰' })}
                        </div>
                    </div>

                    {/* Lost & Found */}
                    <div 
                        onClick={() => router.push('/help/lost')}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', gap: 6 }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 12, background: '#FEF9C3', border: '1px solid #FEF08A' }}>
                            <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>🔍</span>
                        </div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#000000', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            {t('my_page.help_lost', { defaultValue: '분실물' })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Referral Section - Logged In Only */}
            {accessToken && !capabilities.canViewAdminConsole && (
                <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 8, paddingLeft: 4 }}>
                        <h2 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--foreground, #2A2624)', margin: 0 }}>
                            {t("my_page.referral.title_new", { defaultValue: '추천인 코드' })}
                        </h2>
                    </div>
                    <ReferralSection referralCode={referralCode} coupons={coupons} />
                </div>
            )}

            {/* Bookings Section */}
            {!capabilities.canViewAdminConsole && (
                <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 8, paddingLeft: 4 }}>
                        <h2 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--foreground, #2A2624)', margin: 0 }}>
                            {t('my_page.bookings.title_new', { defaultValue: '내 예약' })}
                        </h2>
                        {accessToken && (
                            <button
                                onClick={() => router.push('/my/bookings/beauty')}
                                style={{ background: 'none', border: 'none', color: '#B8913A', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                            >
                                {t('common.actions.view_all')}
                            </button>
                        )}
                    </div>
                    <MyBookingsSection accessToken={accessToken} authReady={authReady} />
                </div>
            )}

            {/* Community Section */}
            {!capabilities.canViewAdminConsole && (
                <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 8, paddingLeft: 4 }}>
                        <h2 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--foreground, #2A2624)', margin: 0 }}>
                            {t('my_page.community_hub.title_new', { defaultValue: '내 커뮤니티' })}
                        </h2>
                        {accessToken && (
                            <button
                                onClick={() => router.push('/my/community')}
                                style={{ background: 'none', border: 'none', color: '#B8913A', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                            >
                                {t('common.actions.view_all')}
                            </button>
                        )}
                    </div>
                    <CommunityHubSection authorName={communityAuthorName} />
                </div>
            )}

            {/* Standard Partner Banner */}
            {capabilities.showPartnerBanner && accessToken && (
                <div style={{ marginBottom: 12 }}>
                    <PartnerStatusBanner
                        status={partnerStatus}
                        canApplyForPartner={capabilities.canApplyForPartner}
                    />
                </div>
            )}

            {/* Admin Section */}
            {capabilities.canViewAdminConsole && (
                <section className={styles.section} style={{ marginBottom: 0, paddingBottom: 100 }}>
                    <div className={styles.adminTitleRow}>
                        <h2 className={styles.sectionTitle} style={{ margin: 0 }}>⚙️ {t('my_page.dashboard.admin_title')}</h2>
                        <span className={styles.adminBadge}>{t('my_page.settings.admin.enabled')}</span>
                    </div>

                    <div className={styles.adminMenuGrid}>
                        {[
                            { icon: '📊', label: t('my_page.dashboard.admin_menu.dashboard'), desc: t('my_page.dashboard.admin_menu.dashboard_desc'), path: '/admin' },
                            { icon: '💼', label: t('my_page.dashboard.admin_menu.bookings'), desc: t('my_page.dashboard.admin_menu.bookings_desc'), path: '/admin/bookings/beauty' },
                            { icon: '🤝', label: t('my_page.dashboard.admin_menu.partners'), desc: t('my_page.dashboard.admin_menu.partners_desc'), path: '/admin/partners' },
                            { icon: '🛡️', label: t('my_page.dashboard.admin_menu.users'), desc: t('my_page.dashboard.admin_menu.users_desc'), path: '/admin/users' },
                        ].map((item) => (
                            <div
                                key={item.path}
                                className={styles.adminMenuCard}
                                onClick={() => router.push(item.path)}
                            >
                                <div className={styles.adminMenuIconWrap}>{item.icon}</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div className={styles.adminMenuLabel}>{item.label}</div>
                                    <div className={styles.adminMenuDesc}>{item.desc}</div>
                                </div>
                                <span className={styles.adminMenuArrow}>›</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}



            {/* Legal Links (No Card/Section wrapper) */}
            <div style={{ display: 'flex', flexDirection: 'row', gap: 24, justifyContent: 'center', marginTop: 28, flexWrap: 'wrap' }}>
                <div
                    onClick={() => router.push('/privacy')}
                    style={{
                        fontSize: '0.75rem',
                        color: 'var(--soft-ink, #8A847F)',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        fontWeight: 600,
                        opacity: 0.8
                    }}
                >
                    {t('privacy_policy.title')}
                </div>
                <div
                    onClick={() => router.push('/terms')}
                    style={{
                        fontSize: '0.75rem',
                        color: 'var(--soft-ink, #8A847F)',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        fontWeight: 600,
                        opacity: 0.8
                    }}
                >
                    {t('terms_of_service.title')}
                </div>
            </div>

            {/* Bottom Spacer */}
            <div style={{ height: '160px', minHeight: '160px', flexShrink: 0, width: '100%', pointerEvents: 'none' }} />
        </div>
    );
}

export default function MyPage() {
    return (
        <Suspense fallback={<div style={{ padding: 24 }}>...</div>}>
            <MyPageContent />
        </Suspense>
    );
}
