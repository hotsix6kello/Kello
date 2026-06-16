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

export default function HomePartnerStores() {
  const router = useRouter();
  const [stores, setStores] = useState<PublishedStoreItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stores/published', { cache: 'no-store' })
      .then((res) => res.json())
      .then((body: { ok?: boolean; items?: PublishedStoreItem[] }) => {
        if (body.ok && Array.isArray(body.items)) {
          setStores(body.items);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // 로딩 중도 아니고 매장도 없으면 섹션 자체를 숨김
  if (!loading && stores.length === 0) {
    return null;
  }

  const firstType = (types: string[]) => types[0] ?? '';

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <span className={styles.title}>🏪 제휴 매장</span>
        <button
          type="button"
          className={styles.viewAllBtn}
          onClick={() => router.push('/explore')}
        >
          전체 보기 →
        </button>
      </div>

      <div className={styles.scrollTrack}>
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : stores.map((store) => {
              const type = firstType(store.businessTypes);
              const emoji = TYPE_EMOJIS[type] ?? '🏪';

              return (
                <button
                  key={store.id}
                  type="button"
                  className={styles.card}
                  onClick={() => router.push(`/booking/partner/${store.id}`)}
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
                  </div>
                </button>
              );
            })}
      </div>
    </section>
  );
}
