'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
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
    gap: 4,
    height: 30,
    padding: '0 8px',
    borderRadius: 999,
    background: 'transparent',
    border: 'none',
    color: '#6B5C28',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
};

export default function HomeSettingsButton() {
    const { t, i18n } = useTranslation('common');
    const [isOpen, setIsOpen] = useState(false);

    const currentCode = resolveCanonicalLocale(i18n.language, 'ko');
    const currentLang = LANGUAGES.find(lang => lang.code === currentCode) || LANGUAGES[0];

    const handleSelect = (lang: LangOption) => {
        setIsOpen(false);
        const related = LANG_TO_CURRENCY[lang.code];
        if (related) {
            localStorage.setItem('kello_currency', related);
            window.dispatchEvent(new CustomEvent('kello_currency_change', { detail: related }));
        }
        if (lang.code !== currentCode) {
            changeLanguage(lang.code);
        }
    };

    return (
        <div style={{ position: 'relative', zIndex: 200, display: 'flex', alignItems: 'center' }}>
            <button
                style={BTN_STYLE}
                onClick={() => setIsOpen(v => !v)}
                aria-label={t('common.select_language', { defaultValue: 'Language & Currency' })}
            >
                <Image 
                    src={currentLang.flag} 
                    alt={currentLang.label} 
                    width={18} 
                    height={12} 
                    className="object-cover rounded-[2px]"
                    style={{ objectFit: 'cover' }}
                />
                <span>{currentLang.label}</span>
                <ChevronDown size={11} style={{ marginLeft: 2, opacity: 0.8 }} />
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
