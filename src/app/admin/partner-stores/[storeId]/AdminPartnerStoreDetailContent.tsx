'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

import sharedStyles from '../../admin.module.css';
import styles from '../partner-stores.module.css';
import { supabase } from '@/lib/supabaseClient';
import type {
  PartnerStoreDetail,
  PartnerStoreMenuItem,
  PartnerStorePhoto,
  PartnerStoreReviewStatus,
} from '@/lib/admin/partnerStoreAdmin.ts';

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  hair: '헤어',
  nail: '네일',
  eyelash: '속눈썹',
  makeup: '메이크업',
  esthetic: '에스테틱',
  waxing: '왁싱',
};

const DAY_OF_WEEK_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

const SLOT_TYPE_LABELS: Record<string, string> = {
  representative: '대표',
  interior: '내부',
  treatment: '시술',
};

type Props = {
  storeId: string;
};

async function getAdminAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token ?? null;
}

function formatMenuItemPrice(item: PartnerStoreMenuItem) {
  const formatter = new Intl.NumberFormat('ko-KR');

  if (item.priceType === 'range' && item.priceMin != null && item.priceMax != null) {
    return `₩${formatter.format(item.priceMin)} ~ ₩${formatter.format(item.priceMax)}`;
  }

  if (item.priceType === 'from' && item.price != null) {
    return `₩${formatter.format(item.price)}~`;
  }

  if (item.price != null) {
    return `₩${formatter.format(item.price)}`;
  }

  return '-';
}

function formatTime(value: string | null) {
  if (!value) return null;
  return value.slice(0, 5);
}

