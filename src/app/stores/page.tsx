'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import type { PublishedStoreItem } from '@/app/api/stores/published/route';

type FilterKey = 'all' | 'hair' | 'nail' | 'eyelash' | 'makeup' | 'esthetic' | 'waxing';

const FILTER_KEYS: FilterKey[] = ['all', 'hair', 'nail', 'eyelash', 'makeup', 'esthetic', 'waxing'];

const TYPE_EMOJIS: Record<string, string> = {
  hair: '✂️',
  nail: '💅',
  eyelash: '👁️',
  makeup: '💄',
  esthetic: '🧖',
  waxing: '🌸',
};

export default function StoresPage() {
  const router = useRouter();
  const { t } = useTranslation('common');
  const [stores, setStores] = useState<PublishedStoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  const FILTERS = FILTER_KEYS.map((key) => ({
    key,
    label: key === 'all' ? t('common.categories.all') : t(`categories.${key}.label`, { defaultValue: key }),
  }));

  const EMPTY_CARDS = [
    { title: t('stores_page.empty_hair_title'), description: t('stores_page.empty_hair_desc'), type: 'hair' },
    { title: t('stores_page.empty_nail_title'), description: t('stores_page.empty_nail_desc'), type: 'nail' },
    { title: t('stores_page.empty_lash_title'), description: t('stores_page.empty_lash_desc'), type: 'makeup' },
  ];

  useEffect(() => {
    fetch('/api/stores/published', { cache: 'no-store' })
      .then((res) => res.json())
      .then((body: { ok?: boolean; items?: PublishedStoreItem[] }) => {
        if (body.ok && Array.isArray(body.items)) {
          setStores(body.items);
          setFetchError(false);
        } else {
          setFetchError(true);
        }
      })
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, []);

  const filteredStores =
    activeFilter === 'all' ? stores : stores.filter((s) => s.businessTypes.includes(activeFilter));

  const handleBooking = (store: PublishedStoreItem) => {
    const params = new URLSearchParams({
      booking: 'true',
      business_name: store.name ?? t('stores_page.default_store_name'),
      store_id: store.id,
      store_source: 'partner',
    });
    router.push(`/?${params.toString()}`);
  };

  return (
    <main style={{ background: '#faf7f4', minHeight: '100dvh', paddingBottom: 100 }}>
      {/* 상단 네비바 */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '52px 20px 16px',
          background: '#faf7f4',
        }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            background: 'none',
            border: 'none',
            padding: '4px 2px',
            color: '#6b5f56',
            fontSize: 18,
            cursor: 'pointer',
          }}
          aria-label={t('common.back')}
        >
          ←
        </button>
        <h1
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 900,
            color: '#1a1614',
            letterSpacing: -0.5,
          }}
        >
          {t('stores_page.page_title')}
        </h1>
      </header>

      {/* 부제목 + 지도 버튼 */}
      <div style={{ padding: '0 20px 4px' }}>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: '#8a7a6e', lineHeight: 1.5 }}>
          {t('stores_page.subtitle')}
        </p>
        <button
          type="button"
          onClick={() => router.push('/explore')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            border: '1px solid rgba(188, 148, 78, 0.38)',
            borderRadius: 999,
            padding: '7px 14px',
            background: 'rgba(255, 255, 255, 0.9)',
            color: '#7a5c2e',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {t('stores_page.view_on_map')}
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          padding: '16px 20px 4px',
          scrollbarWidth: 'none',
        }}
      >
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setActiveFilter(f.key)}
            style={{
              flexShrink: 0,
              border: activeFilter === f.key ? '1.5px solid #c4942f' : '1.5px solid rgba(0,0,0,0.1)',
              borderRadius: 999,
              padding: '8px 15px',
              background: activeFilter === f.key ? '#c4942f' : '#fff',
              color: activeFilter === f.key ? '#fff' : '#4a3f35',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '14px 20px 0' }}>
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: 96,
                  borderRadius: 20,
                  background: '#ede8e3',
                  opacity: 0.7,
                }}
              />
            ))}
          </div>
        )}

        {!loading && fetchError && (
          <div
            style={{
              padding: 20,
              borderRadius: 20,
              background: '#fff7f8',
              border: '1px solid rgba(255, 126, 160, 0.2)',
              color: '#9b4b5b',
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            {t('stores_page.fetch_error')}
          </div>
        )}

        {!loading && !fetchError && stores.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {EMPTY_CARDS.map((card) => (
              <div
                key={card.title}
                style={{
                  display: 'flex',
                  gap: 14,
                  alignItems: 'center',
                  padding: '18px 16px',
                  borderRadius: 20,
                  background: '#fff',
                  border: '1px solid rgba(0,0,0,0.07)',
                  boxShadow: '0 4px 12px rgba(103, 79, 76, 0.06)',
                }}
              >
                <div
                  style={{
                    flexShrink: 0,
                    width: 52,
                    height: 52,
                    borderRadius: 18,
                    background: 'rgba(255, 126, 160, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 26,
                  }}
                >
                  {TYPE_EMOJIS[card.type] ?? '🏪'}
                </div>
                <div style={{ minWidth: 0 }}>
                  <strong
                    style={{
                      display: 'block',
                      fontSize: 15,
                      fontWeight: 800,
                      color: '#1a1a1a',
                      letterSpacing: -0.3,
                    }}
                  >
                    {card.title}
                  </strong>
                  <p
                    style={{
                      margin: '4px 0 0',
                      fontSize: 13,
                      color: '#7e6e70',
                      lineHeight: 1.45,
                      fontWeight: 500,
                    }}
                  >
                    {card.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !fetchError && stores.length > 0 && filteredStores.length === 0 && (
          <p style={{ padding: '32px 0', textAlign: 'center', color: '#8a7a6e', fontSize: 14 }}>
            {t('stores_page.no_category_stores')}
          </p>
        )}

        {!loading && !fetchError && filteredStores.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredStores.map((store) => {
              const type = store.businessTypes[0] ?? '';
              const emoji = TYPE_EMOJIS[type] ?? '🏪';

              return (
                <article
                  key={store.id}
                  style={{
                    display: 'flex',
                    gap: 14,
                    padding: 14,
                    borderRadius: 20,
                    background: '#fff',
                    border: '1px solid rgba(0,0,0,0.07)',
                    boxShadow: '0 4px 12px rgba(103, 79, 76, 0.06)',
                  }}
                >
                  <div
                    style={{
                      flexShrink: 0,
                      position: 'relative',
                      width: 80,
                      height: 80,
                      borderRadius: 16,
                      overflow: 'hidden',
                      background: '#f5f0ee',
                    }}
                  >
                    {store.thumbnailUrl ? (
                      <Image
                        src={store.thumbnailUrl}
                        alt={store.name ?? '제휴 매장'}
                        fill
                        sizes="80px"
                        style={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'linear-gradient(135deg, #fdf0ee 0%, #f5e6e8 100%)',
                          fontSize: 28,
                        }}
                      >
                        {emoji}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                    }}
                  >
                    <strong
                      style={{
                        display: 'block',
                        fontSize: 15,
                        fontWeight: 800,
                        color: '#1a1a1a',
                        letterSpacing: -0.3,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {store.name ?? t('stores_page.default_store_name')}
                    </strong>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 5 }}>
                      {store.businessTypes.slice(0, 3).map((btype) => (
                        <span
                          key={btype}
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: '#c88c93',
                            background: 'rgba(200, 140, 147, 0.12)',
                            borderRadius: 6,
                            padding: '2px 6px',
                          }}
                        >
                          {t(`categories.${btype}.label`, { defaultValue: btype })}
                        </span>
                      ))}
                    </div>
                    {store.address && (
                      <span
                        style={{
                          display: 'block',
                          marginTop: 5,
                          fontSize: 12,
                          color: '#888',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {store.address}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleBooking(store)}
                    style={{
                      flexShrink: 0,
                      alignSelf: 'center',
                      border: 'none',
                      borderRadius: 999,
                      padding: '9px 12px',
                      background: 'linear-gradient(135deg, #ff6f9f 0%, #ff3566 100%)',
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 800,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {t('stores_page.booking_inquiry_short')}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
