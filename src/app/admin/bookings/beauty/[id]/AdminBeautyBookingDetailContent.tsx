'use client';

import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import sharedStyles from '../../../admin.module.css';
import styles from '../beauty-bookings.module.css';
import { supabase } from '@/lib/supabaseClient';
import {
  BEAUTY_BOOKING_ALLOWED_TRANSITIONS,
  BEAUTY_BOOKING_OPERATOR_STATUS_LABELS,
  type BeautyBookingAdminRecord,
  type BeautyBookingAdminStatus,
  type BeautyBookingAlternativeOfferItem,
  type BeautyBookingOperatorStatus,
} from '@/lib/bookings/beautyBookingAdmin.ts';
import { type BeautyBookingNotificationRecord } from '@/lib/bookings/beautyNotificationServer.ts';

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

const BEAUTY_CATEGORY_ICONS: Record<string, string> = {
  hair: '✂',
  nail: '💅',
  esthetic: '✨',
  waxing: '🪒',
  makeup: '💄',
  lash: '👁',
};


type DetailResponse =
  | {
      ok?: boolean;
      item?: BeautyBookingAdminRecord;
      notifications?: BeautyBookingNotificationRecord[];
      error?: string;
    }
  | null;

type PatchResponse =
  | {
      ok?: boolean;
      item?: BeautyBookingAdminRecord;
      error?: string;
    }
  | null;

type DetailField = {
  label: string;
  value: ReactNode;
};

type Props = {
  bookingId: string;
};

type OperatorFormState = {
  operatorStatus: BeautyBookingOperatorStatus;
  internalNote: string;
  shopContacted: boolean;
  customerContacted: boolean;
  followUpNeeded: boolean;
  isSaving: boolean;
};

type AlternativeState = {
  slots: { date: string; time: string }[];
  note: string;
  isSubmitting: boolean;
  error: string | null;
};

type QuoteFormState = {
  shopName: string;
  shopAddress: string;
  serviceName: string;
  date: string;
  time: string;
  totalPrice: string;
  currency: string;
  note: string;
  expiresAt: string;
  isSubmitting: boolean;
  error: string | null;
};

type ImageModalState = {
  isLoading: boolean;
  error: string | null;
  activeImage: { url: string; title: string } | null;
};

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


function toDateInputValue(value: string | null | undefined): string {
  if (!value) return '';
  const match = value.match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : '';
}

function toTimeInputValue(value: string | null | undefined): string {
  if (!value) return '';
  const match = value.match(/^(\d{2}:\d{2})/);
  return match ? match[1] : '';
}

