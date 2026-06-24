'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import sharedStyles from '../../admin.module.css';
import styles from './beauty-bookings.module.css';
import { supabase } from '@/lib/supabaseClient';
import {
  normalizeBeautyBookingAdminListStatus,
  type BeautyBookingAdminListStatus,
  type BeautyBookingAdminRecord,
  type BeautyBookingAdminStatus,
} from '@/lib/bookings/beautyBookingAdmin.ts';

const STATUS_LABELS: Record<BeautyBookingAdminStatus, string> = {
  requested: '접수됨',
  confirmed: '예약 확정',
  completed: '시술 완료',
  canceled: '예약 취소',
  failed: '처리 실패',
  change_requested: '변경 요청',
};

const BEAUTY_CATEGORY_LABELS: Record<string, string> = {
  hair: '헤어',
  nail: '네일',
  esthetic: '에스테틱',
  waxing: '왁싱',
  makeup: '메이크업',
  lash: '속눈썹',
};

const LANGUAGE_LABELS: Record<string, string> = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
  'zh-CN': '简체中文',
  'zh-HK': '繁體中文',
  vi: 'Tiếng Việt',
  th: 'ไทย',
  id: 'Bahasa Indonesia',
  ms: 'Bahasa Melayu',
};

const STATUS_FILTER_OPTIONS: { value: BeautyBookingAdminListStatus; label: string }[] = [
  { value: 'all', label: '전체 상태' },
  { value: 'requested', label: '접수됨' },
  { value: 'confirmed', label: '예약 확정' },
  { value: 'completed', label: '시술 완료' },
  { value: 'canceled', label: '예약 취소' },
  { value: 'failed', label: '처리 실패' },
  { value: 'change_requested', label: '변경 요청' },
];

const CATEGORY_FILTER_OPTIONS = [
  { value: 'all', label: '전체 카테고리' },
  { value: 'hair', label: '헤어' },
  { value: 'nail', label: '네일' },
  { value: 'esthetic', label: '에스테틱' },
  { value: 'waxing', label: '왁싱' },
  { value: 'makeup', label: '메이크업' },
  { value: 'lash', label: '속눈썹' },
];

function formatDateTimeLabel(value: string) {
  try {
    return new Date(value).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('ko-KR').format(value);
}

function getStatusToneClass(status: BeautyBookingAdminStatus) {
  switch (status) {
    case 'requested':
      return styles.statusRequested;
    case 'confirmed':
      return styles.statusConfirmed;
    case 'completed':
      return styles.statusCompleted;
    case 'canceled':
      return styles.statusCanceled;
    case 'failed':
      return styles.statusFailed;
    case 'change_requested':
      return styles.statusChangeRequested || styles.statusRequested;
    default:
      return styles.statusRequested;
  }
}

async function getAdminAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token ?? null;
}

