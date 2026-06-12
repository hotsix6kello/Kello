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
      <div className={styles.textContainer}>
        <div className={styles.line1}>지금 가입하시면 즉시 사용가능한 5% 할인 쿠폰 증정</div>
        <div className={styles.line2}>
          <span className={styles.highlight}>Kello</span>와 함께 회원가입만 해도 바로 쓸 수 있는 쿠폰을 드려요.
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
