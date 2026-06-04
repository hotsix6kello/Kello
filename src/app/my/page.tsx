"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { Shield, Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { getMyPageCapabilities, type PartnerStatus } from "./pagePermissions";
import styles from "./my.module.css";
import {
    type BeautyBookingAdminRecord,
} from "@/lib/bookings/beautyBookingAdmin";
import AdminStatsDashboard from "../components/AdminStatsDashboard";
import {
    CITY_COORDS,
    type CityKey,
    getNextUpcomingBooking,
    normalizeCityFromBooking,
} from "./travelHelper";

interface DashboardProfileRecord {
    display_name: string | null;
    nickname: string | null;
    nickname_updated_at: string | null;
    role: string | null;
    created_at: string | null;
    avatar_url: string | null;
    referral_code: string | null;
    country: string | null;
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
    referralCode,
    countryCode,
    style,
}: {
    userName: string;
    subtitle?: string;
    avatarUrl?: string;
    onAvatarUpdate?: (url: string) => void;
    referralCode: string | null;
    countryCode?: string | null;
    style?: React.CSSProperties;
}) {
    const [uploading, setUploading] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [copied, setCopied] = useState(false);
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

            // 1. Update Profile in DB
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id);

            if (updateError) throw updateError;

            // 2. Callback
            if (onAvatarUpdate) onAvatarUpdate(publicUrl);
            
            alert("프로필 이미지가 변경되었습니다.");
        } catch (error) {
            console.error('Error uploading avatar:', error);
            alert("이미지 업로드에 실패했습니다.");
        } finally {
            setUploading(false);
        }
    };

    const handleRemoveAvatar = async () => {
        try {
            setShowMenu(false);
            setUploading(true);
            const { data: userData } = await supabase.auth.getUser();
            const user = userData.user;
            if (!user) throw new Error("Not authenticated");

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: null })
                .eq('id', user.id);

            if (updateError) throw updateError;

            if (onAvatarUpdate) onAvatarUpdate("");
            alert("프로필 이미지가 삭제되었습니다.");
        } catch (error) {
            console.error('Error removing avatar:', error);
            alert("이미지 삭제에 실패했습니다.");
        } finally {
            setUploading(false);
        }
    };

    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!referralCode) return;
        await navigator.clipboard.writeText(referralCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    // Convert country code to flag image URL
    const getCountryFlagUrl = (code: string | null | undefined): string => {
        if (!code) return "";
        // Support common country codes stored as 2-letter ISO or language codes like 'ko', 'ja', 'en'
        const langToCountry: Record<string, string> = {
            ko: "kr", ja: "jp", en: "us", zh: "cn", fr: "fr", de: "de",
            es: "es", pt: "pt", it: "it", ru: "ru", ar: "sa", vi: "vn",
            th: "th", id: "id", ms: "my",
        };
        const isoCode = code.length === 2 ? (langToCountry[code.toLowerCase()] ?? code.toLowerCase()) : code.toLowerCase();
        return `https://flagcdn.com/w40/${isoCode}.png`;
    };

    const flagUrl = getCountryFlagUrl(countryCode);

    return (
        <div 
            className={styles.profileCard} 
            style={{ 
                position: 'relative', 
                display: 'flex', 
                alignItems: 'center', 
                gap: 16, 
                background: 'var(--surface)', 
                padding: '18px 16px', 
                borderRadius: '16px', 
                border: '1px solid var(--warm-sand)', 
                boxShadow: 'var(--shadow-sm)',
                ...style 
            }}
        >
            <div className={styles.profileAvatarWrap} style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setShowMenu(!showMenu)}>
                <div className={styles.profileAvatar} style={{ width: 72, height: 72, borderRadius: '50%', background: '#E8E3D9', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2.5px solid var(--primary-glow)', overflow: 'hidden', position: 'relative' }}>
                    {avatarUrl ? (
                        <Image 
                            src={avatarUrl} 
                            alt={userName} 
                            fill
                            className={styles.avatarImg} 
                            style={{ borderRadius: '50%', objectFit: 'cover' }} 
                        />
                    ) : (
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#8A847F', width: '55%', height: '55%' }}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    )}
                </div>
                {flagUrl && (
                    <span style={{
                        position: 'absolute',
                        top: '-4px',
                        right: '-4px',
                        width: '22px',
                        height: '16px',
                        animation: 'flagBounce 1s ease infinite',
                        display: 'inline-block',
                        zIndex: 2,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                        borderRadius: '3px',
                        overflow: 'hidden'
                    }}>
                        <Image
                            src={flagUrl}
                            alt={countryCode || ""}
                            width={22}
                            height={16}
                            className="object-cover"
                        />
                    </span>
                )}
                {uploading && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.7)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>...</div>}
            </div>

            <div className={styles.profileInfo} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <h1 className={styles.profileName} style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--foreground)', position: 'relative' }}>
                        {userName}
                    </h1>
                </div>
                <div className={styles.profileSubtext} style={{ fontSize: '0.75rem', color: 'var(--gray-500)', wordBreak: 'break-all' }}>
                    {subtitle || "이메일 정보 없음"}
                </div>
                {referralCode && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--gray-500)', fontWeight: 600 }}>
                            추천코드: <strong style={{ color: 'var(--foreground)' }}>{referralCode}</strong>
                        </span>
                        <button
                            onClick={handleCopy}
                            title={copied ? '복사됨' : '복사'}
                            style={{
                                background: copied ? '#D1FAE5' : 'var(--primary-glow)',
                                border: '1px solid var(--warm-sand)',
                                borderRadius: '6px',
                                padding: '3px 6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s',
                                color: copied ? '#065F46' : 'var(--primary)',
                            }}
                            onMouseDown={e => e.stopPropagation()}
                        >
                            {copied ? (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"/>
                                </svg>
                            ) : (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                                </svg>
                            )}
                        </button>
                    </div>
                )}
            </div>

            <span style={{ color: 'var(--gray-400)', fontSize: '1.2rem', fontWeight: 700 }}>&gt;</span>

            <input 
                type="file" 
                ref={fileInputRef}
                accept="image/*" 
                onChange={handleFileChange} 
                style={{ display: 'none' }} 
                disabled={uploading}
            />

            {showMenu && (
                <div style={{
                    position: 'absolute',
                    top: '80px',
                    left: '16px',
                    background: '#FFFFFF',
                    border: '1px solid var(--warm-sand)',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    zIndex: 10,
                    padding: '8px 0',
                    display: 'flex',
                    flexDirection: 'column',
                    minWidth: '140px'
                }}>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(false);
                            fileInputRef.current?.click();
                        }}
                        style={{
                            background: 'none',
                            border: 'none',
                            padding: '10px 16px',
                            textAlign: 'left',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            color: 'var(--foreground)',
                            fontWeight: 600,
                        }}
                    >
                        📷 이미지 변경
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveAvatar();
                        }}
                        style={{
                            background: 'none',
                            border: 'none',
                            padding: '10px 16px',
                            textAlign: 'left',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            color: '#EF4444',
                            fontWeight: 600,
                        }}
                    >
                        🗑️ 이미지 없음
                    </button>
                    <div style={{ height: 1, background: 'var(--warm-sand)', margin: '4px 0' }} />
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(false);
                        }}
                        style={{
                            background: 'none',
                            border: 'none',
                            padding: '8px 16px',
                            textAlign: 'left',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            color: 'var(--gray-500)',
                        }}
                    >
                        취소
                    </button>
                </div>
            )}
        </div>
    );
}

