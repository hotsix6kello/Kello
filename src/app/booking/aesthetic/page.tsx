'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Search } from 'lucide-react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import styles from './page.module.css';
import type { PublishedStoreItem } from '@/app/api/stores/published/route';

const TYPE_EMOJIS: Record<string, string> = {
  hair: '✂️', nail: '💅', eyelash: '👁️', makeup: '💄', esthetic: '🧖', waxing: '🌸',
};

export default function BeautyStoreManagementPage() {
  const router = useRouter();
  const { t } = useTranslation('common');

  const [stores, setStores] = useState<PublishedStoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch('/api/stores/published', { cache: 'no-store' })
      .then((res) => res.json())
      .then((body: { ok?: boolean; items?: PublishedStoreItem[] }) => {
        if (body.ok && Array.isArray(body.items)) {
          setStores(body.items);
        } else {
          setFetchError(true);
        }
      })
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, []);

  const filteredStores = stores.filter((store) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (store.name ?? '').toLowerCase().includes(q) ||
      (store.address ?? '').toLowerCase().includes(q) ||
      store.businessTypes.some((bt) => bt.toLowerCase().includes(q))
    );
  });

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <header className={styles.header}>
          <button
            className={styles.backButton}
            onClick={() => router.back()}
            aria-label={t('common.back')}
          >
            <ArrowLeft size={20} strokeWidth={2.5} />
          </button>

          <div className={styles.logoWrapper}>
            <svg width="76" height="30" viewBox="0 0 76 30" aria-label="Kello" style={{ display: 'block' }}>
              <text x="2" y="22" fontFamily="'Nunito', 'Quicksand', 'Pretendard', 'Inter', sans-serif"
                fontWeight="800" fontSize="24" fill="#FF3566" letterSpacing="-0.5">
                Kello
              </text>
            </svg>
          </div>

          <div className={styles.placeholder} />
        </header>

        <div className={styles.topFixedPanel}>
          <div className={styles.searchBarWrapper}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder={t('booking_aesthetic.search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.scrollArea}>
          <div className={styles.storeList}>

            {/* 로딩 */}
            {loading && Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{
                height: 96, borderRadius: 20, background: '#ede8e3', opacity: 0.7, marginBottom: 12
              }} />
            ))}

            {/* 에러 */}
            {!loading && fetchError && (
              <div style={{
                padding: 20, borderRadius: 20, background: '#fff7f8',
                border: '1px solid rgba(255,126,160,0.2)', color: '#9b4b5b',
                fontWeight: 700, fontSize: 14, textAlign: 'center'
              }}>
                {t('stores_page.fetch_error')}
              </div>
            )}

            {/* 데이터 있음 */}
            {!loading && !fetchError && filteredStores.length > 0 && filteredStores.map((store) => {
              const type = store.businessTypes[0] ?? '';
              const emoji = TYPE_EMOJIS[type] ?? '🏪';
              return (
                <div
                  key={store.id}
                  onClick={() => {
                    const params = new URLSearchParams({
                      booking: 'true',
                      business_name: store.name ?? t('stores_page.default_store_name'),
                      store_id: store.id,
                      store_source: 'partner',
                    });
                    router.push(`/?${params.toString()}`);
                  }}
                  style={{
                    display: 'flex', gap: 14, padding: 14, borderRadius: 20,
                    background: '#fff', border: '1px solid rgba(0,0,0,0.07)',
                    boxShadow: '0 4px 12px rgba(103,79,76,0.06)',
                    cursor: 'pointer', marginBottom: 12,
                  }}
                >
                  <div style={{
                    flexShrink: 0, position: 'relative', width: 80, height: 80,
                    borderRadius: 16, overflow: 'hidden', background: '#f5f0ee',
                  }}>
                    {store.thumbnailUrl ? (
                      <Image
                        src={store.thumbnailUrl}
                        alt={store.name ?? t('stores_page.default_store_name')}
                        fill sizes="80px" style={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{
                        width: '100%', height: '100%', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        background: 'linear-gradient(135deg,#fdf0ee 0%,#f5e6e8 100%)', fontSize: 28
                      }}>
                        {emoji}
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <strong style={{
                      display: 'block', fontSize: 15, fontWeight: 800, color: '#1a1a1a',
                      letterSpacing: -0.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }}>
                      {store.name ?? t('stores_page.default_store_name')}
                    </strong>

                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 5 }}>
                      {store.businessTypes.slice(0, 2).map((btype) => (
                        <span key={btype} style={{
                          fontSize: 10, fontWeight: 700, color: '#c88c93',
                          background: 'rgba(200,140,147,0.12)', borderRadius: 6, padding: '2px 6px'
                        }}>
                          {t(`categories.${btype}.label`, { defaultValue: btype })}
                        </span>
                      ))}
                    </div>

                    {store.address && (
                      <span style={{
                        display: 'flex', alignItems: 'center', gap: 3,
                        marginTop: 5, fontSize: 12, color: '#888'
                      }}>
                        <MapPin size={11} />
                        {store.address}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* 검색 결과 없음 */}
            {!loading && !fetchError && stores.length > 0 && filteredStores.length === 0 && (
              <div className={styles.emptyState}>
                <p className={styles.emptyTitle}>{t('booking_aesthetic.empty_title')}</p>
                <p className={styles.emptyDesc}>{t('booking_aesthetic.empty_desc')}</p>
              </div>
            )}

            {/* 제휴업체 없음 — 준비 중 */}
            {!loading && !fetchError && stores.length === 0 && (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', padding: '48px 24px', textAlign: 'center', gap: 12,
              }}>
                <div style={{ fontSize: 48 }}>🌸</div>
                <strong style={{ fontSize: 16, fontWeight: 800, color: '#1a1614', letterSpacing: -0.3 }}>
                  {t('booking_aesthetic.no_partners_title')}
                </strong>
                <p style={{ fontSize: 14, color: '#8a7a6e', lineHeight: 1.5, margin: 0 }}>
                  {t('booking_aesthetic.no_partners_desc')}
                </p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
