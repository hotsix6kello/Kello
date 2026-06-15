'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from './WelcomeCouponPopup.module.css';

interface WelcomeCouponPopupProps {
  onClose?: () => void;
}

export default function WelcomeCouponPopup({ onClose }: WelcomeCouponPopupProps) {
  const router = useRouter();

  const handleSignUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push('/auth/signup');
    if (onClose) onClose();
  };

  return (
    <div className={styles.floatingBanner} onClick={handleSignUp}>
      <Image 
        src="/images/home/bottom_coupon_banner.png" 
        alt="10% Coupon Banner" 
        width={480}
        height={144}
        className={styles.bannerImage} 
        priority
      />
    </div>
  );
}
