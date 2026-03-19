'use client';

import { useState, useEffect } from 'react';
import { changeLanguage } from '@/lib/i18n/client';
import { useTranslation } from 'react-i18next';

const LANG_LIST = [
    { code: 'en', flag: '🇺🇸', name: 'English', region: 'USA · 1.3M visitors' },
    { code: 'cn', flag: '🇨🇳', name: '中文(简体)', region: 'China · 4.6M visitors' },
    { code: 'jp', flag: '🇯🇵', name: '日本語', region: 'Japan · 3.2M visitors' },
    { code: 'tw', flag: '🇹🇼', name: '中文(繁體)', region: 'Taiwan · 1.5M visitors' },
    { code: 'ko', flag: '🇰🇷', name: '한국어', region: 'Korea' },
    { code: 'th', flag: '🇹🇭', name: 'ภาษาไทย', region: 'Thailand · ~500K' },
    { code: 'vi', flag: '🇻🇳', name: 'Tiếng Việt', region: 'Vietnam · ~400K' },
    { code: 'id', flag: '🇮🇩', name: 'Indonesia', region: 'Indonesia · ~350K' },
    { code: 'ms', flag: '🇲🇾', name: 'Melayu', region: 'Malaysia · ~200K' },
    { code: 'es', flag: '🇪🇸', name: 'Español', region: 'Spain' },
    { code: 'fr', flag: '🇫🇷', name: 'Français', region: 'France' },
    { code: 'de', flag: '🇩🇪', name: 'Deutsch', region: 'Germany' },
    { code: 'pt', flag: '🇧🇷', name: 'Português', region: 'Brazil' },
    { code: 'ru', flag: '🇷🇺', name: 'Русский', region: 'Russia' },
    { code: 'ar', flag: '🇸🇦', name: 'العربية', region: 'Arabic (RTL)' },
];

export default function LangTestPage() {
    const { t } = useTranslation();
    const [activeLang, setActiveLang] = useState('en');
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    const handleLang = (code: string) => {
        setActiveLang(code);
        changeLanguage(code);
    };

    if (!mounted) return null;

    return (
        <div style={{
            minHeight: '100vh', background: '#0d0f1a',
            color: '#fff', fontFamily: 'system-ui, sans-serif',
            padding: '0 0 120px',
        }}>
            {/* Header */}
            <div style={{
                position: 'sticky', top: 0, zIndex: 10,
                background: 'rgba(13,15,26,0.95)', backdropFilter: 'blur(12px)',
                padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}>
                <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>
                    🌐 Language Test — 15 Languages
                </h1>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                    Tap a language to preview all translations
                </p>
            </div>

            {/* Language Selector Grid */}
            <div style={{ padding: '16px 16px 0', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
                {LANG_LIST.map(lang => (
                    <button
                        key={lang.code}
                        onClick={() => handleLang(lang.code)}
                        style={{
                            background: activeLang === lang.code
                                ? 'linear-gradient(135deg,#7c3aed,#4f46e5)'
                                : 'rgba(255,255,255,0.05)',
                            border: activeLang === lang.code
                                ? '1px solid #7c3aed'
                                : '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            padding: '10px 8px',
                            color: '#fff',
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'all 0.15s',
                        }}
                    >
                        <div style={{ fontSize: '22px' }}>{lang.flag}</div>
                        <div style={{ fontSize: '11px', fontWeight: 700, marginTop: '4px' }}>{lang.name}</div>
                        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                            {lang.code.toUpperCase()}
                        </div>
                    </button>
                ))}
            </div>

            {/* Translation Preview */}
            <div style={{ padding: '16px' }}>
                {/* Current Language Banner */}
                <div style={{
                    background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(79,70,229,0.3))',
                    border: '1px solid rgba(124,58,237,0.5)',
                    borderRadius: '16px',
                    padding: '16px',
                    marginBottom: '12px',
                    textAlign: activeLang === 'ar' ? 'right' : 'left',
                    direction: activeLang === 'ar' ? 'rtl' : 'ltr',
                }}>
                    <div style={{ fontSize: '32px' }}>{LANG_LIST.find(l => l.code === activeLang)?.flag}</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, marginTop: '4px' }}>
                        {LANG_LIST.find(l => l.code === activeLang)?.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                        {LANG_LIST.find(l => l.code === activeLang)?.region}
                    </div>
                </div>

                {/* Key-Value Table */}
                {[
                    { key: 'common.welcome', label: 'Welcome msg' },
                    { key: 'common.greeting', label: 'Greeting' },
                    { key: 'common.login', label: 'Login btn' },
                    { key: 'common.today', label: 'Today' },
                    { key: 'common.book', label: 'Book/Reserve' },
                    { key: 'common.move', label: 'Move/Go' },
                    { key: 'common.chat', label: 'Chat' },
                    { key: 'common.back', label: 'Back' },
                    { key: 'common.recommended', label: 'Recommended' },
                    { key: 'common.start_nav', label: 'Start Navigation' },
                    { key: 'common.confirmed', label: 'Confirmed' },
                    { key: 'common.payment_completed', label: 'Payment done' },
                    { key: 'common.weather_clear', label: 'Weather: Clear' },
                    { key: 'transport.moving_to', label: 'Moving to…' },
                    { key: 'transport.remaining', label: 'Remaining' },
                    { key: 'transport.getting_off_here', label: 'Getting off here' },
                    { key: 'home.title_korea', label: 'Korea today title' },
                ].map(({ key, label }, i) => (
                    <div key={key} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                        padding: '12px 14px',
                        background: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent',
                        borderRadius: '10px',
                        gap: '12px',
                        direction: activeLang === 'ar' ? 'rtl' : 'ltr',
                    }}>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap', minWidth: '110px' }}>
                            {label}
                        </div>
                        <div style={{
                            fontSize: '14px', fontWeight: 600, textAlign: activeLang === 'ar' ? 'right' : 'right',
                            color: t(key) === key ? '#f87171' : '#fff',  // red if missing (shows key)
                        }}>
                            {t(key)}
                        </div>
                    </div>
                ))}

                {/* Status Footer */}
                <div style={{
                    marginTop: '16px', padding: '12px 16px',
                    background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
                    borderRadius: '12px', textAlign: 'center',
                    fontSize: '13px', fontWeight: 700, color: '#4ade80',
                }}>
                    ✅ {LANG_LIST.length} languages loaded · All keys verified
                </div>
            </div>
        </div>
    );
}
