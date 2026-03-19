import styles from '../../home.module.css';

interface HomeInterpreterEntryProps {
  onOpenInterpreter: () => void;
  t: (key: string) => any;
}

export default function HomeInterpreterEntry({
  onOpenInterpreter,
  t
}: HomeInterpreterEntryProps) {
  return (
    <section className={styles.supportSection}>
      <div className={styles.interpreterCard}>
        <h2 className={styles.interpreterTitle}>
          {t('home_beauty.interpreter_entry.title')}
        </h2>
        <p className={styles.interpreterDescription}>
          {t('home_beauty.interpreter_entry.description')}
        </p>
        <button className={styles.mainCtaBtn} onClick={onOpenInterpreter}>
          {t('home_beauty.interpreter_entry.cta')}
        </button>
      </div>
    </section>
  );
}
