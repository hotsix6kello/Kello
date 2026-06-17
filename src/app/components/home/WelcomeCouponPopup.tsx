'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import styles from './WelcomeCouponPopup.module.css';

interface WelcomeCouponPopupProps {
  onClose?: () => void;
}

export default function WelcomeCouponPopup({ onClose }: WelcomeCouponPopupProps) {
  const router = useRouter();
  const { t } = useTranslation('common');

  const handleSignUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push('/auth/signup');
    if (onClose) onClose();
  };

  return (
    <div className={styles.floatingBanner} onClick={handleSignUp}>
      <div className={styles.textContainer}>
        <div className={styles.line1}>{t('welcome_popup.title')}</div>
        <div className={styles.line2}>
          <span className={styles.highlight}>Kello</span>{t('welcome_popup.description')}
        </div>
      </div>
      <div className={styles.couponContainer}>
        <Image
          src="/images/home/coupon_ticket.png"
          alt="5% Coupon"
          width={140}
          height={100}
          className={styles.couponImage}
        />
      </div>
    </div>
  );
}
