'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { PublishedStoreItem } from '@/app/api/stores/published/route';

type FilterKey = 'all' | 'hair' | 'nail' | 'eyelash' | 'makeup' | 'esthetic' | 'waxing';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'hair', label: '헤어' },
  { key: 'nail', label: '네일' },
  { key: 'eyelash', label: '속눈썹' },
  { key: 'makeup', label: '메이크업' },
  { key: 'esthetic', label: '에스테틱' },
  { key: 'waxing', label: '왁싱' },
];

const TYPE_LABELS: Record<string, string> = {
  hair: '헤어',
  nail: '네일',
  eyelash: '속눈썹',
  makeup: '메이크업',
  esthetic: '에스테틱',
  waxing: '왁싱',
};

const TYPE_EMOJIS: Record<string, string> = {
  hair: '✂️',
  nail: '💅',
  eyelash: '👁️',
  makeup: '💄',
  esthetic: '🧖',
  waxing: '🌸',
};

const EMPTY_CARDS = [
  {
    title: '헤어 제휴샵 준비 중',
    description: '외국인 고객 응대가 가능한 K-뷰티샵을 선별하고 있어요.',
    type: 'hair',
  },
  {
    title: '네일 제휴샵 준비 중',
    description: '사진 견적과 예약 확정이 가능한 제휴샵을 준비 중이에요.',
    type: 'nail',
  },
  {
    title: '속눈썹·메이크업 준비 중',
    description: '방문 전 상담이 가능한 제휴샵을 모집하고 있어요.',
    type: 'makeup',
  },
];

export default function StoresPage() {
  const router = useRouter();
  const [stores, setStores] = useState<PublishedStoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

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
      business_name: store.name ?? '제휴 매장',
      store_id: store.id,
      store_source: 'partner',
    });
    router.push(`/?${params.toString()}`);
  };

  return (
    <main style={{ background: '#faf7f4', minHeight: '100dvh', paddingBottom: 100 }}>
      <header style={{ padding: '52px 20px 0' }}>
        <button
          type="button"
          onClick={() => router.back()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: 'none',
            border: 'none',
            padding: '4px 0',
            color: '#6b5f56',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          ← 뒤로
        </button>
        <h1
          style={{ margin: '14px 0 0', fontSize: 22, fontWeight: 900, color: '#1a1614', letterSpacing: -0.5 }}
        >
          Kello 제휴 뷰티샵
        </h1>
        <p style={{ margin: '8px 0 0', fontSize: 14, color: '#6b5f56', lineHeight: 1.55 }}>
          외국인 방문객도 안심하고 예약할 수 있는 K-Beauty 제휴샵을 모아봤어요.
        </p>
        <button
          type="button"
          onClick={() => router.push('/explore')}
          style={{
            marginTop: 14,
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
          🗺️ 지도에서 보기
        </button>
      </header>

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
            제휴샵 정보를 불러오지 못했어요.
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
            해당 카테고리의 제휴샵이 아직 없어요.
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
                      {store.name ?? '제휴 매장'}
                    </strong>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 5 }}>
                      {store.businessTypes.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: '#c88c93',
                            background: 'rgba(200, 140, 147, 0.12)',
                            borderRadius: 6,
                            padding: '2px 6px',
                          }}
                        >
                          {TYPE_LABELS[t] ?? t}
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
                    예약 문의
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
