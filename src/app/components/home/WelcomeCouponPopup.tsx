'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabaseClient';
import styles from './WelcomeCouponPopup.module.css';

type Destination = '/auth/signup' | '/my';

export default function WelcomeCouponPopup() {
  const router = useRouter();
  const { t } = useTranslation('common');
  const [destination, setDestination] = useState<Destination>('/auth/signup');

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return; // 비로그인 → 기본값 /auth/signup 유지

      const { data: coupons } = await supabase
        .from('coupons')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('is_used', false)
        .limit(1);

      setDestination(coupons && coupons.length > 0 ? '/my' : '/auth/signup');
    };

    void check();
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    router.push(destination);
  };

  return (
    <button type="button" className={styles.floatingBanner} onClick={handleClick}>
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
