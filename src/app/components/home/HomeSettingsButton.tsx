'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '@/lib/i18n/client';
import { resolveCanonicalLocale } from '@/lib/i18n/locales';
import { LANGUAGES, type LangOption } from '../LanguagePicker';
import pickerStyles from '../LanguagePicker.module.css';

const LANG_TO_CURRENCY: Record<string, string> = {
    ko: 'KRW', en: 'USD', ja: 'JPY',
    'zh-CN': 'CNY', 'zh-TW': 'TWD',
    vi: 'VND', th: 'THB', ar: 'SAR',
};

const BTN_STYLE: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    height: 36,
    padding: '0 13px',
    borderRadius: 999,
    background: 'rgba(255,255,255,0.72)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.65)',
    color: '#3B2430',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
};

export default function HomeSettingsButton() {
    const { t, i18n } = useTranslation('common');
    const [isOpen, setIsOpen] = useState(false);
    const [currency, setCurrency] = useState('USD');

    const currentCode = resolveCanonicalLocale(i18n.language, 'ko');
    const langShort = currentCode.split('-')[0].toUpperCase();

    useEffect(() => {
        const saved = localStorage.getItem('kello_currency');
        setCurrency(saved ?? LANG_TO_CURRENCY[currentCode] ?? 'USD');

        const handler = (e: Event) => {
            const code = (e as CustomEvent<string>).detail;
            if (code) setCurrency(code);
        };
        window.addEventListener('kello_currency_change', handler);
        return () => window.removeEventListener('kello_currency_change', handler);
        // currentCode is intentionally excluded: initial read only
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSelect = (lang: LangOption) => {
        setIsOpen(false);
        const related = LANG_TO_CURRENCY[lang.code];
        if (related) {
            localStorage.setItem('kello_currency', related);
            window.dispatchEvent(new CustomEvent('kello_currency_change', { detail: related }));
            setCurrency(related);
        }
        if (lang.code !== currentCode) {
            changeLanguage(lang.code);
        }
    };

    return (
        <div style={{ position: 'relative', zIndex: 200, display: 'inline-block' }}>
            <button
                style={BTN_STYLE}
                onClick={() => setIsOpen(v => !v)}
                aria-label={t('common.select_language', { defaultValue: 'Language & Currency' })}
            >
                <span style={{ fontSize: 14, lineHeight: 1 }}>🌐</span>
                <span>{langShort} · {currency}</span>
                <span style={{ fontSize: 9, opacity: 0.6 }}>▾</span>
            </button>

            {isOpen && (
                <>
                    <div className={pickerStyles.backdrop} onClick={() => setIsOpen(false)} />
                    <div className={pickerStyles.dropdown}>
                        <div className={pickerStyles.dropdownHeader}>
                            <h2>{t('common.select_language', { defaultValue: 'Language & Currency' })}</h2>
                        </div>
                        <div className={pickerStyles.langList}>
                            {LANGUAGES.map((lang) => (
                                <button
                                    key={lang.code}
                                    className={`${pickerStyles.langItem} ${lang.code === currentCode ? pickerStyles.active : ''}`}
                                    onClick={() => handleSelect(lang)}
                                >
                                    <span className={pickerStyles.itemLabel}>
                                        {lang.label}
                                        {LANG_TO_CURRENCY[lang.code] && (
                                            <span style={{ fontSize: '0.85em', opacity: 0.55, marginLeft: 6 }}>
                                                · {LANG_TO_CURRENCY[lang.code]}
                                            </span>
                                        )}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
