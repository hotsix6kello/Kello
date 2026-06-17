'use client';

import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { BeautyCategoryOption, BeautyCategoryId } from './constants';
import styles from '../../home.module.css';

interface HomeBookingSectionProps {
  categories: BeautyCategoryOption[];
  selectedCategory: BeautyCategoryId | null;
  onSelectCategory: (id: BeautyCategoryId) => void;
}

export default function HomeBookingSection({
  categories,
  selectedCategory,
  onSelectCategory,
}: HomeBookingSectionProps) {
  const { t } = useTranslation('common');

  return (
    <section className={styles.bookingShell}>
      <h3 className={styles.sectionSubtitle}>{t('home_beauty.booking.section_subtitle')}</h3>
      <div className={styles.categoryRow}>
        {categories.map((option) => {
          const isActive = selectedCategory === option.id;
          const label = t(option.label);

          return (
            <button
              key={option.id}
              type="button"
              className={`${styles.categoryCircleBtn} ${isActive ? styles.categoryCircleBtnActive : ''}`}
              onClick={() => onSelectCategory(option.id)}
            >
              <div className={styles.categoryCircleIcon}>
                <Image
                  src={option.image}
                  alt={label}
                  width={44}
                  height={44}
                  className={styles.categoryIcon}
                />
              </div>
              <span className={styles.categoryCircleLabel}>{label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