function ReferralSection({
    coupons,
}: {
    coupons: CouponRecord[];
}) {
    const { t, i18n } = useTranslation("common");

    const reasonKey = (reason: string) => {
        const map: Record<string, string> = {
            signup: t("my_page.referral.reason_signup", { defaultValue: "회원가입" }),
            referred: t("my_page.referral.reason_referred", { defaultValue: "친구 초대 완료" }),
            referrer: t("my_page.referral.reason_referrer", { defaultValue: "초대 코드 등록 완료" }),
        };
        return map[reason] ?? reason;
    };

    if (coupons.length === 0) return null;

    return (
        <section className={styles.section} style={{ padding: "12px 16px" }}>
            <div className={styles.sectionHeader} style={{ marginBottom: 8 }}>
                <h2 className={styles.sectionTitle}>{t("my_page.referral.coupons_title", { defaultValue: "내 쿠폰" })}</h2>
            </div>
            <div className={styles.couponList}>
                {coupons.map((c) => (
                    <div key={c.id} className={`${styles.couponItem} ${c.is_used ? styles.couponItemUsed : ""}`}>
                        <div>
                            <div className={styles.couponDiscount}>{c.discount_value}%{c.discount_type === "percent" ? " OFF" : ""}</div>
                            <div className={styles.couponReason}>{reasonKey(c.issue_reason)}</div>
                            <div className={styles.couponDate}>
                                {new Date(c.created_at).toLocaleDateString(i18n.language === "ko" ? "ko-KR" : "en-US")}
                            </div>
                        </div>
                        <span className={`${styles.couponBadge} ${c.is_used ? styles.couponBadgeUsed : ""}`}>
                            {c.is_used ? t("my_page.referral.coupon_used", { defaultValue: "사용됨" }) : t("my_page.referral.coupon_available", { defaultValue: "사용 가능" })}
                        </span>
                    </div>
                ))}
            </div>
        </section>
    );
}



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
                        background: 'var(--hanji-ivory)',
                        borderRadius: 14,
                        border: '1px solid var(--warm-sand)',
                        padding: '14px 16px',
                    }}
                >
                    <div style={{ width: '42%', height: 14, borderRadius: 999, background: 'var(--warm-sand)', marginBottom: 10 }} />
                    <div style={{ width: '68%', height: 12, borderRadius: 999, background: 'var(--warm-sand)', marginBottom: 8 }} />
                    <div style={{ width: '56%', height: 12, borderRadius: 999, background: 'var(--warm-sand)', marginBottom: 14 }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                        <div style={{ flex: 1, height: 34, borderRadius: 10, background: 'var(--warm-sand)' }} />
                        <div style={{ flex: 1, height: 34, borderRadius: 10, background: 'var(--warm-sand)' }} />
                    </div>
                </div>
            ))}
        </div>
    );
}

