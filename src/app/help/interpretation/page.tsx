'use client';

import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

const services = [
    { titleKey: 'hotline_title', descKey: 'hotline_desc', icon: '☎️', color: '#8b5cf6', href: 'tel:1330', hrefLabel: '📞 Call 1330' },
    { titleKey: 'papago_title', descKey: 'papago_desc', icon: '🌐', color: '#10b981', href: 'https://papago.naver.com', hrefLabel: 'Open Papago', external: true },
    { titleKey: 'google_title', descKey: 'google_desc', icon: '🌍', color: '#3b82f6', href: 'https://translate.google.com', hrefLabel: 'Open Google Translate', external: true },
    { titleKey: 'dasan_title', descKey: 'dasan_desc', icon: '💬', color: '#f59e0b', href: 'tel:120', hrefLabel: '📞 Call 120' },
];

const phraseKeys = ['p1', 'p2', 'p3', 'p4'];

export default function InterpretationPage() {
    const router = useRouter();
    const { t } = useTranslation('common');

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', paddingBottom: 100 }}>
            <header style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', padding: '20px 20px 24px', color: 'white' }}>
                <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.4rem', cursor: 'pointer', marginBottom: 8 }}>←</button>
                <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>🌐 {t('help_page.interp_title')}</h1>
                <p style={{ margin: '4px 0 0', opacity: 0.85, fontSize: '0.9rem' }}>{t('help_page.interp_desc')}</p>
            </header>

            <div style={{ padding: '20px 20px 0' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>📡 {t('help_page.interp_services')}</h2>

                {services.map((s, i) => (
                    <div key={i} style={{ background: 'white', borderRadius: 16, padding: '16px', marginBottom: 12, border: `2px solid ${s.color}20`, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                            <div style={{ fontSize: '2rem', flexShrink: 0 }}>{s.icon}</div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: s.color }}>
                                    {t(`help_page.interp.${s.titleKey}`, { defaultValue: s.titleKey })}
                                </div>
                                <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 4, lineHeight: 1.5 }}>
                                    {t(`help_page.interp.${s.descKey}`, { defaultValue: '' })}
                                </div>
                                <a
                                    href={s.href}
                                    target={s.external ? '_blank' : undefined}
                                    rel={s.external ? 'noopener noreferrer' : undefined}
                                    style={{ display: 'inline-block', marginTop: 10, background: s.color + '15', color: s.color, padding: '7px 14px', borderRadius: 20, fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none' }}
                                >
                                    {s.hrefLabel}
                                </a>
                            </div>
                        </div>
                    </div>
                ))}

                <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: '24px 0 12px' }}>🗣 {t('help_page.interp_phrases')}</h2>

                {phraseKeys.map((k) => {
                    const kr = t(`help_page.interp.${k}_kr`, { defaultValue: '' });
                    const en = t(`help_page.interp.${k}_en`, { defaultValue: '' });
                    if (!kr) return null;
                    return (
                        <div key={k} style={{ background: 'white', borderRadius: 14, padding: '16px', marginBottom: 10, border: '2px solid #f5f3ff' }}>
                            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#8b5cf6' }}>{kr}</div>
                            <div style={{ fontSize: '0.88rem', color: '#374151', marginTop: 6 }}>→ {en}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
