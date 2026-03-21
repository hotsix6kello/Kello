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
    <section className={styles.supportSection} style={{ paddingBottom: '32px' }}>
      <div className={styles.interpreterCard} style={{ padding: '0' }}>
        <button className={styles.mainCtaBtn} onClick={onOpenInterpreter}>
          {t('home_beauty.interpreter_entry.cta')}
        </button>
      </div>
    </section>
  );
}
