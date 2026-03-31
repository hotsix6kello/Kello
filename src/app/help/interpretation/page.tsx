'use client';

import { useRouter } from 'next/navigation';

export default function InterpretationPage() {
    const router = useRouter();

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f8fafc', paddingBottom: 24 }}>
            <header style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', padding: '20px 20px 24px', color: 'white' }}>
                <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.4rem', cursor: 'pointer', marginBottom: 8 }}>←</button>
                <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>🌐 통역 · 번역 안내</h1>
            </header>

            <div style={{ padding: '20px 20px 0' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>📡 바로 도움받기</h2>

                <div style={{ background: 'white', borderRadius: 16, padding: '16px', marginBottom: 24, border: '2px solid #8b5cf620', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div style={{ fontSize: '2rem', flexShrink: 0 }}>☎️</div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#8b5cf6' }}>1330 관광 통역 안내</div>
                            <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 4, lineHeight: 1.5 }}>
                                통역이나 여행 안내가 필요할 때 가장 빠른 공식 도움입니다
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                                <a
                                    href="tel:1330"
                                    style={{ background: '#8b5cf615', color: '#8b5cf6', padding: '7px 14px', borderRadius: 20, fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none' }}
                                >
                                    📞 1330 전화하기
                                </a>
                                <a
                                    href="https://visitkorea.or.kr/helper/main.do"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ background: '#f5f3ff', color: '#7c3aed', padding: '7px 14px', borderRadius: 20, fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none', border: '1px solid #ddd6fe' }}
                                >
                                    💬 채팅으로 문의
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>📱 번역 도구</h2>

                <div style={{ background: 'white', borderRadius: 16, padding: '16px', marginBottom: 12, border: '2px solid #10b98120', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div style={{ fontSize: '2rem', flexShrink: 0 }}>🌐</div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#10b981' }}>Papago</div>
                            <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 4, lineHeight: 1.5 }}>
                                한국어 대화와 텍스트 번역에 가장 편하게 쓸 수 있습니다
                            </div>
                            <a
                                href="https://papago.naver.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ display: 'inline-block', marginTop: 10, background: '#10b98115', color: '#10b981', padding: '7px 14px', borderRadius: 20, fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none' }}
                            >
                                Papago 열기
                            </a>
                        </div>
                    </div>
                </div>

                <div style={{ background: 'white', borderRadius: 16, padding: '16px', marginBottom: 12, border: '2px solid #3b82f620', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div style={{ fontSize: '2rem', flexShrink: 0 }}>🌍</div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#3b82f6' }}>Google Translate</div>
                            <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 4, lineHeight: 1.5 }}>
                                카메라 번역이나 추가 언어 지원이 필요할 때 유용합니다
                            </div>
                            <a
                                href="https://translate.google.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ display: 'inline-block', marginTop: 10, background: '#3b82f615', color: '#3b82f6', padding: '7px 14px', borderRadius: 20, fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none' }}
                            >
                                Google 번역 열기
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
