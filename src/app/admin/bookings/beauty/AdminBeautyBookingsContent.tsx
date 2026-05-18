'use client';

import { useCallback, useDeferredValue, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

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

// ===================== Group A — bookingsListReducer =====================
type BookingsListState = {
  bookings: BeautyBookingAdminRecord[];
  selectedBookingId: string | null;
  loading: boolean;
  loadError: string | null;
};

type BookingsListAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: BeautyBookingAdminRecord[] }
  | { type: 'FETCH_ERROR'; payload: string }
  | { type: 'SELECT_BOOKING'; payload: string }
  | { type: 'AUTO_SELECT_FIRST' }
  | { type: 'UPDATE_BOOKING'; payload: BeautyBookingAdminRecord };

function bookingsListReducer(state: BookingsListState, action: BookingsListAction): BookingsListState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, loadError: null };
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, bookings: action.payload };
    case 'FETCH_ERROR':
      return { ...state, loading: false, loadError: action.payload, bookings: [] };
    case 'SELECT_BOOKING':
      return { ...state, selectedBookingId: action.payload };
    case 'AUTO_SELECT_FIRST': {
      const nextId = state.bookings.length > 0 ? state.bookings[0].id : null;
      if (nextId === state.selectedBookingId) return state;
      return { ...state, selectedBookingId: nextId };
    }
    case 'UPDATE_BOOKING':
      return {
        ...state,
        bookings: state.bookings.map((b) => (b.id === action.payload.id ? action.payload : b)),
      };
    default:
      return state;
  }
}

// ===================== Group B — operatorFormReducer =====================
type OperatorFormState = {
  operatorStatus: BeautyBookingOperatorStatus;
  internalNote: string;
  shopContacted: boolean;
  customerContacted: boolean;
  followUpNeeded: boolean;
  isSaving: boolean;
  error: string | null;
};

type OperatorFormAction =
  | {
      type: 'INIT_FROM_BOOKING';
      payload: {
        operatorStatus: BeautyBookingOperatorStatus;
        internalNote: string;
        shopContacted: boolean;
        customerContacted: boolean;
        followUpNeeded: boolean;
      };
    }
  | {
      type: 'SET_FIELD';
      payload: Partial<
        Pick<OperatorFormState, 'operatorStatus' | 'internalNote' | 'shopContacted' | 'customerContacted' | 'followUpNeeded'>
      >;
    }
  | { type: 'SAVE_START' }
  | { type: 'SAVE_SUCCESS' }
  | { type: 'SAVE_ERROR'; payload: string };

function operatorFormReducer(state: OperatorFormState, action: OperatorFormAction): OperatorFormState {
  switch (action.type) {
    case 'INIT_FROM_BOOKING':
      return { ...state, ...action.payload, error: null };
    case 'SET_FIELD':
      return { ...state, ...action.payload };
    case 'SAVE_START':
      return { ...state, isSaving: true, error: null };
    case 'SAVE_SUCCESS':
      return { ...state, isSaving: false };
    case 'SAVE_ERROR':
      return { ...state, isSaving: false, error: action.payload };
    default:
      return state;
  }
}

// ===================== Group C — alternativeReducer =====================
type AlternativeState = {
  slots: { date: string; time: string }[];
  note: string;
  isSubmitting: boolean;
  error: string | null;
};

type AlternativeAction =
  | { type: 'SET_SLOT'; payload: { index: number; field: 'date' | 'time'; value: string } }
  | { type: 'ADD_SLOT' }
  | { type: 'REMOVE_SLOT'; payload: number }
  | { type: 'SET_NOTE'; payload: string }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; payload: string };

