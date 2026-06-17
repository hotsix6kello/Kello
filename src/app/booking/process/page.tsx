'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from './page.module.css';

export default function BookingProcessPage() {
  const router = useRouter();
  const { t } = useTranslation('common');
  const [selectedService, setSelectedService] = useState<string | null>(null);

  const services = [
    {
      id: 'basic',
      name: t('booking_skeleton.services.aesthetic.basic_title'),
      desc: t('booking_skeleton.services.aesthetic.basic_desc'),
    },
    {
      id: 'trouble',
      name: t('booking_skeleton.services.aesthetic.trouble_title'),
      desc: t('booking_skeleton.services.aesthetic.trouble_desc'),
    },
    {
      id: 'calming',
      name: t('booking_skeleton.services.aesthetic.calming_title'),
      desc: t('booking_skeleton.services.aesthetic.calming_desc'),
    },
    {
      id: 'lifting',
      name: t('booking_skeleton.services.aesthetic.lifting_title'),
      desc: t('booking_skeleton.services.aesthetic.lifting_desc'),
    },
    {
      id: 'brightening',
      name: t('booking_skeleton.services.aesthetic.bright_title'),
      desc: t('booking_skeleton.services.aesthetic.bright_desc'),
    },
  ];

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <header className={styles.header}>
          <button
            className={styles.backButton}
            onClick={() => router.back()}
            aria-label={t('common.back')}
          >
            <ArrowLeft size={24} strokeWidth={2} />
          </button>
          <h1 className={styles.headerTitle}>
            {t('booking_skeleton.service_selection.title')}
          </h1>
          <div className={styles.placeholder} />
        </header>

        <div className={styles.scrollArea}>
          <div className={styles.processBox}>
            <div className={styles.stepContainer}>
              <div className={`${styles.stepItem} ${styles.active}`}>
                <span className={styles.stepLabel}>{t('booking_skeleton.steps.step')} 1</span>
                <span className={styles.stepTitle}>{t('booking_skeleton.steps.step1_title')}</span>
              </div>
              <div className={styles.stepItem}>
                <span className={styles.stepLabel}>{t('booking_skeleton.steps.step')} 2</span>
                <span className={styles.stepTitle}>{t('booking_skeleton.steps.step2_title')}</span>
              </div>
              <div className={styles.stepItem}>
                <span className={styles.stepLabel}>{t('booking_skeleton.steps.step')} 3</span>
                <span className={styles.stepTitle}>{t('booking_skeleton.steps.step3_title')}</span>
              </div>
            </div>

            <div className={styles.serviceList}>
              {services.map(svc => (
                <div
                  key={svc.id}
                  className={`${styles.serviceCard} ${selectedService === svc.id ? styles.selected : ''}`}
                  onClick={() => setSelectedService(svc.id)}
                >
                  <h3 className={styles.serviceName}>{svc.name}</h3>
                  <p className={styles.serviceDesc}>{svc.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.bottomArea}>
          <button
            className={styles.nextButton}
            disabled={!selectedService}
            onClick={() => {
              if (selectedService) {
                alert(t('booking_skeleton.next_step'));
              }
            }}
          >
            {t('booking_skeleton.next_step')}
          </button>
        </div>
      </div>
    </div>
  );
}
