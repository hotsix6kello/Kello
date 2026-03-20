import { TFunction } from 'i18next';
import styles from '../../home.module.css';

interface HomeRecommendedPlansProps {
  plans: Array<{ id: string; label: string; title: string; duration: number; items: unknown[] }>;
  days: number;
  onApplyPlan: (plan: { id: string; duration: number; items: unknown[] }) => void;
  onCreateCustomPlan: () => void;
  t: TFunction;
}

export default function HomeRecommendedPlans({
  plans,
  days,
  onApplyPlan,
  onCreateCustomPlan,
  t
}: HomeRecommendedPlansProps) {
  return (
    <section className={styles.featuredSection}>
      <h2 className={styles.sectionTitle}>{t('home.recommended_plans')}</h2>
      <div className={styles.featuredGrid}>
        {plans.map(plan => (
          <article 
            key={plan.id} 
            className={styles.featuredCard}
            onClick={() => onApplyPlan(plan)}
          >
            <div className={styles.selectionTag}>{plan.label}</div>
            <h3 className={styles.selectionTitle}>{plan.title}</h3>
          </article>
        ))}
        {/* Custom Plan CTA */}
        <article 
          className={`${styles.featuredCard} ${styles.customPlanCard}`}
          onClick={onCreateCustomPlan}
        >
          <div className={styles.selectionTag}>{t('home.plans.request_custom_label')}</div>
          <h3 className={styles.selectionTitle}>
            {t('home.plans.request_custom_title', { days })}
          </h3>
        </article>
      </div>
    </section>
  );
}