function toDateTimeLocalInputValue(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function dateTimeLocalInputToIso(value: string): string | null {
  if (!value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function mapBookingToQuoteFields(booking: BeautyBookingAdminRecord) {
  return {
    shopName: booking.quoteShopName ?? '',
    shopAddress: booking.quoteShopAddress ?? '',
    serviceName: booking.quoteServiceName ?? '',
    date: toDateInputValue(booking.quoteDate),
    time: toTimeInputValue(booking.quoteTime),
    totalPrice: booking.quoteTotalPrice !== null ? String(booking.quoteTotalPrice) : '',
    currency: booking.quoteCurrency ?? 'KRW',
    note: booking.quoteNote ?? '',
    expiresAt: toDateTimeLocalInputValue(booking.quoteExpiresAt),
  };
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

function DetailList({ items }: { items: DetailField[] }) {
  return (
    <dl className={styles.detailList}>
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function AdminBeautyBookingDetailContent({ bookingId }: Props) {
  const router = useRouter();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<BeautyBookingAdminRecord | null>(null);
  const selectedBookingRef = useRef<BeautyBookingAdminRecord | null>(null);
  const [notifications, setNotifications] = useState<BeautyBookingNotificationRecord[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<BeautyBookingAdminStatus | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [imageModal, setImageModal] = useState<ImageModalState>({
    isLoading: false,
    error: null,
    activeImage: null,
  });
  const [operatorForm, setOperatorForm] = useState<OperatorFormState>({
    operatorStatus: 'pending_assignment',
    internalNote: '',
    shopContacted: false,
    customerContacted: false,
    followUpNeeded: false,
    isSaving: false,
  });
  const [alternative, setAlternative] = useState<AlternativeState>({
    slots: [{ date: '', time: '' }],
    note: '',
    isSubmitting: false,
    error: null,
  });
  const [quoteForm, setQuoteForm] = useState<QuoteFormState>({
    shopName: '',
    shopAddress: '',
    serviceName: '',
    date: '',
    time: '',
    totalPrice: '',
    currency: 'KRW',
    note: '',
    expiresAt: '',
    isSubmitting: false,
    error: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const mobileWrapper = document.querySelector('.mobile-wrapper');
    mobileWrapper?.classList.add('admin-booking-detail-wide');
    return () => {
      mobileWrapper?.classList.remove('admin-booking-detail-wide');
    };
  }, []);

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

  const loadBooking = useCallback(
    async (showLoading = true) => {
      const accessToken = await getAdminAccessToken();

      if (!accessToken) {
        const message = '관리자 세션을 다시 확인해 주세요.';
        setLoadError(message);
        setActionError(message);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (showLoading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const response = await fetch(`/api/bookings/beauty/${bookingId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: 'no-store',
        });

        const body = (await response.json().catch(() => null)) as DetailResponse;

        if (!response.ok || body?.ok !== true || !body.item) {
          throw new Error(body?.error ?? '예약 상세 정보를 불러오지 못했어요.');
        }

        setSelectedBooking(body.item);
        setNotifications(Array.isArray(body.notifications) ? body.notifications : []);
        setLoadError(null);
      } catch (error) {
        const message = error instanceof Error ? error.message : '예약 상세 정보를 불러오지 못했어요.';

        if (showLoading || !selectedBookingRef.current) {
          setLoadError(message);
        } else {
          setActionError(message);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [bookingId],
  );

  useEffect(() => {
    selectedBookingRef.current = selectedBooking;
  }, [selectedBooking]);

  useEffect(() => {
    if (isAdmin) {
      void loadBooking();
    }
  }, [isAdmin, loadBooking]);

  useEffect(() => {
    if (!selectedBooking) {
      return;
    }

    setOperatorForm({
      operatorStatus: selectedBooking.operatorStatus,
      internalNote: selectedBooking.internalNote,
      shopContacted: selectedBooking.shopContacted,
      customerContacted: selectedBooking.customerContacted,
      followUpNeeded: selectedBooking.followUpNeeded,
      isSaving: false,
    });
    setAlternative({
      slots: selectedBooking.alternativeOfferItems.length > 0 ? selectedBooking.alternativeOfferItems : [{ date: '', time: '' }],
      note: selectedBooking.alternativeOfferNote,
      isSubmitting: false,
      error: null,
    });
    setQuoteForm({
      ...mapBookingToQuoteFields(selectedBooking),
      isSubmitting: false,
      error: null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBooking?.id]);

  const sendPatch = useCallback(
    async (payload: Record<string, unknown>, fallbackError: string) => {
      const accessToken = await getAdminAccessToken();

      if (!accessToken) {
        throw new Error('관리자 세션을 다시 확인해 주세요.');
      }

      const response = await fetch(`/api/bookings/beauty/${bookingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      const body = (await response.json().catch(() => null)) as PatchResponse;

      if (!response.ok || body?.ok !== true || !body.item) {
        throw new Error(body?.error ?? fallbackError);
      }

      return body.item;
    },
    [bookingId],
  );

  const selectedBookingHasImages = Boolean(
    selectedBooking &&
      (selectedBooking.hasCurrentImage ||
        selectedBooking.hasStyleImage ||
        selectedBooking.currentImageUrl ||
        selectedBooking.styleImageUrl),
  );

  const allowedTransitions = selectedBooking
    ? BEAUTY_BOOKING_ALLOWED_TRANSITIONS[selectedBooking.status] ?? []
    : [];

  const clearFeedback = () => {
    setActionError(null);
    setActionSuccess(null);
  };

  const notificationEntries = notifications.map((notification) => {
    const cooldownActive = Boolean(
      notification.last_resent_at &&
        Date.now() - new Date(notification.last_resent_at).getTime() < 5 * 60 * 1000,
    );

    return {
      notification,
      cooldownActive,
      resendDisabled: resendingId === notification.id || notification.resend_count >= 3 || cooldownActive,
    };
  });

  const handleViewImage = async (type: 'current' | 'style') => {
    if (!selectedBooking) {
      return;
    }

    setImageModal({
      isLoading: true,
      error: null,
      activeImage: null,
    });

    try {
      const accessToken = await getAdminAccessToken();

      if (!accessToken) {
        throw new Error('관리자 세션을 다시 확인해 주세요.');
      }

      const response = await fetch(`/api/bookings/beauty/images/signed-url?bookingId=${selectedBooking.id}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const body = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            images?: { imageType: 'current' | 'style'; signedUrl: string | null }[];
            error?: string;
          }
        | null;

      if (!response.ok || body?.ok !== true || !Array.isArray(body.images)) {
        throw new Error(body?.error ?? '이미지를 불러오지 못했어요.');
      }

      const imageResult = body.images.find((image) => image.imageType === type);

      if (!imageResult?.signedUrl) {
        throw new Error('해당 이미지를 찾을 수 없습니다.');
      }

      setImageModal({
        isLoading: false,
        error: null,
        activeImage: {
          url: imageResult.signedUrl,
          title: type === 'current' ? '현재 상태 이미지' : '스타일 참고 이미지',
        },
      });
    } catch (error) {
      setImageModal({
        isLoading: false,
        error: error instanceof Error ? error.message : '이미지를 불러오지 못했어요.',
        activeImage: null,
      });
    }
  };

  const handleStatusUpdate = async (nextStatus: BeautyBookingAdminStatus) => {
    if (!selectedBooking) {
      return;
    }

    clearFeedback();
    setPendingStatus(nextStatus);

    try {
      const item = await sendPatch({ status: nextStatus }, '예약 상태를 변경하지 못했어요.');
      setSelectedBooking(item);
      setActionSuccess('예약 상태를 업데이트했어요.');
      void loadBooking(false);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '예약 상태를 변경하지 못했어요.');
    } finally {
      setPendingStatus(null);
    }
  };

  const handleReviewChangeRequest = async (action: 'approved' | 'rejected') => {
    if (!selectedBooking) {
      return;
    }

    clearFeedback();
    setIsReviewing(true);

    try {
      const item = await sendPatch(
        {
          action,
          note: reviewNote,
        },
        '변경 요청을 처리하지 못했어요.',
      );
      setSelectedBooking(item);
      setReviewNote('');
      setActionSuccess(action === 'approved' ? '변경 요청을 승인했어요.' : '변경 요청을 반려했어요.');
      void loadBooking(false);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '변경 요청을 처리하지 못했어요.');
    } finally {
      setIsReviewing(false);
    }
  };

  const handleUpdateOperatorInfo = async () => {
    if (!selectedBooking) {
      return;
    }

    clearFeedback();
    setOperatorForm((current) => ({ ...current, isSaving: true }));

    try {
      const item = await sendPatch(
        {
          action: 'update_operator_info',
          operatorStatus: operatorForm.operatorStatus,
          internalNote: operatorForm.internalNote,
          shopContacted: operatorForm.shopContacted,
          customerContacted: operatorForm.customerContacted,
          followUpNeeded: operatorForm.followUpNeeded,
        },
        '관리자 처리 정보를 저장하지 못했어요.',
      );
      setSelectedBooking(item);
      setActionSuccess('관리자 처리 정보를 저장했어요.');
      void loadBooking(false);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '관리자 처리 정보를 저장하지 못했어요.');
    } finally {
      setOperatorForm((current) => ({ ...current, isSaving: false }));
    }
  };

  const handleAlternativeSlotChange = (index: number, field: 'date' | 'time', value: string) => {
    setAlternative((current) => ({
      ...current,
      error: null,
      slots: current.slots.map((slot, slotIndex) =>
        slotIndex === index ? { ...slot, [field]: value } : slot,
      ),
    }));
  };

  const handleAddAlternativeSlot = () => {
    setAlternative((current) => ({
      ...current,
      error: null,
      slots: current.slots.length >= 3 ? current.slots : [...current.slots, { date: '', time: '' }],
    }));
  };

  const handleRemoveAlternativeSlot = (index: number) => {
    setAlternative((current) => ({
      ...current,
      slots: current.slots.filter((_, slotIndex) => slotIndex !== index),
    }));
  };

  const handleOfferAlternative = async () => {
    if (!selectedBooking) {
      return;
    }

    const alternativeItems = alternative.slots.filter((slot) => slot.date.trim() && slot.time.trim()) as BeautyBookingAlternativeOfferItem[];

    if (alternativeItems.length === 0) {
      setAlternative((current) => ({
        ...current,
        error: '최소 한 개의 제안 일정이 필요합니다.',
      }));
      return;
    }

    clearFeedback();
    setAlternative((current) => ({
      ...current,
      isSubmitting: true,
      error: null,
    }));

    try {
      const item = await sendPatch(
        {
          action: 'offer_alternative',
          note: alternative.note,
          alternativeItems,
        },
        '대체 일정 제안을 전송하지 못했어요.',
      );
      setSelectedBooking(item);
      setActionSuccess('대체 일정 제안을 고객에게 전송했어요.');
      void loadBooking(false);
    } catch (error) {
      setAlternative((current) => ({
        ...current,
        error: error instanceof Error ? error.message : '대체 일정 제안을 전송하지 못했어요.',
      }));
    } finally {
      setAlternative((current) => ({
        ...current,
        isSubmitting: false,
      }));
    }
  };

  const handleSendQuote = async () => {
    if (!selectedBooking) return;

    if (!quoteForm.shopName.trim() || !quoteForm.date.trim() || !quoteForm.time.trim()) {
      setQuoteForm((c) => ({ ...c, error: '매장명, 제안 날짜, 제안 시간은 필수입니다.' }));
      return;
    }
    const parsedPrice = parseInt(quoteForm.totalPrice, 10);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setQuoteForm((c) => ({ ...c, error: '총 금액은 0 이상의 숫자여야 합니다.' }));
      return;
    }

    clearFeedback();
    setQuoteForm((c) => ({ ...c, isSubmitting: true, error: null }));

    try {
      const autoExpiry = (() => {
        const d = new Date();
        d.setDate(d.getDate() + 3);
        d.setHours(23, 59, 0, 0);
        return d.toISOString();
      })();

      const item = await sendPatch(
        {
          action: 'send_quote',
          quote: {
            quoteShopName: quoteForm.shopName.trim(),
            quoteShopAddress: quoteForm.shopAddress.trim(),
            quoteServiceName: quoteForm.serviceName.trim(),
            quoteDate: quoteForm.date,
            quoteTime: quoteForm.time,
            quoteTotalPrice: parsedPrice,
            quoteCurrency: quoteForm.currency.trim() || 'KRW',
            quoteNote: quoteForm.note.trim(),
            quoteExpiresAt: dateTimeLocalInputToIso(quoteForm.expiresAt) ?? autoExpiry,
          },
        },
        '예약 제안서를 저장하지 못했어요.',
      );
      setSelectedBooking(item);
      setQuoteForm((c) => ({
        ...c,
        ...mapBookingToQuoteFields(item),
        isSubmitting: false,
        error: null,
      }));
      setActionSuccess('예약 제안서를 저장/발송했어요.');
      void loadBooking(false);
    } catch (error) {
      setQuoteForm((c) => ({
        ...c,
        isSubmitting: false,
        error: error instanceof Error ? error.message : '예약 제안서를 저장하지 못했어요.',
      }));
    }
  };

  const handleResendNotification = async (notificationId: string) => {
    if (!selectedBooking) {
      return;
    }

    clearFeedback();
    setResendingId(notificationId);

    try {
      const item = await sendPatch(
        {
          action: 'resend_notification',
          notificationId,
        },
        '알림을 재전송하지 못했어요.',
      );
      setSelectedBooking(item);
      setActionSuccess('알림을 재전송했어요.');
      void loadBooking(false);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '알림을 재전송하지 못했어요.');
    } finally {
      setResendingId(null);
    }
  };

  const handleDeleteBooking = async () => {
    if (!selectedBooking) return;
    if (!window.confirm('취소된 예약을 영구 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) return;

    clearFeedback();
    setIsDeleting(true);

    try {
      const accessToken = await getAdminAccessToken();
      if (!accessToken) throw new Error('관리자 세션을 다시 확인해 주세요.');

      const response = await fetch(`/api/bookings/beauty/${selectedBooking.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const body = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;

      if (!response.ok || !body?.ok) {
        throw new Error(body?.error ?? '예약을 삭제하지 못했어요.');
      }

      router.push('/admin/bookings/beauty');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '예약을 삭제하지 못했어요.');
      setIsDeleting(false);
    }
  };

  if (isAdmin === null || (loading && !selectedBooking && !loadError)) {
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
          뷰티 예약 상세 화면은 관리자만 확인할 수 있습니다.
        </p>
        <button
          type="button"
          onClick={() => router.push('/admin/bookings/beauty')}
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
          예약 목록으로
        </button>
      </div>
    );
  }

  if (!selectedBooking) {
    return (
      <div className={sharedStyles.container}>
        <header className={sharedStyles.header}>
          <button
            type="button"
            onClick={() => router.push('/admin/bookings/beauty')}
            style={{
              background: 'none',
              border: 'none',
              padding: '4px 0',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
            }}
            aria-label="목록으로"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1 className={sharedStyles.headerTitle}>뷰티 예약 상세</h1>
          <div className={sharedStyles.headerActions}>
            <Link href="/admin/bookings/beauty" className={sharedStyles.headerNavButton}>
              <span className={sharedStyles.headerNavButtonFull}>예약 목록</span>
              <span className={sharedStyles.headerNavButtonShort}>목록</span>
            </Link>
            <Link href="/my" className={sharedStyles.headerNavButton}>
              <span className={sharedStyles.headerNavButtonFull}>마이페이지</span>
              <span className={sharedStyles.headerNavButtonShort}>마이</span>
            </Link>
            <span className={sharedStyles.adminBadge}>ADMIN</span>
          </div>
        </header>
        <div className={sharedStyles.content}>
          <div className={styles.errorState} style={{ marginBottom: 16 }}>
            {loadError ?? '예약 상세 정보를 찾을 수 없습니다.'}
          </div>
          <button type="button" className={styles.refreshButton} onClick={() => void loadBooking()}>
            다시 불러오기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={sharedStyles.container}>
      <header className={sharedStyles.header}>
        <button
          type="button"
          onClick={() => router.push('/admin/bookings/beauty')}
          style={{
            background: 'none',
            border: 'none',
            padding: '4px 0',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
          }}
          aria-label="예약 목록으로"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <h1 className={`${sharedStyles.headerTitle} ${styles.adminDetailHeaderTitle}`}>뷰티 예약 상세</h1>
        <div className={sharedStyles.headerActions}>
          <Link href="/admin/bookings/beauty" className={sharedStyles.headerNavButton}>
            <span className={sharedStyles.headerNavButtonFull}>예약 목록</span>
            <span className={sharedStyles.headerNavButtonShort}>목록</span>
          </Link>
          <Link href="/my" className={sharedStyles.headerNavButton}>
            <span className={sharedStyles.headerNavButtonFull}>마이페이지</span>
            <span className={sharedStyles.headerNavButtonShort}>마이</span>
          </Link>
          <span className={`${sharedStyles.adminBadge} ${styles.adminDetailHeaderBadge}`}>ADMIN</span>
        </div>
      </header>

      <div className={sharedStyles.content}>
        {loadError ? (
          <div className={styles.errorState} style={{ marginBottom: 16 }}>
            {loadError}
          </div>
        ) : null}

        <div className={styles.adminDetailPage}>

          {/* 상단 히어로 카드 */}
          <section className={styles.detailHeroCard}>
            <div className={styles.heroLeft}>
              <span className={styles.heroCategoryIcon}>
                {BEAUTY_CATEGORY_ICONS[selectedBooking.beautyCategory] ?? '✂'}
              </span>
              <div>
                <p className={styles.heroCategoryLabel}>
                  {BEAUTY_CATEGORY_LABELS[selectedBooking.beautyCategory] ?? selectedBooking.beautyCategory}
                </p>
                <h2 className={styles.heroCustomerName}>{selectedBooking.customerName}</h2>
              </div>
            </div>

            <div className={styles.heroMetaBoxes}>
              <div className={styles.heroMetaBox}>
                <span className={styles.heroMetaIcon}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                </span>
                <div>
                  <span className={styles.heroMetaLabel}>요청 일시</span>
                  <span className={styles.heroMetaValue}>
                    {new Date(selectedBooking.bookingDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })} {selectedBooking.bookingTime}
                  </span>
                </div>
              </div>
              <div className={styles.heroMetaBox}>
                <span className={styles.heroMetaIcon}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                </span>
                <div>
                  <span className={styles.heroMetaLabel}>지역</span>
                  <span className={styles.heroMetaValue}>{selectedBooking.region}</span>
                </div>
              </div>
              <div className={styles.heroMetaBox}>
                <span className={styles.heroMetaLabel}>현재 상태</span>
                <span className={`${styles.statusBadge} ${getStatusToneClass(selectedBooking.status)}`}>
                  {STATUS_LABELS[selectedBooking.status]}
                </span>
              </div>
            </div>

            <div className={styles.heroActions}>
              <button
                type="button"
                className={`${styles.refreshButton} ${styles.heroActionBtn}`}
                onClick={() => {
                  const el = document.getElementById('admin-internal-section');
                  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                고객 안내 작성
              </button>
              {allowedTransitions.includes('confirmed') ? (
                <button
                  type="button"
                  className={`${styles.actionButton} ${styles.actionPrimary} ${styles.heroActionBtn}`}
                  onClick={() => void handleStatusUpdate('confirmed')}
                  disabled={pendingStatus !== null}
                >
                  {pendingStatus === 'confirmed' ? '변경 중...' : '예약 확정'}
                </button>
              ) : null}
              {allowedTransitions.includes('canceled') ? (
                <button
                  type="button"
                  className={`${styles.actionButton} ${styles.actionDanger} ${styles.heroActionBtn}`}
                  onClick={() => void handleStatusUpdate('canceled')}
                  disabled={pendingStatus !== null}
                >
                  {pendingStatus === 'canceled' ? '취소 중...' : '예약 취소'}
                </button>
              ) : null}
              {selectedBooking.status === 'canceled' ? (
                <button
                  type="button"
                  className={`${styles.actionButton} ${styles.actionDelete} ${styles.heroActionBtn}`}
                  onClick={() => void handleDeleteBooking()}
                  disabled={isDeleting}
                >
                  {isDeleting ? '삭제 중...' : '내역 삭제'}
                </button>
              ) : null}
            </div>
          </section>

          {actionError ? <p className={styles.actionError}>{actionError}</p> : null}
          {actionSuccess ? <p className={styles.actionSuccess}>{actionSuccess}</p> : null}

          {/* 변경 요청 검토 (해당 상태일 때만) */}
          {selectedBooking.status === 'change_requested' ? (
            <section className={styles.detailCard}>
              <h3 className={styles.blockTitle}>고객 변경 요청 검토</h3>
              <p style={{ fontSize: '0.84rem', color: '#64748b', margin: '0 0 12px' }}>
                {selectedBooking.changeReason || '별도 사유 없음'}
                {selectedBooking.changeRequestedAt
                  ? ` · 요청 시각: ${formatDateTimeLabel(selectedBooking.changeRequestedAt)}`
                  : ''}
              </p>
              <textarea
                className={styles.input}
                style={{ width: '100%', minHeight: 80, padding: '12px 14px' }}
                placeholder="고객에게 전달할 승인/반려 안내 문구를 입력해 주세요."
                value={reviewNote}
                onChange={(event) => setReviewNote(event.target.value)}
                disabled={isReviewing}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button
                  type="button"
                  className={`${styles.actionButton} ${styles.actionPrimary}`}
                  onClick={() => void handleReviewChangeRequest('approved')}
                  disabled={isReviewing}
                >
                  {isReviewing ? '처리 중...' : '변경 요청 승인'}
                </button>
                <button
                  type="button"
                  className={`${styles.actionButton} ${styles.actionDanger}`}
                  onClick={() => void handleReviewChangeRequest('rejected')}
                  disabled={isReviewing}
                >
                  {isReviewing ? '처리 중...' : '변경 요청 반려'}
                </button>
              </div>
            </section>
          ) : null}

          {/* 두 컬럼 레이아웃 */}
          <div className={styles.adminDetailColumns}>

            {/* 왼쪽: 고객 요청 요약 */}
            <div className={styles.adminDetailMainColumn}>
              <section className={styles.detailCard}>
                <div className={styles.leftCardHeader}>
                  <h3 className={styles.blockTitle} style={{ margin: 0 }}>고객 요청 요약</h3>
                </div>

                <DetailList
                  items={[
                    { label: '고객명', value: selectedBooking.customerName },
                    { label: '연락처', value: selectedBooking.customerPhone },
                    { label: '이메일', value: selectedBooking.customerEmail ?? '등록되지 않음' },
                    {
                      label: '예약 카테고리',
                      value: BEAUTY_CATEGORY_LABELS[selectedBooking.beautyCategory] ?? selectedBooking.beautyCategory,
                    },
                    { label: '대표 시술', value: selectedBooking.primaryServiceName ?? '미정' },
                    ...(selectedBooking.addOnNames.length > 0
                      ? [{ label: '추가 옵션', value: selectedBooking.addOnNames.join(', ') }]
                      : []),
                    {
                      label: '희망 일정',
                      value: `${new Date(selectedBooking.bookingDate).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace('.', '')} ${selectedBooking.bookingTime}`,
                    },
                    { label: '지역', value: selectedBooking.region },
                    { label: '요청사항', value: selectedBooking.customerRequest || '별도 요청 없음' },
                  ]}
                />

                <details className={styles.summaryAccordion}>
                  <summary>추가 정보</summary>
                  <div>
                    <DetailList
                      items={[
                        { label: '예약 ID', value: selectedBooking.id },
                        { label: '예약 접수 시각', value: formatDateTimeLabel(selectedBooking.createdAt) },
                        { label: '최근 수정 시각', value: formatDateTimeLabel(selectedBooking.updatedAt) },
                        { label: '지역', value: selectedBooking.region },
                      ]}
                    />
                  </div>
                </details>

                <details className={styles.summaryAccordion}>
                  <summary>동의 / 정책 정보</summary>
                  <div>
                    <DetailList
                      items={[
                        { label: '서비스 약관 동의', value: selectedBooking.agreements.serviceTermsAgreed ? '동의' : '미동의' },
                        { label: '개인정보 수집 동의', value: selectedBooking.agreements.privacyPolicyAgreed ? '동의' : '미동의' },
                        { label: '제3자 정보 제공 동의', value: selectedBooking.agreements.thirdPartySharingAgreed ? '동의' : '미동의' },
                        { label: '마케팅 수신 동의', value: selectedBooking.agreements.marketingConsentAgreed ? '동의' : '미동의' },
                        { label: '환불 규정 동의', value: selectedBooking.agreements.refundPolicyAgreed ? '동의' : '미동의' },
                      ]}
                    />
                  </div>
                </details>

                <details className={styles.summaryAccordion}>
                  <summary>첨부 이미지</summary>
                  <div>
                    {selectedBookingHasImages ? (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {selectedBooking.hasCurrentImage ? (
                          <button
                            type="button"
                            className={styles.imageButton}
                            onClick={() => void handleViewImage('current')}
                            disabled={imageModal.isLoading}
                          >
                            <span className={styles.imageButtonIcon}>🖼</span>
                            현재 이미지 보기
                          </button>
                        ) : null}
                        {selectedBooking.hasStyleImage ? (
                          <button
                            type="button"
                            className={styles.imageButton}
                            onClick={() => void handleViewImage('style')}
                            disabled={imageModal.isLoading}
                          >
                            <span className={styles.imageButtonIcon}>🎨</span>
                            스타일 이미지 보기
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      <p style={{ fontSize: '0.84rem', color: '#94a3b8', margin: 0 }}>첨부된 이미지가 없습니다.</p>
                    )}
                    {imageModal.error ? (
                      <p style={{ color: '#dc2626', fontSize: '0.75rem', margin: '8px 0 0' }}>{imageModal.error}</p>
                    ) : null}
                  </div>
                </details>
              </section>
            </div>

            {/* 오른쪽: 견적 입력 */}
            <div className={styles.adminDetailSideColumn}>
              <section className={styles.detailCard}>
                <h3 className={styles.blockTitle}>견적 입력</h3>

                {selectedBooking.quoteStatus ? (
                  <div
                    className={styles.quoteBanner}
                    style={{
                      background:
                        selectedBooking.quoteStatus === 'accepted'
                          ? '#dcfce7'
                          : selectedBooking.quoteStatus === 'rejected'
                            ? '#fee2e2'
                            : '#fef9c3',
                    }}
                  >
                    <span style={{ fontWeight: 700 }}>
                      제안 상태:{' '}
                      {selectedBooking.quoteStatus === 'pending'
                        ? '고객 확인 중'
                        : selectedBooking.quoteStatus === 'accepted'
                          ? '수락됨'
                          : selectedBooking.quoteStatus === 'rejected'
                            ? '거절됨'
                            : '만료됨'}
                    </span>
                    {selectedBooking.quoteSentAt ? (
                      <span style={{ color: '#64748b', fontSize: '0.8rem' }}>
                        발송일: {formatDateTimeLabel(selectedBooking.quoteSentAt)}
                      </span>
                    ) : null}
                    {selectedBooking.paymentStatus === 'paid' && selectedBooking.paidAmount !== null ? (
                      <div style={{ marginTop: 4, fontSize: '0.8rem' }}>
                        <span style={{ fontWeight: 700, color: '#065f46' }}>
                          💳 결제 완료: ₩{formatPrice(selectedBooking.paidAmount)}
                        </span>
                        {selectedBooking.couponDiscountAmount !== null && selectedBooking.couponDiscountAmount > 0 ? (
                          <span style={{ color: '#7c3aed', marginLeft: 8 }}>
                            쿠폰 할인: -₩{formatPrice(selectedBooking.couponDiscountAmount)}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {/* 매장명 | 시술명 */}
                <div className={styles.quoteGrid2}>
                  <label className={styles.field}>
                    <span>매장명 *</span>
                    <input
                      type="text"
                      className={styles.input}
                      value={quoteForm.shopName}
                      onChange={(e) => setQuoteForm((c) => ({ ...c, shopName: e.target.value }))}
                      placeholder={selectedBooking.storeName}
                    />
                  </label>
                  <label className={styles.field}>
                    <span>시술명</span>
                    <input
                      type="text"
                      className={styles.input}
                      value={quoteForm.serviceName}
                      onChange={(e) => setQuoteForm((c) => ({ ...c, serviceName: e.target.value }))}
                      placeholder={selectedBooking.primaryServiceName ?? ''}
                    />
                  </label>
                </div>

                {/* 날짜 | 시간 */}
                <div className={styles.quoteGrid2}>
                  <label className={styles.field}>
                    <span>날짜 *</span>
                    <input
                      type="date"
                      className={styles.input}
                      value={quoteForm.date}
                      onChange={(e) => setQuoteForm((c) => ({ ...c, date: e.target.value }))}
                    />
                  </label>
                  <label className={styles.field}>
                    <span>시간 *</span>
                    <input
                      type="time"
                      className={styles.input}
                      value={quoteForm.time}
                      onChange={(e) => setQuoteForm((c) => ({ ...c, time: e.target.value }))}
                    />
                  </label>
                </div>

                {/* 금액 + 통화 인라인 */}
                <label className={styles.field}>
                  <span>금액 *</span>
                  <div className={styles.quotePriceRow}>
                    <input
                      type="number"
                      min="0"
                      className={styles.input}
                      value={quoteForm.totalPrice}
                      onChange={(e) => setQuoteForm((c) => ({ ...c, totalPrice: e.target.value }))}
                      placeholder="0"
                    />
                    <select
                      className={styles.select}
                      value={quoteForm.currency}
                      onChange={(e) => setQuoteForm((c) => ({ ...c, currency: e.target.value }))}
                      style={{ width: 90, flexShrink: 0 }}
                    >
                      <option value="KRW">KRW</option>
                      <option value="USD">USD</option>
                      <option value="JPY">JPY</option>
                    </select>
                  </div>
                </label>

                {/* 안내 메모 */}
                <label className={styles.field}>
                  <span>안내 메모</span>
                  <textarea
                    className={styles.input}
                    style={{ width: '100%', minHeight: 88, padding: '12px 14px' }}
                    value={quoteForm.note}
                    onChange={(e) => setQuoteForm((c) => ({ ...c, note: e.target.value }))}
                    placeholder="고객에게 전달할 안내 메모를 입력해 주세요."
                  />
                </label>

                {quoteForm.error ? (
                  <p style={{ color: '#dc2626', fontSize: '0.8rem', margin: 0 }}>{quoteForm.error}</p>
                ) : null}

                <button
                  type="button"
                  onClick={() => void handleSendQuote()}
                  disabled={quoteForm.isSubmitting}
                  className={`${styles.actionButton} ${styles.actionPrimary}`}
                  style={{ width: '100%' }}
                >
                  {quoteForm.isSubmitting ? '저장 중...' : '견적 저장 후 발송'}
                </button>
              </section>
            </div>
          </div>

          {/* 하단 아코디언: 내부 처리 */}
          <details className={styles.bottomAccordion}>
            <summary className={styles.bottomAccordionSummary}>
              <span>내부 처리</span>
              <span className={styles.bottomAccordionMeta}>
                {BEAUTY_BOOKING_OPERATOR_STATUS_LABELS[operatorForm.operatorStatus]}
              </span>
            </summary>
            <div className={styles.bottomAccordionBody}>
              <label className={styles.field}>
                <span>운영 상태</span>
                <select
                  className={styles.select}
                  value={operatorForm.operatorStatus}
                  onChange={(event) =>
                    setOperatorForm((current) => ({
                      ...current,
                      operatorStatus: event.target.value as BeautyBookingOperatorStatus,
                    }))
                  }
                >
                  {(Object.entries(BEAUTY_BOOKING_OPERATOR_STATUS_LABELS) as [BeautyBookingOperatorStatus, string][]).map(
                    ([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <label className={styles.field} style={{ marginTop: 12 }}>
                <span>내부 메모</span>
                <textarea
                  className={styles.input}
                  style={{ width: '100%', minHeight: 80, padding: '12px 14px' }}
                  value={operatorForm.internalNote}
                  onChange={(event) =>
                    setOperatorForm((current) => ({
                      ...current,
                      internalNote: event.target.value,
                    }))
                  }
                  placeholder="매장 협의 상황이나 후속 확인 필요 사항을 기록해 주세요."
                />
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, margin: '12px 0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={operatorForm.shopContacted}
                    onChange={(event) => setOperatorForm((current) => ({ ...current, shopContacted: event.target.checked }))}
                    style={{ width: 16, height: 16 }}
                  />
                  매장 연락 완료
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={operatorForm.customerContacted}
                    onChange={(event) => setOperatorForm((current) => ({ ...current, customerContacted: event.target.checked }))}
                    style={{ width: 16, height: 16 }}
                  />
                  고객 안내 완료
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={operatorForm.followUpNeeded}
                    onChange={(event) => setOperatorForm((current) => ({ ...current, followUpNeeded: event.target.checked }))}
                    style={{ width: 16, height: 16 }}
                  />
                  추가 확인 필요
                </label>
              </div>
              <button
                type="button"
                onClick={() => void handleUpdateOperatorInfo()}
                disabled={operatorForm.isSaving}
                className={`${styles.actionButton} ${styles.actionPrimary}`}
                style={{ width: '100%' }}
              >
                {operatorForm.isSaving ? '저장 중...' : '내부 처리 상태 저장'}
              </button>
            </div>
          </details>

          {/* 하단 아코디언: 대체 일정 제안 */}
          <details className={styles.bottomAccordion}>
            <summary className={styles.bottomAccordionSummary}>
              <span>대체 일정 제안</span>
              <span className={styles.bottomAccordionMeta}>
                {selectedBooking.alternativeOfferItems.filter((s) => s.date).length > 0
                  ? `${selectedBooking.alternativeOfferItems.filter((s) => s.date).length}개 제안`
                  : '0개 제안'}
              </span>
            </summary>
            <div className={styles.bottomAccordionBody}>
              <div style={{ display: 'grid', gap: 12 }}>
                {alternative.slots.map((slot, index) => (
                  <div key={`${slot.date}-${slot.time}-${index}`} className={styles.alternativeSlotRow}>
                    <input
                      type="date"
                      className={styles.input}
                      style={{ minWidth: 0 }}
                      value={slot.date}
                      onChange={(event) => handleAlternativeSlotChange(index, 'date', event.target.value)}
                    />
                    <input
                      type="time"
                      className={styles.input}
                      style={{ minWidth: 0 }}
                      value={slot.time}
                      onChange={(event) => handleAlternativeSlotChange(index, 'time', event.target.value)}
                    />
                    {alternative.slots.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => handleRemoveAlternativeSlot(index)}
                        className={styles.alternativeRemoveButton}
                      >
                        ✕
                      </button>
                    ) : null}
                  </div>
                ))}
                {alternative.slots.length < 3 ? (
                  <button
                    type="button"
                    onClick={handleAddAlternativeSlot}
                    style={{
                      background: 'none',
                      border: '1px dashed #9a3412',
                      color: '#9a3412',
                      padding: '8px',
                      borderRadius: 8,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    + 제안 일정 추가
                  </button>
                ) : null}
              </div>
              <label className={styles.field} style={{ marginTop: 12 }}>
                <span>고객 안내 문구</span>
                <textarea
                  className={styles.input}
                  style={{ width: '100%', minHeight: 72, padding: '12px 14px' }}
                  value={alternative.note}
                  onChange={(event) =>
                    setAlternative((current) => ({
                      ...current,
                      note: event.target.value,
                      error: null,
                    }))
                  }
                  placeholder="대체 일정 제안 사유나 안내 문구를 입력해 주세요."
                />
              </label>
              {alternative.error ? (
                <p style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: 8, marginBottom: 0 }}>{alternative.error}</p>
              ) : null}
              <button
                type="button"
                onClick={() => void handleOfferAlternative()}
                disabled={alternative.isSubmitting}
                className={`${styles.actionButton} ${styles.actionPrimary}`}
                style={{ width: '100%', marginTop: 12 }}
              >
                {alternative.isSubmitting ? '전송 중...' : '대체 일정 제안 전송'}
              </button>
              {selectedBooking.alternativeOfferStatus !== 'none' ? (
                <div
                  style={{
                    marginTop: 12,
                    padding: '12px',
                    background: 'white',
                    borderRadius: 10,
                    fontSize: '0.85rem',
                    border: '1px solid #ffedd5',
                  }}
                >
                  <p style={{ margin: '0 0 4px 0', fontWeight: 700 }}>
                    현재 제안 상태:
                    <span
                      style={{
                        color:
                          selectedBooking.alternativeOfferStatus === 'accepted'
                            ? '#059669'
                            : selectedBooking.alternativeOfferStatus === 'rejected'
                              ? '#dc2626'
                              : '#9a3412',
                        marginLeft: 6,
                      }}
                    >
                      {selectedBooking.alternativeOfferStatus === 'offered'
                        ? '고객 확인 중'
                        : selectedBooking.alternativeOfferStatus === 'accepted'
                          ? '고객 수락'
                          : '고객 거절'}
                    </span>
                  </p>
                  {selectedBooking.alternativeResponseAt ? (
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.75rem' }}>
                      응답 시각: {formatDateTimeLabel(selectedBooking.alternativeResponseAt)}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </details>

          {/* 하단 아코디언: 고객 알림 발송 이력 */}
          <details className={styles.bottomAccordion}>
            <summary className={styles.bottomAccordionSummary}>
              <span>고객 알림 발송 이력</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {notifications.length > 0 ? (
                  <span className={styles.bottomAccordionMeta}>
                    최근: {formatDateTimeLabel(notifications[0].created_at)}
                  </span>
                ) : null}
                <button
                  type="button"
                  className={styles.refreshButton}
                  onClick={(e) => {
                    e.preventDefault();
                    void loadBooking(false);
                  }}
                  disabled={refreshing}
                  style={{ fontSize: '0.78rem', minHeight: 32 }}
                >
                  {refreshing ? '...' : '새로고침'}
                </button>
              </div>
            </summary>
            <div className={styles.bottomAccordionBody}>
              {notifications.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: '#64748b', textAlign: 'center', padding: '16px 0', margin: 0 }}>
                  발송된 알림 이력이 없습니다.
                </p>
              ) : (
                <>
                  <div className={styles.notificationsMobileList}>
                    {notificationEntries.map(({ notification, cooldownActive, resendDisabled }) => (
                      <article key={notification.id} className={styles.notificationsMobileCard}>
                        <div className={styles.notificationsMobileRow}>
                          <div>
                            <div style={{ fontWeight: 700 }}>{formatDateTimeLabel(notification.created_at)}</div>
                            <div style={{ color: '#94a3b8', fontSize: '0.72rem' }}>{notification.channel}</div>
                          </div>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              padding: '2px 8px',
                              borderRadius: 999,
                              background:
                                notification.dispatch_status === 'sent'
                                  ? '#dcfce7'
                                  : notification.dispatch_status === 'failed'
                                    ? '#fee2e2'
                                    : '#f1f5f9',
                              color:
                                notification.dispatch_status === 'sent'
                                  ? '#166534'
                                  : notification.dispatch_status === 'failed'
                                    ? '#991b1b'
                                    : '#475569',
                            }}
                          >
                            {notification.dispatch_status === 'sent'
                              ? '발송 완료'
                              : notification.dispatch_status === 'failed'
                                ? '실패'
                                : '대기 중'}
                          </span>
                        </div>
                        <div className={styles.notificationsMobileTitle}>{notification.title}</div>
                        {notification.error_log ? (
                          <p className={styles.notificationsMobileError}>오류 로그: {notification.error_log}</p>
                        ) : null}
                        <div className={styles.notificationsMobileRow}>
                          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                            재전송 {notification.resend_count}회
                          </div>
                          <button
                            type="button"
                            onClick={() => void handleResendNotification(notification.id)}
                            disabled={resendDisabled}
                            className={styles.notificationsMobileButton}
                            style={{
                              background: resendDisabled ? '#e2e8f0' : '#7c3aed',
                              color: resendDisabled ? '#94a3b8' : 'white',
                              cursor: resendDisabled ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {resendingId === notification.id
                              ? '...'
                              : notification.resend_count >= 3
                                ? '한도 초과'
                                : cooldownActive
                                  ? '대기 중'
                                  : '재전송'}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                  <div className={styles.notificationsDesktopTable} style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                          <th style={{ padding: '8px 4px' }}>시각 / 채널</th>
                          <th style={{ padding: '8px 4px' }}>제목 / 상태</th>
                          <th style={{ padding: '8px 4px', textAlign: 'right' }}>관리</th>
                        </tr>
                      </thead>
                      <tbody>
                        {notificationEntries.map(({ notification, cooldownActive, resendDisabled }) => (
                          <tr key={notification.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '10px 4px' }}>
                              <div style={{ fontWeight: 600 }}>{formatDateTimeLabel(notification.created_at)}</div>
                              <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>{notification.channel}</div>
                            </td>
                            <td style={{ padding: '10px 4px' }}>
                              <div style={{ fontWeight: 500 }}>{notification.title}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span
                                  style={{
                                    fontSize: '0.7rem',
                                    padding: '1px 6px',
                                    borderRadius: 4,
                                    background:
                                      notification.dispatch_status === 'sent'
                                        ? '#dcfce7'
                                        : notification.dispatch_status === 'failed'
                                          ? '#fee2e2'
                                          : '#f1f5f9',
                                    color:
                                      notification.dispatch_status === 'sent'
                                        ? '#166534'
                                        : notification.dispatch_status === 'failed'
                                          ? '#991b1b'
                                          : '#475569',
                                  }}
                                >
                                  {notification.dispatch_status === 'sent'
                                    ? '발송 완료'
                                    : notification.dispatch_status === 'failed'
                                      ? '실패'
                                      : '대기 중'}
                                </span>
                                {notification.error_log ? (
                                  <span title={notification.error_log} style={{ fontSize: '0.7rem', color: '#991b1b', cursor: 'help' }}>
                                    오류 로그
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td style={{ padding: '10px 4px', textAlign: 'right' }}>
                              {notification.resend_count > 0 ? (
                                <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: 4 }}>
                                  재전송 {notification.resend_count}회
                                </div>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => void handleResendNotification(notification.id)}
                                disabled={resendDisabled}
                                style={{
                                  padding: '4px 8px',
                                  background: resendDisabled ? '#e2e8f0' : '#7c3aed',
                                  color: resendDisabled ? '#94a3b8' : 'white',
                                  border: 'none',
                                  borderRadius: 6,
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  cursor: resendDisabled ? 'not-allowed' : 'pointer',
                                }}
                              >
                                {resendingId === notification.id
                                  ? '...'
                                  : notification.resend_count >= 3
                                    ? '한도 초과'
                                    : cooldownActive
                                      ? '대기 중'
                                      : '재전송'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </details>

        </div>
      </div>

      {imageModal.activeImage ? (
        <div className={styles.modalOverlay} onClick={() => setImageModal((current) => ({ ...current, activeImage: null }))}>
          <div className={styles.modalContent} onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className={styles.modalClose}
              onClick={() => setImageModal((current) => ({ ...current, activeImage: null }))}
              aria-label="닫기"
            >
              ✕
            </button>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{imageModal.activeImage.title}</h3>
            </div>
            <div className={styles.modalImageContainer}>
              <Image
                src={imageModal.activeImage.url}
                alt={imageModal.activeImage.title}
                className={styles.modalImage}
                width={800}
                height={600}
                unoptimized
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
