'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
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
      setLoadError(t('admin.session_required', { defaultValue: '관리자 세션을 다시 확인해 주세요.' }));
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
        throw new Error(message ?? t('admin.partner_store_load_failed', { defaultValue: '매장 정보를 불러오지 못했어요.' }));
      }

      setDetail(body);
      setMenuOverrides(new Map());
      setPhotoOverrides(new Map());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : t('admin.partner_store_load_failed', { defaultValue: '매장 정보를 불러오지 못했어요.' }));
    } finally {
      setLoading(false);
    }
  }, [storeId, t]);

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
        ? categoryNameById.get(item.categoryId) ?? t('admin.partner_store_uncategorized', { defaultValue: '미분류' })
        : t('admin.partner_store_uncategorized', { defaultValue: '미분류' });

      if (!groups.has(key)) {
        groups.set(key, { name, items: [] });
      }
      groups.get(key)!.items.push(item);
    }

    return Array.from(groups.values());
  }, [detail, t]);

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
      setToast({ tone: 'error', message: t('admin.session_required', { defaultValue: '관리자 세션을 다시 확인해 주세요.' }) });
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
        throw new Error(body?.error ?? t('admin.partner_store_save_failed', { defaultValue: '저장에 실패했어요.' }));
      }

      setToast({ tone: 'success', message: t('admin.partner_store_menu_saved', { defaultValue: '메뉴 검수 결과를 저장했어요.' }) });
      await fetchDetail();
    } catch (error) {
      setToast({ tone: 'error', message: error instanceof Error ? error.message : t('admin.partner_store_save_failed', { defaultValue: '저장에 실패했어요.' }) });
    } finally {
      setSavingMenu(false);
    }
  };

  const handleSavePhotos = async () => {
    if (photoOverrides.size === 0) return;

    const accessToken = await getAdminAccessToken();
    if (!accessToken) {
      setToast({ tone: 'error', message: t('admin.session_required', { defaultValue: '관리자 세션을 다시 확인해 주세요.' }) });
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
        throw new Error(body?.error ?? t('admin.partner_store_save_failed', { defaultValue: '저장에 실패했어요.' }));
      }

      setToast({ tone: 'success', message: t('admin.partner_store_photos_saved', { defaultValue: '사진 검수 결과를 저장했어요.' }) });
      await fetchDetail();
    } catch (error) {
      setToast({ tone: 'error', message: error instanceof Error ? error.message : t('admin.partner_store_save_failed', { defaultValue: '저장에 실패했어요.' }) });
    } finally {
      setSavingPhotos(false);
    }
  };

  const submitStoreReview = async (review_status: 'approved' | 'rejected', review_reason?: string) => {
    const accessToken = await getAdminAccessToken();
    if (!accessToken) {
      setToast({ tone: 'error', message: t('admin.session_required', { defaultValue: '관리자 세션을 다시 확인해 주세요.' }) });
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
        throw new Error(body?.error ?? t('admin.partner_store_save_failed', { defaultValue: '저장에 실패했어요.' }));
      }

      setToast({
        tone: 'success',
        message: review_status === 'approved'
          ? t('admin.partner_store_approved', { defaultValue: '매장을 승인했어요.' })
          : t('admin.partner_store_rejected', { defaultValue: '매장을 반려했어요.' }),
      });
      setRejectModalOpen(false);
      setRejectReason('');
      await fetchDetail();
    } catch (error) {
      setToast({ tone: 'error', message: error instanceof Error ? error.message : t('admin.partner_store_save_failed', { defaultValue: '저장에 실패했어요.' }) });
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
        <h2 style={{ fontWeight: 700, fontSize: '1.2rem', margin: 0 }}>{t('admin.no_auth_title', { defaultValue: '관리자 전용 페이지' })}</h2>
        <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem', textAlign: 'center' }}>{t('admin.no_auth_desc', { defaultValue: '접근 권한이 없습니다.' })}</p>
        <button onClick={() => router.push('/admin')} style={{ padding: '12px 28px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 14, fontWeight: 700, cursor: 'pointer' }}>
          {t('admin.go_admin_home', { defaultValue: '관리자 홈으로' })}
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
          aria-label={t('common.back', { defaultValue: '뒤로가기' })}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <h1 className={sharedStyles.headerTitle}>{detail?.store.name ?? t('admin.partner_store_detail_title', { defaultValue: '제휴 매장 검수' })}</h1>
        <span className={sharedStyles.adminBadge}>ADMIN</span>
      </header>

      <div className={sharedStyles.content}>
        {loadError ? <div className={styles.errorState}>{loadError}</div> : null}
        {loading && !detail ? <div className={styles.emptyState}>{t('admin.loading', { defaultValue: '불러오는 중...' })}</div> : null}

        {detail ? (
          <div className={styles.detailPage}>
            <div className={styles.detailCard}>
              <div className={styles.detailHeader}>
                <div className={styles.detailHeaderCopy}>
                  <h2 className={styles.detailTitle}>{detail.store.name ?? t('admin.partner_stores_unnamed', { defaultValue: '이름 없는 매장' })}</h2>
                  <p className={styles.detailSub}>{detail.store.address ?? t('admin.partner_stores_no_address', { defaultValue: '주소 미등록' })}</p>
                </div>
                <span className={`${styles.statusBadge} ${
                  detail.store.reviewStatus === 'pending' ? styles.statusPending
                    : detail.store.reviewStatus === 'approved' ? styles.statusApproved
                      : styles.statusRejected
                }`}>
                  {detail.store.reviewStatus === 'pending'
                    ? t('admin.review_status_pending', { defaultValue: '검수대기' })
                    : detail.store.reviewStatus === 'approved'
                      ? t('admin.review_status_approved', { defaultValue: '승인됨' })
                      : t('admin.review_status_rejected', { defaultValue: '반려' })}
                </span>
              </div>

              {detail.store.reviewStatus === 'rejected' && detail.store.reviewReason ? (
                <div className={styles.reviewReasonNote}>
                  <strong>{t('admin.partner_store_reject_reason_label', { defaultValue: '반려 사유' })}:</strong> {detail.store.reviewReason}
                </div>
              ) : null}

              <div className={styles.summaryGrid}>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>{t('admin.partner_store_business_types', { defaultValue: '업종' })}</span>
                  <strong>{detail.store.businessTypes.map((type) => BUSINESS_TYPE_LABELS[type] ?? type).join(', ') || '-'}</strong>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>{t('admin.partner_store_phone', { defaultValue: '연락처' })}</span>
                  <strong>{detail.store.phone ?? '-'}</strong>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>{t('admin.partner_store_published', { defaultValue: '게시 상태' })}</span>
                  <strong>
                    {detail.store.published
                      ? t('admin.partner_stores_published', { defaultValue: '게시됨' })
                      : t('admin.partner_stores_unpublished', { defaultValue: '비공개' })}
                    {' '}
                    <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)', fontWeight: 400 }}>
                      ({t('admin.partner_store_published_owner_note', { defaultValue: '매장 사장님이 직접 전환' })})
                    </span>
                  </strong>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>{t('admin.partner_store_capacity', { defaultValue: '동시 처리 인원 / 준비시간 / 슬롯 간격' })}</span>
                  <strong>
                    {detail.store.capacity ?? '-'} / {detail.store.leadTimeHours ?? '-'}{t('admin.hours_unit', { defaultValue: '시간' })} / {detail.store.slotIntervalMinutes ?? '-'}{t('admin.minutes_unit', { defaultValue: '분' })}
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
                  {t('admin.partner_store_approve', { defaultValue: '매장 승인' })}
                </button>
                <button
                  type="button"
                  className={`${styles.actionButton} ${styles.actionReject}`}
                  disabled={storeActionLoading}
                  onClick={() => setRejectModalOpen(true)}
                >
                  {t('admin.partner_store_reject', { defaultValue: '매장 반려' })}
                </button>
              </div>
            </div>

            <div className={styles.detailCard}>
              <h3 className={styles.sectionTitle}>{t('admin.partner_store_business_hours', { defaultValue: '영업시간' })}</h3>
              {detail.businessHours.length === 0 ? (
                <div className={styles.emptyState}>{t('admin.partner_store_no_business_hours', { defaultValue: '등록된 영업시간이 없습니다.' })}</div>
              ) : (
                <div className={styles.hoursGrid}>
                  {detail.businessHours.map((hours) => (
                    <div key={hours.dayOfWeek} className={styles.hoursRow}>
                      <span className={styles.hoursDay}>{DAY_OF_WEEK_LABELS[hours.dayOfWeek] ?? hours.dayOfWeek}</span>
                      {hours.isOpen ? (
                        <span className={styles.hoursTime}>
                          {formatTime(hours.startTime)} - {formatTime(hours.endTime)}
                          {hours.breakStartTime && hours.breakEndTime
                            ? ` (${t('admin.partner_store_break_time', { defaultValue: '휴게' })} ${formatTime(hours.breakStartTime)}-${formatTime(hours.breakEndTime)})`
                            : ''}
                        </span>
                      ) : (
                        <span className={styles.hoursClosed}>{t('admin.partner_store_closed', { defaultValue: '휴무' })}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.detailCard}>
              <div className={styles.sectionHeaderRow}>
                <h3 className={styles.sectionTitle}>{t('admin.partner_store_menu_items', { defaultValue: '메뉴 검수' })}</h3>
              </div>
              {categorizedMenuItems.length === 0 ? (
                <div className={styles.emptyState}>{t('admin.partner_store_no_menu_items', { defaultValue: '등록된 메뉴가 없습니다.' })}</div>
              ) : (
                categorizedMenuItems.map((group) => (
                  <div key={group.name} className={styles.categoryBlock}>
                    <p className={styles.categoryTitle}>{group.name}</p>
                    {group.items.map((item) => {
                      const effectiveStatus = menuOverrides.get(item.id) ?? item.reviewStatus;
                      return (
                        <div key={item.id} className={styles.itemRow}>
                          <div className={styles.itemInfo}>
                            <div className={styles.itemName}>{item.name ?? '-'}{!item.visible ? ` (${t('admin.partner_store_hidden', { defaultValue: '비공개' })})` : ''}</div>
                            <div className={styles.itemMeta}>
                              {formatMenuItemPrice(item)} · {item.durationMin != null ? `${item.durationMin}${t('admin.minutes_unit', { defaultValue: '분' })}` : '-'}
                              {item.options.length > 0 ? ` · ${t('admin.partner_store_options_count', { count: item.options.length, defaultValue: `옵션 ${item.options.length}개` })}` : ''}
                            </div>
                          </div>
                          <div className={styles.toggleGroup}>
                            <button
                              type="button"
                              className={`${styles.toggleBtn} ${effectiveStatus === 'approved' ? styles.toggleApproveActive : ''}`}
                              onClick={() => handleMenuToggle(item, 'approved')}
                            >
                              {t('admin.review_action_approve', { defaultValue: '승인' })}
                            </button>
                            <button
                              type="button"
                              className={`${styles.toggleBtn} ${effectiveStatus === 'rejected' ? styles.toggleRejectActive : ''}`}
                              onClick={() => handleMenuToggle(item, 'rejected')}
                            >
                              {t('admin.review_action_reject', { defaultValue: '반려' })}
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
                    {savingMenu ? t('admin.saving', { defaultValue: '저장 중...' }) : t('admin.save_changes', { defaultValue: '변경사항 저장' })}
                  </button>
                </div>
              ) : null}
            </div>

            <div className={styles.detailCard}>
              <div className={styles.sectionHeaderRow}>
                <h3 className={styles.sectionTitle}>{t('admin.partner_store_photos', { defaultValue: '사진 검수' })}</h3>
              </div>
              {detail.photos.length === 0 ? (
                <div className={styles.emptyState}>{t('admin.partner_store_no_photos', { defaultValue: '등록된 사진이 없습니다.' })}</div>
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
                              {t('admin.review_action_approve', { defaultValue: '승인' })}
                            </button>
                            <button
                              type="button"
                              className={`${styles.toggleBtn} ${effectiveStatus === 'rejected' ? styles.toggleRejectActive : ''}`}
                              onClick={() => handlePhotoToggle(photo, 'rejected')}
                            >
                              {t('admin.review_action_reject', { defaultValue: '반려' })}
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
                    {savingPhotos ? t('admin.saving', { defaultValue: '저장 중...' }) : t('admin.save_changes', { defaultValue: '변경사항 저장' })}
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
            <h3 className={styles.modalTitle}>{t('admin.partner_store_reject_modal_title', { defaultValue: '매장 반려 사유 입력' })}</h3>
            <p className={styles.modalDesc}>
              {t('admin.partner_store_reject_modal_desc', { defaultValue: '반려 사유는 매장 사장님에게 전달됩니다.' })}
            </p>
            <textarea
              className={styles.modalTextarea}
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder={t('admin.partner_store_reject_reason_placeholder', { defaultValue: '반려 사유를 입력하세요' })}
            />
            <button
              type="button"
              className={styles.modalConfirmButton}
              disabled={storeActionLoading}
              onClick={() => void submitStoreReview('rejected', rejectReason)}
            >
              {t('admin.partner_store_reject_confirm', { defaultValue: '반려 확정' })}
            </button>
            <button type="button" className={styles.modalCancelButton} onClick={() => setRejectModalOpen(false)}>
              {t('admin.cancel', { defaultValue: '취소' })}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