export default function AdminPartnerStoreDetailContent({ storeId }: Props) {
  const router = useRouter();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [detail, setDetail] = useState<PartnerStoreDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [menuOverrides, setMenuOverrides] = useState<Map<string, PartnerStoreReviewStatus>>(new Map());
  const [photoOverrides, setPhotoOverrides] = useState<Map<string, PartnerStoreReviewStatus>>(new Map());
  const [savingMenu, setSavingMenu] = useState(false);
  const [savingPhotos, setSavingPhotos] = useState(false);
  const [storeActionLoading, setStoreActionLoading] = useState(false);

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const [toast, setToast] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

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

  const fetchDetail = useCallback(async () => {
    const accessToken = await getAdminAccessToken();

    if (!accessToken) {
      setLoadError('관리자 세션을 다시 확인해 주세요.');
      return;
    }

    setLoading(true);
    setLoadError(null);

    try {
      const response = await fetch(`/api/admin/partner-stores/${storeId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: 'no-store',
      });

      const body = (await response.json().catch(() => null)) as
        | ({ ok: true } & PartnerStoreDetail)
        | { ok: false; error?: string }
        | null;

      if (!response.ok || !body || body.ok !== true) {
        const message = body && body.ok === false ? body.error : undefined;
        throw new Error(message ?? '매장 정보를 불러오지 못했어요.');
      }

      setDetail(body);
      setMenuOverrides(new Map());
      setPhotoOverrides(new Map());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : '매장 정보를 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    if (isAdmin) {
      void fetchDetail();
    }
  }, [fetchDetail, isAdmin]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  const categorizedMenuItems = useMemo(() => {
    if (!detail) return [];

    const categoryNameById = new Map(detail.categories.map((category) => [category.id, category.name]));
    const groups = new Map<string, { name: string; items: PartnerStoreMenuItem[] }>();

    for (const item of detail.menuItems) {
      const key = item.categoryId ?? 'uncategorized';
      const name = item.categoryId
        ? categoryNameById.get(item.categoryId) ?? '미분류'
        : '미분류';

      if (!groups.has(key)) {
        groups.set(key, { name, items: [] });
      }
      groups.get(key)!.items.push(item);
    }

    return Array.from(groups.values());
  }, [detail]);

  const handleMenuToggle = (item: PartnerStoreMenuItem, status: PartnerStoreReviewStatus) => {
    setMenuOverrides((prev) => {
      const next = new Map(prev);
      const current = next.get(item.id) ?? item.reviewStatus;

      if (current === status) {
        next.delete(item.id);
      } else {
        next.set(item.id, status);
      }

      return next;
    });
  };

  const handlePhotoToggle = (photo: PartnerStorePhoto, status: PartnerStoreReviewStatus) => {
    setPhotoOverrides((prev) => {
      const next = new Map(prev);
      const current = next.get(photo.id) ?? photo.reviewStatus;

      if (current === status) {
        next.delete(photo.id);
      } else {
        next.set(photo.id, status);
      }

      return next;
    });
  };

  const handleSaveMenuItems = async () => {
    if (menuOverrides.size === 0) return;

    const accessToken = await getAdminAccessToken();
    if (!accessToken) {
      setToast({ tone: 'error', message: '관리자 세션을 다시 확인해 주세요.' });
      return;
    }

    setSavingMenu(true);

    try {
      const items = Array.from(menuOverrides.entries()).map(([id, review_status]) => ({ id, review_status }));

      const response = await fetch(`/api/admin/partner-stores/${storeId}/menu-items`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ items }),
      });

      const body = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;

      if (!response.ok || body?.ok !== true) {
        throw new Error(body?.error ?? '저장에 실패했어요.');
      }

      setToast({ tone: 'success', message: '메뉴 검수 결과를 저장했어요.' });
      await fetchDetail();
    } catch (error) {
      setToast({ tone: 'error', message: error instanceof Error ? error.message : '저장에 실패했어요.' });
    } finally {
      setSavingMenu(false);
    }
  };

  const handleSavePhotos = async () => {
    if (photoOverrides.size === 0) return;

    const accessToken = await getAdminAccessToken();
    if (!accessToken) {
      setToast({ tone: 'error', message: '관리자 세션을 다시 확인해 주세요.' });
      return;
    }

    setSavingPhotos(true);

    try {
      const photos = Array.from(photoOverrides.entries()).map(([id, review_status]) => ({ id, review_status }));

      const response = await fetch(`/api/admin/partner-stores/${storeId}/photos`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ photos }),
      });

      const body = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;

      if (!response.ok || body?.ok !== true) {
        throw new Error(body?.error ?? '저장에 실패했어요.');
      }

      setToast({ tone: 'success', message: '사진 검수 결과를 저장했어요.' });
      await fetchDetail();
    } catch (error) {
      setToast({ tone: 'error', message: error instanceof Error ? error.message : '저장에 실패했어요.' });
    } finally {
      setSavingPhotos(false);
    }
  };

  const submitStoreReview = async (review_status: 'approved' | 'rejected', review_reason?: string) => {
    const accessToken = await getAdminAccessToken();
    if (!accessToken) {
      setToast({ tone: 'error', message: '관리자 세션을 다시 확인해 주세요.' });
      return;
    }

    setStoreActionLoading(true);

    try {
      const response = await fetch(`/api/admin/partner-stores/${storeId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ review_status, ...(review_reason !== undefined ? { review_reason } : {}) }),
      });

      const body = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;

      if (!response.ok || body?.ok !== true) {
        throw new Error(body?.error ?? '저장에 실패했어요.');
      }

      setToast({
        tone: 'success',
        message: review_status === 'approved' ? '매장을 승인했어요.' : '매장을 반려했어요.',
      });
      setRejectModalOpen(false);
      setRejectReason('');
      await fetchDetail();
    } catch (error) {
      setToast({ tone: 'error', message: error instanceof Error ? error.message : '저장에 실패했어요.' });
    } finally {
      setStoreActionLoading(false);
    }
  };

  if (isAdmin === null) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
        <div style={{ width: 36, height: 36, border: '3px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: 'var(--background)', padding: 24 }}>
        <div style={{ fontSize: '3rem' }}>🔒</div>
        <h2 style={{ fontWeight: 700, fontSize: '1.2rem', margin: 0 }}>관리자 전용 페이지</h2>
        <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem', textAlign: 'center' }}>접근 권한이 없습니다.</p>
        <button onClick={() => router.push('/admin')} style={{ padding: '12px 28px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 14, fontWeight: 700, cursor: 'pointer' }}>
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
          style={{ background: 'none', border: 'none', padding: '4px 0', color: '#64748b', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          aria-label="뒤로가기"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <h1 className={sharedStyles.headerTitle}>{detail?.store.name ?? '제휴 매장 검수'}</h1>
        <span className={sharedStyles.adminBadge}>ADMIN</span>
      </header>

      <div className={sharedStyles.content}>
        {loadError ? <div className={styles.errorState}>{loadError}</div> : null}
        {loading && !detail ? <div className={styles.emptyState}>불러오는 중...</div> : null}

        {detail ? (
          <div className={styles.detailPage}>
            <div className={styles.detailCard}>
              <div className={styles.detailHeader}>
                <div className={styles.detailHeaderCopy}>
                  <h2 className={styles.detailTitle}>{detail.store.name ?? '이름 없는 매장'}</h2>
                  <p className={styles.detailSub}>{detail.store.address ?? '주소 미등록'}</p>
                </div>
                <span className={`${styles.statusBadge} ${
                  detail.store.reviewStatus === 'pending' ? styles.statusPending
                    : detail.store.reviewStatus === 'approved' ? styles.statusApproved
                      : styles.statusRejected
                }`}>
                  {detail.store.reviewStatus === 'pending'
                    ? '검수대기'
                    : detail.store.reviewStatus === 'approved'
                      ? '승인됨'
                      : '반려'}
                </span>
              </div>

              {detail.store.reviewStatus === 'rejected' && detail.store.reviewReason ? (
                <div className={styles.reviewReasonNote}>
                  <strong>반려 사유:</strong> {detail.store.reviewReason}
                </div>
              ) : null}

              <div className={styles.summaryGrid}>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>업종</span>
                  <strong>{detail.store.businessTypes.map((type) => BUSINESS_TYPE_LABELS[type] ?? type).join(', ') || '-'}</strong>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>연락처</span>
                  <strong>{detail.store.phone ?? '-'}</strong>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>게시 상태</span>
                  <strong>
                    {detail.store.published ? '게시됨' : '비공개'}
                    {' '}
                    <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)', fontWeight: 400 }}>
                      (매장 사장님이 직접 전환)
                    </span>
                  </strong>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>동시 처리 인원 / 준비시간 / 슬롯 간격</span>
                  <strong>
                    {detail.store.capacity ?? '-'} / {detail.store.leadTimeHours ?? '-'}시간 / {detail.store.slotIntervalMinutes ?? '-'}분
                  </strong>
                </div>
              </div>

              <div className={styles.actionRow}>
                <button
                  type="button"
                  className={`${styles.actionButton} ${styles.actionApprove}`}
                  disabled={storeActionLoading}
                  onClick={() => void submitStoreReview('approved')}
                >
                  매장 승인
                </button>
                <button
                  type="button"
                  className={`${styles.actionButton} ${styles.actionReject}`}
                  disabled={storeActionLoading}
                  onClick={() => setRejectModalOpen(true)}
                >
                  매장 반려
                </button>
              </div>
            </div>

            <div className={styles.detailCard}>
              <h3 className={styles.sectionTitle}>영업시간</h3>
              {detail.businessHours.length === 0 ? (
                <div className={styles.emptyState}>등록된 영업시간이 없습니다.</div>
              ) : (
                <div className={styles.hoursGrid}>
                  {detail.businessHours.map((hours) => (
                    <div key={hours.dayOfWeek} className={styles.hoursRow}>
                      <span className={styles.hoursDay}>{DAY_OF_WEEK_LABELS[hours.dayOfWeek] ?? hours.dayOfWeek}</span>
                      {hours.isOpen ? (
                        <span className={styles.hoursTime}>
                          {formatTime(hours.startTime)} - {formatTime(hours.endTime)}
                          {hours.breakStartTime && hours.breakEndTime
                            ? ` (휴게 ${formatTime(hours.breakStartTime)}-${formatTime(hours.breakEndTime)})`
                            : ''}
                        </span>
                      ) : (
                        <span className={styles.hoursClosed}>휴무</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.detailCard}>
              <div className={styles.sectionHeaderRow}>
                <h3 className={styles.sectionTitle}>메뉴 검수</h3>
              </div>
              {categorizedMenuItems.length === 0 ? (
                <div className={styles.emptyState}>등록된 메뉴가 없습니다.</div>
              ) : (
                categorizedMenuItems.map((group) => (
                  <div key={group.name} className={styles.categoryBlock}>
                    <p className={styles.categoryTitle}>{group.name}</p>
                    {group.items.map((item) => {
                      const effectiveStatus = menuOverrides.get(item.id) ?? item.reviewStatus;
                      return (
                        <div key={item.id} className={styles.itemRow}>
                          <div className={styles.itemInfo}>
                            <div className={styles.itemName}>{item.name ?? '-'}{!item.visible ? ' (비공개)' : ''}</div>
                            <div className={styles.itemMeta}>
                              {formatMenuItemPrice(item)} · {item.durationMin != null ? `${item.durationMin}분` : '-'}
                              {item.options.length > 0 ? ` · 옵션 ${item.options.length}개` : ''}
                            </div>
                          </div>
                          <div className={styles.toggleGroup}>
                            <button
                              type="button"
                              className={`${styles.toggleBtn} ${effectiveStatus === 'approved' ? styles.toggleApproveActive : ''}`}
                              onClick={() => handleMenuToggle(item, 'approved')}
                            >
                              승인
                            </button>
                            <button
                              type="button"
                              className={`${styles.toggleBtn} ${effectiveStatus === 'rejected' ? styles.toggleRejectActive : ''}`}
                              onClick={() => handleMenuToggle(item, 'rejected')}
                            >
                              반려
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
              {categorizedMenuItems.length > 0 ? (
                <div className={styles.saveBar}>
                  <button
                    type="button"
                    className={styles.saveButton}
                    disabled={menuOverrides.size === 0 || savingMenu}
                    onClick={() => void handleSaveMenuItems()}
                  >
                    {savingMenu ? '저장 중...' : '변경사항 저장'}
                  </button>
                </div>
              ) : null}
            </div>

            <div className={styles.detailCard}>
              <div className={styles.sectionHeaderRow}>
                <h3 className={styles.sectionTitle}>사진 검수</h3>
              </div>
              {detail.photos.length === 0 ? (
                <div className={styles.emptyState}>등록된 사진이 없습니다.</div>
              ) : (
                <div className={styles.photoGrid}>
                  {detail.photos.map((photo) => {
                    const effectiveStatus = photoOverrides.get(photo.id) ?? photo.reviewStatus;
                    return (
                      <div key={photo.id} className={styles.photoCard}>
                        <div className={styles.photoImageWrap}>
                          {photo.signedUrl ? (
                            <Image
                              src={photo.signedUrl}
                              alt={SLOT_TYPE_LABELS[photo.slotType ?? ''] ?? photo.slotType ?? 'photo'}
                              fill
                              unoptimized
                              style={{ objectFit: 'cover' }}
                            />
                          ) : null}
                        </div>
                        <div className={styles.photoMeta}>
                          {SLOT_TYPE_LABELS[photo.slotType ?? ''] ?? photo.slotType ?? '-'}
                          {photo.slotIndex != null ? ` #${photo.slotIndex + 1}` : ''}
                        </div>
                        <div className={styles.photoToggleRow}>
                          <div className={styles.toggleGroup}>
                            <button
                              type="button"
                              className={`${styles.toggleBtn} ${effectiveStatus === 'approved' ? styles.toggleApproveActive : ''}`}
                              onClick={() => handlePhotoToggle(photo, 'approved')}
                            >
                              승인
                            </button>
                            <button
                              type="button"
                              className={`${styles.toggleBtn} ${effectiveStatus === 'rejected' ? styles.toggleRejectActive : ''}`}
                              onClick={() => handlePhotoToggle(photo, 'rejected')}
                            >
                              반려
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {detail.photos.length > 0 ? (
                <div className={styles.saveBar}>
                  <button
                    type="button"
                    className={styles.saveButton}
                    disabled={photoOverrides.size === 0 || savingPhotos}
                    onClick={() => void handleSavePhotos()}
                  >
                    {savingPhotos ? '저장 중...' : '변경사항 저장'}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div style={{ height: '160px', minHeight: '160px', flexShrink: 0, width: '100%', pointerEvents: 'none' }} />
      </div>

      {toast ? (
        <div className={`${styles.toast} ${toast.tone === 'success' ? styles.toastSuccess : styles.toastError}`}>
          {toast.message}
        </div>
      ) : null}

      {rejectModalOpen ? (
        <div className={styles.modalOverlay} onClick={() => setRejectModalOpen(false)}>
          <div className={styles.modalSheet} onClick={(event) => event.stopPropagation()}>
            <h3 className={styles.modalTitle}>매장 반려 사유 입력</h3>
            <p className={styles.modalDesc}>반려 사유는 매장 사장님에게 전달됩니다.</p>
            <textarea
              className={styles.modalTextarea}
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="반려 사유를 입력하세요"
            />
            <button
              type="button"
              className={styles.modalConfirmButton}
              disabled={storeActionLoading}
              onClick={() => void submitStoreReview('rejected', rejectReason)}
            >
              반려 확정
            </button>
            <button type="button" className={styles.modalCancelButton} onClick={() => setRejectModalOpen(false)}>
              취소
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
