'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import styles from './HomePartnerStores.module.css';
import type { PublishedStoreItem } from '@/app/api/stores/published/route';

const BUSINESS_TYPE_LABELS: Record<string, string> = {
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

function getAddressShort(address: string | null): string {
  if (!address) return '';
  // "서울특별시 강남구 테헤란로 ..." → "강남구"
  const parts = address.split(' ');
  return parts[1] ?? parts[0] ?? '';
}

function SkeletonCard() {
  return (
    <div className={styles.skeleton}>
      <div className={styles.skeletonThumb} />
      <div className={styles.skeletonBody}>
        <div className={`${styles.skeletonLine}`} />
        <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
      </div>
    </div>
  );
}

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

export default function HomePartnerStores() {
  const router = useRouter();
  const [stores, setStores] = useState<PublishedStoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

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

  const firstType = (types: string[]) => types[0] ?? '';
  const handleStartBooking = () => router.push('/booking/aesthetic');
  const handlePartnerBooking = (store: PublishedStoreItem) => {
    const params = new URLSearchParams({
      booking: 'true',
      business_name: store.name ?? '제휴 매장',
      store_id: store.id,
      store_source: 'partner',
    });

    router.push(`/?${params.toString()}`);
  };

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <span className={styles.title}>추천 제휴샵</span>
        <button
          type="button"
          className={styles.viewAllBtn}
          onClick={() => router.push('/explore')}
        >
          전체 보기 →
        </button>
      </div>

      <div className={styles.scrollTrack}>
        {loading && Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}

        {!loading && fetchError && (
          <div className={styles.errorCard}>제휴샵 정보를 불러오지 못했어요.</div>
        )}

        {!loading &&
          !fetchError &&
          stores.length > 0 &&
          stores.map((store) => {
              const type = firstType(store.businessTypes);
              const emoji = TYPE_EMOJIS[type] ?? '🏪';

              return (
                <article
                  key={store.id}
                  className={styles.card}
                >
                  <div className={styles.cardThumb}>
                    {store.thumbnailUrl ? (
                      <Image
                        src={store.thumbnailUrl}
                        alt={store.name ?? '제휴 매장'}
                        fill
                        sizes="160px"
                        className={styles.cardThumbImg}
                      />
                    ) : (
                      <div className={styles.cardThumbPlaceholder}>{emoji}</div>
                    )}
                  </div>

                  <div className={styles.cardBody}>
                    <div className={styles.cardName}>{store.name ?? '매장'}</div>
                    <div className={styles.tagRow}>
                      {store.businessTypes.slice(0, 2).map((t) => (
                        <span key={t} className={styles.tag}>
                          {BUSINESS_TYPE_LABELS[t] ?? t}
                        </span>
                      ))}
                    </div>
                    {store.address && (
                      <div className={styles.cardAddress}>{getAddressShort(store.address)}</div>
                    )}
                    <button
                      type="button"
                      className={styles.cardCta}
                      onClick={() => handlePartnerBooking(store)}
                    >
                      예약 문의하기
                    </button>
                  </div>
                </article>
              );
            })}

        {!loading &&
          !fetchError &&
          stores.length === 0 &&
          EMPTY_CARDS.map((card) => (
            <article key={card.title} className={styles.emptyCard}>
              <div className={styles.emptyIcon}>{TYPE_EMOJIS[card.type] ?? '🏪'}</div>
              <div className={styles.emptyTitle}>{card.title}</div>
              <p className={styles.emptyDesc}>{card.description}</p>
              <button type="button" className={styles.emptyCta} onClick={handleStartBooking}>
                예약 문의하기
              </button>
            </article>
          ))}
      </div>
    </section>
  );
}