function alternativeReducer(state: AlternativeState, action: AlternativeAction): AlternativeState {
  switch (action.type) {
    case 'SET_SLOT': {
      const slots = state.slots.map((slot, i) =>
        i === action.payload.index ? { ...slot, [action.payload.field]: action.payload.value } : slot,
      );
      return { ...state, slots };
    }
    case 'ADD_SLOT':
      return { ...state, slots: [...state.slots, { date: '', time: '' }] };
    case 'REMOVE_SLOT':
      return { ...state, slots: state.slots.filter((_, i) => i !== action.payload) };
    case 'SET_NOTE':
      return { ...state, note: action.payload };
    case 'SUBMIT_START':
      return { ...state, isSubmitting: true, error: null };
    case 'SUBMIT_SUCCESS':
      return { ...state, isSubmitting: false, slots: [{ date: '', time: '' }], note: '' };
    case 'SUBMIT_ERROR':
      return { ...state, isSubmitting: false, error: action.payload };
    default:
      return state;
  }
}

// ===================== Group D — notificationsReducer =====================
type NotificationsState = {
  notifications: BeautyBookingNotificationRecord[];
  loading: boolean;
  resendingId: string | null;
};

type NotificationsAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: BeautyBookingNotificationRecord[] }
  | { type: 'RESEND_START'; payload: string }
  | { type: 'RESEND_END' };

function notificationsReducer(state: NotificationsState, action: NotificationsAction): NotificationsState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true };
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, notifications: action.payload };
    case 'RESEND_START':
      return { ...state, resendingId: action.payload };
    case 'RESEND_END':
      return { ...state, resendingId: null };
    default:
      return state;
  }
}

// ===================== Group E — imageModalReducer =====================
type ImageModalState = {
  isLoading: boolean;
  error: string | null;
  activeImage: { url: string; title: string } | null;
};

type ImageModalAction =
  | { type: 'LOADING_START' }
  | { type: 'SHOW_IMAGE'; payload: { url: string; title: string } }
  | { type: 'IMAGE_ERROR'; payload: string }
  | { type: 'CLOSE' };

function imageModalReducer(state: ImageModalState, action: ImageModalAction): ImageModalState {
  switch (action.type) {
    case 'LOADING_START':
      return { ...state, isLoading: true, error: null };
    case 'SHOW_IMAGE':
      return { isLoading: false, error: null, activeImage: action.payload };
    case 'IMAGE_ERROR':
      return { ...state, isLoading: false, error: action.payload };
    case 'CLOSE':
      return { ...state, activeImage: null };
    default:
      return state;
  }
}

// ===================== Group F — statusActionReducer =====================
type StatusActionState = {
  error: string | null;
  success: string | null;
  pendingStatus: BeautyBookingAdminStatus | null;
  reviewNote: string;
  isReviewing: boolean;
};

type StatusActionAction =
  | { type: 'CLEAR_FEEDBACK' }
  | { type: 'STATUS_PENDING'; payload: BeautyBookingAdminStatus }
  | { type: 'STATUS_SUCCESS'; payload: string }
  | { type: 'STATUS_ERROR'; payload: string }
  | { type: 'REVIEW_START' }
  | { type: 'REVIEW_END' }
  | { type: 'SET_REVIEW_NOTE'; payload: string };

function statusActionReducer(state: StatusActionState, action: StatusActionAction): StatusActionState {
  switch (action.type) {
    case 'CLEAR_FEEDBACK':
      return { ...state, error: null, success: null };
    case 'STATUS_PENDING':
      return { ...state, pendingStatus: action.payload, error: null, success: null };
    case 'STATUS_SUCCESS':
      return { ...state, pendingStatus: null, success: action.payload };
    case 'STATUS_ERROR':
      return { ...state, pendingStatus: null, error: action.payload };
    case 'REVIEW_START':
      return { ...state, isReviewing: true, error: null, success: null };
    case 'REVIEW_END':
      return { ...state, isReviewing: false };
    case 'SET_REVIEW_NOTE':
      return { ...state, reviewNote: action.payload };
    default:
      return state;
  }
}

