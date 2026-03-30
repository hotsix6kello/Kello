'use client';

import { useState } from 'react';
import Image from 'next/image';
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
    { code: 'ko', label: '한국어', flag: 'https://flagcdn.com/w40/kr.png' },
    { code: 'en', label: 'English', flag: 'https://flagcdn.com/w40/us.png' },
    { code: 'ja', label: '日本語', flag: 'https://flagcdn.com/w40/jp.png' },
    { code: 'zh-CN', label: '简体中文', flag: 'https://flagcdn.com/w40/cn.png' },
    { code: 'zh-HK', label: '繁體中文', flag: 'https://flagcdn.com/w40/hk.png' },
    { code: 'vi', label: 'Tiếng Việt', flag: 'https://flagcdn.com/w40/vn.png' },
    { code: 'th', label: 'ไทย', flag: 'https://flagcdn.com/w40/th.png' },
    { code: 'id', label: 'Bahasa Indonesia', flag: 'https://flagcdn.com/w40/id.png' },
    { code: 'ms', label: 'Bahasa Melayu', flag: 'https://flagcdn.com/w40/my.png' },
    { code: 'fr', label: 'Français', flag: 'https://flagcdn.com/w40/fr.png' },
    { code: 'es', label: 'Español', flag: 'https://flagcdn.com/w40/es.png' },
    { code: 'de', label: 'Deutsch', flag: 'https://flagcdn.com/w40/de.png' },
    { code: 'pt', label: 'Português', flag: 'https://flagcdn.com/w40/pt.png' },
    { code: 'ru', label: 'Русский', flag: 'https://flagcdn.com/w40/ru.png' },
    { code: 'ar', label: 'العربية', flag: 'https://flagcdn.com/w40/sa.png' },
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}>
                    <Image src={current.flag} alt="" width={20} height={14} className="object-cover rounded-[2px]" />
                    {locale.toUpperCase()}
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
                                    <Image src={lang.flag} alt="" width={24} height={16} className="object-cover rounded-[2px] mr-3" />
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
