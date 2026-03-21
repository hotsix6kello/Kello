import styles from '../../home.module.css';

interface HomeBookingSectionProps {
  categories: any[];
  selectedCategory: string | null;
  onSelectCategory: (id: any) => void;
  t: (key: any, options?: any) => any;
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
                <span className={styles.categoryLabel}>{t(`home_beauty.categories.${option.id}.label`)}</span>
                <span className={styles.categoryNote}>{t(`home_beauty.categories.${option.id}.note`)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
