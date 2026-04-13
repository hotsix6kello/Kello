'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from "react-i18next";
import { supabase } from '@/lib/supabaseClient';
import styles from './notification-settings.module.css';

interface BeautyNotificationPreferences {
  inAppEnabled: boolean;
  emailEnabled: boolean;
  bookingUpdatesEnabled: boolean;
  changeRequestUpdatesEnabled: boolean;
  alternativeOfferUpdatesEnabled: boolean;
}

function NotificationSettingsContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [preferences, setPreferences] = useState<BeautyNotificationPreferences>({
    inAppEnabled: true,
    emailEnabled: true,
    bookingUpdatesEnabled: true,
    changeRequestUpdatesEnabled: true,
    alternativeOfferUpdatesEnabled: true,
  });
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const { t } = useTranslation('common');

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(Boolean(user));
      setAuthReady(true);
      if (user) {
        fetchPreferences();
      }
    };
    void init();
  }, []);

  const fetchPreferences = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    try {
      const response = await fetch('/api/bookings/beauty/preferences', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const body = await response.json();
      if (body.ok) {
        setPreferences(body.preferences);
      }
    } catch (_error) {
      console.error('Failed to fetch preferences:', _error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key: keyof BeautyNotificationPreferences) => {
    const newPrefs = { ...preferences, [key]: !preferences[key] };
    setPreferences(newPrefs);
    await savePreferences(newPrefs);
  };

  const savePreferences = async (newPrefs: BeautyNotificationPreferences) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch('/api/bookings/beauty/preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(newPrefs),
      });
      const body = await response.json();
      if (body.ok) {
        setMessage({ text: t('notifications.save_success', { defaultValue: '설정이 저장되었습니다.' }), type: 'success' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        throw new Error(body.error);
      }
    } catch {
      setMessage({ text: t('notifications.save_fail', { defaultValue: '저장에 실패했습니다.' }), type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (!authReady || loading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.spinner} />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
            <button type="button" className={styles.backButton} onClick={() => router.push('/my')}>←</button>
            <h1 className={styles.headerTitle}>{t('notifications.title', { defaultValue: '알림 설정' })}</h1>
        </header>
        <div className={styles.content}>
            <p>{t('notifications.login_required', { defaultValue: '로그인 후 이용 가능합니다.' })}</p>
            <button className={styles.primaryButton} onClick={() => router.push('/auth')}>{t('notifications.login_button', { defaultValue: '로그인' })}</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button type="button" className={styles.backButton} onClick={() => router.push('/my')}>←</button>
        <h1 className={styles.headerTitle}>{t('notifications.title', { defaultValue: '알림 설정' })}</h1>
      </header>

      <main className={styles.content}>
        <div className={styles.heroSection}>
          <h2 className={styles.heroTitle}>{t('notifications.hero_title', { defaultValue: '예약 알림을 내게 맞춰 보세요. ✨' })}</h2>
          <p className={styles.heroDescription}>{t('notifications.hero_desc', { defaultValue: 'Kello 프리미엄 대행 서비스의 예약 업데이트를 받는 방식을 정할 수 있습니다.' })}</p>
        </div>

        {message && (
          <div className={`${styles.toast} ${styles[message.type]}`}>
            {message.text}
          </div>
        )}

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>{t('notifications.channel.title', { defaultValue: '채널 설정' })}</h3>
          <div className={styles.optionCard}>
            <div className={styles.optionInfo}>
              <h4 className={styles.optionTitle}>{t('notifications.channel.email_title', { defaultValue: '이메일로도 예약 진행 상황 받기' })}</h4>
              <p className={styles.optionDescription}>{t('notifications.channel.email_desc', { defaultValue: '예약 정보와 진행 과정의 핵심 업데이트를 이메일로도 안전하게 보내드립니다.' })}</p>
            </div>
            <label className={styles.switch}>
              <input 
                type="checkbox" 
                checked={preferences.emailEnabled} 
                onChange={() => handleToggle('emailEnabled')} 
                disabled={saving}
              />
              <span className={styles.slider}></span>
            </label>
          </div>

          <div className={styles.optionCard}>
            <div className={styles.optionInfo}>
              <h4 className={styles.optionTitle}>{t('notifications.channel.app_title', { defaultValue: '앱에서 예약 알림 받기' })}</h4>
              <p className={styles.optionDescription}>{t('notifications.channel.app_desc', { defaultValue: '중요한 예약 상태 변화는 앱 내 알림함에 항상 기록되어 언제든 확인할 수 있습니다.' })}</p>
            </div>
            <label className={styles.switch}>
              <input 
                type="checkbox" 
                checked={true} // Mandatory for core booking processes
                disabled={true}
              />
              <span className={`${styles.slider} ${styles.disabled}`}></span>
            </label>
          </div>
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>{t('notifications.types.title', { defaultValue: '알림 종류 설정' })}</h3>
          <div className={styles.optionCard}>
            <div className={styles.optionInfo}>
              <h4 className={styles.optionTitle}>{t('notifications.types.booking_title', { defaultValue: '예약 단계별 알림 받기' })}</h4>
              <p className={styles.optionDescription}>{t('notifications.types.booking_desc', { defaultValue: '접수, 확정, 이용 완료 등 서비스 이용의 주요 단계마다 알림을 받습니다.' })}</p>
            </div>
            <label className={styles.switch}>
              <input 
                type="checkbox" 
                checked={preferences.bookingUpdatesEnabled} 
                onChange={() => handleToggle('bookingUpdatesEnabled')} 
                disabled={saving}
              />
              <span className={styles.slider}></span>
            </label>
          </div>

          <div className={styles.optionCard}>
            <div className={styles.optionInfo}>
              <h4 className={styles.optionTitle}>{t('notifications.types.change_title', { defaultValue: '변경 요청 결과 알림 받기' })}</h4>
              <p className={styles.optionDescription}>{t('notifications.types.change_desc', { defaultValue: '요청하신 날짜/항목 변경의 승인 또는 반려 결과를 즉시 알려드립니다.' })}</p>
            </div>
            <label className={styles.switch}>
              <input 
                type="checkbox" 
                checked={preferences.changeRequestUpdatesEnabled} 
                onChange={() => handleToggle('changeRequestUpdatesEnabled')} 
                disabled={saving}
              />
              <span className={styles.slider}></span>
            </label>
          </div>

          <div className={styles.optionCard}>
            <div className={styles.optionInfo}>
              <h4 className={styles.optionTitle}>{t('notifications.types.alternative_title', { defaultValue: '대체 일정 제안 알림 받기' })}</h4>
              <p className={styles.optionDescription}>{t('notifications.types.alternative_desc', { defaultValue: '원하시는 시간이 마감되어 매장에서 다른 대안 시간을 제안했을 때 알려드립니다.' })}</p>
            </div>
            <label className={styles.switch}>
              <input 
                type="checkbox" 
                checked={preferences.alternativeOfferUpdatesEnabled} 
                onChange={() => handleToggle('alternativeOfferUpdatesEnabled')} 
                disabled={saving}
              />
              <span className={styles.slider}></span>
            </label>
          </div>
        </section>

        <p className={styles.footerNote}>
          {t('notifications.footer_note', { defaultValue: '예약 관련 필수 안내사항은 설정과 관계없이 발송될 수 있습니다.' })}
        </p>
      </main>
    </div>
  );
}

export default function NotificationSettingsPage() {
  return (
    <Suspense fallback={<div className={styles.loadingScreen}><div className={styles.spinner} /></div>}>
      <NotificationSettingsContent />
    </Suspense>
  );
}
