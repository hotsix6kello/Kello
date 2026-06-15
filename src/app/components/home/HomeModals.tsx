import { TFunction } from 'i18next';
import styles from '../../home.module.css';

interface HomeModalsProps {
  showCard: boolean;
  onCardClose: () => void;
  destInfo: { name: string; nameKo: string; lat: number; lng: number };
  onCopy: () => void;
  copied: boolean;
  t: TFunction;
}

export default function HomeModals({
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
      {showCard && (
        <div className={styles.overlay} onClick={onCardClose}>
          <div className={styles.addressCard} onClick={e => e.stopPropagation()}>
            <div className={styles.cardTitle}>{t('modals.card_title')}</div>
            <div className={styles.cardAddress}>{destInfo.nameKo}</div>
            <div className={styles.cardName}>{destInfo.name}</div>
            <button className={styles.cardCopyBtn} onClick={onCopy}>
              {copied ? t('modals.copy_done') : t('modals.copy')}
            </button>
            <button className={styles.cardCloseBtn} onClick={onCardClose}>
              {t('modals.close')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
