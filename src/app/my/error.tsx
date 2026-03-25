'use client';

import { useEffect } from 'react';

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

  return (
    <div style={{ padding: '24px', textAlign: 'center' }}>
      <h2 style={{ marginBottom: '16px' }}>오류가 발생했습니다.</h2>
      <p style={{ marginBottom: '24px', color: '#666' }}>페이지를 불러오는 중 문제가 생겼습니다.</p>
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
        다시 시도
      </button>
    </div>
  );
}
