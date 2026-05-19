import Link from 'next/link';

const HUB_CARDS = [
  {
    title: '음성 대화 번역',
    description: '방문객과 직원이 번갈아 말하면 한국어와 선택 언어로 대화를 도와드려요.',
    cta: '음성 번역 시작하기',
    href: '/interpreter',
    status: '바로 사용 가능',
    available: true,
  },
  {
    title: '채팅 번역',
    description: '말하기 어려운 상황에서는 텍스트로 입력해 번역할 수 있어요.',
    cta: '채팅 번역 준비 중',
    status: '준비 중',
    available: false,
  },
] as const;

const cardStyle = {
  borderRadius: 24,
  border: '1px solid #e2e8f0',
  background: '#ffffff',
  padding: '24px 20px',
  boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)',
};

const ctaStyle = {
  width: '100%',
  borderRadius: 16,
  padding: '16px 18px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '1rem',
  fontWeight: 700,
  textDecoration: 'none',
  border: 'none',
};

export default function TalkPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '24px 20px calc(132px + env(safe-area-inset-bottom, 0px))',
        background: 'var(--background)',
      }}
    >
      <section style={{ width: '100%', maxWidth: 480, margin: '0 auto' }}>
        <div
          style={{
            ...cardStyle,
            marginBottom: 16,
            padding: '28px 22px',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '0.875rem',
              fontWeight: 700,
              color: '#2563eb',
            }}
          >
            소통 허브
          </p>
          <h1
            style={{
              margin: '10px 0 0',
              fontSize: '1.9rem',
              lineHeight: 1.2,
              fontWeight: 800,
              color: '#0f172a',
            }}
          >
            소통 방식을 선택해 주세요
          </h1>
          <p
            style={{
              margin: '12px 0 0',
              fontSize: '1rem',
              lineHeight: 1.6,
              color: '#475569',
            }}
          >
            상황에 맞는 통역 방식을 고르면 바로 대화를 시작할 수 있어요.
          </p>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          {HUB_CARDS.map((card) => (
            <article key={card.title} style={cardStyle}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  borderRadius: 999,
                  padding: '6px 12px',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  color: card.available ? '#1d4ed8' : '#475569',
                  background: card.available ? '#dbeafe' : '#e2e8f0',
                }}
              >
                {card.status}
              </span>
              <h2
                style={{
                  margin: '16px 0 0',
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: '#0f172a',
                }}
              >
                {card.title}
              </h2>
              <p
                style={{
                  margin: '10px 0 0',
                  fontSize: '0.975rem',
                  lineHeight: 1.6,
                  color: '#475569',
                }}
              >
                {card.description}
              </p>

              {card.available ? (
                <Link
                  href={card.href}
                  style={{
                    ...ctaStyle,
                    marginTop: 18,
                    background: '#0f172a',
                    color: '#ffffff',
                  }}
                >
                  {card.cta}
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  style={{
                    ...ctaStyle,
                    marginTop: 18,
                    background: '#e2e8f0',
                    color: '#64748b',
                    cursor: 'not-allowed',
                  }}
                >
                  {card.cta}
                </button>
              )}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
