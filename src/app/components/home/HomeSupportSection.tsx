import { TFunction } from 'i18next';
import styles from '../../home.module.css';

interface HomeSupportSectionProps {
  assuranceItems: unknown[];
  onOpenInterpreter: () => void;
  t: TFunction;
}

export default function HomeSupportSection({
  assuranceItems,
  onOpenInterpreter,
  t
}: HomeSupportSectionProps) {
  return (
    <section className={styles.supportSection}>
      <article className={styles.interpreterCard}>
        <span className={styles.interpreterEyebrow}>{t('home_beauty.interpreter.eyebrow')}</span>
        <h2 className={styles.interpreterTitle}>{t('home_beauty.interpreter.title')}</h2>
        <p className={styles.interpreterDescription}>
          {t('home_beauty.interpreter.description')}
        </p>
        <button className={styles.secondaryBtn} type="button" onClick={onOpenInterpreter}>
          {t('home_beauty.interpreter.button')}
        </button>
      </article>

      <div className={styles.assuranceGrid}>
        {assuranceItems.map((_, index) => (
          <article key={index} className={styles.assuranceCard}>
            <h3 className={styles.assuranceTitle}>{t(`home_beauty.assurance.items.${index}.title`)}</h3>
            <p className={styles.assuranceDescription}>{t(`home_beauty.assurance.items.${index}.desc`)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
