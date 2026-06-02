'use client';

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
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

const LANGUAGE_LABELS: Record<string, string> = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
  'zh-CN': '简体中文',
  'zh-HK': '繁體中文',
  vi: 'Tiếng Việt',
  th: 'ไทย',
  id: 'Bahasa Indonesia',
  ms: 'Bahasa Melayu',
};

const INTENT_LABELS: Record<string, string> = {
  booking_confirm: '예약 확인',
  service_request: '시술 요청 전달',
  allergy_notice: '주의사항 전달',
  style_consultation: '스타일 상담',
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

type ImageModalState = {
  isLoading: boolean;
  error: string | null;
  activeImage: { url: string; title: string } | null;
};

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

function buildBookingTitle(
  categoryLabel: string | null | undefined,
  serviceName: string | null | undefined,
  storeName: string,
) {
  const parts = [categoryLabel, serviceName].filter((part) => {
    return part && part !== 'null' && part !== 'undefined' && part.trim() !== '';
  });

  return parts.length > 0 ? parts.join(' · ') : storeName;
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
      return '변경 요청 상태로 이동';
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
  const processingRef = useRef<HTMLElement | null>(null);

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<BeautyBookingAdminRecord | null>(null);
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

        if (showLoading || !selectedBooking) {
          setLoadError(message);
        } else {
          setActionError(message);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [bookingId, selectedBooking],
  );

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
  }, [selectedBooking]);

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

  const bookingTitle = useMemo(() => {
    if (!selectedBooking) {
      return '';
    }

    const categoryLabel = BEAUTY_CATEGORY_LABELS[selectedBooking.beautyCategory] ?? selectedBooking.beautyCategory;
    return buildBookingTitle(categoryLabel, selectedBooking.primaryServiceName, selectedBooking.storeName);
  }, [selectedBooking]);

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

  const handleJumpToProcessing = () => {
    processingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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
          <span className={sharedStyles.adminBadge}>ADMIN</span>
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
        <span className={`${sharedStyles.adminBadge} ${styles.adminDetailHeaderBadge}`}>ADMIN</span>
      </header>

      <div className={sharedStyles.content}>
        {loadError ? (
          <div className={styles.errorState} style={{ marginBottom: 16 }}>
            {loadError}
          </div>
        ) : null}

        <div className={styles.adminDetailPage}>
          <section className={styles.detailCard}>
            <div className={styles.detailHeader}>
              <div className={styles.detailHeaderCopy}>
                <p className={styles.eyebrow}>Booking Detail</p>
                <h2 className={styles.detailTitle}>{bookingTitle}</h2>
                <p className={styles.detailSub}>
                  {selectedBooking.storeName} · 희망일 {formatDateLabel(selectedBooking.bookingDate)} {selectedBooking.bookingTime}
                </p>
              </div>
              <span className={`${styles.statusBadge} ${getStatusToneClass(selectedBooking.status)}`}>
                {STATUS_LABELS[selectedBooking.status]}
              </span>
            </div>

            <div className={styles.adminHeroActions}>
              <button type="button" className={`${styles.refreshButton} ${styles.heroActionButton}`} onClick={handleJumpToProcessing}>
                고객 안내 작성
              </button>
              {allowedTransitions.includes('confirmed') ? (
                <button
                  type="button"
                  className={`${styles.actionButton} ${styles.actionPrimary} ${styles.heroActionButton}`}
                  onClick={() => void handleStatusUpdate('confirmed')}
                  disabled={pendingStatus !== null}
                >
                  {pendingStatus === 'confirmed' ? '변경 중...' : '예약 확정으로 변경'}
                </button>
              ) : null}
              {allowedTransitions.includes('canceled') ? (
                <button
                  type="button"
                  className={`${styles.actionButton} ${styles.actionDanger} ${styles.heroActionButton}`}
                  onClick={() => void handleStatusUpdate('canceled')}
                  disabled={pendingStatus !== null}
                >
                  {pendingStatus === 'canceled' ? '변경 중...' : '예약 취소로 변경'}
                </button>
              ) : null}
            </div>

            {actionError ? <p className={styles.actionError}>{actionError}</p> : null}
            {actionSuccess ? <p className={styles.actionSuccess}>{actionSuccess}</p> : null}
          </section>

          <div className={styles.adminDetailColumns}>
            <div className={styles.adminDetailMainColumn}>
              <section className={styles.detailCard}>
                <div>
                  <h3 className={styles.blockTitle}>예약 요약</h3>
                  <p className={styles.sectionText}>고객이 확인하는 기본 예약 정보를 먼저 모아 두었습니다.</p>
                </div>

                <div className={styles.summaryGrid}>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>희망 일정</span>
                    <strong>{formatDateLabel(selectedBooking.bookingDate)} {selectedBooking.bookingTime}</strong>
                  </div>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>매장</span>
                    <strong>{selectedBooking.storeName}</strong>
                  </div>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>디자이너</span>
                    <strong>{selectedBooking.designerName ?? '매장 추천'}</strong>
                  </div>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>예상 금액</span>
                    <strong className={styles.priceEmphasis}>₩{formatPrice(selectedBooking.totalPrice)}</strong>
                  </div>
                </div>

                <details className={styles.infoBlock}>
                  <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: '0.86rem' }}>추가 운영 정보 보기</summary>
                  <div style={{ marginTop: 12 }}>
                    <DetailList
                      items={[
                        { label: '예약 ID', value: selectedBooking.id },
                        { label: '예약 접수 시각', value: formatDateTimeLabel(selectedBooking.createdAt) },
                        { label: '최근 수정 시각', value: formatDateTimeLabel(selectedBooking.updatedAt) },
                        { label: '생성 플로우', value: selectedBooking.createdFromFlow },
                        { label: '지역', value: selectedBooking.region },
                        { label: '상태', value: STATUS_LABELS[selectedBooking.status] },
                      ]}
                    />
                  </div>
                </details>
              </section>

              <section className={styles.detailCard}>
                <div>
                  <h3 className={styles.blockTitle}>고객 정보</h3>
                  <p className={styles.sectionText}>연락 수단과 예약 주체 정보를 분리해서 봅니다.</p>
                </div>

                <div className={styles.blockGrid}>
                  <div className={styles.infoBlock}>
                    <DetailList
                      items={[
                        { label: '고객명', value: selectedBooking.customerName },
                        { label: '연락처', value: selectedBooking.customerPhone },
                        { label: '이메일', value: selectedBooking.customerEmail ?? '등록되지 않음' },
                        { label: '고객 계정 ID', value: selectedBooking.customerUserId ?? '비회원 또는 미연결' },
                      ]}
                    />
                  </div>

                  <div className={styles.infoBlock}>
                    <DetailList
                      items={[
                        {
                          label: '예약 카테고리',
                          value: BEAUTY_CATEGORY_LABELS[selectedBooking.beautyCategory] ?? selectedBooking.beautyCategory,
                        },
                        { label: '대표 시술', value: selectedBooking.primaryServiceName ?? '미정' },
                        {
                          label: '추가 옵션',
                          value: selectedBooking.addOnNames.length ? selectedBooking.addOnNames.join(', ') : '선택 없음',
                        },
                        { label: '지역', value: selectedBooking.region },
                      ]}
                    />
                  </div>
                </div>
              </section>

              <section className={styles.detailCard}>
                <div>
                  <h3 className={styles.blockTitle}>요청/문구 정보</h3>
                  <p className={styles.sectionText}>고객 요청과 고객에게 보이는 안내 문구를 같은 맥락 안에서 확인합니다.</p>
                </div>

                <div className={styles.blockGrid}>
                  <div className={styles.infoBlock}>
                    <DetailList
                      items={[
                        { label: '고객 요청사항', value: selectedBooking.customerRequest || '별도 요청 없음' },
                        {
                          label: '전달 언어',
                          value: LANGUAGE_LABELS[selectedBooking.communicationLanguage] ?? selectedBooking.communicationLanguage,
                        },
                        {
                          label: '전달 목적',
                          value: INTENT_LABELS[selectedBooking.communicationIntent] ?? selectedBooking.communicationIntent,
                        },
                      ]}
                    />
                  </div>

                  <div className={styles.infoBlock}>
                    <div className={styles.messageSection}>
                      <div className={styles.messageCard}>
                        <span className={styles.messageLabel}>고객에게 보이는 한국어 문구</span>
                        <p className={styles.messageText}>{selectedBooking.koreanMessage}</p>
                      </div>
                      <div className={styles.messageCard}>
                        <span className={styles.messageLabel}>고객에게 보이는 번역 문구</span>
                        <p className={styles.messageText}>{selectedBooking.localizedMessage}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedBooking.status === 'change_requested' ? (
                  <div className={styles.infoBlock}>
                    <h4 className={styles.blockTitle}>고객 변경 요청</h4>
                    <DetailList
                      items={[
                        {
                          label: '요청 시각',
                          value: selectedBooking.changeRequestedAt ? formatDateTimeLabel(selectedBooking.changeRequestedAt) : '확인 중',
                        },
                        { label: '요청 사유', value: selectedBooking.changeReason || '별도 사유 없음' },
                        {
                          label: '변경 전 상태',
                          value: selectedBooking.statusBeforeChangeRequest
                            ? STATUS_LABELS[selectedBooking.statusBeforeChangeRequest]
                            : '기록 없음',
                        },
                      ]}
                    />
                  </div>
                ) : null}

                {selectedBooking.changeRequestStatus && selectedBooking.changeRequestStatus !== 'pending' ? (
                  <div
                    className={styles.infoBlock}
                    style={{
                      borderLeft: `4px solid ${selectedBooking.changeRequestStatus === 'approved' ? '#059669' : '#dc2626'}`,
                    }}
                  >
                    <h4 className={styles.blockTitle}>변경 요청 처리 결과</h4>
                    <DetailList
                      items={[
                        {
                          label: '검토 결과',
                          value: selectedBooking.changeRequestStatus === 'approved' ? '승인됨' : '반려됨',
                        },
                        {
                          label: '검토 시각',
                          value: selectedBooking.changeReviewedAt ? formatDateTimeLabel(selectedBooking.changeReviewedAt) : '기록 없음',
                        },
                        { label: '관리자 메모', value: selectedBooking.changeReviewNote || '별도 코멘트 없음' },
                      ]}
                    />
                  </div>
                ) : null}

                {selectedBooking.status === 'canceled' ? (
                  <div className={styles.infoBlock}>
                    <h4 className={styles.blockTitle}>취소 정보</h4>
                    <DetailList
                      items={[
                        {
                          label: '취소 시각',
                          value: selectedBooking.canceledAt ? formatDateTimeLabel(selectedBooking.canceledAt) : '확인 중',
                        },
                        {
                          label: '취소 주체',
                          value:
                            selectedBooking.canceledBy === 'customer'
                              ? '고객'
                              : selectedBooking.canceledBy === 'admin'
                                ? '관리자'
                                : '미상',
                        },
                        { label: '취소 사유', value: selectedBooking.cancelReason || '별도 사유 없음' },
                      ]}
                    />
                  </div>
                ) : null}

                <details className={styles.infoBlock}>
                  <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: '0.86rem' }}>동의/정책 정보 보기</summary>
                  <div style={{ marginTop: 12 }}>
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
              </section>

              <section className={styles.detailCard}>
                <div>
                  <h3 className={styles.blockTitle}>참조 이미지</h3>
                  <p className={styles.sectionText}>첨부 여부는 고객 입력 기준, 실제 파일명은 아래 확장 정보로 확인할 수 있습니다.</p>
                </div>

                <div className={styles.blockGrid}>
                  <div className={styles.infoBlock}>
                    <DetailList
                      items={[
                        { label: '첨부 상태', value: selectedBookingHasImages ? '첨부됨' : '없음' },
                        { label: '현재 이미지', value: selectedBooking.hasCurrentImage ? '있음' : '없음' },
                        { label: '스타일 이미지', value: selectedBooking.hasStyleImage ? '있음' : '없음' },
                      ]}
                    />

                    <details style={{ marginTop: 12 }}>
                      <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem' }}>파일 정보 보기</summary>
                      <div style={{ marginTop: 10 }}>
                        <DetailList
                          items={[
                            {
                              label: '현재 이미지 파일명',
                              value: selectedBooking.currentImageName ?? (selectedBooking.hasCurrentImage ? 'Stored image' : 'None'),
                            },
                            {
                              label: '스타일 이미지 파일명',
                              value: selectedBooking.styleImageName ?? (selectedBooking.hasStyleImage ? 'Stored image' : 'None'),
                            },
                            { label: '현재 이미지 경로', value: selectedBooking.currentImagePath ?? '기록 없음' },
                            { label: '스타일 이미지 경로', value: selectedBooking.styleImagePath ?? '기록 없음' },
                          ]}
                        />
                      </div>
                    </details>
                  </div>

                  <div className={styles.infoBlock}>
                    <div className={styles.imageActions}>
                      {!selectedBookingHasImages && (
                        <p className={styles.sectionText} style={{ color: 'var(--gray-400)' }}>
                          등록된 참조 이미지가 없습니다.
                        </p>
                      )}

                      {selectedBooking.hasCurrentImage && (
                        <button
                          type="button"
                          className={styles.imageButton}
                          onClick={() => void handleViewImage('current')}
                          disabled={imageModal.isLoading}
                        >
                          <span className={styles.imageButtonIcon}>🖼</span>
                          현재 이미지 보기
                        </button>
                      )}

                      {selectedBooking.hasStyleImage && (
                        <button
                          type="button"
                          className={styles.imageButton}
                          onClick={() => void handleViewImage('style')}
                          disabled={imageModal.isLoading}
                        >
                          <span className={styles.imageButtonIcon}>🎨</span>
                          스타일 이미지 보기
                        </button>
                      )}
                    </div>

                    {imageModal.isLoading ? (
                      <p className={styles.sectionText} style={{ marginTop: 8 }}>
                        불러오는 중...
                      </p>
                    ) : null}
                    {imageModal.error ? (
                      <p className={styles.errorState} style={{ marginTop: 8, padding: '6px 12px', fontSize: '0.75rem' }}>
                        {imageModal.error}
                      </p>
                    ) : null}
                  </div>
                </div>
              </section>
            </div>

            <div className={styles.adminDetailSideColumn}>
              <section ref={processingRef} className={styles.detailCard}>
            <div>
              <h3 className={styles.blockTitle}>관리자 처리</h3>
              <p className={styles.sectionText}>아래 내용은 고객에게 바로 노출되지 않는 관리자 전용 처리 영역입니다.</p>
            </div>

            {selectedBooking.status === 'change_requested' ? (
              <div className={styles.infoBlock}>
                <h4 className={styles.blockTitle}>변경 요청 검토</h4>
                <p className={styles.sectionText} style={{ marginBottom: 12 }}>
                  고객이 요청한 변경 내용을 승인하거나 반려하고, 필요한 안내 문구를 남길 수 있습니다.
                </p>
                <textarea
                  className={styles.input}
                  style={{ width: '100%', minHeight: 88, padding: '12px 14px' }}
                  placeholder="고객에게 전달할 승인/반려 안내 문구를 입력해 주세요."
                  value={reviewNote}
                  onChange={(event) => setReviewNote(event.target.value)}
                  disabled={isReviewing}
                />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
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
              </div>
            ) : null}

            <div className={styles.blockGrid}>
              <section className={styles.infoBlock}>
                <h4 className={styles.blockTitle}>내부 처리 상태</h4>
                <div className={styles.grid2}>
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
                </div>

                <label className={styles.field} style={{ marginTop: 12 }}>
                  <span>내부 메모</span>
                  <textarea
                    className={styles.input}
                    style={{ width: '100%', minHeight: 88, padding: '12px 14px' }}
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

                <div style={{ margin: '16px 0', display: 'flex', flexWrap: 'wrap', gap: 20 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={operatorForm.shopContacted}
                      onChange={(event) =>
                        setOperatorForm((current) => ({
                          ...current,
                          shopContacted: event.target.checked,
                        }))
                      }
                      style={{ width: 16, height: 16 }}
                    />
                    매장 연락 완료
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={operatorForm.customerContacted}
                      onChange={(event) =>
                        setOperatorForm((current) => ({
                          ...current,
                          customerContacted: event.target.checked,
                        }))
                      }
                      style={{ width: 16, height: 16 }}
                    />
                    고객 안내 완료
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={operatorForm.followUpNeeded}
                      onChange={(event) =>
                        setOperatorForm((current) => ({
                          ...current,
                          followUpNeeded: event.target.checked,
                        }))
                      }
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
              </section>

              <section className={styles.infoBlock}>
                <h4 className={styles.blockTitle}>대체 일정 제안</h4>
                <p className={styles.sectionText} style={{ marginBottom: 12 }}>
                  고객 안내용 문구와 함께 최대 3개의 대체 일정을 보낼 수 있습니다.
                </p>

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
                  <p style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: 12, marginBottom: 0 }}>{alternative.error}</p>
                ) : null}

                <button
                  type="button"
                  onClick={() => void handleOfferAlternative()}
                  disabled={alternative.isSubmitting}
                  className={`${styles.actionButton} ${styles.actionPrimary}`}
                  style={{ width: '100%', marginTop: 16 }}
                >
                  {alternative.isSubmitting ? '전송 중...' : '대체 일정 제안 전송'}
                </button>

                {selectedBooking.alternativeOfferStatus !== 'none' ? (
                  <div
                    style={{
                      marginTop: 16,
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
                      <p style={{ margin: 0, color: 'var(--gray-500)', fontSize: '0.75rem' }}>
                        응답 시각: {formatDateTimeLabel(selectedBooking.alternativeResponseAt)}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </section>
            </div>
              </section>

              <section className={styles.detailCard}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div>
                    <h3 className={styles.blockTitle}>고객 알림 발송 이력</h3>
                    <p className={styles.sectionText}>같은 알림은 최대 3회, 5분 간격으로만 재전송할 수 있습니다.</p>
                  </div>
                  <button
                    type="button"
                    className={styles.refreshButton}
                    onClick={() => void loadBooking(false)}
                    disabled={refreshing}
                  >
                    {refreshing ? '불러오는 중...' : '새로고침'}
                  </button>
                </div>

                {notifications.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: '#64748b', textAlign: 'center', padding: '20px 0', margin: 0 }}>
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
                        {notificationEntries.map(({ notification, cooldownActive, resendDisabled }) => {
                          return (
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
                          );
                        })}
                      </tbody>
                    </table>
                    </div>
                  </>
                )}
              </section>

              <section className={styles.detailCard}>
                <div>
                  <h3 className={styles.blockTitle}>상태 변경</h3>
                  <p className={styles.sectionText}>최종 상태 변경은 아래에서 한 번 더 확인하면서 진행합니다.</p>
                </div>

                {allowedTransitions.length === 0 ? (
                  <div className={styles.panelNote}>현재 상태에서는 추가로 변경할 수 있는 다음 단계가 없습니다.</div>
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
            </div>
          </div>
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
