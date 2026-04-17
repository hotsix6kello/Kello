'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './ReferralCodePopup.module.css';

interface ReferralCodePopupProps {
  onClose: () => void;
  onSubmit: (code: string) => Promise<void>;
  errorMessage?: string;
}

export default function ReferralCodePopup({ onClose, onSubmit, errorMessage }: ReferralCodePopupProps) {
  const { t } = useTranslation('common');
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!code.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmit(code.trim());
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.card} onClick={e => e.stopPropagation()}>
        <h2 className={styles.title}>{t('referral_popup.title')}</h2>
        <p className={styles.description}>{t('referral_popup.description')}</p>
        <input
          className={styles.input}
          type="text"
          value={code}
          onChange={e => setCode(e.target.value)}
          placeholder={t('referral_popup.placeholder')}
        />
        {errorMessage && (
          <p className={styles.errorMessage}>{errorMessage}</p>
        )}
        <button
          className={styles.submitButton}
          onClick={handleSubmit}
          disabled={!code.trim() || isSubmitting}
        >
          {t('referral_popup.submit')}
        </button>
        <button className={styles.skipButton} onClick={onClose} disabled={isSubmitting}>
          {t('referral_popup.skip')}
        </button>
      </div>
    </div>
  );
}