export default function AdminBeautyBookingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const detailRef = useRef<HTMLDivElement | null>(null);

  // Group G — 5개 useState 현행 유지
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<BeautyBookingAdminListStatus>(
    normalizeBeautyBookingAdminListStatus(searchParams.get('status')),
  );
  const [beautyCategoryFilter, setBeautyCategoryFilter] = useState(searchParams.get('beautyCategory') ?? 'all');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') ?? '');
  const deferredSearchQuery = useDeferredValue(searchQuery);

  // Group A
  const [bookingsList, dispatchBookings] = useReducer(bookingsListReducer, {
    bookings: [],
    selectedBookingId: null,
    loading: false,
    loadError: null,
  });

  // Group B
  const [operatorForm, dispatchOperatorForm] = useReducer(operatorFormReducer, {
    operatorStatus: 'pending_assignment',
    internalNote: '',
    shopContacted: false,
    customerContacted: false,
    followUpNeeded: false,
    isSaving: false,
    error: null,
  });

  // Group C
  const [alternative, dispatchAlternative] = useReducer(alternativeReducer, {
    slots: [{ date: '', time: '' }],
    note: '',
    isSubmitting: false,
    error: null,
  });

  // Group D
  const [notifs, dispatchNotifs] = useReducer(notificationsReducer, {
    notifications: [],
    loading: false,
    resendingId: null,
  });

  // Group E
  const [imageModal, dispatchImageModal] = useReducer(imageModalReducer, {
    isLoading: false,
    error: null,
    activeImage: null,
  });

  // Group F
  const [statusAction, dispatchStatusAction] = useReducer(statusActionReducer, {
    error: null,
    success: null,
    pendingStatus: null,
    reviewNote: '',
    isReviewing: false,
  });

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
      dispatchBookings({ type: 'FETCH_ERROR', payload: '관리자 세션을 다시 확인해 주세요.' });
      return;
    }

    dispatchBookings({ type: 'FETCH_START' });

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

      dispatchBookings({ type: 'FETCH_SUCCESS', payload: body.items });
    } catch (error) {
      dispatchBookings({
        type: 'FETCH_ERROR',
        payload: error instanceof Error ? error.message : '예약 목록을 불러오지 못했어요.',
      });
    }
  }, [beautyCategoryFilter, deferredSearchQuery, statusFilter]);

  useEffect(() => {
    if (isAdmin) {
      void fetchBookings();
    }
  }, [fetchBookings, isAdmin]);

  useEffect(() => {
    const { bookings, selectedBookingId } = bookingsList;
    if (!bookings.length || !selectedBookingId || !bookings.some((b) => b.id === selectedBookingId)) {
      dispatchBookings({ type: 'AUTO_SELECT_FIRST' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingsList.bookings, bookingsList.selectedBookingId]);

  useEffect(() => {
    dispatchStatusAction({ type: 'CLEAR_FEEDBACK' });
  }, [bookingsList.selectedBookingId]);

  const selectedBooking = useMemo(
    () => bookingsList.bookings.find((b) => b.id === bookingsList.selectedBookingId) ?? null,
    [bookingsList.bookings, bookingsList.selectedBookingId],
  );
  const selectedBookingHasImages = Boolean(
    selectedBooking &&
      (selectedBooking.hasCurrentImage ||
        selectedBooking.hasStyleImage ||
        selectedBooking.currentImageUrl ||
        selectedBooking.styleImageUrl),
  );

  useEffect(() => {
    if (selectedBooking) {
      dispatchOperatorForm({
        type: 'INIT_FROM_BOOKING',
        payload: {
          operatorStatus: selectedBooking.operatorStatus,
          internalNote: selectedBooking.internalNote,
          shopContacted: selectedBooking.shopContacted,
          customerContacted: selectedBooking.customerContacted,
          followUpNeeded: selectedBooking.followUpNeeded,
        },
      });
      void fetchNotifications(selectedBooking.id);
    }
  }, [selectedBooking]);

  const handleViewImage = async (type: 'current' | 'style') => {
    if (!selectedBooking) return;

    dispatchImageModal({ type: 'LOADING_START' });

    try {
      const accessToken = await getAdminAccessToken();
      if (!accessToken) throw new Error('관리자 세션을 확인해 주세요.');

      const response = await fetch(`/api/bookings/beauty/images/signed-url?bookingId=${selectedBooking.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const body = (await response.json()) as {
        ok: boolean;
        images: { imageType: 'current' | 'style'; signedUrl: string | null }[];
        error?: string;
      };

      if (body.ok && Array.isArray(body.images)) {
        const imgResult = body.images.find((img) => img.imageType === type);
        if (imgResult?.signedUrl) {
          dispatchImageModal({
            type: 'SHOW_IMAGE',
            payload: {
              url: imgResult.signedUrl,
              title: type === 'current' ? '현재 상태 이미지' : '희망 스타일 이미지',
            },
          });
        } else {
          dispatchImageModal({ type: 'IMAGE_ERROR', payload: '해당 이미지를 찾을 수 없습니다.' });
        }
      } else {
        throw new Error(body.error ?? '이미지 정보를 불러오지 못했습니다.');
      }
    } catch (error) {
      console.error('Failed to fetch signed URL:', error);
      dispatchImageModal({
        type: 'IMAGE_ERROR',
        payload: error instanceof Error ? error.message : '이미지를 불러올 수 없습니다.',
      });
    }
  };

  const fetchNotifications = async (bookingId: string) => {
    const accessToken = await getAdminAccessToken();
    if (!accessToken) return;

    dispatchNotifs({ type: 'FETCH_START' });
    try {
      const response = await fetch(`/api/bookings/beauty/${bookingId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const body = await response.json();
      dispatchNotifs({
        type: 'FETCH_SUCCESS',
        payload: body.ok && Array.isArray(body.notifications) ? body.notifications : [],
      });
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      dispatchNotifs({ type: 'FETCH_SUCCESS', payload: [] });
    }
  };

  const allowedTransitions = selectedBooking
    ? BEAUTY_BOOKING_ALLOWED_TRANSITIONS[selectedBooking.status] ?? []
    : [];

  const handleSelectBooking = (bookingId: string) => {
    dispatchBookings({ type: 'SELECT_BOOKING', payload: bookingId });
    dispatchStatusAction({ type: 'CLEAR_FEEDBACK' });
    setIsSheetOpen(true);
  };

  const handleStatusUpdate = async (nextStatus: BeautyBookingAdminStatus) => {
    if (!selectedBooking) return;

    const accessToken = await getAdminAccessToken();
    if (!accessToken) {
      dispatchStatusAction({ type: 'STATUS_ERROR', payload: '관리자 세션을 다시 확인해 주세요.' });
      return;
    }

    dispatchStatusAction({ type: 'STATUS_PENDING', payload: nextStatus });

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

      dispatchBookings({ type: 'UPDATE_BOOKING', payload: body.item });
      dispatchStatusAction({ type: 'STATUS_SUCCESS', payload: '예약 상태를 업데이트했어요.' });
    } catch (error) {
      dispatchStatusAction({
        type: 'STATUS_ERROR',
        payload: error instanceof Error ? error.message : '예약 상태를 변경하지 못했어요.',
      });
    }
  };

  const handleReviewChangeRequest = async (action: 'approved' | 'rejected') => {
    if (!selectedBooking) return;

    const accessToken = await getAdminAccessToken();
    if (!accessToken) {
      dispatchStatusAction({ type: 'STATUS_ERROR', payload: '관리자 세션을 다시 확인해 주세요.' });
      return;
    }

    dispatchStatusAction({ type: 'REVIEW_START' });

    try {
      const response = await fetch(`/api/bookings/beauty/${selectedBooking.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ action, note: statusAction.reviewNote.trim() }),
      });

      const body = (await response.json().catch(() => null)) as
        | { ok?: boolean; item?: BeautyBookingAdminRecord; error?: string }
        | null;

      if (!response.ok || body?.ok !== true || !body.item) {
        throw new Error(body?.error ?? '변경 요청 처리에 실패했어요.');
      }

      dispatchBookings({ type: 'UPDATE_BOOKING', payload: body.item });
      dispatchStatusAction({
        type: 'STATUS_SUCCESS',
        payload: action === 'approved' ? '변경 요청을 승인했어요.' : '변경 요청을 반려했어요.',
      });
      dispatchStatusAction({ type: 'SET_REVIEW_NOTE', payload: '' });
    } catch (error) {
      dispatchStatusAction({
        type: 'STATUS_ERROR',
        payload: error instanceof Error ? error.message : '변경 요청 처리에 실패했어요.',
      });
    } finally {
      dispatchStatusAction({ type: 'REVIEW_END' });
    }
  };

  const handleUpdateOperatorInfo = async () => {
    if (!selectedBooking) return;

    const accessToken = await getAdminAccessToken();
    if (!accessToken) {
      dispatchOperatorForm({ type: 'SAVE_ERROR', payload: '관리자 세션을 다시 확인해 주세요.' });
      return;
    }

    dispatchOperatorForm({ type: 'SAVE_START' });

    try {
      const response = await fetch(`/api/bookings/beauty/${selectedBooking.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          action: 'update_operator_info',
          operatorStatus: operatorForm.operatorStatus,
          internalNote: operatorForm.internalNote,
          shopContacted: operatorForm.shopContacted,
          customerContacted: operatorForm.customerContacted,
          followUpNeeded: operatorForm.followUpNeeded,
        }),
      });

      const body = (await response.json()) as { ok?: boolean; item?: BeautyBookingAdminRecord; error?: string };

      if (!response.ok || body?.ok !== true || !body.item) {
        throw new Error(body?.error ?? '기록 저장에 실패했어요.');
      }

      dispatchBookings({ type: 'UPDATE_BOOKING', payload: body.item });
      dispatchStatusAction({ type: 'STATUS_SUCCESS', payload: '내부 처리 상태를 저장했습니다.' });
      dispatchOperatorForm({ type: 'SAVE_SUCCESS' });
    } catch (error) {
      dispatchOperatorForm({
        type: 'SAVE_ERROR',
        payload: error instanceof Error ? error.message : '기록 저장 중 오류가 발생했습니다.',
      });
    }
  };

  const handleOfferAlternative = async () => {
    if (!selectedBooking) return;

    const accessToken = await getAdminAccessToken();
    if (!accessToken) {
      dispatchAlternative({ type: 'SUBMIT_ERROR', payload: '관리자 세션을 다시 확인해 주세요.' });
      return;
    }

    const validSlots = alternative.slots.filter((s) => s.date && s.time);
    if (validSlots.length === 0) {
      dispatchAlternative({ type: 'SUBMIT_ERROR', payload: '최소 한 개의 제안 일정이 필요합니다.' });
      return;
    }

    dispatchAlternative({ type: 'SUBMIT_START' });

    try {
      const response = await fetch(`/api/bookings/beauty/${selectedBooking.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          action: 'offer_alternative',
          alternativeItems: validSlots,
          note: alternative.note,
        }),
      });

      const body = (await response.json()) as { ok?: boolean; item?: BeautyBookingAdminRecord; error?: string };

      if (!response.ok || body?.ok !== true || !body.item) {
        throw new Error(body?.error ?? '제안 전송에 실패했어요.');
      }

      dispatchBookings({ type: 'UPDATE_BOOKING', payload: body.item });
      dispatchStatusAction({ type: 'STATUS_SUCCESS', payload: '대체 일정 제안을 고객에게 전송했습니다.' });
      dispatchAlternative({ type: 'SUBMIT_SUCCESS' });
    } catch (error) {
      dispatchAlternative({
        type: 'SUBMIT_ERROR',
        payload: error instanceof Error ? error.message : '제안 전송 중 오류가 발생했습니다.',
      });
    }
  };

  const handleResendNotification = async (notificationId: string) => {
    if (!selectedBooking) return;

    const accessToken = await getAdminAccessToken();
    if (!accessToken) return;

    dispatchNotifs({ type: 'RESEND_START', payload: notificationId });
    try {
      const response = await fetch(`/api/bookings/beauty/${selectedBooking.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ action: 'resend_notification', notificationId }),
      });

      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error ?? '재전송 실패');

      dispatchStatusAction({ type: 'STATUS_SUCCESS', payload: '알림을 재전송했습니다.' });
      void fetchNotifications(selectedBooking.id);
    } catch (error) {
      dispatchStatusAction({
        type: 'STATUS_ERROR',
        payload: error instanceof Error ? error.message : '알림 재전송 실패',
      });
    } finally {
      dispatchNotifs({ type: 'RESEND_END' });
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
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', padding: '4px 0', color: '#64748b', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          aria-label="뒤로가기"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <h1 className={sharedStyles.headerTitle}>💼 뷰티 예약 관리</h1>
        <span className={sharedStyles.adminBadge}>ADMIN</span>
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
              <button className={styles.refreshButton} onClick={() => void fetchBookings()} disabled={bookingsList.loading}>
                {bookingsList.loading ? '불러오는 중...' : '새로고침'}
              </button>
            </div>

            {bookingsList.loadError ? <div className={styles.errorState}>{bookingsList.loadError}</div> : null}

            {bookingsList.loading ? <div className={styles.emptyState}>예약 목록을 불러오는 중입니다.</div> : null}

            {!bookingsList.loading && !bookingsList.loadError && bookingsList.bookings.length === 0 ? (
              <div className={styles.emptyState}>조건에 맞는 예약 요청이 없습니다.</div>
            ) : null}

            {!bookingsList.loading && bookingsList.bookings.length > 0 ? (
              <div className={styles.bookingList}>
                {bookingsList.bookings.map((booking) => (
                  <button
                    key={booking.id}
                    type="button"
                    className={`${styles.bookingCard} ${bookingsList.selectedBookingId === booking.id ? styles.bookingCardActive : ''}`}
                    onClick={() => handleSelectBooking(booking.id)}
                    aria-pressed={bookingsList.selectedBookingId === booking.id}
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
                      <span className={styles.regionText}>
                        {booking.hasCurrentImage || booking.hasStyleImage ? '?대?吏 泥⑤? ?덉쓬' : '泥⑤???놁쓬'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </section>

          <section ref={detailRef} className={`${styles.detailSection} ${isSheetOpen ? styles.detailSectionOpen : ''}`}>
            <div className={styles.sheetHandle} />
            <div className={styles.sheetHeaderRow}>
              <h3 className={styles.sheetHeaderTitle}>예약 상세</h3>
              <button
                className={styles.sheetCloseBtn}
                onClick={() => setIsSheetOpen(false)}
                aria-label="닫기"
              >✕</button>
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
                        <dt>Email</dt>
                        <dd>{selectedBooking.customerEmail ?? '媛?ν븳 ?대찓???놁쓬'}</dd>
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
                        <dt>서비스 약관 동의</dt>
                        <dd>{selectedBooking.agreements.serviceTermsAgreed ? '동의' : '미동의'}</dd>
                      </div>
                      <div>
                        <dt>개인정보 수집 동의</dt>
                        <dd>{selectedBooking.agreements.privacyPolicyAgreed ? '동의' : '미동의'}</dd>
                      </div>
                      <div>
                        <dt>제3자 제공 동의</dt>
                        <dd>{selectedBooking.agreements.thirdPartySharingAgreed ? '동의' : '미동의'}</dd>
                      </div>
                      <div>
                        <dt>마케팅 정보 수신</dt>
                        <dd>{selectedBooking.agreements.marketingConsentAgreed ? '동의' : '미동의'}</dd>
                      </div>
                    </dl>
                  </section>

                  <section className={styles.infoBlock}>
                    <h5 className={styles.blockTitle}>참조 이미지</h5>
                    <dl className={styles.detailList}>
                      <div>
                        <dt>Attachment</dt>
                        <dd>{selectedBookingHasImages ? 'Attached' : 'None'}</dd>
                      </div>
                      <div>
                        <dt>Current image file</dt>
                        <dd>{selectedBooking.currentImageName ?? (selectedBooking.hasCurrentImage ? 'Stored image' : 'None')}</dd>
                      </div>
                      <div>
                        <dt>Style image file</dt>
                        <dd>{selectedBooking.styleImageName ?? (selectedBooking.hasStyleImage ? 'Stored image' : 'None')}</dd>
                      </div>
                    </dl>
                    <div className={styles.imageActions}>
                      {!selectedBookingHasImages && (
                        <p className={styles.sectionText} style={{ color: 'var(--gray-400)' }}>등록된 이미지가 없습니다.</p>
                      )}

                      {selectedBooking.hasCurrentImage && (
                        <button
                          type="button"
                          className={styles.imageButton}
                          onClick={() => void handleViewImage('current')}
                          disabled={imageModal.isLoading}
                        >
                          <span className={styles.imageButtonIcon}>📸</span> 현재 이미지 보기
                        </button>
                      )}

                      {selectedBooking.hasStyleImage && (
                        <button
                          type="button"
                          className={styles.imageButton}
                          onClick={() => void handleViewImage('style')}
                          disabled={imageModal.isLoading}
                        >
                          <span className={styles.imageButtonIcon}>✨</span> 스타일 이미지 보기
                        </button>
                      )}
                    </div>
                    {imageModal.isLoading && <p className={styles.sectionText} style={{ marginTop: 8 }}>불러오는 중...</p>}
                    {imageModal.error && <p className={styles.errorState} style={{ marginTop: 8, padding: '6px 12px', fontSize: '0.75rem' }}>{imageModal.error}</p>}
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
                        value={statusAction.reviewNote}
                        onChange={(e) => dispatchStatusAction({ type: 'SET_REVIEW_NOTE', payload: e.target.value })}
                        disabled={statusAction.isReviewing}
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
                          disabled={statusAction.isReviewing}
                        >
                          {statusAction.isReviewing ? '처리 중...' : '요청 승인'}
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
                          disabled={statusAction.isReviewing}
                        >
                          {statusAction.isReviewing ? '처리 중...' : '요청 반려'}
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
                        value={operatorForm.operatorStatus}
                        onChange={(e) => dispatchOperatorForm({ type: 'SET_FIELD', payload: { operatorStatus: e.target.value as BeautyBookingOperatorStatus } })}
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
                        value={operatorForm.internalNote}
                        onChange={(e) => dispatchOperatorForm({ type: 'SET_FIELD', payload: { internalNote: e.target.value } })}
                        placeholder="매장과 조율 중인 내용이나 특이 사항을 기록하세요 (고객에게 노출 안됨)"
                      />
                    </label>
                  </div>

                  <div style={{ margin: '16px 0', display: 'flex', flexWrap: 'wrap', gap: 20 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
                      <input type="checkbox" checked={operatorForm.shopContacted} onChange={(e) => dispatchOperatorForm({ type: 'SET_FIELD', payload: { shopContacted: e.target.checked } })} style={{ width: 16, height: 16 }} />
                      매장 연락 완료
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
                      <input type="checkbox" checked={operatorForm.customerContacted} onChange={(e) => dispatchOperatorForm({ type: 'SET_FIELD', payload: { customerContacted: e.target.checked } })} style={{ width: 16, height: 16 }} />
                      고객 추가 안내 완료
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600, color: operatorForm.followUpNeeded ? '#dc2626' : 'inherit' }}>
                      <input type="checkbox" checked={operatorForm.followUpNeeded} onChange={(e) => dispatchOperatorForm({ type: 'SET_FIELD', payload: { followUpNeeded: e.target.checked } })} style={{ width: 16, height: 16 }} />
                      사후 관리 필요 (Follow-up)
                    </label>
                  </div>

                  {operatorForm.error && <p style={{ color: '#dc2626', fontSize: '0.8rem', marginBottom: 12 }}>{operatorForm.error}</p>}

                  <button
                    onClick={handleUpdateOperatorInfo}
                    disabled={operatorForm.isSaving}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: '#701a75',
                      color: 'white',
                      border: 'none',
                      borderRadius: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                    }}
                  >
                    {operatorForm.isSaving ? '내부 기록 저장 중...' : '내부 기록 및 상태 저장'}
                  </button>
                </section>

                <section className={styles.operatorSection} style={{ backgroundColor: '#fff7ed', border: '1.5px solid #ffedd5', borderRadius: 16, padding: 20, marginTop: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#9a3412' }}>📅 대체 일정 제안 (Alternative Offer)</h5>
                    <span style={{ fontSize: '0.7rem', background: '#ffedd5', color: '#9a3412', padding: '2px 8px', borderRadius: 999, fontWeight: 700 }}>고객 전송 가능</span>
                  </div>

                  <div style={{ display: 'grid', gap: 12 }}>
                    {alternative.slots.map((slot, index) => (
                      <div key={index} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          type="date"
                          className={styles.input}
                          style={{ flex: 2, borderColor: '#ffedd5' }}
                          value={slot.date}
                          onChange={(e) => dispatchAlternative({ type: 'SET_SLOT', payload: { index, field: 'date', value: e.target.value } })}
                        />
                        <input
                          type="time"
                          className={styles.input}
                          style={{ flex: 1, borderColor: '#ffedd5' }}
                          value={slot.time}
                          onChange={(e) => dispatchAlternative({ type: 'SET_SLOT', payload: { index, field: 'time', value: e.target.value } })}
                        />
                        {alternative.slots.length > 1 && (
                          <button
                            onClick={() => dispatchAlternative({ type: 'REMOVE_SLOT', payload: index })}
                            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '1.2rem' }}
                          >×</button>
                        )}
                      </div>
                    ))}

                    {alternative.slots.length < 3 && (
                      <button
                        onClick={() => dispatchAlternative({ type: 'ADD_SLOT' })}
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
                        value={alternative.note}
                        onChange={(e) => dispatchAlternative({ type: 'SET_NOTE', payload: e.target.value })}
                        placeholder="마감 안내 및 제안 사유를 입력하세요"
                      />
                    </label>
                  </div>

                  {alternative.error && <p style={{ color: '#dc2626', fontSize: '0.8rem', marginBottom: 12, marginTop: 12 }}>{alternative.error}</p>}

                  <button
                    onClick={handleOfferAlternative}
                    disabled={alternative.isSubmitting}
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
                      fontSize: '0.9rem',
                    }}
                  >
                    {alternative.isSubmitting ? '제안 전송 중...' : '대체 일정 제안 보내기'}
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
                      disabled={notifs.loading}
                      style={{ background: 'none', border: 'none', color: '#7c3aed', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      {notifs.loading ? '불러오는 중...' : '새로고침'}
                    </button>
                  </div>

                  {notifs.notifications.length === 0 ? (
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
                          {notifs.notifications.map((notif) => (
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
                                    color: notif.dispatch_status === 'sent' ? '#166534' : notif.dispatch_status === 'failed' ? '#991b1b' : '#475569',
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
                                    notifs.resendingId === notif.id ||
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
                                    cursor: (notif.resend_count >= 3 || !!(notif.last_resent_at && (Date.now() - new Date(notif.last_resent_at).getTime() < 5 * 60 * 1000))) ? 'not-allowed' : 'pointer',
                                  }}
                                >
                                  {notifs.resendingId === notif.id ? '...' :
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

                  {statusAction.error ? <p className={styles.actionError}>{statusAction.error}</p> : null}
                  {statusAction.success ? <p className={styles.actionSuccess}>{statusAction.success}</p> : null}

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
                          disabled={statusAction.pendingStatus !== null}
                        >
                          {statusAction.pendingStatus === nextStatus ? '변경 중...' : getStatusActionLabel(nextStatus)}
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              </article>
            )}
          </section>
        </div>

        {isSheetOpen && (
          <div
            className={styles.backdrop}
            onClick={() => setIsSheetOpen(false)}
            aria-hidden="true"
          />
        )}

        <div style={{ height: '200px', minHeight: '200px', flexShrink: 0, width: '100%', pointerEvents: 'none' }} />
      </div>

      {imageModal.activeImage && (
        <div className={styles.modalOverlay} onClick={() => dispatchImageModal({ type: 'CLOSE' })}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => dispatchImageModal({ type: 'CLOSE' })} aria-label="닫기">✕</button>
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
      )}
    </div>
  );
}
