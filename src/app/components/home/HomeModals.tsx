import { TFunction } from 'i18next';
import styles from '../../home.module.css';
import ExploreMap from '../../explore/components/ExploreMap';

interface HomeModalsProps {
  isMapOpen: boolean;
  onMapClose: () => void;
  showCard: boolean;
  onCardClose: () => void;
  destInfo: { name: string; nameKo: string; lat: number; lng: number };
  onCopy: () => void;
  copied: boolean;
  t: TFunction;
}

export default function HomeModals({
  isMapOpen,
  onMapClose,
  showCard,
  onCardClose,
  destInfo,
  onCopy,
  copied,
  t
}: HomeModalsProps) {
  if (!destInfo) return null;

  return (
    <>
      {isMapOpen && (
        <div className={styles.modalOverlay} onClick={onMapClose}>
          <div className={styles.mapModal} onClick={e => e.stopPropagation()}>
            <div className={styles.mapModalHeader}>
              <div className={styles.mapModalInfo}>
                <div className={styles.mapModalTitle}>{destInfo.nameKo}</div>
                <div className={styles.mapModalAddr}>{destInfo.name}</div>
              </div>
              <button className={styles.mapCloseBtn} onClick={onMapClose}>✕</button>
            </div>
            <div className={styles.mapContainer}>
              <ExploreMap
                items={[]}
                center={{ lat: destInfo.lat, lng: destInfo.lng }}
                onItemClick={() => { }}
                zoom={15}
              />
            </div>
          </div>
        </div>
      )}

      {showCard && (
        <div className={styles.overlay} onClick={onCardClose}>
          <div className={styles.addressCard} onClick={e => e.stopPropagation()}>
            <div className={styles.cardTitle}>{t('home_beauty.modals.card_title')}</div>
            <div className={styles.cardAddress}>{destInfo.nameKo}</div>
            <div className={styles.cardName}>{destInfo.name}</div>
            <button className={styles.cardCopyBtn} onClick={onCopy}>
              {copied ? t('home_beauty.modals.copy_done') : t('home_beauty.modals.copy')}
            </button>
            <button className={styles.cardCloseBtn} onClick={onCardClose}>
              {t('home_beauty.modals.close')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
