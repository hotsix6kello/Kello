'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '@/lib/i18n/client';
import { LOCALE_STORAGE_KEY, resolveCanonicalLocale } from '@/lib/i18n/locales';
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
];

interface LanguagePickerProps {
    compact?: boolean;
}

export default function LanguagePicker({ compact = false }: LanguagePickerProps) {
    const { t, i18n } = useTranslation('common');
    const [isOpen, setIsOpen] = useState(false);
    
    // Sync current language with i18n instance
    const currentCode = i18n.language || 'ko';
    const current = LANGUAGES.find(l => l.code === currentCode) || LANGUAGES[0];

    useEffect(() => {
        const stored = resolveCanonicalLocale(localStorage.getItem(LOCALE_STORAGE_KEY), 'ko');
        if (stored && stored !== i18n.language) {
             i18n.changeLanguage(stored);
        }
    }, [i18n]);

    const handleSelect = (lang: LangOption) => {
        setIsOpen(false);
        if (lang.code !== currentCode) {
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
                <span className={styles.flag}>{current.flag}</span>
                {!compact && <span className={styles.langLabel}>{current.label}</span>}
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
