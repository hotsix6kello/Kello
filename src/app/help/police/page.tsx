'use client';

import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';

const getPoliceContacts = (t: TFunction) => [
    { label: t('help_page.police.report_call_title'), note: t('help_page.police.report_call_desc'), number: '112', icon: '🚔' },
    { label: t('help_page.police.official_site_title'), note: t('help_page.police.official_site_desc'), number: null, icon: '🌐', url: 'https://www.police.go.kr', urlLabel: 'police.go.kr' },
];

export default function PolicePage() {
    const router = useRouter();
    const { t } = useTranslation('common');
    const policeContacts = getPoliceContacts(t);

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f8fafc', paddingBottom: 24 }}>
            <header style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', padding: '20px 20px 24px', color: 'white' }}>
                <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.4rem', cursor: 'pointer', marginBottom: 8 }}>←</button>
                <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>🚔 {t('help_page.police_header')}</h1>
            </header>

            <div style={{ padding: '20px 20px 0' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>📞 {t('help_page.police_contacts_section')}</h2>

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

                <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: '24px 0 12px' }}>🗣 {t('help_page.tourism_police_section')}</h2>

                <div style={{ background: 'white', borderRadius: 14, padding: 16, border: '2px solid #eff6ff', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <div style={{ fontWeight: 700, color: '#1d4ed8', marginBottom: 4 }}>👮 {t('help_page.tourism_police_title')}</div>
                    <div style={{ fontSize: '0.88rem', color: '#374151', lineHeight: 1.5 }}>
                        {t('help_page.tourism_police_desc')}
                    </div>
                </div>
            </div>
        </div>
    );
}
