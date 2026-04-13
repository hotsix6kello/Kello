'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('MyPage Error:', error);
  }, [error]);

  const { t } = useTranslation('common');

  return (
    <div style={{ padding: '24px', textAlign: 'center' }}>
      <h2 style={{ marginBottom: '16px' }}>{t('common.error_title')}</h2>
      <p style={{ marginBottom: '24px', color: '#666' }}>{t('common.error_desc')}</p>
      <button
        onClick={() => reset()}
        style={{
          padding: '10px 20px',
          background: '#7c3aed',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer'
        }}
      >
        {t('common.retry')}
      </button>
    </div>
  );
}
