import { TFunction } from 'i18next';
import Image from 'next/image';
import { BeautyCategoryOption, BeautyCategoryId } from './constants';
import styles from '../../home.module.css';

interface HomeBookingSectionProps {
  categories: BeautyCategoryOption[];
  selectedCategory: BeautyCategoryId | null;
  onSelectCategory: (id: BeautyCategoryId) => void;
  t: TFunction;
}

export default function HomeBookingSection({
  categories,
  selectedCategory,
  onSelectCategory,
  t
}: HomeBookingSectionProps) {
  return (
    <section className={styles.bookingShell}>
      <div className={styles.bookingCard}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{t('home_beauty.booking.title')}</h2>
          {t('home_beauty.booking.description') && (
            <p className={styles.sectionDescription}>
              {t('home_beauty.booking.description')}
            </p>
          )}
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
                <div className={styles.categoryIconWrap}>
                  <Image 
                    src={option.image} 
                    alt={t(option.label)} 
                    width={56} 
                    height={56} 
                    className={styles.categoryIcon}
                  />
                </div>
                <span className={styles.categoryLabel}>{t(option.label)}</span>
              </button>
            );
          })}
        </div>


      </div>
    </section>
  );
}
