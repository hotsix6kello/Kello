'use client';

import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import styles from './privacy.module.css';

export default function PrivacyPolicyPage() {
  const { t } = useTranslation('common');
  const router = useRouter();

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button onClick={() => router.back()} className={styles.backBtn}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </button>
        <h1 className={styles.title}>{t('privacy_policy.title')}</h1>
      </header>

      <main className={styles.content}>
        <p className={styles.effectiveDate}>{t('privacy_policy.effective_date')}</p>

        {/* 1. Collection */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('privacy_policy.collection.title')}</h2>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t('privacy_policy.table.category')}</th>
                  <th>{t('privacy_policy.table.items')}</th>
                  <th>{t('privacy_policy.table.purpose')}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{t('privacy_policy.collection.required')}</td>
                  <td>{t('privacy_policy.collection.required_items')}</td>
                  <td>{t('privacy_policy.collection.required_purpose')}</td>
                </tr>
                <tr>
                  <td>{t('privacy_policy.collection.auto')}</td>
                  <td>{t('privacy_policy.collection.auto_items')}</td>
                  <td>{t('privacy_policy.collection.auto_purpose')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 2. Retention */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('privacy_policy.retention.title')}</h2>
          <p>{t('privacy_policy.retention.content')}</p>
          <p className={styles.legalBasis}>{t('privacy_policy.retention.legal_basis')}</p>
        </section>

        {/* 3. Third Party */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('privacy_policy.third_party.title')}</h2>
          <p>{t('privacy_policy.third_party.content')}</p>
          <ul className={styles.list}>
            <li>{t('privacy_policy.third_party.providers')}</li>
          </ul>
        </section>

        {/* 4. Overseas Transfer */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('privacy_policy.overseas.title')}</h2>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t('privacy_policy.overseas.recipient')}</th>
                  <th>{t('privacy_policy.overseas.country')}</th>
                  <th>{t('privacy_policy.overseas.purpose')}</th>
                  <th>{t('privacy_policy.overseas.items')}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{t('privacy_policy.overseas.supabase_name')}</td>
                  <td>{t('privacy_policy.overseas.usa')}</td>
                  <td>{t('privacy_policy.overseas.storage_auth')}</td>
                  <td>{t('privacy_policy.overseas.log_items')}</td>
                </tr>
                <tr>
                  <td>{t('privacy_policy.overseas.google_name')}</td>
                  <td>{t('privacy_policy.overseas.usa')}</td>
                  <td>{t('privacy_policy.overseas.storage_auth')}</td>
                  <td>{t('privacy_policy.overseas.log_items')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 5. Destruction */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('privacy_policy.destruction.title')}</h2>
          <p>{t('privacy_policy.destruction.content')}</p>
        </section>
      </main>
    </div>
  );
}
