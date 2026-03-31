'use client';

import { useRouter } from 'next/navigation';

const policeContacts = [
    { label: '범죄 신고 (긴급)', note: '24시간 서비스, 외국어 대응 가능', number: '112', icon: '🚔' },
    { label: '경찰청 공식 사이트', note: '사이버 범죄 신고 및 정보 안내', number: null, icon: '🌐', url: 'https://www.police.go.kr', urlLabel: 'police.go.kr' },
];

export default function PolicePage() {
    const router = useRouter();

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f8fafc', paddingBottom: 24 }}>
            <header style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', padding: '20px 20px 24px', color: 'white' }}>
                <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.4rem', cursor: 'pointer', marginBottom: 8 }}>←</button>
                <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>🚔 경찰 · 안전 안내</h1>
            </header>

            <div style={{ padding: '20px 20px 0' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>📞 경찰 신고 및 안내</h2>

                {policeContacts.map((p, i) => (
                    <div key={i} style={{ background: 'white', borderRadius: 14, padding: '14px 16px', marginBottom: 10, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                        <span style={{ fontSize: '1.6rem' }}>{p.icon}</span>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b' }}>{p.label}</div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>{p.note}</div>
                        </div>
                        {p.number ? (
                            <a href={`tel:${p.number}`} style={{ background: '#eff6ff', color: '#3b82f6', padding: '8px 14px', borderRadius: 20, fontWeight: 700, textDecoration: 'none', fontSize: '0.9rem' }}>
                                📲 {p.number}
                            </a>
                        ) : (
                            <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ background: '#eff6ff', color: '#3b82f6', padding: '8px 14px', borderRadius: 20, fontWeight: 700, textDecoration: 'none', fontSize: '0.85rem' }}>
                                {p.urlLabel} →
                            </a>
                        )}
                    </div>
                ))}

                <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: '24px 0 12px' }}>🗣 관광경찰 안내</h2>

                <div style={{ background: 'white', borderRadius: 14, padding: 16, border: '2px solid #eff6ff', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <div style={{ fontWeight: 700, color: '#1d4ed8', marginBottom: 4 }}>👮 관광경찰 서비스</div>
                    <div style={{ fontSize: '0.88rem', color: '#374151', lineHeight: 1.5 }}>
                        명동, 인사동, 이태원 등 주요 관광지에서 도움을 받을 수 있습니다.
                    </div>
                </div>
            </div>
        </div>
    );
}
