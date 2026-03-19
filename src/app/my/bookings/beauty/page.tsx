'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { supabase } from '@/lib/supabaseClient';
import {
  isBeautyBookingCustomerCancelableStatus,
  isBeautyBookingCustomerChangeableStatus,
  type BeautyBookingAdminRecord,
} from '@/lib/bookings/beautyBookingAdmin.ts';
import { useBeautyTranslation } from '@/hooks/useBeautyTranslation';
import styles from './beauty-bookings.module.css';

type BookingTabId = 'all' | 'active' | 'completed' | 'canceled';

const TIMELINE_STEP_IDS = ['requested', 'confirmed', 'completed', 'canceled'] as const;

function formatPrice(value: number, language: string, t: any) {
  const formatted = new Intl.NumberFormat(language === 'ko' ? 'ko-KR' : 'en-US').format(value);
  const unit = t('beauty_explore.label_booking_unit');
  return language === 'ko' ? `${formatted}${unit}` : `${unit} ${formatted}`;
}

function formatDateLabel(value: string, language: string) {
  try {
    return new Date(value).toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    });
  } catch {
    return value;
  }
}

function formatDateTimeLabel(value: string, language: string) {
  try {
    return new Date(value).toLocaleString(language === 'ko' ? 'ko-KR' : 'en-US', {
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

function getStatusToneClass(status: BeautyBookingAdminRecord['status']) {
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

function getTimelineStepState(
  currentStatus: BeautyBookingAdminRecord['status'],
  stepId: (typeof TIMELINE_STEP_IDS)[number],
) {
  if (currentStatus === 'canceled') {
    if (stepId === 'requested') {
      return 'done';
    }

    if (stepId === 'canceled') {
      return 'current';
    }

    return 'pending';
  }

  const order: BeautyBookingAdminRecord['status'][] = ['requested', 'confirmed', 'completed'];
  const currentIndex = order.indexOf(currentStatus);
  const stepIndex = order.indexOf(stepId as BeautyBookingAdminRecord['status']);

  if (stepId === 'canceled') {
    return 'optional';
  }

  if (stepIndex < currentIndex) {
    return 'done';
  }

  if (stepIndex === currentIndex) {
    return 'current';
  }

  return 'pending';
}

async function getCustomerAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token ?? null;
}

function MyBeautyBookingsContent() {
  const { t, i18n } = useTranslation('common');
  const currentLocale = i18n.language ?? 'ko';
  const { translate } = useBeautyTranslation();

  // Locale-키 기반 동적 상수
  const TAB_OPTIONS: { id: BookingTabId; label: string }[] = [
    { id: 'all', label: t('beauty_bookings.tab_all') },
    { id: 'active', label: t('beauty_bookings.tab_active') },
    { id: 'completed', label: t('beauty_bookings.tab_completed') },
    { id: 'canceled', label: t('beauty_bookings.tab_canceled') },
  ];

  const STATUS_LABELS: Record<BeautyBookingAdminRecord['status'], string> = {
    requested: t('beauty_bookings.status_requested'),
    confirmed: t('beauty_bookings.status_confirmed'),
    completed: t('beauty_bookings.status_completed'),
    canceled: t('beauty_bookings.status_canceled'),
    failed: t('beauty_bookings.status_failed'),
    change_requested: t('beauty_bookings.status_change_requested'),
  };

  const STATUS_DESCRIPTIONS: Record<BeautyBookingAdminRecord['status'], string> = {
    requested: t('beauty_bookings.status_desc_requested'),
    confirmed: t('beauty_bookings.status_desc_confirmed'),
    completed: t('beauty_bookings.status_desc_completed'),
    canceled: t('beauty_bookings.status_desc_canceled'),
    failed: t('beauty_bookings.status_desc_failed'),
    change_requested: t('beauty_bookings.status_desc_change_requested'),
  };

  const CANCEL_REASON_OPTIONS = [
    t('beauty_bookings.cancel_reason_schedule'),
    t('beauty_bookings.cancel_reason_other_shop'),
    t('beauty_bookings.cancel_reason_mistake'),
    t('beauty_bookings.cancel_reason_etc'),
  ];

  const TIMELINE_STEPS = TIMELINE_STEP_IDS.map((id) => ({
    id,
    label: t(`beauty_bookings.status_${id}`),
  }));

  function getCategoryLabel(cat: string) {
    const key = `beauty_bookings.category_${cat}`;
    const v = t(key);
    return v === key ? cat : v;
  }

  function getLangLabel(lang: string) {
    const map: Record<string, string> = {
      ko: t('beauty_bookings.lang_ko'), en: t('beauty_bookings.lang_en'),
      ja: t('beauty_bookings.lang_ja'), 'zh-CN': t('beauty_bookings.lang_zh_cn'),
      'zh-HK': t('beauty_bookings.lang_zh_hk'), vi: t('beauty_bookings.lang_vi'),
      th: t('beauty_bookings.lang_th'), id: t('beauty_bookings.lang_id'), ms: t('beauty_bookings.lang_ms'),
    };
    return map[lang] ?? lang;
  }

  function getIntentLabel(intent: string) {
    const map: Record<string, string> = {
      booking_confirm: t('beauty_bookings.intent_booking_confirm'),
      service_request: t('beauty_bookings.intent_service_request'),
      allergy_notice: t('beauty_bookings.intent_allergy_notice'),
      style_consultation: t('beauty_bookings.intent_style_consultation'),
    };
    return map[intent] ?? intent;
  }

  // 동적 자유문장 번역 상태 (customerRequest, alternativeOfferNote)
  const [translatedRequest, setTranslatedRequest] = useState<string>('');
  const [translatedOfferNote, setTranslatedOfferNote] = useState<string>('');

  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingIdFromUrl = searchParams.get('bookingId');
  const focusFromUrl = searchParams.get('focus');
  const detailRef = useRef<HTMLDivElement | null>(null);
  const alternativeOfferRef = useRef<HTMLDivElement | null>(null);

  const [authReady, setAuthReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [bookings, setBookings] = useState<BeautyBookingAdminRecord[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<BookingTabId>('all');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [hasInitializedDeepLink, setHasInitializedDeepLink] = useState(false);
  const [deepLinkApplied, setDeepLinkApplied] = useState(false);
  const [isCancelPanelOpen, setIsCancelPanelOpen] = useState(false);
  const [selectedCancelReason, setSelectedCancelReason] = useState<string>('');
  const [cancelDetails, setCancelDetails] = useState('');
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState<string | null>(null);
  const [isCancelSubmitting, setIsCancelSubmitting] = useState(false);

  const [isChangePanelOpen, setIsChangePanelOpen] = useState(false);
  const [changeReason, setChangeReason] = useState('');
  const [changeError, setChangeError] = useState<string | null>(null);
  const [changeSuccess, setChangeSuccess] = useState<string | null>(null);
  const [isChangeSubmitting, setIsChangeSubmitting] = useState(false);
  
  // Alternative offer states
  const [selectedOfferSlot, setSelectedOfferSlot] = useState<{ date: string; time: string } | null>(null);
  const [isAlternativeSubmitting, setIsAlternativeSubmitting] = useState(false);
  const [alternativeResponseError, setAlternativeResponseError] = useState<string | null>(null);
  const [alternativeResponseSuccess, setAlternativeResponseSuccess] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setIsLoggedIn(Boolean(user));
      setAuthReady(true);
    };

    void init();
  }, []);

  useEffect(() => {
    if (!authReady || !isLoggedIn) {
      return;
    }

    let cancelled = false;

    const fetchBookings = async () => {
      const accessToken = await getCustomerAccessToken();

      if (!accessToken) {
        if (!cancelled) {
          setLoadError('로그인 상태를 다시 확인해 주세요.');
          setBookings([]);
        }
        return;
      }

      if (!cancelled) {
        setLoading(true);
        setLoadError(null);
      }

      try {
        const response = await fetch('/api/bookings/beauty/mine', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: 'no-store',
        });

        const body = (await response.json().catch(() => null)) as
          | { ok?: boolean; items?: BeautyBookingAdminRecord[]; error?: string }
          | null;

        if (!response.ok || body?.ok !== true || !Array.isArray(body.items)) {
          throw new Error(
            response.status === 401
              ? '로그인 후 내 예약을 확인해 주세요.'
              : body?.error ?? '내 예약을 불러오지 못했어요.',
          );
        }

        if (!cancelled) {
          setBookings(body.items);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : '내 예약을 불러오지 못했어요.');
          setBookings([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchBookings();

    return () => {
      cancelled = true;
    };
  }, [authReady, isLoggedIn]);

  const filteredBookings = useMemo(() => {
    if (activeTab === 'all') {
      return bookings;
    }

    if (activeTab === 'active') {
      return bookings.filter((booking) => 
        booking.status === 'requested' || 
        booking.status === 'confirmed' || 
        booking.status === 'change_requested'
      );
    }

    if (activeTab === 'completed') {
      return bookings.filter((booking) => booking.status === 'completed');
    }

    return bookings.filter((booking) => booking.status === 'canceled');
  }, [activeTab, bookings]);

  useEffect(() => {
    if (!bookings.length || hasInitializedDeepLink) return;

    if (bookingIdFromUrl) {
      const target = bookings.find(b => b.id === bookingIdFromUrl);
      if (target) {
        // If the target is not in the current tab, switch to 'all' to ensure it's visible
        if (!filteredBookings.some(b => b.id === bookingIdFromUrl)) {
          setActiveTab('all');
        }
        setSelectedBookingId(target.id);
        setDeepLinkApplied(true);
        
        // Auto scroll for mobile
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
          setTimeout(() => {
            detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 400);
        }

        // Secondary scroll for focus target
        if (focusFromUrl === 'alternative-offer') {
          setTimeout(() => {
            alternativeOfferRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 800);
        }
      }
      setHasInitializedDeepLink(true);
    }
  }, [bookings, bookingIdFromUrl, hasInitializedDeepLink, filteredBookings, focusFromUrl]);

  useEffect(() => {
    if (!filteredBookings.length) {
      setSelectedBookingId(null);
      return;
    }

    // Skip auto-selection if we are still processing a potential deep link
    if (bookingIdFromUrl && !hasInitializedDeepLink) return;

    if (!selectedBookingId || !filteredBookings.some((booking) => booking.id === selectedBookingId)) {
      setSelectedBookingId(filteredBookings[0].id);
    }
  }, [filteredBookings, selectedBookingId, bookingIdFromUrl, hasInitializedDeepLink]);

  const selectedBooking = useMemo(
    () => filteredBookings.find((booking) => booking.id === selectedBookingId) ?? null,
    [filteredBookings, selectedBookingId],
  );

  const canCancelSelectedBooking = selectedBooking
    ? isBeautyBookingCustomerCancelableStatus(selectedBooking.status)
    : false;

  const canChangeSelectedBooking = selectedBooking
    ? isBeautyBookingCustomerChangeableStatus(selectedBooking.status)
    : false;

  useEffect(() => {
    setIsCancelPanelOpen(false);
    setSelectedCancelReason('');
    setCancelDetails('');
    setCancelError(null);
    setCancelSuccess(null);
    setIsCancelSubmitting(false);

    setIsChangePanelOpen(false);
    setChangeReason('');
    setChangeError(null);
    setChangeSuccess(null);
    setIsChangeSubmitting(false);

    setSelectedOfferSlot(null);
    setAlternativeResponseError(null);
    setAlternativeResponseSuccess(null);
    setIsAlternativeSubmitting(false);
  }, [selectedBookingId]);

  // Dynamic Translation Effect
  useEffect(() => {
    if (!selectedBooking) {
      setTranslatedRequest('');
      setTranslatedOfferNote('');
      return;
    }

    // Translate Customer Request
    if (selectedBooking.customerRequest && currentLocale !== 'ko') {
      void translate({
        text: selectedBooking.customerRequest,
        targetLocale: currentLocale,
        contentType: 'customerRequest',
      }).then(setTranslatedRequest);
    } else {
      setTranslatedRequest(selectedBooking.customerRequest || '');
    }

    // Translate Alternative Offer Note
    if (selectedBooking.alternativeOfferNote && currentLocale !== 'ko') {
      void translate({
        text: selectedBooking.alternativeOfferNote,
        targetLocale: currentLocale,
        contentType: 'alternativeOfferNote',
      }).then(setTranslatedOfferNote);
    } else {
      setTranslatedOfferNote(selectedBooking.alternativeOfferNote || '');
    }
  }, [selectedBooking, currentLocale, translate]);

  const handleSelectBooking = (bookingId: string) => {
    setSelectedBookingId(bookingId);

    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      window.setTimeout(() => {
        detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    }
  };

  const handleBookingCancel = async () => {
    if (!selectedBooking || !canCancelSelectedBooking || isCancelSubmitting) {
      return;
    }

    const reason = [selectedCancelReason.trim(), cancelDetails.trim()].filter(Boolean).join(' - ').trim();

    if (!reason) {
      setCancelError(t('beauty_bookings.error_cancel_reason'));
      return;
    }

    const accessToken = await getCustomerAccessToken();

    if (!accessToken) {
      setCancelError(t('beauty_bookings.error_login'));
      return;
    }

    setIsCancelSubmitting(true);
    setCancelError(null);
    setCancelSuccess(null);

    try {
      const response = await fetch(`/api/bookings/beauty/mine/${selectedBooking.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ reason }),
      });

      const body = (await response.json().catch(() => null)) as
        | { ok?: boolean; item?: BeautyBookingAdminRecord; error?: string }
        | null;

      if (!response.ok || body?.ok !== true || !body.item) {
        throw new Error(
          response.status === 400
            ? t('beauty_bookings.error_cancel_400')
            : response.status === 403
              ? t('beauty_bookings.error_cancel_403')
              : response.status === 401
                ? t('beauty_bookings.error_login')
                : body?.error ?? t('beauty_bookings.error_cancel'),
        );
      }

      const updatedItem = body.item;
      setBookings((current) =>
        current.map((booking) => (booking.id === updatedItem.id ? updatedItem : booking)),
      );
      setCancelSuccess('예약이 취소되었어요.');
      setIsCancelPanelOpen(false);

      if (activeTab === 'active') {
        setActiveTab('all');
      }
    } catch (error) {
      setCancelError(
        error instanceof Error ? error.message : '예약을 취소하지 못했어요. 잠시 후 다시 시도해 주세요.',
      );
    } finally {
      setIsCancelSubmitting(false);
    }
  };

  const handleBookingChangeRequest = async () => {
    if (!selectedBooking || !canChangeSelectedBooking || isChangeSubmitting) {
      return;
    }

    if (!changeReason.trim()) {
      setChangeError('변경하고 싶은 내용을 입력해 주세요.');
      return;
    }

    const accessToken = await getCustomerAccessToken();

    if (!accessToken) {
      setChangeError('로그인 상태를 다시 확인해 주세요.');
      return;
    }

    setIsChangeSubmitting(true);
    setChangeError(null);
    setChangeSuccess(null);

    try {
      const response = await fetch(`/api/bookings/beauty/mine/${selectedBooking.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ 
          action: 'request_change',
          reason: changeReason.trim() 
        }),
      });

      const body = (await response.json().catch(() => null)) as
        | { ok?: boolean; item?: BeautyBookingAdminRecord; error?: string }
        | null;

      if (!response.ok || body?.ok !== true || !body.item) {
        throw new Error(
          body?.error ?? '변경 요청을 보내지 못했어요. 잠시 후 다시 시도해 주세요.',
        );
      }

      const updatedItem = body.item;
      setBookings((current) =>
        current.map((booking) => (booking.id === updatedItem.id ? updatedItem : booking)),
      );
      setChangeSuccess('변경 요청이 전달되었어요.');
      setIsChangePanelOpen(false);
    } catch (error) {
      setChangeError(
        error instanceof Error ? error.message : '변경 요청을 보내지 못했어요. 잠시 후 다시 시도해 주세요.',
      );
    } finally {
      setIsChangeSubmitting(false);
    }
  };

  const handleResponseAlternative = async (response: 'accepted' | 'rejected') => {
    if (!selectedBooking || isAlternativeSubmitting) {
      return;
    }

    if (response === 'accepted' && !selectedOfferSlot) {
      setAlternativeResponseError('제안된 일정 중 하나를 선택해 주세요.');
      return;
    }

    const accessToken = await getCustomerAccessToken();
    if (!accessToken) {
      setAlternativeResponseError('로그인 상태를 다시 확인해 주세요.');
      return;
    }

    setIsAlternativeSubmitting(true);
    setAlternativeResponseError(null);
    setAlternativeResponseSuccess(null);

    try {
      const apiResponse = await fetch(`/api/bookings/beauty/mine/${selectedBooking.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          action: 'respond_alternative',
          response,
          selectedItem: selectedOfferSlot,
        }),
      });

      const body = (await apiResponse.json()) as { ok?: boolean; item?: BeautyBookingAdminRecord; error?: string };

      if (!apiResponse.ok || body?.ok !== true || !body.item) {
        throw new Error(body?.error ?? '처리에 실패했어요. 잠시 후 다시 시도해 주세요.');
      }

      const updatedItem = body.item;
      setBookings((current) =>
        current.map((booking) => (booking.id === updatedItem.id ? updatedItem : booking)),
      );
      setAlternativeResponseSuccess(response === 'accepted' ? '제안을 수락하여 예약 일정이 변경되었습니다.' : '제안을 거절하였습니다.');
    } catch (error) {
      setAlternativeResponseError(error instanceof Error ? error.message : '처리에 실패했어요.');
    } finally {
      setIsAlternativeSubmitting(false);
    }
  };

  if (!authReady) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.spinner} />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <button type="button" className={styles.backButton} onClick={() => router.push('/my')}>
            ←
          </button>
          <h1 className={styles.headerTitle}>{t('beauty_bookings.page_title')}</h1>
        </header>
        <div className={styles.loginCard}>
          <div className={styles.loginIcon}>🔐</div>
          <h2 className={styles.loginTitle}>{t('beauty_bookings.login_title')}</h2>
          <p className={styles.loginText}>{t('beauty_bookings.login_text')}</p>
          <div className={styles.loginActions}>
            <button type="button" className={styles.primaryButton} onClick={() => router.push('/auth')}>
              {t('beauty_bookings.login_action')}
            </button>
            <button type="button" className={styles.secondaryButton} onClick={() => router.push('/my')}>
              {t('beauty_bookings.back_to_my')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button type="button" className={styles.backButton} onClick={() => router.push('/my')}>
          ←
        </button>
        <h1 className={styles.headerTitle}>{t('beauty_bookings.page_title')}</h1>
      </header>

      <main className={styles.content}>
        <section className={styles.heroCard}>
          <p className={styles.eyebrow}>{t('beauty_bookings.hero_eyebrow')}</p>
          <h2 className={styles.heroTitle}>{t('beauty_bookings.hero_title')}</h2>
          <p className={styles.heroText}>
            {t('beauty_bookings.hero_text')}
          </p>
        </section>

        {deepLinkApplied && (
          <div style={{ 
            position: 'fixed', 
            top: 100, 
            left: '50%', 
            transform: 'translateX(-50%)', 
            zIndex: 1000,
            background: '#7c3aed',
            color: 'white',
            padding: '10px 20px',
            borderRadius: 99,
            fontSize: '0.88rem',
            fontWeight: 700,
            boxShadow: '0 8px 16px rgba(124, 58, 237, 0.4)',
            animation: 'deepLinkToast 3.5s forwards',
            pointerEvents: 'none',
            whiteSpace: 'nowrap'
          }}>
            {t('beauty_bookings.deeplink_toast')}
            <style>{`
              @keyframes deepLinkToast {
                0% { opacity: 0; transform: translate(-50%, -20px); }
                10% { opacity: 1; transform: translate(-50%, 0); }
                90% { opacity: 1; transform: translate(-50%, 0); }
                100% { opacity: 0; transform: translate(-50%, -20px); }
              }
            `}</style>
          </div>
        )}

        <section className={styles.tabBar} aria-label={t('beauty_bookings.tab_aria')}>
          {TAB_OPTIONS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`${styles.tabButton} ${activeTab === tab.id ? styles.tabButtonActive : ''}`}
              onClick={() => setActiveTab(tab.id)}
              aria-pressed={activeTab === tab.id}
            >
              {tab.label}
            </button>
          ))}
        </section>

        <div className={styles.layout}>
          <section className={styles.listSection}>
            {loadError ? <div className={styles.errorState}>{loadError}</div> : null}
            {loading ? <div className={styles.emptyState}>{t('beauty_bookings.loading')}</div> : null}
            {!loading && !loadError && filteredBookings.length === 0 ? (
              <div className={styles.emptyState}>
                {t('beauty_bookings.empty')}
              </div>
            ) : null}

            {!loading && filteredBookings.length > 0 ? (
              <div className={styles.cardList}>
                {filteredBookings.map((booking) => (
                  <button
                    key={booking.id}
                    type="button"
                    className={`${styles.bookingCard} ${selectedBookingId === booking.id ? styles.bookingCardActive : ''}`}
                    onClick={() => handleSelectBooking(booking.id)}
                    aria-pressed={selectedBookingId === booking.id}
                  >
                    <div className={styles.cardTop}>
                      <span className={`${styles.statusBadge} ${getStatusToneClass(booking.status)}`}>
                        {STATUS_LABELS[booking.status]}
                      </span>
                      <span className={styles.createdAt}>{formatDateTimeLabel(booking.createdAt, i18n.language)}</span>
                    </div>
                    <h3 className={styles.storeName}>{booking.storeName}</h3>
                     <p className={styles.bookingMeta}>
                       {getCategoryLabel(booking.beautyCategory)} ·{' '}
                       {formatDateLabel(booking.bookingDate, i18n.language)} {booking.bookingTime}
                     </p>
                    <dl className={styles.cardInfoList}>
                      <div>
                        <dt>{t('beauty_bookings.card_primary_service')}</dt>
                        <dd>{booking.primaryServiceName}</dd>
                      </div>
                      <div>
                        <dt>{t('beauty_bookings.card_estimated_price')}</dt>
                        <dd>{formatPrice(booking.totalPrice, i18n.language, t)}</dd>
                      </div>
                    </dl>
                     <div className={styles.cardFooter}>
                       <span className={styles.languagePill}>
                         {getLangLabel(booking.communicationLanguage)}
                       </span>
                       <span className={styles.statusHint}>{STATUS_DESCRIPTIONS[booking.status]}</span>
                     </div>
                  </button>
                ))}
              </div>
            ) : null}
          </section>

          <section ref={detailRef} className={styles.detailSection}>
            {!selectedBooking ? (
              <div className={styles.emptyState}>{t('beauty_bookings.select_prompt')}</div>
            ) : (
              <article className={styles.detailCard}>
                <div className={styles.detailHeader}>
                  <div>
                    <p className={styles.eyebrow}>Booking Detail</p>
                    <h3 className={styles.detailTitle}>{selectedBooking.storeName}</h3>
                    <p className={styles.detailSub}>
                      {formatDateLabel(selectedBooking.bookingDate, i18n.language)} {selectedBooking.bookingTime}
                    </p>
                  </div>
                  <span className={`${styles.statusBadge} ${getStatusToneClass(selectedBooking.status)}`}>
                    {STATUS_LABELS[selectedBooking.status]}
                  </span>
                </div>

                <div className={styles.summaryGrid}>
                   <div className={styles.summaryItem}>
                     <span>{t('beauty_bookings.detail_category')}</span>
                     <strong>{getCategoryLabel(selectedBooking.beautyCategory)}</strong>
                   </div>
                   <div className={styles.summaryItem}>
                     <span>{t('beauty_bookings.detail_designer')}</span>
                     <strong>{selectedBooking.designerName ?? t('beauty_bookings.detail_designer_default')}</strong>
                   </div>
                    <div className={styles.summaryItem}>
                      <span>{t('beauty_bookings.detail_requested_at')}</span>
                      <strong>{formatDateTimeLabel(selectedBooking.createdAt, i18n.language)}</strong>
                    </div>
                   <div className={styles.summaryItem}>
                     <span>{t('beauty_bookings.detail_status')}</span>
                     <strong>{STATUS_DESCRIPTIONS[selectedBooking.status]}</strong>
                   </div>
                 </div>

                <section className={styles.timelineSection}>
                  <h4 className={styles.blockTitle}>{t('beauty_bookings.timeline_title')}</h4>
                  <div className={styles.timelineList}>
                    {TIMELINE_STEPS.map((step) => {
                      const stepState = getTimelineStepState(selectedBooking.status, step.id);
                      return (
                        <div
                          key={step.id}
                          className={`${styles.timelineItem} ${
                            stepState === 'done'
                              ? styles.timelineDone
                              : stepState === 'current'
                                ? styles.timelineCurrent
                                : stepState === 'optional'
                                  ? styles.timelineOptional
                                  : styles.timelinePending
                          }`}
                        >
                          <span className={styles.timelineDot} />
                          <span>{step.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </section>

                 {selectedBooking.status === 'change_requested' ? (
                   <section className={styles.cancelInfoCard}>
                     <h4 className={styles.blockTitle}>{t('beauty_bookings.change_request_title')}</h4>
                     <p className={styles.statusHint} style={{ marginBottom: 12 }}>{t('beauty_bookings.change_request_hint')}</p>
                     <dl className={styles.detailList}>
                        <div>
                          <dt>{t('beauty_bookings.change_request_time')}</dt>
                          <dd>{selectedBooking.changeRequestedAt ? formatDateTimeLabel(selectedBooking.changeRequestedAt, i18n.language) : t('beauty_bookings.change_request_time_empty')}</dd>
                        </div>
                       <div>
                         <dt>{t('beauty_bookings.change_request_reason')}</dt>
                         <dd>{selectedBooking.changeReason || t('beauty_bookings.change_request_reason_empty')}</dd>
                       </div>
                     </dl>
                   </section>
                 ) : null}

                 {selectedBooking.changeRequestStatus && selectedBooking.changeRequestStatus !== 'pending' ? (
                   <section className={styles.detailBlock} style={{ borderLeft: `4px solid ${selectedBooking.changeRequestStatus === 'approved' ? '#059669' : '#dc2626'}`, marginBottom: 16 }}>
                     <h4 className={styles.blockTitle}>{t('beauty_bookings.change_result_title')}</h4>
                     <dl className={styles.detailList}>
                       <div>
                         <dt>{t('beauty_bookings.change_result_status')}</dt>
                         <dd style={{ fontWeight: 700, color: selectedBooking.changeRequestStatus === 'approved' ? '#059669' : '#dc2626' }}>
                           {selectedBooking.changeRequestStatus === 'approved' ? t('beauty_bookings.change_result_approved') : t('beauty_bookings.change_result_rejected')}
                         </dd>
                       </div>
                      {selectedBooking.changeReviewNote && (
                        <div>
                          <dt>{t('beauty_bookings.alt_offer_admin_label')}</dt>
                          <dd style={{ background: '#f9fafb', padding: '8px 12px', borderRadius: 8, fontSize: '0.82rem' }}>
                            {selectedBooking.changeReviewNote}
                          </dd>
                        </div>
                      )}
                        <div>
                          <dt>{t('beauty_bookings.change_result_review_time')}</dt>
                          <dd>{selectedBooking.changeReviewedAt ? formatDateTimeLabel(selectedBooking.changeReviewedAt, i18n.language) : '-'}</dd>
                        </div>
                    </dl>
                  </section>
                ) : null}

                {selectedBooking.alternativeOfferStatus === 'offered' ? (
                  <section 
                    ref={alternativeOfferRef} 
                    className={styles.detailBlock} 
                    style={{ border: '2px solid #7c3aed', background: '#f5f3ff', borderRadius: 16, padding: 20, marginBottom: 20 }}
                  >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                         <span style={{ fontSize: '1.2rem' }}>📅</span>
                         <h4 className={styles.blockTitle} style={{ margin: 0, color: '#6d28d9' }}>{t('beauty_bookings.alt_offer_title')}</h4>
                      </div>
                      <p style={{ fontSize: '0.88rem', color: '#6d28d9', fontWeight: 600, marginBottom: 16 }}>
                         {t('beauty_bookings.alt_offer_desc')}
                      </p>

                      {selectedBooking.alternativeOfferNote && (
                        <div style={{ background: 'white', padding: '12px 16px', borderRadius: 12, marginBottom: 20, border: '1px solid #ddd6fe' }}>
                          <span style={{ fontSize: '0.7rem', color: '#7c3aed', fontWeight: 700, display: 'block', marginBottom: 4 }}>{t('beauty_bookings.alt_offer_admin_label')}</span>
                          <p style={{ margin: 0, fontSize: '0.85rem', color: '#4b5563', lineHeight: 1.5 }}>{translatedOfferNote}</p>
                        </div>
                      )}

                     <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                        {selectedBooking.alternativeOfferItems.map((item, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setSelectedOfferSlot(item)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '14px 16px',
                              borderRadius: 12,
                              border: `2px solid ${selectedOfferSlot === item ? '#7c3aed' : '#ede9fe'}`,
                              background: selectedOfferSlot === item ? '#f5f3ff' : 'white',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              textAlign: 'left'
                            }}
                          >
                            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                              {formatDateLabel(item.date, i18n.language)} {item.time}
                            </span>
                            <div style={{ 
                              width: 20, 
                              height: 20, 
                              borderRadius: '50%', 
                              border: `2px solid ${selectedOfferSlot === item ? '#7c3aed' : '#ddd6fe'}`,
                              background: selectedOfferSlot === item ? '#7c3aed' : 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              {selectedOfferSlot === item && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'white' }} />}
                            </div>
                          </button>
                        ))}
                     </div>

                     {alternativeResponseError && <p style={{ color: '#dc2626', fontSize: '0.82rem', marginBottom: 12 }}>{alternativeResponseError}</p>}
                     {alternativeResponseSuccess && <p style={{ color: '#059669', fontSize: '0.82rem', marginBottom: 12 }}>{alternativeResponseSuccess}</p>}

                     <div style={{ display: 'flex', gap: 8 }}>
                         <button
                           type="button"
                           onClick={() => handleResponseAlternative('accepted')}
                           disabled={isAlternativeSubmitting}
                           style={{
                             flex: 2,
                             padding: '14px',
                             background: '#7c3aed',
                             color: 'white',
                             border: 'none',
                             borderRadius: 12,
                             fontWeight: 700,
                             cursor: 'pointer'
                           }}
                         >
                           {isAlternativeSubmitting ? t('beauty_bookings.alt_offer_processing') : t('beauty_bookings.alt_offer_accept')}
                         </button>
                         <button
                           type="button"
                           onClick={() => handleResponseAlternative('rejected')}
                           disabled={isAlternativeSubmitting}
                           style={{
                             flex: 1,
                             padding: '14px',
                             background: 'white',
                             color: '#dc2626',
                             border: '1px solid #fecaca',
                             borderRadius: 12,
                             fontWeight: 600,
                             cursor: 'pointer'
                           }}
                         >
                           {t('beauty_bookings.alt_offer_reject')}
                         </button>
                     </div>
                  </section>
                ) : null}

                 {selectedBooking.alternativeOfferStatus !== 'none' && selectedBooking.alternativeOfferStatus !== 'offered' ? (
                   <section className={styles.detailBlock} style={{ borderLeft: `4px solid ${selectedBooking.alternativeOfferStatus === 'accepted' ? '#059669' : '#dc2626'}`, background: '#f9fafb', marginBottom: 20 }}>
                     <h4 className={styles.blockTitle} style={{ fontSize: '0.9rem' }}>{t('beauty_bookings.alt_offer_response_title')}</h4>
                     <p style={{ margin: 0, fontSize: '0.85rem' }}>
                        {selectedBooking.alternativeOfferStatus === 'accepted' ? t('beauty_bookings.alt_offer_accepted_result') : t('beauty_bookings.alt_offer_rejected_result')}
                        {selectedBooking.alternativeResponseAt && <span style={{ marginLeft: 8, color: '#6b7280', fontSize: '0.75rem' }}>({formatDateTimeLabel(selectedBooking.alternativeResponseAt, i18n.language)})</span>}
                     </p>
                   </section>
                 ) : null}

                 <div className={styles.detailGrid}>
                   <section className={styles.detailBlock}>
                     <h4 className={styles.blockTitle}>{t('beauty_bookings.service_info_title')}</h4>
                    <dl className={styles.detailList}>
                       <div>
                         <dt>{t('beauty_bookings.service_primary')}</dt>
                         <dd>{selectedBooking.primaryServiceName}</dd>
                       </div>
                       <div>
                         <dt>{t('beauty_bookings.service_addons')}</dt>
                         <dd>{selectedBooking.addOnNames.length ? selectedBooking.addOnNames.join(', ') : t('beauty_bookings.service_addons_empty')}</dd>
                       </div>
                       <div>
                         <dt>{t('beauty_bookings.service_region')}</dt>
                         <dd>{selectedBooking.region}</dd>
                       </div>
                    </dl>
                  </section>

                   <section className={styles.detailBlock}>
                     <h4 className={styles.blockTitle}>{t('beauty_bookings.price_title')}</h4>
                    <dl className={styles.detailList}>
                       <div>
                         <dt>{t('beauty_bookings.price_base')}</dt>
                         <dd>{formatPrice(selectedBooking.basePrice, i18n.language, t)}</dd>
                       </div>
                       <div>
                         <dt>{t('beauty_bookings.price_addon')}</dt>
                         <dd>{formatPrice(selectedBooking.addOnPrice, i18n.language, t)}</dd>
                       </div>
                       <div>
                         <dt>{t('beauty_bookings.price_surcharge')}</dt>
                         <dd>{formatPrice(selectedBooking.designerSurcharge, i18n.language, t)}</dd>
                       </div>
                       <div>
                         <dt>{t('beauty_bookings.price_total')}</dt>
                         <dd className={styles.priceEmphasis}>{formatPrice(selectedBooking.totalPrice, i18n.language, t)}</dd>
                       </div>
                    </dl>
                  </section>

                   <section className={styles.detailBlock}>
                     <h4 className={styles.blockTitle}>{t('beauty_bookings.request_title')}</h4>
                     <dl className={styles.detailList}>
                       <div>
                         <dt>{t('beauty_bookings.request_memo')}</dt>
                         <dd>{translatedRequest || t('beauty_bookings.request_memo_empty')}</dd>
                       </div>
                     </dl>
                   </section>

                   <section className={styles.detailBlock}>
                     <h4 className={styles.blockTitle}>{t('beauty_bookings.delivery_title')}</h4>
                    <dl className={styles.detailList}>
                       <div>
                        <dt>{t('beauty_bookings.delivery_lang')}</dt>
                        <dd>{getLangLabel(selectedBooking.communicationLanguage)}</dd>
                      </div>
                      <div>
                        <dt>{t('beauty_bookings.delivery_intent')}</dt>
                        <dd>{getIntentLabel(selectedBooking.communicationIntent)}</dd>
                      </div>
                    </dl>
                  </section>
                </div>

                 {selectedBooking.status === 'canceled' ? (
                   <section className={styles.cancelInfoCard}>
                     <h4 className={styles.blockTitle}>{t('beauty_bookings.cancel_info_title')}</h4>
                     <dl className={styles.detailList}>
                        <div>
                          <dt>{t('beauty_bookings.cancel_time')}</dt>
                          <dd>{selectedBooking.canceledAt ? formatDateTimeLabel(selectedBooking.canceledAt, i18n.language) : t('beauty_bookings.cancel_time_empty')}</dd>
                        </div>
                       <div>
                         <dt>{t('beauty_bookings.cancel_by')}</dt>
                         <dd>{selectedBooking.canceledBy === 'customer' ? t('beauty_bookings.cancel_by_customer') : selectedBooking.canceledBy === 'admin' ? t('beauty_bookings.cancel_by_admin') : t('beauty_bookings.cancel_by_unknown')}</dd>
                       </div>
                       <div>
                         <dt>{t('beauty_bookings.cancel_reason_label')}</dt>
                         <dd>{selectedBooking.cancelReason || t('beauty_bookings.cancel_reason_empty')}</dd>
                       </div>
                     </dl>
                   </section>
                 ) : null}

                 <section className={styles.messageSection}>
                   <div className={styles.messageCard}>
                     <span className={styles.messageLabel}>{t('beauty_bookings.message_korean')}</span>
                     <p className={styles.messageText}>{selectedBooking.koreanMessage}</p>
                   </div>
                   <div className={styles.messageCard}>
                     <span className={styles.messageLabel}>{t('beauty_bookings.message_localized')}</span>
                     <p className={styles.messageText}>{selectedBooking.localizedMessage}</p>
                   </div>
                 </section>

                 <section className={styles.cancelSection}>
                   <div className={styles.cancelHeader}>
                     <div>
                       <h4 className={styles.blockTitle}>{t('beauty_bookings.manage_title')}</h4>
                       <p className={styles.cancelText}>
                         {t('beauty_bookings.manage_desc')}
                       </p>
                     </div>
                    {canChangeSelectedBooking || canCancelSelectedBooking ? (
                      <div className={styles.actionButtonRow}>
                         {canChangeSelectedBooking && (
                           <button
                             type="button"
                             className={styles.secondaryActionButton}
                             onClick={() => {
                               setChangeSuccess(null);
                               setChangeError(null);
                               setIsChangePanelOpen((current) => !current);
                               setIsCancelPanelOpen(false);
                             }}
                           >
                             {t('beauty_bookings.action_change')}
                           </button>
                         )}
                         {canCancelSelectedBooking && (
                           <button
                             type="button"
                             className={styles.cancelButton}
                             onClick={() => {
                               setCancelSuccess(null);
                               setCancelError(null);
                               setIsCancelPanelOpen((current) => !current);
                               setIsChangePanelOpen(false);
                             }}
                           >
                             {t('beauty_bookings.action_cancel')}
                           </button>
                         )}
                      </div>
                    ) : (
                       <span className={styles.cancelDisabledNote}>{t('beauty_bookings.manage_disabled')}</span>
                    )}
                  </div>

                  {changeSuccess ? <div className={styles.successState}>{changeSuccess}</div> : null}
                  {changeError ? <div className={styles.errorState}>{changeError}</div> : null}
                  {cancelSuccess ? <div className={styles.successState}>{cancelSuccess}</div> : null}
                  {cancelError ? <div className={styles.errorState}>{cancelError}</div> : null}

                   {canChangeSelectedBooking && isChangePanelOpen ? (
                     <div className={styles.cancelPanel}>
                       <p className={styles.panelTitle}>{t('beauty_bookings.change_panel_title')}</p>
                       <textarea
                         className={styles.cancelTextarea}
                         value={changeReason}
                         onChange={(event) => setChangeReason(event.target.value)}
                         placeholder={t('beauty_bookings.change_placeholder')}
                       />
                       <div className={styles.cancelActionRow}>
                         <button
                           type="button"
                           className={styles.primaryActionButton}
                           onClick={() => void handleBookingChangeRequest()}
                           disabled={isChangeSubmitting}
                         >
                           {isChangeSubmitting ? t('beauty_bookings.change_processing') : t('beauty_bookings.change_submit')}
                         </button>
                         <button
                           type="button"
                           className={styles.cancelGhostButton}
                           onClick={() => setIsChangePanelOpen(false)}
                           disabled={isChangeSubmitting}
                         >
                           {t('beauty_bookings.change_close')}
                         </button>
                       </div>
                     </div>
                   ) : null}

                  {canCancelSelectedBooking && isCancelPanelOpen ? (
                    <div className={styles.cancelPanel}>
                      <div className={styles.cancelChipRow}>
                        {CANCEL_REASON_OPTIONS.map((reason) => (
                          <button
                            key={reason}
                            type="button"
                            className={`${styles.cancelChip} ${selectedCancelReason === reason ? styles.cancelChipActive : ''}`}
                            onClick={() => setSelectedCancelReason(reason)}
                            aria-pressed={selectedCancelReason === reason}
                          >
                            {reason}
                          </button>
                        ))}
                      </div>

                       <textarea
                         className={styles.cancelTextarea}
                         value={cancelDetails}
                         onChange={(event) => setCancelDetails(event.target.value)}
                         placeholder={t('beauty_bookings.cancel_details_placeholder')}
                       />
 
                       <div className={styles.cancelActionRow}>
                         <button
                           type="button"
                           className={styles.cancelConfirmButton}
                           onClick={() => void handleBookingCancel()}
                           disabled={isCancelSubmitting}
                         >
                           {isCancelSubmitting ? t('beauty_bookings.cancel_processing') : t('beauty_bookings.cancel_confirm')}
                         </button>
                         <button
                           type="button"
                           className={styles.cancelGhostButton}
                           onClick={() => {
                             setIsCancelPanelOpen(false);
                             setCancelError(null);
                           }}
                           disabled={isCancelSubmitting}
                         >
                           {t('beauty_bookings.change_close')}
                         </button>
                       </div>
                    </div>
                  ) : null}
                </section>
              </article>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export default function MyBeautyBookingsPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 36, height: 36, border: '3px solid #7c3aed', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      }
    >
      <MyBeautyBookingsContent />
    </Suspense>
  );
}
