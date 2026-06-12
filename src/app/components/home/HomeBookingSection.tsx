import Image from 'next/image';
import { BeautyCategoryOption, BeautyCategoryId } from './constants';
import styles from '../../home.module.css';

interface HomeBookingSectionProps {
  categories: BeautyCategoryOption[];
  selectedCategory: BeautyCategoryId | null;
  onSelectCategory: (id: BeautyCategoryId) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}

export default function HomeBookingSection({
  categories,
  selectedCategory,
  onSelectCategory,
  t
}: HomeBookingSectionProps) {
  return (
    <section className={styles.bookingShell}>
      <h3 className={styles.sectionSubtitle}>어떤 K-뷰티 서비스를 찾고 있나요?</h3>
      <div className={styles.categoryRow}>
        {categories.map((option) => {
          const isActive = selectedCategory === option.id;

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
                  alt={t(option.label)}
                  width={44}
                  height={44}
                  className={styles.categoryIcon}
                />
              </div>
              <span className={styles.categoryCircleLabel}>{option.labelKo}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
