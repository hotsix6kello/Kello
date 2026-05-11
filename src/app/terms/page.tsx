'use client';

import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import styles from './terms.module.css';

export default function TermsOfServicePage() {
  const { t } = useTranslation('common');
  const router = useRouter();

  const sections = [
    {
      title: t('terms_of_service.definitions.title'),
      content: t('terms_of_service.definitions.content')
    },
    {
      title: t('terms_of_service.benefits.title'),
      items: [
        t('terms_of_service.benefits.signup'),
        t('terms_of_service.benefits.referral')
      ]
    },
    {
      title: t('terms_of_service.platform_fee.title'),
      content: t('terms_of_service.platform_fee.content'),
      note: t('terms_of_service.platform_fee.note')
    },
    {
      title: t('terms_of_service.refund_policy.title'),
      content: t('terms_of_service.refund_policy.subtitle'),
      refundSchedule: [
        t('terms_of_service.refund_policy.four_days'),
        t('terms_of_service.refund_policy.three_days'),
        t('terms_of_service.refund_policy.two_days'),
        t('terms_of_service.refund_policy.one_day'),
        t('terms_of_service.refund_policy.same_day')
      ],
      note: t('terms_of_service.refund_policy.note')
    },
    {
      title: t('terms_of_service.chargeback.title'),
      content: t('terms_of_service.chargeback.content'),
      note: t('terms_of_service.chargeback.note')
    },
    {
      title: t('terms_of_service.liability.title'),
      items: [
        t('terms_of_service.liability.interpretation'),
        t('terms_of_service.liability.community')
      ]
    }
  ];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button onClick={() => router.back()} className={styles.backBtn}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </button>
        <h1 className={styles.title}>{t('terms_of_service.title')}</h1>
      </header>

      <main className={styles.content}>
        <p className={styles.effectiveDate}>{t('terms_of_service.effective_date')}</p>

        {sections.map((section, index) => (
          <section key={index} className={styles.section}>
            <h2 className={styles.sectionTitle}>{section.title}</h2>
            {section.content && <p className={styles.sectionText}>{section.content}</p>}
            
            {section.items && (
              <ul className={styles.list}>
                {section.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            )}

            {section.refundSchedule && (
              <ul className={styles.refundList}>
                {section.refundSchedule.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            )}

            {section.note && <p className={styles.note}>{section.note}</p>}
          </section>
        ))}
      </main>
    </div>
  );
}
