'use client';

import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import styles from './WelcomeCouponPopup.module.css';

interface WelcomeCouponPopupProps {
  onClose?: () => void;
}

export default function WelcomeCouponPopup({ onClose }: WelcomeCouponPopupProps) {
  const router = useRouter();
  const { t } = useTranslation('common');

  const handleSignUp = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    router.push('/auth/signup');
    if (onClose) onClose();
  };

  return (
    <button type="button" className={styles.floatingBanner} onClick={handleSignUp}>
      <span className={styles.copy}>
        <span className={styles.title}>{t('welcome_popup.title')}</span>
        <span className={styles.description}>{t('welcome_popup.description')}</span>
      </span>
      <span className={styles.ticket} aria-hidden="true">
        <span className={styles.discount}>5%</span>
        <span className={styles.off}>OFF</span>
      </span>
    </button>
  );
}

