'use client';

import { Suspense, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import sharedStyles from '../../admin.module.css';
import styles from './beauty-bookings.module.css';
import { supabase } from '@/lib/supabaseClient';
import {
  BEAUTY_BOOKING_ALLOWED_TRANSITIONS,
  normalizeBeautyBookingAdminListStatus,
  BEAUTY_BOOKING_OPERATOR_STATUS_LABELS,
  type BeautyBookingAdminListStatus,
  type BeautyBookingAdminRecord,
  type BeautyBookingAdminStatus,
  type BeautyBookingOperatorStatus,
} from '@/lib/bookings/beautyBookingAdmin.ts';
import { type BeautyBookingNotificationRecord } from '@/lib/bookings/beautyNotificationServer.ts';

const STATUS_LABELS: Record<BeautyBookingAdminStatus, string> = {
  requested: '접수됨',
  confirmed: '예약 확정',
  completed: '시술 완료',
  canceled: '취소됨',
  failed: '처리 실패',
  change_requested: '변경 요청됨',
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
  'zh-CN': '中文',
};

const INTENT_LABELS: Record<string, string> = {
  booking_confirm: '예약 확인',
  service_request: '시술 요청 전달',
  allergy_notice: '민감 사항 전달',
  style_consultation: '스타일 상담 도움',
};

const STATUS_FILTER_OPTIONS: { value: BeautyBookingAdminListStatus; label: string }[] = [
  { value: 'all', label: '전체 상태' },
  { value: 'requested', label: '접수됨' },
  { value: 'confirmed', label: '예약 확정' },
  { value: 'completed', label: '시술 완료' },
  { value: 'canceled', label: '취소됨' },
  { value: 'failed', label: '처리 실패' },
  { value: 'change_requested', label: '변경 요청됨' },
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

function formatDateLabel(value: string) {
  try {
    return new Date(value).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      weekday: 'short',
    });
  } catch {
    return value;
  }
}

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

