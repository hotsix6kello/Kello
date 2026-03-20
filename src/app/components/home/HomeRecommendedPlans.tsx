import { TFunction } from 'i18next';
import styles from '../../home.module.css';

import { RecommendedPlan } from './types';

interface HomeRecommendedPlansProps {
  plans: RecommendedPlan[];
  days: number;
  onApplyPlan: (plan: RecommendedPlan) => void;
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
