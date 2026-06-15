import { TFunction } from 'i18next';
import Image from 'next/image';
import styles from '../../home.module.css';

interface HomeLocationSheetProps {
  isOpen: boolean;
  onClose: () => void;
  isSearchingInSheet: boolean;
  input: string;
  sheetSearchResults: Array<{ title: string; area: string; [key: string]: unknown }>;
  destInfo: { name: string; nameKo: string; [key: string]: unknown };
  onSelectPlace: (place: { title: string; area: string; [key: string]: unknown }) => void;
  onKRide: () => void;
  onTransit: () => void;
  onCopy: () => void;
  copied: boolean;
  t: TFunction;
}

export default function HomeLocationSheet({
  isOpen,
  onClose,
  isSearchingInSheet,
  input,
  sheetSearchResults,
  destInfo,
  onSelectPlace,
  onKRide,
  onTransit,
  onCopy,
  copied,
  t
}: HomeLocationSheetProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={e => e.stopPropagation()}>
        <div className={styles.sheetHandle} />

        {isSearchingInSheet ? (
          <div className={styles.sheetSearchSection}>
            <div className={styles.sheetHeader} style={{ border: 'none', paddingBottom: '0' }}>
              <div className={styles.sheetTitle}>{t('location_sheet.search_title')}</div>
              <div className={styles.sheetSubtitle}>
                {t('location_sheet.search_result_count', { query: input, count: sheetSearchResults.length })}
              </div>
            </div>
            <div className={styles.sheetResultList} style={{ maxHeight: '65vh', overflowY: 'auto', padding: '0 24px 20px' }}>
              {sheetSearchResults.map((item, idx) => (
                <div key={idx} className={styles.searchResultItem} onClick={() => onSelectPlace(item)}>
                  <span style={{ marginRight: '16px', fontSize: '1.4rem', opacity: 0.7 }}>📍</span>
                  <div style={{ flex: 1 }}>
                    <div className={styles.searchResultTitle}>{item.title}</div>
                    <div className={styles.searchResultArea}>{item.area}</div>
                  </div>
                  <span style={{ color: 'var(--gray-300)', fontSize: '1.2rem' }}>→</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className={styles.sheetHeader}>
              <div className={styles.sheetTitle}>{destInfo.name}</div>
              <div className={styles.sheetSubtitle}>{destInfo.nameKo}</div>
            </div>

            <div className={styles.quickChoices} style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <button className={styles.choiceBtn} onClick={onKRide}>
                <div className={styles.choiceIcon}>🚕</div>
                <div className={styles.choiceLabel}>K.Ride</div>
                <div className={styles.choiceSubText}>{t('location_sheet.call_taxi')}</div>
              </button>
              <button className={styles.choiceBtn} onClick={onTransit}>
                <div className={styles.choiceIcon}>🚇</div>
                <div className={styles.choiceLabel}>{t('fab.transit')}</div>
                <div className={styles.choiceSubText}>Google Maps</div>
              </button>
              <button className={styles.choiceBtn} onClick={onTransit} style={{ gridColumn: 'span 2', flexDirection: 'row', padding: '16px' }}>
                <div className={styles.choiceIcon} style={{ width: '40px', height: '40px', fontSize: '20px' }}>
                  <Image src="https://www.google.com/images/branding/product/ico/maps15_bnuw32.ico" width={24} height={24} alt="G" />
                </div>
                <div style={{ textAlign: 'left', flex: 1, paddingLeft: '12px' }}>
                  <div className={styles.choiceLabel}>Google Maps Transit</div>
                  <div className={styles.choiceSubText}>{t('location_sheet.google_maps_desc')}</div>
                </div>
              </button>
            </div>
          </>
        )}

        <div className={styles.footerActions}>
          {destInfo && !isSearchingInSheet && (
            <button className={styles.footerBtn} onClick={onCopy}>
              <span>📋 {copied ? t('fab.copy_done') : t('fab.copy')}</span>
            </button>
          )}
          <button className={styles.footerBtn} onClick={onClose}>{t('fab.cancel')}</button>
        </div>
      </div>
    </div>
  );
}
