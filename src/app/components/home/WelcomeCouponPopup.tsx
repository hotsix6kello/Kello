'use client';

import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import styles from './WelcomeCouponPopup.module.css';

interface WelcomeCouponPopupProps {
  onClose: () => void;
}

export default function WelcomeCouponPopup({ onClose }: WelcomeCouponPopupProps) {
  const { t } = useTranslation('common');
  const router = useRouter();

  const handleSignUp = () => {
    router.push('/auth/signup');
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.card} onClick={e => e.stopPropagation()}>
        <h2 className={styles.title}>{t('welcome_popup.title')}</h2>
        <p className={styles.description}>{t('welcome_popup.description')}</p>
        <button className={styles.ctaButton} onClick={handleSignUp}>
          {t('welcome_popup.cta')}
        </button>
        <button className={styles.closeButton} onClick={onClose}>
          {t('welcome_popup.close')}
        </button>
      </div>
    </div>
  );
}
