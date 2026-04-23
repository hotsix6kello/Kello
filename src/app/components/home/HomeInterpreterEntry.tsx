'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import i18n, { LANGUAGE_CHANGED_EVENT } from '@/lib/i18n/client';
import {
  type CanonicalLocaleCode,
  LOCALE_STORAGE_KEY,
  MANUAL_SELECTION_FLAG,
  isRtlLocale,
  resolveCanonicalLocale,
} from '@/lib/i18n/locales';
import styles from '../../home.module.css';

interface HomeInterpreterEntryProps {
  onOpenInterpreter: () => void;
}

const LANGUAGE_OPTIONS: { code: CanonicalLocaleCode; flag: string; label: string }[] = [
  { code: 'ko',    flag: '🇰🇷', label: '한국어'      },
  { code: 'en',    flag: '🇺🇸', label: 'English'     },
  { code: 'ja',    flag: '🇯🇵', label: '日本語'       },
  { code: 'zh-CN', flag: '🇨🇳', label: '中文(简)'     },
  { code: 'zh-TW', flag: '🇹🇼', label: '中文(繁)'     },
  { code: 'vi',    flag: '🇻🇳', label: 'Tiếng Việt'  },
  { code: 'th',    flag: '🇹🇭', label: 'ภาษาไทย'     },
  { code: 'ar',    flag: '🇸🇦', label: 'العربية'     },
];

function applyLanguage(canonical: CanonicalLocaleCode) {
  localStorage.setItem(LOCALE_STORAGE_KEY, canonical);
  localStorage.setItem(MANUAL_SELECTION_FLAG, '1');
  document.cookie = `${LOCALE_STORAGE_KEY}=${canonical}; path=/; max-age=31536000; samesite=lax`;
  void i18n.changeLanguage(canonical);
  document.documentElement.lang = canonical;
  document.documentElement.dir = isRtlLocale(canonical) ? 'rtl' : 'ltr';
  window.dispatchEvent(
    new CustomEvent(LANGUAGE_CHANGED_EVENT, { detail: { locale: canonical } })
  );
}

export default function HomeInterpreterEntry({ onOpenInterpreter }: HomeInterpreterEntryProps) {
  const { t, i18n: i18nInstance } = useTranslation('common');

  const [selectedLocale, setSelectedLocale] = useState<CanonicalLocaleCode>(() =>
    resolveCanonicalLocale(i18nInstance.resolvedLanguage ?? i18nInstance.language)
  );

  useEffect(() => {
    const sync = () => {
      setSelectedLocale(
        resolveCanonicalLocale(i18nInstance.resolvedLanguage ?? i18nInstance.language)
      );
    };
    i18nInstance.on('languageChanged', sync);
    return () => { i18nInstance.off('languageChanged', sync); };
  }, [i18nInstance]);

  const handleSelect = (code: CanonicalLocaleCode) => {
    if (code === selectedLocale) return;
    setSelectedLocale(code);
    applyLanguage(code);
  };

  return (
    <section className={styles.supportSection} style={{ paddingBottom: '32px' }}>
      <div className={styles.interpreterCard} style={{ padding: '20px 16px 16px' }}>

        {/* Language selector label */}
        <p style={{
          fontSize: '0.72rem',
          fontWeight: 700,
          color: 'rgba(255,255,255,0.55)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: '10px',
        }}>
          {t('interpreter_entry.select_language')}
        </p>

        {/* 8-language grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px',
          marginBottom: '16px',
        }}>
          {LANGUAGE_OPTIONS.map((opt) => {
            const isSelected = selectedLocale === opt.code;
            return (
              <button
                key={opt.code}
                onClick={() => handleSelect(opt.code)}
                style={{
                  background: isSelected
                    ? 'rgba(255,255,255,0.22)'
                    : 'rgba(255,255,255,0.07)',
                  border: isSelected
                    ? '1.5px solid rgba(255,255,255,0.7)'
                    : '1.5px solid rgba(255,255,255,0.15)',
                  borderRadius: '10px',
                  padding: '9px 4px 7px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  color: isSelected ? '#fff' : 'rgba(255,255,255,0.65)',
                  transition: 'all 0.15s',
                  outline: 'none',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{opt.flag}</span>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: isSelected ? 700 : 400,
                  lineHeight: 1.2,
                  textAlign: 'center',
                  wordBreak: 'keep-all',
                }}>
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* CTA */}
        <button className={styles.mainCtaBtn} onClick={onOpenInterpreter}>
          {t('interpreter_entry.cta')}
        </button>
      </div>
    </section>
  );
}
