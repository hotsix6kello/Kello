import { TFunction } from 'i18next';
import { BeautyCategoryOption, BeautyCategoryId } from './constants';
import styles from '../../home.module.css';

interface HomeBookingSectionProps {
  categories: BeautyCategoryOption[];
  selectedCategory: BeautyCategoryId | null;
  onSelectCategory: (id: BeautyCategoryId) => void;
  onStartBooking: () => void;
  t: TFunction;
}

export default function HomeBookingSection({
  categories,
  selectedCategory,
  onSelectCategory,
  onStartBooking,
  t
}: HomeBookingSectionProps) {
  return (
    <section className={styles.bookingShell}>
      <div className={styles.bookingCard}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionEyebrow}>{t('home_beauty.booking.step')}</span>
          <h2 className={styles.sectionTitle}>{t('home_beauty.booking.title')}</h2>
          <p className={styles.sectionDescription}>
            {t('home_beauty.booking.description')}
          </p>
        </div>

        <div className={styles.categoryGrid}>
          {categories.map((option) => {
            const isActive = selectedCategory === option.id;

            return (
              <button
                key={option.id}
                type="button"
                className={`${styles.categoryButton} ${isActive ? styles.categoryButtonActive : ''}`}
                onClick={() => onSelectCategory(option.id)}
              >
                <span className={styles.categoryCode}>{option.code}</span>
                <span className={styles.categoryLabel}>{t(`home_beauty.categories.${option.id}.label`)}</span>
                <span className={styles.categoryNote}>{t(`home_beauty.categories.${option.id}.note`)}</span>
              </button>
            );
          })}
        </div>

        <div className={styles.ctaSection} style={{ marginTop: '24px' }}>
          <p className={styles.ctaHint}>
            {t('home_beauty.cta.hint')}
          </p>
          <button
            className={styles.mainCtaBtn}
            type="button"
            disabled={!selectedCategory}
            onClick={onStartBooking}
          >
            {t('home_beauty.cta.button')}
          </button>
        </div>
      </div>
    </section>
  );
}
