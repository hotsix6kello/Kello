'use client';

import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

export default function InterpretationPage() {
    const router = useRouter();
    const { t } = useTranslation('common');

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f8fafc', paddingBottom: 24 }}>
            <header style={{ 
                background: '#F0FDF4', 
                borderBottom: '1px solid #DCFCE7',
                padding: '16px 20px', 
                color: '#000000',
                display: 'flex',
                alignItems: 'center',
                gap: 12
            }}>
                <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#000000', fontSize: '1.4rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>←</button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h5.75L22 22h2l-5.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z" fill="#10B981" />
                    </svg>
                    <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#000000' }}>{t('my_page.help_interpreter', { defaultValue: '통역' })}</h1>
                </div>
            </header>

            <div style={{ padding: '20px 20px 0' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>📡 {t('help_page.interp_immediate_title')}</h2>

                <div style={{ background: 'white', borderRadius: 16, padding: '16px', marginBottom: 24, border: '2px solid #8b5cf620', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div style={{ fontSize: '2rem', flexShrink: 0 }}>☎️</div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#8b5cf6' }}>{t('help_page.interp_hotline_title')}</div>
                            <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 4, lineHeight: 1.5 }}>
                                {t('help_page.interp_hotline_desc')}
                            </div>
                            <div style={{ marginTop: 10 }}>
                                <a
                                    href="https://visitkorea.or.kr/helper/main.do"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ display: 'inline-block', background: '#f5f3ff', color: '#7c3aed', padding: '7px 14px', borderRadius: 20, fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none', border: '1px solid #ddd6fe' }}
                                >
                                    💬 {t('help_page.interp_chat_label')}
                                </a>
                            </div>
                        </div>
                        <a href="tel:1330" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: '50%', background: '#22C55E', color: 'white', textDecoration: 'none', boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)', flexShrink: 0 }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-2.2 2.2a15.045 15.045 0 0 1-6.59-6.59l2.2-2.21a.96.96 0 0 0 .25-1A11.36 11.36 0 0 1 8.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.58c0-.56-.45-1.04-1-1.04z" />
                            </svg>
                        </a>
                    </div>
                </div>

                <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>📱 {t('help_page.interp_tools_title')}</h2>

                <div style={{ background: 'white', borderRadius: 16, padding: '16px', marginBottom: 12, border: '2px solid #10b98120', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div style={{ fontSize: '2rem', flexShrink: 0 }}>🌐</div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#10b981' }}>{t('help_page.interp_actions.open_papago', { defaultValue: 'Papago' })}</div>
                            <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 4, lineHeight: 1.5 }}>
                                {t('help_page.interp.papago_desc')}
                            </div>
                            <a
                                href="https://papago.naver.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ display: 'inline-block', marginTop: 10, background: '#10b98115', color: '#10b981', padding: '7px 14px', borderRadius: 20, fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none' }}
                            >
                                {t('help_page.interp_actions.open_papago')}
                            </a>
                        </div>
                    </div>
                </div>

                <div style={{ background: 'white', borderRadius: 16, padding: '16px', marginBottom: 12, border: '2px solid #3b82f620', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div style={{ fontSize: '2rem', flexShrink: 0 }}>🌍</div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#3b82f6' }}>{t('help_page.interp_actions.open_google_translate', { defaultValue: 'Google Translate' })}</div>
                            <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 4, lineHeight: 1.5 }}>
                                {t('help_page.interp.google_desc')}
                            </div>
                            <a
                                href="https://translate.google.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ display: 'inline-block', marginTop: 10, background: '#3b82f615', color: '#3b82f6', padding: '7px 14px', borderRadius: 20, fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none' }}
                            >
                                {t('help_page.interp_actions.open_google_translate')}
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
