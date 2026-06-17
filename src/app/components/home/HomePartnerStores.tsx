'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import styles from './HomePartnerStores.module.css';
import type { PublishedStoreItem } from '@/app/api/stores/published/route';

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
  const { t } = useTranslation('common');
  const [stores, setStores] = useState<PublishedStoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const EMPTY_CARDS = [
    {
      title: t('stores_page.empty_hair_title'),
      description: t('stores_page.empty_hair_desc'),
      type: 'hair',
    },
    {
      title: t('stores_page.empty_nail_title'),
      description: t('stores_page.empty_nail_desc'),
      type: 'nail',
    },
    {
      title: t('stores_page.empty_lash_title'),
      description: t('stores_page.empty_lash_desc'),
      type: 'makeup',
    },
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

  const firstType = (types: string[]) => types[0] ?? '';
  const handleStartBooking = () => router.push('/booking/aesthetic');
  const handlePartnerBooking = (store: PublishedStoreItem) => {
    const params = new URLSearchParams({
      booking: 'true',
      business_name: store.name ?? t('stores_page.default_store_name'),
      store_id: store.id,
      store_source: 'partner',
    });
    router.push(`/?${params.toString()}`);
  };

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <span className={styles.title}>{t('stores_page.section_title')}</span>
        <button
          type="button"
          className={styles.viewAllBtn}
          onClick={() => router.push('/stores')}
        >
          {t('stores_page.view_all')}
        </button>
      </div>

      <div className={styles.scrollTrack}>
        {loading && Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}

        {!loading && fetchError && (
          <div className={styles.errorCard}>{t('stores_page.fetch_error')}</div>
        )}

        {!loading &&
          !fetchError &&
          stores.length > 0 &&
          stores.map((store) => {
            const type = firstType(store.businessTypes);
            const emoji = TYPE_EMOJIS[type] ?? '🏪';

            return (
              <article key={store.id} className={styles.card}>
                <div className={styles.cardThumb}>
                  {store.thumbnailUrl ? (
                    <Image
                      src={store.thumbnailUrl}
                      alt={store.name ?? t('stores_page.default_store_name')}
                      fill
                      sizes="160px"
                      className={styles.cardThumbImg}
                    />
                  ) : (
                    <div className={styles.cardThumbPlaceholder}>{emoji}</div>
                  )}
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.cardName}>{store.name ?? t('stores_page.default_store_name')}</div>
                  <div className={styles.tagRow}>
                    {store.businessTypes.slice(0, 2).map((type) => (
                      <span key={type} className={styles.tag}>
                        {t(`categories.${type}.label`, { defaultValue: type })}
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
                    {t('stores_page.booking_inquiry')}
                  </button>
                </div>
              </article>
            );
          })}

        {!loading &&
          !fetchError &&
          stores.length === 0 &&
          EMPTY_CARDS.map((card) => (
            <article key={card.type} className={styles.emptyCard}>
              <div className={styles.emptyIcon}>{TYPE_EMOJIS[card.type] ?? '🏪'}</div>
              <div className={styles.emptyTitle}>{card.title}</div>
              <p className={styles.emptyDesc}>{card.description}</p>
              <button type="button" className={styles.emptyCta} onClick={handleStartBooking}>
                {t('stores_page.booking_inquiry')}
              </button>
            </article>
          ))}
      </div>
    </section>
  );
}
