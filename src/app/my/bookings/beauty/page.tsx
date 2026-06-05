'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

import { supabase } from '@/lib/supabaseClient';
import {
  isBeautyBookingCustomerCancelableStatus,
  isBeautyBookingCustomerChangeableStatus,
  type BeautyBookingAdminRecord,
} from '@/lib/bookings/beautyBookingAdmin.ts';
import { useBeautyTranslation } from '@/hooks/useBeautyTranslation';
import { PLATFORM_FEE_RATE, calculateRefund, type RefundCalculation } from '@/constants/refundPolicy';
import styles from './beauty-bookings.module.css';

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? '';

type BookingTabId = 'all' | 'active' | 'completed' | 'canceled';

const TIMELINE_STEP_IDS = ['requested', 'confirmed', 'completed', 'canceled'] as const;

function formatPrice(value: number, language: string, t: TFunction) {
  const locale = language === 'ko' ? 'ko-KR' : (language === 'ja' ? 'ja-JP' : 'en-US');
  const formatted = new Intl.NumberFormat(locale).format(value);
  const unit = t('beauty_explore.label_booking_unit');
  return language === 'ko' ? `${formatted}${unit}` : (language === 'ja' ? `${formatted}${unit}` : `${unit} ${formatted}`);
}

function formatDateLabel(value: string, language: string) {
  try {
    const locale = language === 'ko' ? 'ko-KR' : (language === 'ja' ? 'ja-JP' : 'en-US');
    return new Date(value).toLocaleDateString(locale, {
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
    const locale = language === 'ko' ? 'ko-KR' : (language === 'ja' ? 'ja-JP' : 'en-US');
    return new Date(value).toLocaleString(locale, {
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

function isStoreMatched(status: BeautyBookingAdminRecord['status']): boolean {
  return status === 'confirmed' || status === 'completed';
}

function buildCategoryTitle(category: string | null | undefined, serviceName: string | null | undefined): string {
  const parts = [category, serviceName].filter((part) => {
    return part && part !== 'null' && part !== 'undefined' && part.trim() !== '';
  });
  if (parts.length === 0) {
    return ""; // Fallback will be handled by translation key or empty UI
  }
  return parts.join(' · ');
}

function isValidDisplayValue(val: string | null | undefined): boolean {
  if (!val) return false;
  const text = val.trim().toLowerCase();
  if (!text || ['asd', 'asdf', 'test', 'sample', 'qwe', '123', '1234', 'null', 'undefined'].includes(text)) {
    return false;
  }
  return true;
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
  const [cancelRefundConsented, setCancelRefundConsented] = useState(false);

  const [isChangePanelOpen, setIsChangePanelOpen] = useState(false);
  const [changeReason, setChangeReason] = useState('');
  const [changeError, setChangeError] = useState<string | null>(null);
  const [changeSuccess, setChangeSuccess] = useState<string | null>(null);
  const [isChangeSubmitting, setIsChangeSubmitting] = useState(false);
  const [isMobileDetailVisible, setIsMobileDetailVisible] = useState(false);
  
  // Alternative offer states
  const [selectedOfferSlot, setSelectedOfferSlot] = useState<{ date: string; time: string } | null>(null);
  const [isAlternativeSubmitting, setIsAlternativeSubmitting] = useState(false);
  const [alternativeResponseError, setAlternativeResponseError] = useState<string | null>(null);
  const [alternativeResponseSuccess, setAlternativeResponseSuccess] = useState<string | null>(null);

  // Quote response states
  const [isQuoteResponding, setIsQuoteResponding] = useState(false);
  const [quoteRespondError, setQuoteRespondError] = useState<string | null>(null);
  const [quoteRespondSuccess, setQuoteRespondSuccess] = useState<string | null>(null);

  // PayPal payment states
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

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
          setLoadError(t('beauty_bookings.error_login'));
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
              ? t('beauty_bookings.error_load_401')
              : body?.error ?? t('beauty_bookings.error_load'),
          );
        }

        if (!cancelled) {
          setBookings(body.items);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : t('beauty_bookings.error_load'));
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
  }, [authReady, isLoggedIn, t]);

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
          setIsMobileDetailVisible(true);
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

  const cancelRefundCalc = useMemo((): RefundCalculation | null => {
    if (!selectedBooking || !isCancelPanelOpen) return null;
    const serviceFee = selectedBooking.basePrice + selectedBooking.addOnPrice + selectedBooking.designerSurcharge;
    const platformFee = Math.max(selectedBooking.totalPrice - serviceFee, 0);
    if (selectedBooking.totalPrice === 0) return null;
    return calculateRefund({
      appointmentDate: new Date(`${selectedBooking.bookingDate}T00:00:00+09:00`),
      cancelDate: new Date(),
      serviceFee,
      platformFee,
    });
  }, [selectedBooking, isCancelPanelOpen]);

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
    setCancelRefundConsented(false);

    setIsChangePanelOpen(false);
    setChangeReason('');
    setChangeError(null);
    setChangeSuccess(null);
    setIsChangeSubmitting(false);

    setSelectedOfferSlot(null);
    setAlternativeResponseError(null);
    setAlternativeResponseSuccess(null);
    setIsAlternativeSubmitting(false);

    setIsQuoteResponding(false);
    setQuoteRespondError(null);
    setQuoteRespondSuccess(null);

    setPaymentSuccess(null);
    setPaymentError(null);
  }, [selectedBookingId]);

  useEffect(() => {
    setIsMobileDetailVisible(false);
  }, [activeTab]);

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
    setIsMobileDetailVisible(true);
    window.setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 60);
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
      setCancelSuccess(t('beauty_bookings.cancel_success'));
      setIsCancelPanelOpen(false);

      if (activeTab === 'active') {
        setActiveTab('all');
        setIsMobileDetailVisible(false);
      }
    } catch (error) {
      setCancelError(
        error instanceof Error ? error.message : t('beauty_bookings.error_cancel'),
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
      setChangeError(t('beauty_bookings.error_change_reason'));
      return;
    }

    const accessToken = await getCustomerAccessToken();

    if (!accessToken) {
      setChangeError(t('beauty_bookings.error_login'));
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
          body?.error ?? t('beauty_bookings.error_change'),
        );
      }

      const updatedItem = body.item;
      setBookings((current) =>
        current.map((booking) => (booking.id === updatedItem.id ? updatedItem : booking)),
      );
      setChangeSuccess(t('beauty_bookings.change_success'));
      setIsChangePanelOpen(false);
    } catch (error) {
      setChangeError(
        error instanceof Error ? error.message : t('beauty_bookings.error_change'),
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
      setAlternativeResponseError(t('beauty_bookings.alt_slot_select_error'));
      return;
    }

    const accessToken = await getCustomerAccessToken();
    if (!accessToken) {
      setAlternativeResponseError(t('beauty_bookings.error_login'));
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
        throw new Error(body?.error ?? t('common.errors.processing_failed'));
      }

      const updatedItem = body.item;
      setBookings((current) =>
        current.map((booking) => (booking.id === updatedItem.id ? updatedItem : booking)),
      );
      setAlternativeResponseSuccess(response === 'accepted' 
        ? t('beauty_bookings.alt_response_accepted') 
        : t('beauty_bookings.alt_response_rejected'));
    } catch (error) {
      setAlternativeResponseError(error instanceof Error ? error.message : t('beauty_bookings.error_alt'));
    } finally {
      setIsAlternativeSubmitting(false);
    }
  };

  const handleRespondQuote = async (response: 'accepted' | 'rejected') => {
    if (!selectedBooking || isQuoteResponding) return;

    const accessToken = await getCustomerAccessToken();
    if (!accessToken) {
      setQuoteRespondError(t('beauty_bookings.error_login'));
      return;
    }

    setIsQuoteResponding(true);
    setQuoteRespondError(null);
    setQuoteRespondSuccess(null);

    try {
      const apiResponse = await fetch(`/api/bookings/beauty/mine/${selectedBooking.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ action: 'respond_quote', response }),
      });

      const body = (await apiResponse.json()) as { ok?: boolean; item?: BeautyBookingAdminRecord; error?: string };

      if (!apiResponse.ok || body?.ok !== true || !body.item) {
        throw new Error(body?.error ?? t('beauty_bookings.quote_error_respond'));
      }

      setBookings((current) =>
        current.map((booking) => (booking.id === body.item!.id ? body.item! : booking)),
      );
      setQuoteRespondSuccess(
        response === 'accepted'
          ? t('beauty_bookings.quote_accepted_message')
          : t('beauty_bookings.quote_rejected_message'),
      );
    } catch (error) {
      setQuoteRespondError(error instanceof Error ? error.message : t('beauty_bookings.quote_error_respond'));
    } finally {
      setIsQuoteResponding(false);
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

        {!isMobileDetailVisible ? (
          <>

            
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
                        </div>
                        <h3 className={styles.storeName}>
                          {!isStoreMatched(booking.status)
                            ? buildCategoryTitle(getCategoryLabel(booking.beautyCategory), booking.primaryServiceName) || t('my_page.bookings.pending_service')
                            : booking.storeName}
                        </h3>
                        <p className={styles.bookingMeta}>
                          {formatDateLabel(booking.bookingDate, i18n.language)} {booking.bookingTime}
                        </p>
                        <div className={styles.cardFooter} style={{ borderTop: 'none', paddingTop: 0, marginTop: 4 }}>
                          <span className={styles.statusHint} style={{ color: !isStoreMatched(booking.status) ? '#db2777' : 'inherit', fontWeight: 500 }}>
                            {!isStoreMatched(booking.status) ? t('my_page.bookings.matching_status') : STATUS_DESCRIPTIONS[booking.status]}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : null}
              </section>
            </div>
          </>
        ) : (
          <div className={styles.layout}>
            <section ref={detailRef} className={styles.detailSection}>
              <button 
                type="button" 
                className={styles.detailCloseButton}
                onClick={() => {
                  setIsMobileDetailVisible(false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                ← {t('common.actions.back_to_list')}
              </button>
              {!selectedBooking ? (
                <div className={styles.emptyState}>{t('beauty_bookings.select_prompt')}</div>
              ) : (
              <article className={styles.detailCard}>
                <div className={styles.detailHeader}>
                  <div>
                    <p className={styles.eyebrow}>
                      {t('beauty_bookings.hero_eyebrow')} · {t('beauty_bookings.detail_booking_id')}: {selectedBooking.id.substring(0, 8).toUpperCase()}
                    </p>
                    <h3 className={styles.detailTitle}>
                      {!isStoreMatched(selectedBooking.status)
                        ? buildCategoryTitle(getCategoryLabel(selectedBooking.beautyCategory), selectedBooking.primaryServiceName)
                        : selectedBooking.storeName}
                    </h3>
                    <p className={styles.detailSub}>
                      {formatDateLabel(selectedBooking.bookingDate, i18n.language)} {selectedBooking.bookingTime}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    <span className={`${styles.statusBadge} ${getStatusToneClass(selectedBooking.status)}`}>
                      {STATUS_LABELS[selectedBooking.status]}
                    </span>
                    {selectedBooking.status === 'confirmed' && (
                      <button
                        type="button"
                        className={styles.primaryActionButton}
                        onClick={() => router.push(`/interpreter?storeName=${encodeURIComponent(selectedBooking.storeName)}&serviceName=${encodeURIComponent(selectedBooking.primaryServiceName ?? '')}`)}
                        style={{ minHeight: '32px', height: '32px', padding: '0 10px', fontSize: '0.72rem', whiteSpace: 'nowrap' }}
                      >
                        🎙️ {t('beauty_bookings.open_interpreter')}
                      </button>
                    )}
                  </div>
                </div>

                <div className={styles.summaryGrid}>
                   <div className={styles.summaryItem}>
                     <span>{t('beauty_bookings.detail_status')}</span>
                     <strong>{STATUS_LABELS[selectedBooking.status]}</strong>
                   </div>
                   <div className={styles.summaryItem}>
                     <span>{t('beauty_bookings.detail_category_services')}</span>
                     <strong>{buildCategoryTitle(getCategoryLabel(selectedBooking.beautyCategory), selectedBooking.primaryServiceName)}</strong>
                   </div>
                   <div className={styles.summaryItem} style={{ gridColumn: '1 / -1' }}>
                     <span>{t('beauty_bookings.detail_requested_time')}</span>
                     <strong>{formatDateLabel(selectedBooking.bookingDate, i18n.language)} {selectedBooking.bookingTime}</strong>
                   </div>
                 </div>

                 <div className={styles.summaryGrid} style={{ marginTop: 12 }}>
                   <div className={styles.summaryItem} style={{ gridColumn: '1 / -1' }}>
                     <span>{t('beauty_bookings.detail_shop_status')}</span>
                     <strong style={{ color: !isStoreMatched(selectedBooking.status) ? '#db2777' : 'inherit' }}>
                       {!isStoreMatched(selectedBooking.status)
                         ? t('my_page.bookings.matching_status')
                         : selectedBooking.storeName}
                     </strong>
                     <p className={styles.statusHint} style={{ marginTop: 4 }}>
                       {STATUS_DESCRIPTIONS[selectedBooking.status]}
                     </p>
                     {selectedBooking.status === 'confirmed' && (
                       <a
                         href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selectedBooking.storeName} ${selectedBooking.region} Korea`)}`}
                         target="_blank"
                         rel="noopener noreferrer"
                         className={styles.secondaryActionButton}
                         style={{ 
                           display: 'inline-flex', 
                           alignItems: 'center', 
                           justifyContent: 'center', 
                           marginTop: 10,
                           textDecoration: 'none',
                           width: 'auto',
                           gap: 6
                         }}
                       >
                         📍 {t('beauty_bookings.action_view_on_map')}
                       </a>
                     )}
                   </div>
                   {isValidDisplayValue(translatedRequest) && (
                     <div className={styles.summaryItem} style={{ gridColumn: '1 / -1' }}>
                       <span>{t('beauty_bookings.detail_request_info')}</span>
                       <strong>{translatedRequest}</strong>
                       <div style={{ marginTop: 8 }}>
                         <span className={styles.languagePill}>{getLangLabel(selectedBooking.communicationLanguage)}</span>
                       </div>
                     </div>
                   )}
                 </div>

                {selectedBooking.quoteStatus !== null && (() => {
                  const qs = selectedBooking.quoteStatus;
                  const isExpiredByTime =
                    qs === 'pending' &&
                    selectedBooking.quoteExpiresAt !== null &&
                    new Date(selectedBooking.quoteExpiresAt) < new Date();

                  const borderColor =
                    qs === 'accepted' ? '#059669' :
                    qs === 'rejected' ? '#dc2626' :
                    '#7c3aed';

                  return (
                    <section
                      style={{
                        border: `2px solid ${borderColor}`,
                        borderRadius: 16,
                        padding: 20,
                        marginBottom: 20,
                        background: qs === 'accepted' ? '#f0fdf4' : qs === 'rejected' ? '#fff1f2' : '#f5f3ff',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                        <span style={{ fontSize: '1.2rem' }}>📋</span>
                        <h4 className={styles.blockTitle} style={{ margin: 0, color: borderColor }}>
                          {t('beauty_bookings.quote_section_title')}
                        </h4>
                        <span style={{
                          marginLeft: 'auto',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '2px 10px',
                          borderRadius: 99,
                          background: borderColor,
                          color: 'white',
                        }}>
                          {qs === 'pending' ? t('beauty_bookings.quote_status_pending') :
                           qs === 'accepted' ? t('beauty_bookings.quote_status_accepted') :
                           qs === 'rejected' ? t('beauty_bookings.quote_status_rejected') :
                           t('beauty_bookings.quote_status_expired')}
                        </span>
                      </div>

                      {isExpiredByTime && (
                        <p style={{ fontSize: '0.8rem', color: '#b45309', background: '#fef3c7', borderRadius: 8, padding: '6px 12px', marginBottom: 12 }}>
                          ⚠ {t('beauty_bookings.quote_expired_notice')}
                        </p>
                      )}

                      <dl className={styles.detailList}>
                        {selectedBooking.quoteShopName && (
                          <div>
                            <dt>{t('beauty_bookings.quote_shop_name')}</dt>
                            <dd style={{ fontWeight: 700 }}>{selectedBooking.quoteShopName}</dd>
                          </div>
                        )}
                        {selectedBooking.quoteShopAddress && (
                          <div>
                            <dt>{t('beauty_bookings.quote_shop_address')}</dt>
                            <dd>{selectedBooking.quoteShopAddress}</dd>
                          </div>
                        )}
                        {selectedBooking.quoteServiceName && (
                          <div>
                            <dt>{t('beauty_bookings.quote_service_name')}</dt>
                            <dd>{selectedBooking.quoteServiceName}</dd>
                          </div>
                        )}
                        {(selectedBooking.quoteDate || selectedBooking.quoteTime) && (
                          <div>
                            <dt>{t('beauty_bookings.quote_date_time')}</dt>
                            <dd>
                              {selectedBooking.quoteDate ? formatDateLabel(selectedBooking.quoteDate, i18n.language) : ''}
                              {selectedBooking.quoteTime ? ` ${selectedBooking.quoteTime}` : ''}
                            </dd>
                          </div>
                        )}
                        {selectedBooking.quoteTotalPrice !== null && (
                          <div>
                            <dt>{t('beauty_bookings.quote_total_price')}</dt>
                            <dd style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                              {new Intl.NumberFormat(i18n.language === 'ko' ? 'ko-KR' : 'en-US').format(selectedBooking.quoteTotalPrice)}
                              {selectedBooking.quoteCurrency ? ` ${selectedBooking.quoteCurrency}` : ''}
                            </dd>
                          </div>
                        )}
                        {selectedBooking.quoteNote && (
                          <div style={{ gridColumn: '1 / -1' }}>
                            <dt>{t('beauty_bookings.quote_note')}</dt>
                            <dd style={{ background: 'white', padding: '8px 12px', borderRadius: 8, fontSize: '0.85rem', lineHeight: 1.5 }}>
                              {selectedBooking.quoteNote}
                            </dd>
                          </div>
                        )}
                        {selectedBooking.quoteRefundPolicy && (
                          <div style={{ gridColumn: '1 / -1' }}>
                            <dt>{t('beauty_bookings.quote_refund_policy')}</dt>
                            <dd style={{ background: 'white', padding: '8px 12px', borderRadius: 8, fontSize: '0.82rem', lineHeight: 1.5, color: '#374151' }}>
                              {selectedBooking.quoteRefundPolicy}
                            </dd>
                          </div>
                        )}
                        {selectedBooking.quoteExpiresAt && (
                          <div>
                            <dt>{t('beauty_bookings.quote_expires_at')}</dt>
                            <dd style={{ color: isExpiredByTime ? '#b45309' : 'inherit' }}>
                              {formatDateTimeLabel(selectedBooking.quoteExpiresAt, i18n.language)}
                            </dd>
                          </div>
                        )}
                      </dl>

                      {qs === 'pending' && !isExpiredByTime && (
                        <>
                          {quoteRespondError && (
                            <p style={{ color: '#dc2626', fontSize: '0.82rem', margin: '12px 0 0' }}>{quoteRespondError}</p>
                          )}
                          {quoteRespondSuccess && (
                            <p style={{ color: '#059669', fontSize: '0.82rem', margin: '12px 0 0' }}>{quoteRespondSuccess}</p>
                          )}
                          {!quoteRespondSuccess && (
                            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                              <button
                                type="button"
                                onClick={() => void handleRespondQuote('accepted')}
                                disabled={isQuoteResponding}
                                style={{
                                  flex: 2,
                                  padding: '14px',
                                  background: '#7c3aed',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: 12,
                                  fontWeight: 700,
                                  cursor: isQuoteResponding ? 'not-allowed' : 'pointer',
                                  opacity: isQuoteResponding ? 0.7 : 1,
                                }}
                              >
                                {isQuoteResponding ? t('beauty_bookings.quote_processing') : t('beauty_bookings.quote_action_accept')}
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleRespondQuote('rejected')}
                                disabled={isQuoteResponding}
                                style={{
                                  flex: 1,
                                  padding: '14px',
                                  background: 'white',
                                  color: '#dc2626',
                                  border: '1px solid #fecaca',
                                  borderRadius: 12,
                                  fontWeight: 600,
                                  cursor: isQuoteResponding ? 'not-allowed' : 'pointer',
                                  opacity: isQuoteResponding ? 0.7 : 1,
                                }}
                              >
                                {t('beauty_bookings.quote_action_reject')}
                              </button>
                            </div>
                          )}
                        </>
                      )}

                      {qs === 'accepted' && (
                        <>
                          <p style={{ marginTop: 14, fontSize: '0.88rem', color: '#065f46', fontWeight: 600, background: 'white', padding: '10px 14px', borderRadius: 10 }}>
                            ✅ {t('beauty_bookings.quote_accepted_message')}
                          </p>

                          {/* PayPal 결제 영역 */}
                          {selectedBooking.paymentStatus === 'paid' ? (
                            <p style={{ marginTop: 12, fontSize: '0.88rem', color: '#065f46', fontWeight: 700, background: '#dcfce7', padding: '10px 14px', borderRadius: 10 }}>
                              💳 {t('beauty_bookings.payment_status_paid')} · {t('beauty_bookings.payment_success')}
                            </p>
                          ) : (
                            selectedBooking.quoteCurrency === 'KRW' &&
                            selectedBooking.quoteTotalPrice !== null &&
                            PAYPAL_CLIENT_ID ? (
                              <div style={{ marginTop: 16 }}>
                                <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: 8 }}>
                                  {t('beauty_bookings.payment_section_title')} · {new Intl.NumberFormat('ko-KR').format(selectedBooking.quoteTotalPrice)} KRW
                                </p>
                                {paymentError && (
                                  <p style={{ color: '#dc2626', fontSize: '0.82rem', marginBottom: 8 }}>{paymentError}</p>
                                )}
                                <PayPalScriptProvider
                                  options={{
                                    clientId: PAYPAL_CLIENT_ID,
                                    currency: 'KRW',
                                    intent: 'capture',
                                  }}
                                >
                                  <PayPalButtons
                                    style={{ layout: 'vertical', height: 45 }}
                                    createOrder={async () => {
                                      const accessToken = await getCustomerAccessToken();
                                      const res = await fetch('/api/payments/paypal/create-order', {
                                        method: 'POST',
                                        headers: {
                                          'Content-Type': 'application/json',
                                          Authorization: `Bearer ${accessToken ?? ''}`,
                                        },
                                        body: JSON.stringify({ bookingId: selectedBooking.id }),
                                      });
                                      const data = (await res.json()) as { ok?: boolean; orderId?: string; error?: string };
                                      if (!res.ok || !data.ok || !data.orderId) {
                                        throw new Error(data.error ?? t('beauty_bookings.payment_error'));
                                      }
                                      return data.orderId;
                                    }}
                                    onApprove={async (data) => {
                                      const accessToken = await getCustomerAccessToken();
                                      const res = await fetch('/api/payments/paypal/capture-order', {
                                        method: 'POST',
                                        headers: {
                                          'Content-Type': 'application/json',
                                          Authorization: `Bearer ${accessToken ?? ''}`,
                                        },
                                        body: JSON.stringify({ bookingId: selectedBooking.id, orderId: data.orderID }),
                                      });
                                      const result = (await res.json()) as { ok?: boolean; error?: string };
                                      if (!res.ok || !result.ok) {
                                        setPaymentError(result.error ?? t('beauty_bookings.payment_error'));
                                        return;
                                      }
                                      setPaymentSuccess(t('beauty_bookings.payment_success'));
                                      setPaymentError(null);
                                      // 예약 목록 재조회
                                      const token = await getCustomerAccessToken();
                                      if (token) {
                                        const listRes = await fetch('/api/bookings/beauty/mine', {
                                          headers: { Authorization: `Bearer ${token}` },
                                          cache: 'no-store',
                                        });
                                        const listBody = (await listRes.json().catch(() => null)) as { ok?: boolean; items?: BeautyBookingAdminRecord[] } | null;
                                        if (listBody?.ok && Array.isArray(listBody.items)) {
                                          setBookings(listBody.items);
                                        }
                                      }
                                    }}
                                    onError={(err) => {
                                      console.error('[PayPal] error', err);
                                      setPaymentError(t('beauty_bookings.payment_error'));
                                    }}
                                  />
                                </PayPalScriptProvider>
                                {paymentSuccess && (
                                  <p style={{ color: '#059669', fontSize: '0.88rem', fontWeight: 600, marginTop: 10 }}>{paymentSuccess}</p>
                                )}
                              </div>
                            ) : null
                          )}
                        </>
                      )}

                      {qs === 'rejected' && (
                        <p style={{ marginTop: 14, fontSize: '0.88rem', color: '#991b1b', fontWeight: 600, background: 'white', padding: '10px 14px', borderRadius: 10 }}>
                          ❌ {t('beauty_bookings.quote_rejected_message')}
                        </p>
                      )}
                    </section>
                  );
                })()}

                <details className={styles.moreInfoDetails}>
                  <summary className={styles.moreInfoSummary}>{t('beauty_bookings.detail_more_info')} ▾</summary>
                  <div className={styles.detailsContentWrapper}>
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
                    </dl>
                  </section>

                   <section className={styles.detailBlock}>
                     <h4 className={styles.blockTitle}>{t('beauty_bookings.price_title')}</h4>
                    <dl className={styles.detailList}>
                       <div>
                         <dt>{t('beauty_bookings.price_base')}</dt>
                         <dd>{(!isStoreMatched(selectedBooking.status) && selectedBooking.basePrice === 0) ? '-' : formatPrice(selectedBooking.basePrice, i18n.language, t)}</dd>
                       </div>
                       <div>
                         <dt>{t('beauty_bookings.price_addon')}</dt>
                         <dd>{(!isStoreMatched(selectedBooking.status) && selectedBooking.addOnPrice === 0) ? '-' : formatPrice(selectedBooking.addOnPrice, i18n.language, t)}</dd>
                       </div>
                       <div>
                         <dt>{t('beauty_bookings.price_surcharge')}</dt>
                         <dd>{(!isStoreMatched(selectedBooking.status) && selectedBooking.designerSurcharge === 0) ? '-' : formatPrice(selectedBooking.designerSurcharge, i18n.language, t)}</dd>
                       </div>
                       <div>
                         <dt>{t('beauty_bookings.price_total')}</dt>
                         <dd className={styles.priceEmphasis}>
                           {(!isStoreMatched(selectedBooking.status) && selectedBooking.totalPrice === 0)
                             ? t('beauty_bookings.price_pending_notice')
                             : formatPrice(selectedBooking.totalPrice, i18n.language, t)}
                         </dd>
                       </div>
                    </dl>
                  </section>

                   {/* removed redundant request memo block */}

                   {/* removed redundant delivery details block */}
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

                 {(isValidDisplayValue(selectedBooking.koreanMessage) || isValidDisplayValue(selectedBooking.localizedMessage)) && (
                   <section className={styles.messageSection}>
                     {isValidDisplayValue(selectedBooking.koreanMessage) && (
                       <div className={styles.messageCard}>
                         <span className={styles.messageLabel}>{t('beauty_bookings.message_korean')}</span>
                         <p className={styles.messageText}>{selectedBooking.koreanMessage}</p>
                       </div>
                     )}
                     {isValidDisplayValue(selectedBooking.localizedMessage) && (
                       <div className={styles.messageCard}>
                         <span className={styles.messageLabel}>{t('beauty_bookings.message_localized')}</span>
                         <p className={styles.messageText}>{selectedBooking.localizedMessage}</p>
                       </div>
                     )}
                   </section>
                 )}
                  </div>
                </details>

                 {canChangeSelectedBooking || canCancelSelectedBooking ? (
                   <section className={styles.cancelSection}>
                      <details className={styles.moreInfoDetails} style={{ marginTop: 0 }}>
                        <summary className={styles.moreInfoSummary} style={{ background: 'transparent', border: 'none', color: '#6b7280', margin: 0, padding: 0 }}>{t('beauty_bookings.detail_manage_booking')} ▾</summary>
                        <div className={styles.actionButtonRow} style={{ marginTop: 16 }}>
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
                      </details>
                   </section>
                 ) : null}

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
                      {cancelRefundCalc ? (
                        <div className={styles.cancelRefundBreakdown}>
                          <p className={styles.cancelRefundBreakdownTitle}>
                            {t('beauty_bookings.cancel_days_until', { daysUntil: cancelRefundCalc.daysUntil, refundRate: cancelRefundCalc.refundRate })}
                          </p>
                          {!cancelRefundCalc.isRefundable && (
                            <p className={styles.cancelNoRefundWarning}>
                              {t('beauty_bookings.cancel_no_refund_warning')}
                            </p>
                          )}
                          <dl className={styles.cancelRefundDl}>
                            <div className={styles.cancelRefundRow}>
                              <dt>{t('beauty_bookings.cancel_service_fee')}</dt>
                              <dd>{formatPrice(cancelRefundCalc.refundAmount + cancelRefundCalc.penaltyAmount, i18n.language, t)}</dd>
                            </div>
                            {cancelRefundCalc.penaltyAmount > 0 && (
                              <div className={`${styles.cancelRefundRow} ${styles.cancelRefundDeduct}`}>
                                <dt>{t('beauty_bookings.cancel_penalty', { rate: 100 - cancelRefundCalc.refundRate })}</dt>
                                <dd>−{formatPrice(cancelRefundCalc.penaltyAmount, i18n.language, t)}</dd>
                              </div>
                            )}
                            <div className={`${styles.cancelRefundRow} ${styles.cancelRefundDeduct}`}>
                              <dt>{t('beauty_bookings.cancel_platform_fee_label')}</dt>
                              <dd>−{formatPrice(cancelRefundCalc.platformFee, i18n.language, t)}</dd>
                            </div>
                            <div className={`${styles.cancelRefundRow} ${styles.cancelRefundTotal}`}>
                              <dt>{t('beauty_bookings.cancel_total_refund')}</dt>
                              <dd className={cancelRefundCalc.isRefundable ? styles.cancelRefundAmountPositive : styles.cancelRefundAmountZero}>
                                {formatPrice(cancelRefundCalc.totalRefund, i18n.language, t)}
                              </dd>
                            </div>
                          </dl>
                        </div>
                      ) : (
                        <p className={styles.cancelRefundPolicyNote}>
                          {t('beauty_bookings.cancel_platform_fee_note', { rate: Math.round(PLATFORM_FEE_RATE * 100) })}
                        </p>
                      )}

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

                      <label className={styles.cancelConsentLabel}>
                        <input
                          type="checkbox"
                          className={styles.cancelConsentCheckbox}
                          checked={cancelRefundConsented}
                          onChange={(e) => setCancelRefundConsented(e.target.checked)}
                        />
                        <span>
                          {cancelRefundCalc?.isRefundable === false
                            ? t('beauty_bookings.cancel_consent_no_refund')
                            : cancelRefundCalc
                              ? t('beauty_bookings.cancel_consent_partial', {
                                  platformFeeRate: Math.round(PLATFORM_FEE_RATE * 100),
                                  penaltyRate: 100 - cancelRefundCalc.refundRate,
                                  platformFee: formatPrice(cancelRefundCalc.platformFee, i18n.language, t),
                                  penaltyAmount: formatPrice(cancelRefundCalc.penaltyAmount, i18n.language, t),
                                })
                              : t('beauty_bookings.cancel_consent_default')}
                        </span>
                      </label>

                      <div className={styles.cancelActionRow}>
                        <button
                          type="button"
                          className={styles.cancelConfirmButton}
                          onClick={() => void handleBookingCancel()}
                          disabled={isCancelSubmitting || !cancelRefundConsented}
                        >
                          {isCancelSubmitting ? t('beauty_bookings.cancel_processing') : t('beauty_bookings.cancel_confirm')}
                        </button>
                        <button
                          type="button"
                          className={styles.cancelGhostButton}
                          onClick={() => {
                            setIsCancelPanelOpen(false);
                            setCancelError(null);
                            setCancelRefundConsented(false);
                          }}
                          disabled={isCancelSubmitting}
                        >
                          {t('beauty_bookings.change_close')}
                        </button>
                      </div>
                    </div>
                   ) : null}
              </article>
            )}
            </section>
          </div>
        )}
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