const CITY_NAME_KO: Record<string, string> = {
    Seoul: '서울',
    Busan: '부산',
    Jeju: '제주',
    Daegu: '대구',
    Incheon: '인천'
};

function TravelHelperCard({
    accessToken,
    authReady,
}: {
    accessToken: string;
    authReady: boolean;
}) {
    const [city, setCity] = useState<CityKey>('Seoul');
    const [weather, setWeather] = useState<{ temp: number; icon: string } | null>(null);
    const [loadingWeather, setLoadingWeather] = useState(true);
    const [currency, setCurrency] = useState<string>('USD');
    const [exchangeKrwAmount, setExchangeKrwAmount] = useState<number | null>(null);
    const [loadingExchangeRate, setLoadingExchangeRate] = useState(false);

    // Auto-detect location via Geolocation API
    useEffect(() => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                // Simple geo-boundary detection for Korean cities
                let detected: CityKey = 'Seoul';
                if (latitude >= 33.1 && latitude <= 33.6 && longitude >= 126.1 && longitude <= 127.0) {
                    detected = 'Jeju';
                } else if (latitude >= 35.0 && latitude <= 35.4 && longitude >= 128.8 && longitude <= 129.4) {
                    detected = 'Busan';
                } else if (latitude >= 35.7 && latitude <= 36.0 && longitude >= 128.4 && longitude <= 128.8) {
                    detected = 'Daegu';
                } else if (latitude >= 37.3 && latitude <= 37.6 && longitude >= 126.5 && longitude <= 126.9) {
                    detected = 'Incheon';
                }
                setCity(detected);
            },
            () => { /* permission denied – keep Seoul */ }
        );
    }, []);

    useEffect(() => {
        const saved = typeof window !== 'undefined' ? localStorage.getItem('kello_currency') : null;
        if (saved) setCurrency(saved);

        const handler = (e: Event) => {
            const code = (e as CustomEvent<string>).detail;
            if (code) setCurrency(code);
        };
        window.addEventListener('kello_currency_change', handler);
        return () => window.removeEventListener('kello_currency_change', handler);
    }, []);

    useEffect(() => {
        if (!authReady) {
            setLoadingWeather(false);
            return;
        }
        if (!accessToken) {
            setLoadingWeather(false);
            return;
        }

        let cancelled = false;
        const load = async () => {
            try {
                const res = await fetch('/api/bookings/beauty/mine?view=summary', {
                    headers: { Authorization: `Bearer ${accessToken}` },
                    cache: 'no-store',
                });
                const body = await res.json().catch(() => null) as
                    | { ok?: boolean; items?: MyBookingCardRecord[] }
                    | null;

                if (!cancelled && body?.ok && Array.isArray(body.items)) {
                    const next = getNextUpcomingBooking(body.items);
                    if (next?.storeName) {
                        setCity(normalizeCityFromBooking(next.storeName));
                    }
                }
            } catch { /* keep Seoul default */ }
        };

        void load();
        return () => { cancelled = true; };
    }, [accessToken, authReady]);

    useEffect(() => {
        const coords = CITY_COORDS[city] ?? CITY_COORDS.Seoul;
        let cancelled = false;

        const fetchWeather = async () => {
            setLoadingWeather(true);
            try {
                const res = await fetch(`/api/weather?lat=${coords.lat}&lng=${coords.lng}`);
                const data = await res.json() as { ok: boolean; temp?: number; icon?: string };
                if (!cancelled && data.ok && data.temp !== undefined && data.icon) {
                    setWeather({ temp: data.temp, icon: data.icon });
                }
            } catch { /* keep null */ } finally {
                if (!cancelled) setLoadingWeather(false);
            }
        };

        void fetchWeather();
        return () => { cancelled = true; };
    }, [city]);

    useEffect(() => {
        if (currency === 'KRW') {
            setExchangeKrwAmount(null);
            setLoadingExchangeRate(false);
            return;
        }

        let cancelled = false;
        setLoadingExchangeRate(true);

        const fetchRate = async () => {
            try {
                const res = await fetch('https://open.er-api.com/v6/latest/KRW');
                const data = await res.json() as { result?: string; rates?: Record<string, number> };
                if (!cancelled && data.result === 'success' && data.rates?.[currency]) {
                    const krwPerOne = 1 / data.rates[currency];
                    setExchangeKrwAmount(krwPerOne);
                } else if (!cancelled) {
                    setExchangeKrwAmount(null);
                }
            } catch {
                if (!cancelled) setExchangeKrwAmount(null);
            } finally {
                if (!cancelled) setLoadingExchangeRate(false);
            }
        };

        void fetchRate();
        return () => { cancelled = true; };
    }, [currency]);

    const exchangeLabel = (() => {
        if (currency === 'KRW') return '💱 KRW 기준';
        if (loadingExchangeRate) return `💱 ${currency} ···`;
        if (exchangeKrwAmount !== null) {
            const formatted = exchangeKrwAmount >= 1
                ? Math.round(exchangeKrwAmount).toLocaleString('ko-KR')
                : exchangeKrwAmount.toFixed(2);
            return `💱 1 ${currency} ≈ ₩${formatted}`;
        }
        return `💱 ${currency}`;
    })();

    const cityKo = CITY_NAME_KO[city] || city;
    const weatherIcon = loadingWeather ? '🌤' : (weather ? weather.icon : '🌤');

    return (
        <section style={{
            background: 'var(--hanji-ivory)',
            border: 'none',
            padding: '10px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.8rem',
            fontWeight: 800,
            color: 'var(--foreground)',
            margin: '0 0 -8px 0',
            boxShadow: 'none',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{weatherIcon}</span>
                <span>{cityKo}</span>
                <span>
                    {loadingWeather ? `···°C` : weather ? `${weather.temp}°C` : `24°C`}
                </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {exchangeLabel}
            </div>
        </section>
    );
}


function MyBookingsSection({
    accessToken,
    authReady,
}: {
    accessToken: string;
    authReady: boolean;
}) {
    const { t, i18n } = useTranslation("common");
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: -4 }}>
                <h2 className={styles.sectionTitle} style={{ margin: 0, padding: 0 }}>내 예약</h2>
                <button
                    className={styles.sectionMore}
                    style={{ margin: 0, padding: 0 }}
                    onClick={() => router.push('/my/bookings/beauty')}
                >
                    전체 보기
                </button>
            </div>

            {loading && <SectionCardSkeleton />}
            {!loading && fetchError && (
                <div style={{ textAlign: 'center', padding: '12px 0', color: '#ef4444', fontSize: '0.85rem' }}>
                    {fetchError}
                </div>
            )}
            {!loading && !fetchError && bookings.length === 0 && (
                <div style={{
                    textAlign: 'center',
                    padding: '32px 0',
                    background: '#FFFFFF',
                    border: '1px solid var(--warm-sand)',
                    borderRadius: 16
                }}>
                    <div style={{ fontSize: '2rem', marginBottom: 8 }}>📅</div>
                    <div style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 16, fontWeight: 600 }}>{t('my_page.dashboard.bookings_empty')}</div>
                    <button
                        onClick={() => router.push('/beauty')}
                        style={{
                            background: 'white', border: '1px solid var(--warm-sand)',
                            padding: '10px 20px', borderRadius: 12,
                            fontSize: '0.85rem', color: 'var(--foreground)',
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

                        const STATUS_KO: Record<string, string> = {
                            requested: '예약 요청',
                            confirmed: '예약 확정',
                            completed: '이용 완료',
                            canceled: '예약 취소',
                            failed: '예약 실패',
                            change_requested: '변경 요청',
                        };
                        const STATUS_DESC_KO: Record<string, string> = {
                            requested: '파트너 매칭 대기 중',
                            confirmed: '방문 날짜를 확인해 주세요',
                            completed: '서비스 이용 완료',
                            canceled: '예약이 취소되었습니다',
                            failed: '예약에 실패하였습니다',
                            change_requested: '변경 요청을 검토 중',
                        };

                        return (
                        <div
                            key={b.id}
                            style={{
                                background: '#FFFFFF', borderRadius: 14,
                                border: '1px solid var(--warm-sand)', padding: '14px 16px',
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
                                    {STATUS_KO[b.status] ?? b.status}
                                </span>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: 4 }}>
                                📅 {b.bookingDate} · {b.bookingTime}
                            </div>
                            <div style={{ fontSize: '0.82rem', color: !isMatched ? '#db2777' : '#64748b', fontWeight: !isMatched ? 600 : 400, marginBottom: 4 }}>
                                {!isMatched ? '파트너 매칭 대기 중' : (STATUS_DESC_KO[b.status] ?? '')}
                            </div>
                            <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                                💰 {!isMatched || b.totalPrice === 0 
                                      ? '가격 협의 중' 
                                      : `${b.totalPrice.toLocaleString(i18n.language === 'ko' ? 'ko-KR' : (i18n.language === 'ja' ? 'ja-JP' : 'en-US'))}${t('beauty_explore.label_booking_unit')}`}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: -4 }}>
                 <h2 className={styles.sectionTitle} style={{ margin: 0, padding: 0 }}>
                     {t('my_page.community_hub.title_new', { defaultValue: '내 커뮤니티' })}
                 </h2>
                 <button
                     className={styles.sectionMore}
                     style={{ margin: 0, padding: 0 }}
                     onClick={() => router.push('/my/community')}
                 >
                     {t('common.actions.view_all_new', { defaultValue: '전체 보기' })}
                  </button>
            </div>

            {loading ? (
                <SectionCardSkeleton rows={2} />
             ) : posts.length === 0 ? (
                <div style={{ 
                    textAlign: 'center', 
                    padding: '32px 0px',
                    background: '#FFFFFF',
                    border: '1px solid var(--warm-sand)',
                    borderRadius: 16
                }}>
                    <div style={{ fontSize: '2rem', marginBottom: 8 }}>💬</div>
                    <div style={{ color: 'var(--foreground)', fontSize: '0.9rem', marginBottom: 16, fontWeight: 600 }}>{t('my_page.community.empty_simple_new', { defaultValue: '작성한 글이 없습니다.' })}</div>
                    <button 
                        onClick={() => router.push("/community")}
                        style={{
                            background: 'white',
                            border: '1px solid var(--warm-sand)',
                            padding: '10px 20px',
                            borderRadius: 12,
                            fontSize: '0.85rem',
                            color: 'var(--foreground)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                        }}
                    >
                        {t('common.actions.browse_community_new', { defaultValue: '커뮤니티 둘러보기' })}
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
                                background: '#FFFFFF',
                                border: '1px solid var(--warm-sand)',
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
                                    background: 'var(--primary-glow)', 
                                    color: 'var(--primary)', 
                                    fontSize: '0.7rem', 
                                    fontWeight: 800,
                                    textTransform: 'uppercase'
                                }}>
                                    {post.type ? (t(`common.states.${post.type.toLowerCase()}`, { defaultValue: post.type })) : t('common.states.posts')}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 600 }}>
                                    {post.created_at ? new Date(post.created_at).toLocaleDateString(i18n.language === 'ko' ? 'ko-KR' : (i18n.language === 'ja' ? 'ja-JP' : 'en-US')) : (post.time || '')}
                                </span>
                            </div>
                            <div style={{ fontWeight: 700, color: 'var(--foreground)', fontSize: '0.95rem', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {post.title}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
    const [profileCountry, setProfileCountry] = useState<string | null>(null);

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

            const [{ data: profileData, error: profileError }, { data: couponsData }] = await Promise.all([
                supabase
                    .from("profiles")
                    .select("display_name, nickname, nickname_updated_at, role, created_at, avatar_url, referral_code, country")
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
            setProfileCountry(nextProfile?.country ?? null);
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
        try {
            await supabase.auth.signOut();
            localStorage.removeItem("user");
            router.push("/auth/login");
        } catch (err) {
            console.error("Logout failed:", err);
        }
    };

    if (!hasHydrated) {
        return (
            <div className={styles.container}>
                <div style={{ padding: 24, textAlign: "center", color: "var(--soft-ink)" }}>
                    {t('common.loading', { defaultValue: '불러오는 중...' })}
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container} style={{
            background: '#FDFBF7',
            color: '#2A2624',
            minHeight: '100vh',
            paddingBottom: '160px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            '--hanji-ivory': '#FDFBF7',
            '--warm-sand': '#E8E3D9',
            '--primary': '#B8913A',
            '--primary-glow': '#F5EDD9',
            '--foreground': '#2A2624',
            '--surface': '#FFF8F6',
            '--ink-black': '#2A2624',
            '--soft-ink': '#8A847F',
            '--secondary': '#B8913A',
        } as React.CSSProperties}>
            {/* Header with Title and Settings Gear / Logout */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, padding: '0 4px' }}>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--foreground)', margin: 0 }}>나의 Kello</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button
                        onClick={() => router.push("/my/settings")}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--foreground)', display: 'flex', alignItems: 'center', padding: 4 }}
                        aria-label="설정"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    <button
                        onClick={handleLogout}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--foreground)',
                            display: 'flex',
                            alignItems: 'center',
                            padding: 4
                        }}
                        aria-label="로그아웃"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                    </button>
                </div>
            </header>

            {!capabilities.canViewAdminConsole && (
                <TravelHelperCard accessToken={accessToken} authReady={authReady} />
            )}

            <ProfileSummaryCard
                userName={displayUserName}
                subtitle={displayProfileSubtitle}
                avatarUrl={avatarUrl}
                onAvatarUpdate={(url) => setAvatarUrl(url)}
                referralCode={referralCode}
                countryCode={profileCountry}
                style={{
                    borderRadius: '24px',
                    border: '1px solid var(--warm-sand)',
                    boxShadow: 'var(--shadow-sm)',
                    marginTop: 0,
                    marginBottom: 0,
                    background: 'var(--surface)',
                }}
            />

            {/* Help Center Quick Access Icons */}
            <div className={styles.quickActionBar} style={{
                marginTop: 0,
                marginBottom: 16,
                background: '#F0EBE1',
                border: '1px solid var(--warm-sand)',
                borderRadius: '24px',
                padding: '6px 8px',
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 4,
                boxShadow: 'var(--shadow-sm)'
            }}>
                {[
                    { 
                        icon: (
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="#EF4444" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9 2H15V9H22V15H15V22H9V15H2V9H9V2Z" />
                            </svg>
                        ), 
                        label: "의료", 
                        path: "/help/medical", 
                        color: "#FEE2E2", 
                        borderColor: "#FCA5A5", 
                    },
                    { 
                        icon: (
                            <Shield size={22} color="#3B82F6" strokeWidth={2.5} />
                        ), 
                        label: "경찰", 
                        path: "/help/police", 
                        color: "#EFF6FF", 
                        borderColor: "#BFDBFE", 
                    },
                    { 
                        icon: (
                            <Languages size={22} color="#10B981" strokeWidth={2.5} />
                        ), 
                        label: "통역", 
                        path: "/help/interpretation", 
                        color: "#ECFDF5", 
                        borderColor: "#A7F3D0", 
                    },
                    { 
                        icon: (
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#CA8A04" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                        ), 
                        label: "분실물", 
                        path: "/help/lost", 
                        color: "#FEF9C3", 
                        borderColor: "#FEF08A", 
                    }
                ].map((item) => (
                    <div
                        key={item.path}
                        onClick={() => router.push(item.path)}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            padding: '4px 4px',
                            borderRadius: '12px',
                            transition: 'background-color 0.2s',
                        }}
                    >
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 40,
                            height: 40,
                            borderRadius: '12px',
                            background: item.color,
                            border: `1px solid ${item.borderColor}`,
                            marginBottom: 4,
                        }}>
                            {item.icon}
                        </div>
                        <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--foreground)' }}>
                            {item.label}
                        </div>
                    </div>
                ))}
            </div>

            {!capabilities.canViewAdminConsole && (
                <ReferralSection coupons={coupons} />
            )}

            {!capabilities.canViewAdminConsole && (
                <MyBookingsSection accessToken={accessToken} authReady={authReady} />
            )}

            {!capabilities.canViewAdminConsole && (
                <CommunityHubSection authorName={communityAuthorName} />
            )}

            {/* Standard Partner Banner */}
            {capabilities.showPartnerBanner && (
                <PartnerStatusBanner
                    status={partnerStatus}
                    canApplyForPartner={capabilities.canApplyForPartner}
                />
            )}

            {capabilities.canViewAdminConsole && (
                <AdminStatsDashboard />
            )}

            {/* Admin Section */}
            {capabilities.canViewAdminConsole && (
                <section className={styles.section} style={{ marginBottom: 0, paddingBottom: 100 }}>
                    <div className={styles.adminTitleRow}>
                        <h2 className={styles.sectionTitle} style={{ margin: 0 }}>⚙️ {t('my_page.dashboard.admin_title', { defaultValue: '관리자 대시보드' })}</h2>
                        <span className={styles.adminBadge}>{t('my_page.settings.admin.enabled', { defaultValue: '활성화됨' })}</span>
                    </div>

                    <div className={styles.adminMenuGrid}>
                        {[
                            { icon: '📊', label: t('my_page.dashboard.admin_menu.dashboard', { defaultValue: '통계 대시보드' }), desc: t('my_page.dashboard.admin_menu.dashboard_desc', { defaultValue: '예약 통계 및 실시간 현황' }), path: '/admin' },
                            { icon: '💼', label: t('my_page.dashboard.admin_menu.bookings', { defaultValue: '예약 관리' }), desc: t('my_page.dashboard.admin_menu.bookings_desc', { defaultValue: '전체 예약 내역 확인 및 승인' }), path: '/admin/bookings/beauty' },
                            { icon: '🤝', label: t('my_page.dashboard.admin_menu.partners', { defaultValue: '파트너 관리' }), desc: t('my_page.dashboard.admin_menu.partners_desc', { defaultValue: '신규 파트너 검토 및 권한 제어' }), path: '/admin/partners' },
                            { icon: '🛡️', label: t('my_page.dashboard.admin_menu.users', { defaultValue: '사용자 관리' }), desc: t('my_page.dashboard.admin_menu.users_desc', { defaultValue: '전체 사용자 조회 및 프로필 설정' }), path: '/admin/users' },
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

            {/* Footer Policy Links (Customer Service Card Removed as requested) */}
            <div style={{ display: 'flex', flexDirection: 'row', gap: 24, justifyContent: 'center', flexWrap: 'wrap', marginTop: 24, paddingBottom: 40 }}>
                <div
                    onClick={() => router.push('/privacy')}
                    style={{
                        fontSize: '0.8125rem',
                        color: 'var(--soft-ink)',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        opacity: 0.7
                    }}
                >
                    개인정보처리방침
                </div>
                <div
                    onClick={() => router.push('/terms')}
                    style={{
                        fontSize: '0.8125rem',
                        color: 'var(--soft-ink)',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        opacity: 0.7
                    }}
                >
                    이용약관
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
