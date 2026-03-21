'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '@/lib/i18n/client';
import { resolveCanonicalLocale } from '@/lib/i18n/locales';
import styles from './LanguagePicker.module.css';

export interface LangOption {
    code: string;
    label: string;
    flag: string;
}

export const LANGUAGES: LangOption[] = [
    { code: 'ko', label: '한국어', flag: '🇰🇷' },
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'ja', label: '日本語', flag: '🇯🇵' },
    { code: 'zh-CN', label: '简体中文', flag: '🇨🇳' },
    { code: 'zh-HK', label: '繁體中文', flag: '🇭🇰' },
    { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'th', label: 'ไทย', flag: '🇹🇭' },
    { code: 'id', label: 'Bahasa Indonesia', flag: '🇮🇩' },
    { code: 'ms', label: 'Bahasa Melayu', flag: '🇲🇾' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
    { code: 'pt', label: 'Português', flag: '🇵🇹' },
    { code: 'ru', label: 'Русский', flag: '🇷🇺' },
    { code: 'ar', label: 'العربية', flag: '🇸🇦' },
];

interface LanguagePickerProps {
    compact?: boolean;
}

const LANG_TO_CURRENCY: Record<string, string> = {
    'ko': 'KRW',
    'en': 'USD',
    'ja': 'JPY',
    'zh-CN': 'CNY',
    'zh-HK': 'HKD',
    'vi': 'VND',
    'th': 'THB',
    'id': 'IDR',
    'ms': 'MYR',
    'fr': 'EUR',
    'es': 'EUR',
    'de': 'EUR',
    'pt': 'EUR',
    'ru': 'RUB',
    'ar': 'SAR'
};

const LANG_TO_COUNTRY: Record<string, string> = {
    'ko': 'KR',
    'en': 'US',
    'ja': 'JP',
    'zh-CN': 'CN',
    'zh-HK': 'HK',
    'vi': 'VN',
    'th': 'TH',
    'id': 'ID',
    'ms': 'MY',
    'fr': 'FR',
    'es': 'ES',
    'de': 'DE',
    'pt': 'PT',
    'ru': 'RU',
    'ar': 'SA'
};

const FLAG_EMOJIS: Record<string, string> = {
    kr: '🇰🇷', us: '🇺🇸', jp: '🇯🇵', cn: '🇨🇳', hk: '🇭🇰',
    vn: '🇻🇳', th: '🇹🇭', id: '🇮🇩', my: '🇲🇾', fr: '🇫🇷',
    es: '🇪🇸', de: '🇩🇪', pt: '🇵🇹', ru: '🇷🇺', sa: '🇸🇦'
};

export default function LanguagePicker({ compact = false }: LanguagePickerProps) {
    const { t, i18n } = useTranslation('common');
    const [isOpen, setIsOpen] = useState(false);
    
    // Sync current language with i18n instance
    const currentCode = resolveCanonicalLocale(i18n.language, 'ko');
    const locale = (LANG_TO_COUNTRY[currentCode] || currentCode).toLowerCase();
    const current = LANGUAGES.find(l => l.code === currentCode) || LANGUAGES[0];

    const handleSelect = (lang: LangOption) => {
        setIsOpen(false);
        if (lang.code !== currentCode) {
            // Automatically switch currency based on language
            const relatedCurrency = LANG_TO_CURRENCY[lang.code];
            if (relatedCurrency) {
                localStorage.setItem('kello_currency', relatedCurrency);
            }
            changeLanguage(lang.code);
        }
    };


    return (
        <div className={styles.wrapper}>
            <button
                className={`${styles.trigger} ${compact ? styles.compact : ''}`}
                onClick={() => setIsOpen((value) => !value)}
                title={t('common.select_language', { defaultValue: 'Select Language' })}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 800 }}>
                    {FLAG_EMOJIS[locale] || ''} {locale.toUpperCase()}
                </div>
                <span className={styles.chevron}>{isOpen ? '^' : 'v'}</span>
            </button>

            {isOpen && (
                <>
                    <div className={styles.backdrop} onClick={() => setIsOpen(false)} />
                    <div className={styles.dropdown}>
                        <div className={styles.dropdownHeader}>
                            <h2>{t('common.select_language', { defaultValue: 'Select Language' })}</h2>
                        </div>
                        <div className={styles.langList}>
                            {LANGUAGES.map((lang) => (
                                <button
                                    key={lang.code}
                                    className={`${styles.langItem} ${current.code === lang.code ? styles.active : ''}`}
                                    onClick={() => handleSelect(lang)}
                                >
                                    <span className={styles.itemFlag}>{lang.flag}</span>
                                    <span className={styles.itemLabel}>{lang.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
