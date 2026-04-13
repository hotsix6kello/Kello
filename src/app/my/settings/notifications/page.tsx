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
        setMessage({ text: t('notifications.save_success'), type: 'success' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        throw new Error(body.error);
      }
    } catch {
      setMessage({ text: t('notifications.save_fail'), type: 'error' });
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
            <h1 className={styles.headerTitle}>{t('notifications.title')}</h1>
        </header>
        <div className={styles.content}>
            <p>{t('notifications.login_required')}</p>
            <button className={styles.primaryButton} onClick={() => router.push('/auth')}>{t('notifications.login_button')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button type="button" className={styles.backButton} onClick={() => router.push('/my')}>←</button>
        <h1 className={styles.headerTitle}>{t('notifications.title')}</h1>
      </header>

      <main className={styles.content}>
        <div className={styles.heroSection}>
          <h2 className={styles.heroTitle}>{t('notifications.hero_title')}</h2>
          <p className={styles.heroDescription}>{t('notifications.hero_desc')}</p>
        </div>

        {message && (
          <div className={`${styles.toast} ${styles[message.type]}`}>
            {message.text}
          </div>
        )}

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>{t('notifications.channel.title')}</h3>
          <div className={styles.optionCard}>
            <div className={styles.optionInfo}>
              <h4 className={styles.optionTitle}>{t('notifications.channel.email_title')}</h4>
              <p className={styles.optionDescription}>{t('notifications.channel.email_desc')}</p>
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
              <h4 className={styles.optionTitle}>{t('notifications.channel.app_title')}</h4>
              <p className={styles.optionDescription}>{t('notifications.channel.app_desc')}</p>
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
          <h3 className={styles.sectionTitle}>{t('notifications.types.title')}</h3>
          <div className={styles.optionCard}>
            <div className={styles.optionInfo}>
              <h4 className={styles.optionTitle}>{t('notifications.types.booking_title')}</h4>
              <p className={styles.optionDescription}>{t('notifications.types.booking_desc')}</p>
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
              <h4 className={styles.optionTitle}>{t('notifications.types.change_title')}</h4>
              <p className={styles.optionDescription}>{t('notifications.types.change_desc')}</p>
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
              <h4 className={styles.optionTitle}>{t('notifications.types.alternative_title')}</h4>
              <p className={styles.optionDescription}>{t('notifications.types.alternative_desc')}</p>
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
          {t('notifications.footer_note')}
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