function getStatusActionLabel(status: BeautyBookingAdminStatus) {
  switch (status) {
    case 'confirmed':
      return '예약 확정으로 변경';
    case 'completed':
      return '시술 완료로 변경';
    case 'canceled':
      return '예약 취소로 변경';
    case 'change_requested':
      return '변경 요청 단계로 이동';
    default:
      return STATUS_LABELS[status];
  }
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

function AdminBeautyBookingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const detailRef = useRef<HTMLDivElement | null>(null);

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [bookings, setBookings] = useState<BeautyBookingAdminRecord[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusUpdateError, setStatusUpdateError] = useState<string | null>(null);
  const [statusUpdateSuccess, setStatusUpdateSuccess] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<BeautyBookingAdminStatus | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);
  
  // Operator-specific internal states
  const [operatorStatusInput, setOperatorStatusInput] = useState<BeautyBookingOperatorStatus>('pending_assignment');
  const [internalNoteInput, setInternalNoteInput] = useState("");
  const [shopContactedInput, setShopContactedInput] = useState(false);
  const [customerContactedInput, setCustomerContactedInput] = useState(false);
  const [followUpNeededInput, setFollowUpNeededInput] = useState(false);
  const [isSavingOperatorInfo, setIsSavingOperatorInfo] = useState(false);
  const [operatorInfoError, setOperatorInfoError] = useState<string | null>(null);

  // Alternative offer states
  const [alternativeSlots, setAlternativeSlots] = useState<{ date: string; time: string }[]>([{ date: '', time: '' }]);
  const [alternativeNote, setAlternativeNote] = useState("");
  const [isSubmittingAlternative, setIsSubmittingAlternative] = useState(false);
  const [alternativeError, setAlternativeError] = useState<string | null>(null);

  // Notification states
  const [notifications, setNotifications] = useState<BeautyBookingNotificationRecord[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [isResending, setIsResending] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<BeautyBookingAdminListStatus>(
    normalizeBeautyBookingAdminListStatus(searchParams.get('status')),
  );
  const [beautyCategoryFilter, setBeautyCategoryFilter] = useState(searchParams.get('beautyCategory') ?? 'all');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') ?? '');
  const deferredSearchQuery = useDeferredValue(searchQuery);

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
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle();

      setIsAdmin(profile?.is_admin === true);
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

    if (deferredSearchQuery.trim()) {
      params.set('q', deferredSearchQuery.trim());
    }

    const nextPath = params.toString()
      ? `/admin/bookings/beauty?${params.toString()}`
      : '/admin/bookings/beauty';

    router.replace(nextPath, { scroll: false });
  }, [beautyCategoryFilter, deferredSearchQuery, router, statusFilter]);

  const fetchBookings = useCallback(async () => {
    const accessToken = await getAdminAccessToken();

    if (!accessToken) {
      setLoadError('관리자 세션을 다시 확인해 주세요.');
      setBookings([]);
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
    if (deferredSearchQuery.trim()) {
      params.set('query', deferredSearchQuery.trim());
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
  }, [beautyCategoryFilter, deferredSearchQuery, statusFilter]);

  useEffect(() => {
    if (isAdmin) {
      void fetchBookings();
    }
  }, [fetchBookings, isAdmin]);

  useEffect(() => {
    if (!bookings.length) {
      setSelectedBookingId(null);
      return;
    }

    if (!selectedBookingId || !bookings.some((booking) => booking.id === selectedBookingId)) {
      setSelectedBookingId(bookings[0].id);
    }
  }, [bookings, selectedBookingId]);

  useEffect(() => {
    setStatusUpdateError(null);
    setStatusUpdateSuccess(null);
  }, [selectedBookingId]);

  const selectedBooking = useMemo(
    () => bookings.find((booking) => booking.id === selectedBookingId) ?? null,
    [bookings, selectedBookingId],
  );

  useEffect(() => {
    if (selectedBooking) {
      setOperatorStatusInput(selectedBooking.operatorStatus);
      setInternalNoteInput(selectedBooking.internalNote);
      setShopContactedInput(selectedBooking.shopContacted);
      setCustomerContactedInput(selectedBooking.customerContacted);
      setFollowUpNeededInput(selectedBooking.followUpNeeded);
      setOperatorInfoError(null);
      void fetchNotifications(selectedBooking.id);
    }
  }, [selectedBooking]);

  const fetchNotifications = async (bookingId: string) => {
    const accessToken = await getAdminAccessToken();
    if (!accessToken) return;

    setLoadingNotifications(true);
    try {
      const response = await fetch(`/api/bookings/beauty/${bookingId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const body = await response.json();
      if (body.ok) {
        setNotifications(body.notifications);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const allowedTransitions = selectedBooking
    ? BEAUTY_BOOKING_ALLOWED_TRANSITIONS[selectedBooking.status] ?? []
    : [];

  const handleSelectBooking = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    setStatusUpdateError(null);
    setStatusUpdateSuccess(null);

    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      window.setTimeout(() => {
        detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    }
  };

  const handleStatusUpdate = async (nextStatus: BeautyBookingAdminStatus) => {
    if (!selectedBooking) {
      return;
    }

    const accessToken = await getAdminAccessToken();

    if (!accessToken) {
      setStatusUpdateError('관리자 세션을 다시 확인해 주세요.');
      return;
    }

    setPendingStatus(nextStatus);
    setStatusUpdateError(null);
    setStatusUpdateSuccess(null);

    try {
      const response = await fetch(`/api/bookings/beauty/${selectedBooking.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      const body = (await response.json().catch(() => null)) as
        | { ok?: boolean; item?: BeautyBookingAdminRecord; error?: string }
        | null;

      if (!response.ok || body?.ok !== true || !body.item) {
        throw new Error(body?.error ?? '예약 상태를 변경하지 못했어요.');
      }

      const updatedItem = body.item;
      setBookings((current) =>
        current.map((booking) => (booking.id === updatedItem.id ? updatedItem : booking)),
      );
      setStatusUpdateSuccess('예약 상태를 업데이트했어요.');
    } catch (error) {
      setStatusUpdateError(error instanceof Error ? error.message : '예약 상태를 변경하지 못했어요.');
    } finally {
      setPendingStatus(null);
    }
  };

  const handleReviewChangeRequest = async (action: "approved" | "rejected") => {
    if (!selectedBooking) {
      return;
    }

    const accessToken = await getAdminAccessToken();

    if (!accessToken) {
      setStatusUpdateError("관리자 세션을 다시 확인해 주세요.");
      return;
    }

    setIsReviewing(true);
    setStatusUpdateError(null);
    setStatusUpdateSuccess(null);

    try {
      const response = await fetch(`/api/bookings/beauty/${selectedBooking.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ 
          action, 
          note: reviewNote.trim() 
        }),
      });

      const body = (await response.json().catch(() => null)) as
        | { ok?: boolean; item?: BeautyBookingAdminRecord; error?: string }
        | null;

      if (!response.ok || body?.ok !== true || !body.item) {
        throw new Error(body?.error ?? "변경 요청 처리에 실패했어요.");
      }

      const updatedItem = body.item;
      setBookings((current) =>
        current.map((booking) => (booking.id === updatedItem.id ? updatedItem : booking)),
      );
      setStatusUpdateSuccess(action === "approved" ? "변경 요청을 승인했어요." : "변경 요청을 반려했어요.");
      setReviewNote("");
    } catch (error) {
      setStatusUpdateError(error instanceof Error ? error.message : "변경 요청 처리에 실패했어요.");
    } finally {
      setIsReviewing(false);
    }
  };

  const handleUpdateOperatorInfo = async () => {
    if (!selectedBooking) return;

    const accessToken = await getAdminAccessToken();
    if (!accessToken) {
      setOperatorInfoError("관리자 세션을 다시 확인해 주세요.");
      return;
    }

    setIsSavingOperatorInfo(true);
    setOperatorInfoError(null);

    try {
      const response = await fetch(`/api/bookings/beauty/${selectedBooking.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          action: "update_operator_info",
          operatorStatus: operatorStatusInput,
          internalNote: internalNoteInput,
          shopContacted: shopContactedInput,
          customerContacted: customerContactedInput,
          followUpNeeded: followUpNeededInput,
        }),
      });

      const body = (await response.json()) as { ok?: boolean; item?: BeautyBookingAdminRecord; error?: string };

      if (!response.ok || body?.ok !== true || !body.item) {
        throw new Error(body?.error ?? "기록 저장에 실패했어요.");
      }

      const updatedItem = body.item;
      setBookings((current) =>
        current.map((booking) => (booking.id === updatedItem.id ? updatedItem : booking))
      );
      setStatusUpdateSuccess("내부 처리 상태를 저장했습니다.");
    } catch (error) {
      setOperatorInfoError(error instanceof Error ? error.message : "기록 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSavingOperatorInfo(false);
    }
  };

  const handleOfferAlternative = async () => {
    if (!selectedBooking) return;

    const accessToken = await getAdminAccessToken();
    if (!accessToken) {
      setAlternativeError("관리자 세션을 다시 확인해 주세요.");
      return;
    }

    const validSlots = alternativeSlots.filter(s => s.date && s.time);
    if (validSlots.length === 0) {
      setAlternativeError("최소 한 개의 제안 일정이 필요합니다.");
      return;
    }

    setIsSubmittingAlternative(true);
    setAlternativeError(null);

    try {
      const response = await fetch(`/api/bookings/beauty/${selectedBooking.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          action: "offer_alternative",
          alternativeItems: validSlots,
          note: alternativeNote,
        }),
      });

      const body = (await response.json()) as { ok?: boolean; item?: BeautyBookingAdminRecord; error?: string };

      if (!response.ok || body?.ok !== true || !body.item) {
        throw new Error(body?.error ?? "제안 전송에 실패했어요.");
      }

      const updatedItem = body.item;
      setBookings((current) =>
        current.map((booking) => (booking.id === updatedItem.id ? updatedItem : booking))
      );
      setStatusUpdateSuccess("대체 일정 제안을 고객에게 전송했습니다.");
      setAlternativeNote("");
      setAlternativeSlots([{ date: '', time: '' }]);
    } catch (error) {
      setAlternativeError(error instanceof Error ? error.message : "제안 전송 중 오류가 발생했습니다.");
    } finally {
      setIsSubmittingAlternative(false);
    }
  };

  const handleResendNotification = async (notificationId: string) => {
    if (!selectedBooking) return;

    const accessToken = await getAdminAccessToken();
    if (!accessToken) return;

    setIsResending(notificationId);
    try {
      const response = await fetch(`/api/bookings/beauty/${selectedBooking.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          action: "resend_notification",
          notificationId
        }),
      });

      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error ?? "재전송 실패");
      
      setStatusUpdateSuccess("알림을 재전송했습니다.");
      void fetchNotifications(selectedBooking.id);
    } catch (error) {
      setStatusUpdateError(error instanceof Error ? error.message : "알림 재전송 실패");
    } finally {
      setIsResending(null);
    }
  };

  if (isAdmin === null) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 36, height: 36, border: '3px solid #7c3aed', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
        <div style={{ fontSize: '3rem' }}>🔒</div>
        <h2 style={{ fontWeight: 700, fontSize: '1.2rem', margin: 0 }}>관리자 전용 페이지</h2>
        <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem', textAlign: 'center' }}>
          뷰티 예약 관리 화면은 관리자만 확인할 수 있습니다.
        </p>
        <button
          onClick={() => router.push('/admin')}
          style={{ padding: '12px 28px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 14, fontWeight: 700, cursor: 'pointer' }}
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
          onClick={() => router.push('/admin')}
          style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--foreground)' }}
        >
          ←
        </button>
        <h1 className={sharedStyles.headerTitle}>💼 뷰티 예약 관리</h1>
        <span className={sharedStyles.adminBadge}>ADMIN</span>
      </header>

      <div className={sharedStyles.content}>
        <section className={styles.heroCard}>
          <p className={styles.eyebrow}>Beauty Booking Admin</p>
          <h2 className={styles.heroTitle}>예약 요청을 확인하고 매장 진행 상태를 관리하세요.</h2>
          <p className={styles.heroText}>
            최신 예약부터 확인할 수 있고, 접수 후에는 예약 확정·시술 완료·취소 상태로 순차 변경할 수 있습니다.
          </p>
        </section>

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

            <label className={`${styles.field} ${styles.searchField}`}>
              <span>매장명 또는 고객명</span>
              <input
                className={styles.input}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="예: 강남, 민지"
              />
            </label>
          </div>
        </section>

        <div className={styles.layout}>
          <section className={styles.listSection}>
            <div className={styles.sectionHeader}>
              <div>
                <h3 className={styles.sectionTitle}>예약 목록</h3>
                <p className={styles.sectionText}>최신 예약 순으로 표시됩니다.</p>
              </div>
              <button className={styles.refreshButton} onClick={() => void fetchBookings()} disabled={loading}>
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
                  <button
                    key={booking.id}
                    type="button"
                    className={`${styles.bookingCard} ${selectedBookingId === booking.id ? styles.bookingCardActive : ''}`}
                    onClick={() => handleSelectBooking(booking.id)}
                    aria-pressed={selectedBookingId === booking.id}
                  >
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
                        <dd>{booking.primaryServiceName}</dd>
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
                        <dt>예상 금액</dt>
                        <dd>₩{formatPrice(booking.totalPrice)}</dd>
                      </div>
                    </dl>

                    <div className={styles.cardFooter}>
                      <span className={styles.languagePill}>
                        {LANGUAGE_LABELS[booking.communicationLanguage] ?? booking.communicationLanguage}
                      </span>
                      <span className={styles.regionText}>{booking.region}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </section>

          <section ref={detailRef} className={styles.detailSection}>
            <div className={styles.sectionHeader}>
              <div>
                <h3 className={styles.sectionTitle}>예약 상세</h3>
                <p className={styles.sectionText}>선택한 예약의 세부 정보와 전달 메모를 확인할 수 있습니다.</p>
              </div>
            </div>

            {!selectedBooking ? (
              <div className={styles.emptyState}>목록에서 예약을 선택하면 상세 정보가 표시됩니다.</div>
            ) : (
              <article className={styles.detailCard}>
                <div className={styles.detailHeader}>
                  <div>
                    <p className={styles.eyebrow}>Booking Detail</p>
                    <h4 className={styles.detailTitle}>{selectedBooking.storeName}</h4>
                    <p className={styles.detailSub}>
                      {BEAUTY_CATEGORY_LABELS[selectedBooking.beautyCategory] ?? selectedBooking.beautyCategory} ·{' '}
                      {formatDateLabel(selectedBooking.bookingDate)} {selectedBooking.bookingTime}
                    </p>
                  </div>
                  <span className={`${styles.statusBadge} ${getStatusToneClass(selectedBooking.status)}`}>
                    {STATUS_LABELS[selectedBooking.status]}
                  </span>
                </div>

                <div className={styles.summaryGrid}>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>예약 접수</span>
                    <strong>{formatDateTimeLabel(selectedBooking.createdAt)}</strong>
                  </div>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>지역</span>
                    <strong>{selectedBooking.region}</strong>
                  </div>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>디자이너</span>
                    <strong>{selectedBooking.designerName ?? '매장 추천'}</strong>
                  </div>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>최근 수정</span>
                    <strong>{formatDateTimeLabel(selectedBooking.updatedAt)}</strong>
                  </div>
                </div>

                <div className={styles.blockGrid}>
                  <section className={styles.infoBlock}>
                    <h5 className={styles.blockTitle}>시술 정보</h5>
                    <dl className={styles.detailList}>
                      <div>
                        <dt>대표 시술</dt>
                        <dd>{selectedBooking.primaryServiceName}</dd>
                      </div>
                      <div>
                        <dt>부가 옵션</dt>
                        <dd>{selectedBooking.addOnNames.length ? selectedBooking.addOnNames.join(', ') : '선택 없음'}</dd>
                      </div>
                      <div>
                        <dt>예약 ID</dt>
                        <dd>{selectedBooking.id}</dd>
                      </div>
                      <div>
                        <dt>생성 경로</dt>
                        <dd>{selectedBooking.createdFromFlow}</dd>
                      </div>
                    </dl>
                  </section>

                  <section className={styles.infoBlock}>
                    <h5 className={styles.blockTitle}>가격 요약</h5>
                    <dl className={styles.detailList}>
                      <div>
                        <dt>기본 금액</dt>
                        <dd>₩{formatPrice(selectedBooking.basePrice)}</dd>
                      </div>
                      <div>
                        <dt>옵션 금액</dt>
                        <dd>₩{formatPrice(selectedBooking.addOnPrice)}</dd>
                      </div>
                      <div>
                        <dt>디자이너 추가금</dt>
                        <dd>₩{formatPrice(selectedBooking.designerSurcharge)}</dd>
                      </div>
                      <div>
                        <dt>예상 총 금액</dt>
                        <dd className={styles.priceEmphasis}>₩{formatPrice(selectedBooking.totalPrice)}</dd>
                      </div>
                    </dl>
                  </section>

                  <section className={styles.infoBlock}>
                    <h5 className={styles.blockTitle}>고객 정보</h5>
                    <dl className={styles.detailList}>
                      <div>
                        <dt>이름</dt>
                        <dd>{selectedBooking.customerName}</dd>
                      </div>
                      <div>
                        <dt>연락처</dt>
                        <dd>{selectedBooking.customerPhone}</dd>
                      </div>
                      <div>
                        <dt>요청사항</dt>
                        <dd>{selectedBooking.customerRequest || '별도 요청 없음'}</dd>
                      </div>
                    </dl>
                  </section>

                  <section className={styles.infoBlock}>
                    <h5 className={styles.blockTitle}>전달 정보</h5>
                    <dl className={styles.detailList}>
                      <div>
                        <dt>전달 언어</dt>
                        <dd>{LANGUAGE_LABELS[selectedBooking.communicationLanguage] ?? selectedBooking.communicationLanguage}</dd>
                      </div>
                      <div>
                        <dt>전달 목적</dt>
                        <dd>{INTENT_LABELS[selectedBooking.communicationIntent] ?? selectedBooking.communicationIntent}</dd>
                      </div>
                      <div>
                        <dt>예약 확인 동의</dt>
                        <dd>{selectedBooking.agreements.bookingConfirmed ? '동의' : '미동의'}</dd>
                      </div>
                      <div>
                        <dt>개인정보 안내 동의</dt>
                        <dd>{selectedBooking.agreements.privacyConsent ? '동의' : '미동의'}</dd>
                      </div>
                    </dl>
                  </section>
                </div>

                <section className={styles.messageSection}>
                  <h5 className={styles.blockTitle}>직원 전달 메모</h5>
                  <div className={styles.messageGrid}>
                    <div className={styles.messageCard}>
                      <span className={styles.messageLabel}>한국어 기준 문구</span>
                      <p className={styles.messageText}>{selectedBooking.koreanMessage}</p>
                    </div>
                    <div className={styles.messageCard}>
                      <span className={styles.messageLabel}>선택 언어 문구</span>
                      <p className={styles.messageText}>{selectedBooking.localizedMessage}</p>
                    </div>
                  </div>
                </section>

                {selectedBooking.status === 'change_requested' ? (
                  <section className={styles.infoBlock}>
                    <h5 className={styles.blockTitle}>변경 요청 정보</h5>
                    <dl className={styles.detailList}>
                      <div>
                        <dt>요청 시각</dt>
                        <dd>{selectedBooking.changeRequestedAt ? formatDateTimeLabel(selectedBooking.changeRequestedAt) : '확인 중'}</dd>
                      </div>
                      <div>
                        <dt>변경 사유</dt>
                        <dd>{selectedBooking.changeReason || '별도 사유 없음'}</dd>
                      </div>
                    </dl>

                    <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
                      <textarea
                        style={{
                          width: '100%',
                          minHeight: 80,
                          padding: 12,
                          borderRadius: 12,
                          border: '1.5px solid var(--gray-200)',
                          fontSize: '0.86rem',
                        }}
                        placeholder="승인/반려 관련 안내 메시지를 입력하세요 (예: 요청하신대로 오후 3시로 변경해 드렸습니다.)"
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                        disabled={isReviewing}
                      />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          style={{
                            flex: 1,
                            padding: '10px 16px',
                            background: '#059669',
                            color: 'white',
                            border: 'none',
                            borderRadius: 10,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                          onClick={() => void handleReviewChangeRequest('approved')}
                          disabled={isReviewing}
                        >
                          {isReviewing ? '처리 중...' : '요청 승인'}
                        </button>
                        <button
                          type="button"
                          style={{
                            flex: 1,
                            padding: '10px 16px',
                            background: '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: 10,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                          onClick={() => void handleReviewChangeRequest('rejected')}
                          disabled={isReviewing}
                        >
                          {isReviewing ? '처리 중...' : '요청 반려'}
                        </button>
                      </div>
                    </div>
                  </section>
                ) : null}

                {selectedBooking.changeRequestStatus && selectedBooking.changeRequestStatus !== 'pending' ? (
                  <section className={styles.infoBlock} style={{ borderLeft: `4px solid ${selectedBooking.changeRequestStatus === 'approved' ? '#059669' : '#dc2626'}` }}>
                    <h5 className={styles.blockTitle}>변경 요청 검토 결과</h5>
                    <dl className={styles.detailList}>
                      <div>
                        <dt>처리 결과</dt>
                        <dd style={{ fontWeight: 700, color: selectedBooking.changeRequestStatus === 'approved' ? '#059669' : '#dc2626' }}>
                          {selectedBooking.changeRequestStatus === 'approved' ? '승인됨' : '반려됨'}
                        </dd>
                      </div>
                      <div>
                        <dt>처리 일시</dt>
                        <dd>{selectedBooking.changeReviewedAt ? formatDateTimeLabel(selectedBooking.changeReviewedAt) : '-'}</dd>
                      </div>
                      <div>
                        <dt>운영 메모</dt>
                        <dd>{selectedBooking.changeReviewNote || '별도 코멘트 없음'}</dd>
                      </div>
                    </dl>
                  </section>
                ) : null}

                {selectedBooking.status === 'canceled' ? (
                  <section className={styles.infoBlock}>
                    <h5 className={styles.blockTitle}>취소 정보</h5>
                    <dl className={styles.detailList}>
                      <div>
                        <dt>취소 시각</dt>
                        <dd>{selectedBooking.canceledAt ? formatDateTimeLabel(selectedBooking.canceledAt) : '확인 중'}</dd>
                      </div>
                      <div>
                        <dt>취소 주체</dt>
                        <dd>
                          {selectedBooking.canceledBy === 'customer'
                            ? '고객 취소'
                            : selectedBooking.canceledBy === 'admin'
                              ? '운영자/매장 취소'
                              : '확인 중'}
                        </dd>
                      </div>
                      <div>
                        <dt>취소 사유</dt>
                        <dd>{selectedBooking.cancelReason || '별도 사유 없음'}</dd>
                      </div>
                    </dl>
                  </section>
                ) : null}

                <section className={styles.operatorSection} style={{ backgroundColor: '#fdf4ff', border: '1.5px solid #f5d0fe', borderRadius: 16, padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#701a75' }}>🛡️ 운영 전용 처리 (Admin Only)</h5>
                    <span style={{ fontSize: '0.7rem', background: '#f5d0fe', color: '#701a75', padding: '2px 8px', borderRadius: 999, fontWeight: 700 }}>운영자 전용</span>
                  </div>
                  
                  <div className={styles.grid2}>
                    <label className={styles.field}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#701a75' }}>내부 핸들링 상태</span>
                      <select
                        className={styles.select}
                        value={operatorStatusInput}
                        onChange={(e) => setOperatorStatusInput(e.target.value as BeautyBookingOperatorStatus)}
                        style={{ borderColor: '#f5d0fe' }}
                      >
                        {(Object.entries(BEAUTY_BOOKING_OPERATOR_STATUS_LABELS) as [BeautyBookingOperatorStatus, string][]).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <label className={styles.field}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#701a75' }}>내부 메모</span>
                      <textarea
                        className={styles.input}
                        style={{ minHeight: 80, borderColor: '#f5d0fe', fontSize: '0.86rem' }}
                        value={internalNoteInput}
                        onChange={(e) => setInternalNoteInput(e.target.value)}
                        placeholder="매장과 조율 중인 내용이나 특이 사항을 기록하세요 (고객에게 노출 안됨)"
                      />
                    </label>
                  </div>

                  <div style={{ margin: '16px 0', display: 'flex', flexWrap: 'wrap', gap: 20 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
                      <input type="checkbox" checked={shopContactedInput} onChange={e => setShopContactedInput(e.target.checked)} style={{ width: 16, height: 16 }} />
                      매장 연락 완료
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
                      <input type="checkbox" checked={customerContactedInput} onChange={e => setCustomerContactedInput(e.target.checked)} style={{ width: 16, height: 16 }} />
                      고객 추가 안내 완료
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600, color: followUpNeededInput ? '#dc2626' : 'inherit' }}>
                      <input type="checkbox" checked={followUpNeededInput} onChange={e => setFollowUpNeededInput(e.target.checked)} style={{ width: 16, height: 16 }} />
                      사후 관리 필요 (Follow-up)
                    </label>
                  </div>

                  {operatorInfoError && <p style={{ color: '#dc2626', fontSize: '0.8rem', marginBottom: 12 }}>{operatorInfoError}</p>}

                  <button
                    onClick={handleUpdateOperatorInfo}
                    disabled={isSavingOperatorInfo}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: '#701a75',
                      color: 'white',
                      border: 'none',
                      borderRadius: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    {isSavingOperatorInfo ? '내부 기록 저장 중...' : '내부 기록 및 상태 저장'}
                  </button>
                </section>

                <section className={styles.operatorSection} style={{ backgroundColor: '#fff7ed', border: '1.5px solid #ffedd5', borderRadius: 16, padding: 20, marginTop: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#9a3412' }}>📅 대체 일정 제안 (Alternative Offer)</h5>
                    <span style={{ fontSize: '0.7rem', background: '#ffedd5', color: '#9a3412', padding: '2px 8px', borderRadius: 999, fontWeight: 700 }}>고객 전송 가능</span>
                  </div>

                  <div style={{ display: 'grid', gap: 12 }}>
                    {alternativeSlots.map((slot, index) => (
                      <div key={index} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                         <input 
                            type="date" 
                            className={styles.input} 
                            style={{ flex: 2, borderColor: '#ffedd5' }} 
                            value={slot.date} 
                            onChange={e => {
                              const newSlots = [...alternativeSlots];
                              newSlots[index].date = e.target.value;
                              setAlternativeSlots(newSlots);
                            }}
                         />
                         <input 
                            type="time" 
                            className={styles.input} 
                            style={{ flex: 1, borderColor: '#ffedd5' }} 
                            value={slot.time} 
                            onChange={e => {
                              const newSlots = [...alternativeSlots];
                              newSlots[index].time = e.target.value;
                              setAlternativeSlots(newSlots);
                            }}
                         />
                         {alternativeSlots.length > 1 && (
                           <button 
                              onClick={() => setAlternativeSlots(alternativeSlots.filter((_, i) => i !== index))}
                              style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '1.2rem' }}
                           >×</button>
                         )}
                      </div>
                    ))}
                    
                    {alternativeSlots.length < 3 && (
                      <button 
                        onClick={() => setAlternativeSlots([...alternativeSlots, { date: '', time: '' }])}
                        style={{ background: 'none', border: '1px dashed #9a3412', color: '#9a3412', padding: '8px', borderRadius: 8, fontSize: '0.8rem', cursor: 'pointer' }}
                      >+ 추가 제안 (최대 3개)</button>
                    )}
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <label className={styles.field}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#9a3412' }}>운영자 안내 메시지</span>
                      <textarea
                        className={styles.input}
                        style={{ minHeight: 60, borderColor: '#ffedd5', fontSize: '0.86rem' }}
                        value={alternativeNote}
                        onChange={(e) => setAlternativeNote(e.target.value)}
                        placeholder="마감 안내 및 제안 사유를 입력하세요"
                      />
                    </label>
                  </div>

                  {alternativeError && <p style={{ color: '#dc2626', fontSize: '0.8rem', marginBottom: 12, marginTop: 12 }}>{alternativeError}</p>}

                  <button
                    onClick={handleOfferAlternative}
                    disabled={isSubmittingAlternative}
                    style={{
                      marginTop: 16,
                      width: '100%',
                      padding: '12px',
                      background: '#9a3412',
                      color: 'white',
                      border: 'none',
                      borderRadius: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    {isSubmittingAlternative ? '제안 전송 중...' : '대체 일정 제안 보내기'}
                  </button>

                  {selectedBooking.alternativeOfferStatus !== 'none' && (
                    <div style={{ marginTop: 16, padding: '12px', background: 'white', borderRadius: 10, fontSize: '0.85rem', border: '1px solid #ffedd5' }}>
                      <p style={{ margin: '0 0 4px 0', fontWeight: 700 }}>전송된 제안 상태: 
                        <span style={{ color: selectedBooking.alternativeOfferStatus === 'accepted' ? '#059669' : selectedBooking.alternativeOfferStatus === 'rejected' ? '#dc2626' : '#9a3412', marginLeft: 6 }}>
                          {selectedBooking.alternativeOfferStatus === 'offered' ? '고객 확인 중' : 
                           selectedBooking.alternativeOfferStatus === 'accepted' ? '고객 수락함' : '고객 거절함'}
                        </span>
                      </p>
                      {selectedBooking.alternativeResponseAt && (
                        <p style={{ margin: 0, color: 'var(--gray-500)', fontSize: '0.75rem' }}>응답 시각: {formatDateTimeLabel(selectedBooking.alternativeResponseAt)}</p>
                      )}
                    </div>
                  )}
                </section>

                <section className={styles.operatorSection} style={{ backgroundColor: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 16, padding: 20, marginTop: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>
                      📢 고객 알림 발송 이력 
                      <span style={{ fontWeight: 400, fontSize: '0.75rem', color: '#64748b', marginLeft: 8 }}>(동일 알림 최대 3회, 5분 간격)</span>
                    </h5>
                    <button 
                      onClick={() => void fetchNotifications(selectedBooking.id)} 
                      disabled={loadingNotifications}
                      style={{ background: 'none', border: 'none', color: '#7c3aed', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      {loadingNotifications ? '불러오는 중...' : '새로고침'}
                    </button>
                  </div>

                  {notifications.length === 0 ? (
                    <p style={{ fontSize: '0.85rem', color: '#64748b', textAlign: 'center', padding: '20px 0' }}>발송된 알림 내역이 없습니다.</p>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                            <th style={{ padding: '8px 4px' }}>시각 / 채널</th>
                            <th style={{ padding: '8px 4px' }}>제목 / 상태</th>
                            <th style={{ padding: '8px 4px', textAlign: 'right' }}>관리</th>
                          </tr>
                        </thead>
                        <tbody>
                          {notifications.map((notif) => (
                            <tr key={notif.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '10px 4px' }}>
                                <div style={{ fontWeight: 600 }}>{formatDateTimeLabel(notif.created_at)}</div>
                                <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>{notif.channel}</div>
                              </td>
                              <td style={{ padding: '10px 4px' }}>
                                <div style={{ fontWeight: 500 }}>{notif.title}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <span style={{ 
                                    fontSize: '0.7rem', 
                                    padding: '1px 6px', 
                                    borderRadius: 4,
                                    background: notif.dispatch_status === 'sent' ? '#dcfce7' : notif.dispatch_status === 'failed' ? '#fee2e2' : '#f1f5f9',
                                    color: notif.dispatch_status === 'sent' ? '#166534' : notif.dispatch_status === 'failed' ? '#991b1b' : '#475569'
                                  }}>
                                    {notif.dispatch_status === 'sent' ? '발송 완료' : notif.dispatch_status === 'failed' ? '실패' : '대기 중'}
                                  </span>
                                  {notif.error_log && (
                                    <span title={notif.error_log} style={{ fontSize: '0.7rem', color: '#991b1b', cursor: 'help' }}>⚠️ 에러</span>
                                  )}
                                </div>
                              </td>
                              <td style={{ padding: '10px 4px', textAlign: 'right' }}>
                                {notif.resend_count > 0 && (
                                  <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: 4 }}>
                                    재전송 {notif.resend_count}회
                                  </div>
                                )}
                                <button
                                  onClick={() => handleResendNotification(notif.id)}
                                  disabled={
                                    isResending === notif.id || 
                                    notif.resend_count >= 3 || 
                                    !!(notif.last_resent_at && (Date.now() - new Date(notif.last_resent_at).getTime() < 5 * 60 * 1000))
                                  }
                                  style={{
                                    padding: '4px 8px',
                                    background: (notif.resend_count >= 3 || !!(notif.last_resent_at && (Date.now() - new Date(notif.last_resent_at).getTime() < 5 * 60 * 1000))) ? '#e2e8f0' : '#7c3aed',
                                    color: (notif.resend_count >= 3 || !!(notif.last_resent_at && (Date.now() - new Date(notif.last_resent_at).getTime() < 5 * 60 * 1000))) ? '#94a3b8' : 'white',
                                    border: 'none',
                                    borderRadius: 6,
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    cursor: (notif.resend_count >= 3 || !!(notif.last_resent_at && (Date.now() - new Date(notif.last_resent_at).getTime() < 5 * 60 * 1000))) ? 'not-allowed' : 'pointer'
                                  }}
                                >
                                  {isResending === notif.id ? '...' : 
                                   notif.resend_count >= 3 ? '한도 초과' : 
                                   (notif.last_resent_at && (Date.now() - new Date(notif.last_resent_at).getTime() < 5 * 60 * 1000)) ? '대기 중' : '재전송'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <section className={styles.actionSection}>
                  <div>
                    <h5 className={styles.blockTitle}>상태 변경</h5>
                    <p className={styles.sectionText}>접수 후에는 예약 확정, 시술 완료, 취소 상태로만 변경할 수 있습니다.</p>
                  </div>

                  {statusUpdateError ? <p className={styles.actionError}>{statusUpdateError}</p> : null}
                  {statusUpdateSuccess ? <p className={styles.actionSuccess}>{statusUpdateSuccess}</p> : null}

                  {allowedTransitions.length === 0 ? (
                    <div className={styles.panelNote}>현재 상태에서는 추가로 변경할 수 있는 단계가 없습니다.</div>
                  ) : (
                    <div className={styles.actionRow}>
                      {allowedTransitions.map((nextStatus) => (
                        <button
                          key={nextStatus}
                          type="button"
                          className={`${styles.actionButton} ${nextStatus === 'canceled' ? styles.actionDanger : styles.actionPrimary}`}
                          onClick={() => void handleStatusUpdate(nextStatus)}
                          disabled={pendingStatus !== null}
                        >
                          {pendingStatus === nextStatus ? '변경 중...' : getStatusActionLabel(nextStatus)}
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              </article>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default function AdminBeautyBookingsPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 36, height: 36, border: '3px solid #7c3aed', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      }
    >
      <AdminBeautyBookingsContent />
    </Suspense>
  );
}
