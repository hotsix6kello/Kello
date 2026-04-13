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
      <h2 style={{ marginBottom: '16px' }}>{t('common.error_title', { defaultValue: '오류가 발생했습니다.' })}</h2>
      <p style={{ marginBottom: '24px', color: '#666' }}>{t('common.error_desc', { defaultValue: '페이지를 불러오는 중 문제가 생겼습니다.' })}</p>
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
        {t('common.retry', { defaultValue: '다시 시도' })}
      </button>
    </div>
  );
}
