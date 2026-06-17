'use client';

/**
 * Next.js Global Error file to handle layout-level crashes.
 * Required to have its own <html> and <body> tags since it replaces RootLayout.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error('[GlobalError] Uncaught Layout Error:', error);

  return (
    <html>
      <body style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh', 
        fontFamily: 'sans-serif',
        textAlign: 'center',
        padding: '24px'
      }}>
        <h2 style={{ marginBottom: '16px' }}>Something went wrong.</h2>
        <p style={{ color: '#666', marginBottom: '24px' }}>An unexpected error occurred while running the app.</p>
        <button
          onClick={() => reset()}
          style={{
            padding: '12px 24px',
            borderRadius: '12px',
            background: '#000',
            color: '#fff',
            border: 'none',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Try Again
        </button>
      </body>
    </html>
  );
}