export default function AdminBeautyBookingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [statusFilter, setStatusFilter] = useState<BeautyBookingAdminListStatus>(
    normalizeBeautyBookingAdminListStatus(searchParams.get('status')),
  );
  const [beautyCategoryFilter, setBeautyCategoryFilter] = useState(searchParams.get('beautyCategory') ?? 'all');
  const [bookings, setBookings] = useState<BeautyBookingAdminRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsAdmin(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      setIsAdmin(profile?.role === 'admin' || profile?.role === 'super_admin');
    };

    void init();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();

    if (statusFilter !== 'all') {
      params.set('status', statusFilter);
    }

    if (beautyCategoryFilter !== 'all') {
      params.set('beautyCategory', beautyCategoryFilter);
    }

    const nextPath = params.toString()
      ? `/admin/bookings/beauty?${params.toString()}`
      : '/admin/bookings/beauty';

    router.replace(nextPath, { scroll: false });
  }, [beautyCategoryFilter, router, statusFilter]);

  const fetchBookings = useCallback(async () => {
    const accessToken = await getAdminAccessToken();

    if (!accessToken) {
      setLoadError('관리자 세션을 다시 확인해 주세요.');
      return;
    }

    setLoading(true);
    setLoadError(null);

    const params = new URLSearchParams();
    if (statusFilter !== 'all') {
      params.set('status', statusFilter);
    }
    if (beautyCategoryFilter !== 'all') {
      params.set('beautyCategory', beautyCategoryFilter);
    }

    try {
      const response = await fetch(`/api/bookings/beauty?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: 'no-store',
      });

      const body = (await response.json().catch(() => null)) as
        | { ok?: boolean; items?: BeautyBookingAdminRecord[]; error?: string }
        | null;

      if (!response.ok || body?.ok !== true || !Array.isArray(body.items)) {
        throw new Error(body?.error ?? '예약 목록을 불러오지 못했어요.');
      }

      setBookings(body.items);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : '예약 목록을 불러오지 못했어요.');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [beautyCategoryFilter, statusFilter]);

  useEffect(() => {
    if (isAdmin) {
      void fetchBookings();
    }
  }, [fetchBookings, isAdmin]);

  const handleOpenDetail = (bookingId: string) => {
    router.push(`/admin/bookings/beauty/${bookingId}`);
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (!window.confirm('취소된 예약을 영구 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) return;

    const accessToken = await getAdminAccessToken();
    if (!accessToken) return;

    setDeletingId(bookingId);

    try {
      const response = await fetch(`/api/bookings/beauty/${bookingId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const body = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;

      if (!response.ok || !body?.ok) {
        throw new Error(body?.error ?? '예약을 삭제하지 못했어요.');
      }

      setBookings((prev) => prev.filter((b) => b.id !== bookingId));
    } catch (error) {
      alert(error instanceof Error ? error.message : '예약을 삭제하지 못했어요.');
    } finally {
      setDeletingId(null);
    }
  };

  if (isAdmin === null) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            width: 36,
            height: 36,
            border: '3px solid #7c3aed',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: 24,
        }}
      >
        <div style={{ fontSize: '3rem' }}>🔒</div>
        <h2 style={{ fontWeight: 700, fontSize: '1.2rem', margin: 0 }}>관리자 전용 페이지</h2>
        <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem', textAlign: 'center' }}>
          뷰티 예약 관리 화면은 관리자만 확인할 수 있습니다.
        </p>
        <button
          type="button"
          onClick={() => router.push('/admin')}
          style={{
            padding: '12px 28px',
            background: 'var(--primary)',
            color: 'white',
            border: 'none',
            borderRadius: 14,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          관리자 홈으로
        </button>
      </div>
    );
  }

  return (
    <div className={sharedStyles.container}>
      <header className={sharedStyles.header}>
        <button
          type="button"
          onClick={() => router.back()}
          style={{
            background: 'none',
            border: 'none',
            padding: '4px 0',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
          }}
          aria-label="뒤로가기"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <h1 className={sharedStyles.headerTitle}>뷰티 예약 관리</h1>
        <div className={sharedStyles.headerActions}>
          <Link href="/my" className={sharedStyles.headerNavButton}>
            <span className={sharedStyles.headerNavButtonFull}>마이페이지</span>
            <span className={sharedStyles.headerNavButtonShort}>마이</span>
          </Link>
          <span className={sharedStyles.adminBadge}>ADMIN</span>
        </div>
      </header>

      <div className={sharedStyles.content}>
        <section className={styles.filterCard}>
          <div className={styles.filterGrid}>
            <label className={styles.field}>
              <span>상태</span>
              <select
                className={styles.select}
                value={statusFilter}
                onChange={(event) => setStatusFilter(normalizeBeautyBookingAdminListStatus(event.target.value))}
              >
                {STATUS_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>카테고리</span>
              <select
                className={styles.select}
                value={beautyCategoryFilter}
                onChange={(event) => setBeautyCategoryFilter(event.target.value)}
              >
                {CATEGORY_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <div className={styles.layout}>
          <section className={styles.listSection}>
            <div className={styles.sectionHeader}>
              <div>
                <h3 className={styles.sectionTitle}>예약 목록</h3>
                <p className={styles.sectionText}>목록에서 예약 확인을 눌러 전용 상세 페이지로 이동할 수 있어요.</p>
              </div>
              <button className={styles.refreshButton} type="button" onClick={() => void fetchBookings()} disabled={loading}>
                {loading ? '불러오는 중...' : '새로고침'}
              </button>
            </div>

            {loadError ? <div className={styles.errorState}>{loadError}</div> : null}
            {loading ? <div className={styles.emptyState}>예약 목록을 불러오는 중입니다.</div> : null}

            {!loading && !loadError && bookings.length === 0 ? (
              <div className={styles.emptyState}>조건에 맞는 예약 요청이 없습니다.</div>
            ) : null}

            {!loading && bookings.length > 0 ? (
              <div className={styles.bookingList}>
                {bookings.map((booking) => (
                  <article key={booking.id} className={styles.bookingCard} style={{ cursor: 'default' }}>
                    <div className={styles.bookingCardTop}>
                      <span className={`${styles.statusBadge} ${getStatusToneClass(booking.status)}`}>
                        {STATUS_LABELS[booking.status]}
                      </span>
                      <span className={styles.cardDate}>{formatDateTimeLabel(booking.createdAt)}</span>
                    </div>

                    <div className={styles.bookingCardTitle}>{booking.storeName}</div>
                    <div className={styles.bookingCardMeta}>
                      {BEAUTY_CATEGORY_LABELS[booking.beautyCategory] ?? booking.beautyCategory} · {booking.bookingDate} · {booking.bookingTime}
                    </div>

                    <dl className={styles.bookingMetaList}>
                      <div>
                        <dt>시술</dt>
                        <dd>{booking.primaryServiceName ?? '미정'}</dd>
                      </div>
                      <div>
                        <dt>고객</dt>
                        <dd>{booking.customerName}</dd>
                      </div>
                      <div>
                        <dt>연락처</dt>
                        <dd>{booking.customerPhone}</dd>
                      </div>
                      <div>
                        <dt>Email</dt>
                        <dd>{booking.customerEmail ?? '-'}</dd>
                      </div>
                      <div>
                        <dt>예상 금액</dt>
                        <dd>₩{formatPrice(booking.totalPrice)}</dd>
                      </div>
                    </dl>

                    <div className={styles.cardFooter}>
                      <span className={styles.languagePill}>
                        {LANGUAGE_LABELS[booking.communicationLanguage] ?? booking.communicationLanguage}
                      </span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {booking.status === 'canceled' ? (
                          <button
                            type="button"
                            className={styles.refreshButton}
                            onClick={() => void handleDeleteBooking(booking.id)}
                            disabled={deletingId === booking.id}
                            style={{ minHeight: 38, padding: '0 14px', color: '#dc2626', borderColor: '#fecaca' }}
                          >
                            {deletingId === booking.id ? '삭제 중...' : '삭제'}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className={styles.refreshButton}
                          onClick={() => handleOpenDetail(booking.id)}
                          style={{ minHeight: 38, padding: '0 14px' }}
                        >
                          예약 확인
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
