'use client';

import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

const policeContacts = [
    { labelKey: 'police_info.crime_label', noteKey: 'police_info.crime_note', number: '112', icon: '🚔', color: '#3b82f6' },
    { labelKey: 'police_info.tourist_label', noteKey: 'police_info.tourist_note', number: '1330', icon: '🌐', color: '#8b5cf6' },
    { labelKey: 'police_info.station_label', noteKey: null, number: null, icon: '📍', color: '#10b981', url: 'https://www.police.go.kr', urlLabel: 'police.go.kr' },
];

const phraseKeys = ['p1', 'p2', 'p3', 'p4'];

export default function PolicePage() {
    const router = useRouter();
    const { t } = useTranslation('common');

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', paddingBottom: 100 }}>
            <header style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', padding: '20px 20px 24px', color: 'white' }}>
                <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.4rem', cursor: 'pointer', marginBottom: 8 }}>←</button>
                <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>🚔 {t('help_page.police_title')}</h1>
                <p style={{ margin: '4px 0 0', opacity: 0.85, fontSize: '0.9rem' }}>{t('help_page.police_desc')}</p>
            </header>

            <div style={{ padding: '20px 20px 0' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>📞 {t('help_page.police_contacts')}</h2>

                {policeContacts.map((p, i) => (
                    <div key={i} style={{ background: 'white', borderRadius: 14, padding: '14px 16px', marginBottom: 10, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                        <span style={{ fontSize: '1.6rem' }}>{p.icon}</span>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b' }}>
                                {t(`help_page.${p.labelKey}`, { defaultValue: p.icon })}
                            </div>
                            {p.noteKey && (
                                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
                                    {t(`help_page.${p.noteKey}`)}
                                </div>
                            )}
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

                <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: '24px 0 12px' }}>🗣 {t('help_page.police_phrases')}</h2>

                {phraseKeys.map((k) => {
                    const kr = t(`help_page.police_info.${k}_kr`, { defaultValue: '' });
                    const en = t(`help_page.police_info.${k}_en`, { defaultValue: '' });
                    if (!kr) return null;
                    return (
                        <div key={k} style={{ background: 'white', borderRadius: 14, padding: '16px', marginBottom: 10, border: '2px solid #eff6ff', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#3b82f6' }}>{kr}</div>
                            <div style={{ fontSize: '0.88rem', color: '#374151', marginTop: 6 }}>→ {en}</div>
                        </div>
                    );
                })}

                <div style={{ background: '#eff6ff', borderRadius: 14, padding: 16, marginTop: 8, border: '1px solid #bfdbfe' }}>
                    <div style={{ fontWeight: 700, color: '#1d4ed8', marginBottom: 4 }}>ℹ️ Tourist Police</div>
                    <div style={{ fontSize: '0.85rem', color: '#374151', lineHeight: 1.5 }}>
                        {t('help_page.police_info.tourist_info', { defaultValue: 'Tourist Police officers are stationed at Myeongdong, Insadong, and Itaewon areas.' })}
                    </div>
                </div>
            </div>
        </div>
    );
}
