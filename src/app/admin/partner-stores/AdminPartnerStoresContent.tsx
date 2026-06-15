'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import sharedStyles from '../admin.module.css';
import styles from './partner-stores.module.css';
import { supabase } from '@/lib/supabaseClient';
import {
  isPartnerStoreListStatusFilter,
  type PartnerStoreListItem,
  type PartnerStoreListStatusFilter,
} from '@/lib/admin/partnerStoreAdmin.ts';

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  hair: '헤어',
  nail: '네일',
  eyelash: '속눈썹',
  makeup: '메이크업',
  esthetic: '에스테틱',
  waxing: '왁싱',
};

async function getAdminAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token ?? null;
}

export default function AdminPartnerStoresContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [statusFilter, setStatusFilter] = useState<PartnerStoreListStatusFilter>(() => {
    const initial = searchParams.get('status');
    return isPartnerStoreListStatusFilter(initial) ? initial : 'pending';
  });
  const [items, setItems] = useState<PartnerStoreListItem[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

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
    if (statusFilter !== 'pending') {
      params.set('status', statusFilter);
    }

    const nextPath = params.toString()
      ? `/admin/partner-stores?${params.toString()}`
      : '/admin/partner-stores';

    router.replace(nextPath, { scroll: false });
  }, [router, statusFilter]);

  const fetchItems = useCallback(async (status: PartnerStoreListStatusFilter) => {
    const accessToken = await getAdminAccessToken();

    if (!accessToken) {
      setLoadError(t('admin.session_required', { defaultValue: '관리자 세션을 다시 확인해 주세요.' }));
      return null;
    }

    const response = await fetch(`/api/admin/partner-stores?status=${status}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    });

    const body = (await response.json().catch(() => null)) as
      | { ok?: boolean; items?: PartnerStoreListItem[]; error?: string }
      | null;

    if (!response.ok || body?.ok !== true || !Array.isArray(body.items)) {
      throw new Error(body?.error ?? t('admin.partner_stores_load_failed', { defaultValue: '제휴 매장 목록을 불러오지 못했어요.' }));
    }

    return body.items;
  }, [t]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const [listItems, pendingItems] = await Promise.all([
        fetchItems(statusFilter),
        fetchItems('pending'),
      ]);

      if (listItems) setItems(listItems);
      if (pendingItems) setPendingCount(pendingItems.length);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : t('admin.partner_stores_load_failed', { defaultValue: '제휴 매장 목록을 불러오지 못했어요.' }));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [fetchItems, statusFilter, t]);

  useEffect(() => {
    if (isAdmin) {
      void fetchList();
    }
  }, [fetchList, isAdmin]);

  const TAB_CONFIG: { key: PartnerStoreListStatusFilter; label: string }[] = [
    { key: 'pending', label: t('admin.partner_stores_tab_pending', { defaultValue: '검수대기' }) },
    { key: 'approved', label: t('admin.partner_stores_tab_approved', { defaultValue: '승인됨' }) },
    { key: 'rejected', label: t('admin.partner_stores_tab_rejected', { defaultValue: '반려' }) },
    { key: 'all', label: t('admin.partner_stores_tab_all', { defaultValue: '전체' }) },
  ];

  const formatDate = (value: string | null) => {
    if (!value) return '-';
    try {
      return new Date(value).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return value;
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
        <h1 className={sharedStyles.headerTitle}>{t('admin.partner_stores_title', { defaultValue: '제휴 매장 검수' })}</h1>
        <span className={sharedStyles.adminBadge}>ADMIN</span>
      </header>

      <div className={sharedStyles.tabBar}>
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.key}
            className={`${sharedStyles.tab} ${statusFilter === tab.key ? sharedStyles.tabActive : ''}`}
            onClick={() => setStatusFilter(tab.key)}
          >
            {tab.label}
            {tab.key === 'pending' && pendingCount > 0 ? (
              <span className={styles.tabCount}>{pendingCount}</span>
            ) : null}
          </button>
        ))}
      </div>

      <div className={sharedStyles.content}>
        <section className={styles.filterCard}>
          <p className={styles.filterCardText}>
            {t('admin.partner_stores_filter_desc', { defaultValue: '매장을 선택하면 메뉴/사진 검수 화면으로 이동합니다.' })}
          </p>
          <button type="button" className={styles.refreshButton} onClick={() => void fetchList()} disabled={loading}>
            {loading ? t('admin.loading', { defaultValue: '불러오는 중...' }) : t('admin.refresh', { defaultValue: '새로고침' })}
          </button>
        </section>

        {loadError ? <div className={styles.errorState}>{loadError}</div> : null}
        {loading ? <div className={styles.emptyState}>{t('admin.loading', { defaultValue: '불러오는 중...' })}</div> : null}

        {!loading && !loadError && items.length === 0 ? (
          <div className={styles.emptyState}>{t('admin.partner_stores_empty', { defaultValue: '조건에 맞는 매장이 없습니다.' })}</div>
        ) : null}

        {!loading && items.length > 0 ? (
          <div className={styles.storeList}>
            {items.map((store) => (
              <button
                key={store.id}
                type="button"
                className={styles.storeCard}
                onClick={() => router.push(`/admin/partner-stores/${store.id}`)}
              >
                <div className={styles.storeCardTop}>
                  <span className={styles.storeCardTitle}>{store.name ?? t('admin.partner_stores_unnamed', { defaultValue: '이름 없는 매장' })}</span>
                  <span className={`${styles.statusBadge} ${
                    store.reviewStatus === 'pending' ? styles.statusPending
                      : store.reviewStatus === 'approved' ? styles.statusApproved
                        : styles.statusRejected
                  }`}>
                    {store.reviewStatus === 'pending'
                      ? t('admin.review_status_pending', { defaultValue: '검수대기' })
                      : store.reviewStatus === 'approved'
                        ? t('admin.review_status_approved', { defaultValue: '승인됨' })
                        : t('admin.review_status_rejected', { defaultValue: '반려' })}
                  </span>
                </div>

                <div className={styles.storeCardMeta}>
                  {store.address ?? t('admin.partner_stores_no_address', { defaultValue: '주소 미등록' })} · {formatDate(store.createdAt)}
                </div>

                <div className={styles.badgeRow}>
                  {store.businessTypes.map((type) => (
                    <span key={type} className={styles.typeBadge}>{BUSINESS_TYPE_LABELS[type] ?? type}</span>
                  ))}
                  <span className={`${styles.statusBadge} ${store.published ? styles.publishedOn : styles.publishedOff}`}>
                    {store.published
                      ? t('admin.partner_stores_published', { defaultValue: '게시됨' })
                      : t('admin.partner_stores_unpublished', { defaultValue: '비공개' })}
                  </span>
                  {store.pendingMenuItemsCount > 0 ? (
                    <span className={`${styles.statusBadge} ${styles.countBadge}`}>
                      {t('admin.partner_stores_pending_menu_count', { count: store.pendingMenuItemsCount, defaultValue: `메뉴 검수 ${store.pendingMenuItemsCount}건` })}
                    </span>
                  ) : null}
                  {store.pendingPhotosCount > 0 ? (
                    <span className={`${styles.statusBadge} ${styles.countBadge}`}>
                      {t('admin.partner_stores_pending_photo_count', { count: store.pendingPhotosCount, defaultValue: `사진 검수 ${store.pendingPhotosCount}건` })}
                    </span>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        ) : null}

        <div style={{ height: '160px', minHeight: '160px', flexShrink: 0, width: '100%', pointerEvents: 'none' }} />
      </div>
    </div>
  );
}
