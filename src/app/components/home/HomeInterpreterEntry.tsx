'use client';

import { useTranslation } from 'react-i18next';
import styles from '../../home.module.css';

interface HomeInterpreterEntryProps {
  onOpenInterpreter: () => void;
}

export default function HomeInterpreterEntry({ onOpenInterpreter }: HomeInterpreterEntryProps) {
  const { t } = useTranslation('common');

  return (
    <section className={styles.supportSection} style={{ paddingBottom: '32px' }}>
      <div className={styles.interpreterCard} style={{ padding: '20px 16px 16px' }}>
        <button className={styles.mainCtaBtn} onClick={onOpenInterpreter}>
          {t('interpreter_entry.cta')}
        </button>
      </div>
    </section>
  );
}
