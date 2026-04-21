"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./signup.module.css";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabaseClient";
import i18n from "@/lib/i18n/client";
import { isRtlLocale } from "@/lib/i18n/locales";

const LANGUAGES = [
    { code: 'ko', label: 'South Korea', flag: '🇰🇷' },
    { code: 'en', label: 'United States / Global', flag: '🇺🇸' },
    { code: 'ja', label: 'Japan', flag: '🇯🇵' },
    { code: 'zh-CN', label: 'China', flag: '🇨🇳' },
    { code: 'zh-TW', label: 'Taiwan / HK', flag: '🇭🇰' },
    { code: 'vi', label: 'Vietnam', flag: '🇻🇳' },
    { code: 'th', label: 'Thailand', flag: '🇹🇭' },
    { code: 'ar', label: 'Arabic / Middle East', flag: '🇸🇦' },
];

export default function SignupPage() {
    const { t } = useTranslation('common');
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [countryCode, setCountryCode] = useState("en");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Agreements state
    const [termsRequired, setTermsRequired] = useState(false);
    const [privacyRequired, setPrivacyRequired] = useState(false);
    const [marketingOptional, setMarketingOptional] = useState(false);

    const handleAgreeAll = (checked: boolean) => {
        setTermsRequired(checked);
        setPrivacyRequired(checked);
        setMarketingOptional(checked);
    };

    const isAllAgreed = termsRequired && privacyRequired && marketingOptional;

    const handleCountryChange = (code: string) => {
        setCountryCode(code);
        void i18n.changeLanguage(code);
        document.documentElement.dir = isRtlLocale(code) ? 'rtl' : 'ltr';
        document.documentElement.lang = code;
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!privacyRequired || !termsRequired) {
            setError("필수 약관에 동의해주세요.");
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        const { data, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name, // stored in raw_user_meta_data
                    marketing_consent: marketingOptional, // track optional consent
                },
            },
        });

        if (signUpError) {
            setError(signUpError.message);
            setLoading(false);
            return;
        }

        if (data.session) {
            localStorage.setItem('user', JSON.stringify({ name, email }));
            localStorage.setItem('kello_lang', countryCode);
            setLoading(false);
            void supabase.rpc('issue_signup_coupon', { p_user_id: data.session.user.id })
                .then(
                    ({ error }) => { if (error) console.error('[signup coupon]', error); },
                    (e: unknown) => console.error('[signup coupon]', e)
                );
            router.push('/');
            return;
        }

        setLoading(false);
        setSuccess(t('signup.success'));
        setTimeout(() => {
            router.push('/auth/login');
        }, 3000);
    };

    return (
        <div className={styles.container}>
            {/* Background Orbs */}
            <div className={`${styles.orb} ${styles.orbTop}`} />
            <div className={`${styles.orb} ${styles.orbBottom}`} />

            <div className={styles.formCard}>
                <div className={styles.header}>
                    <h1 className={styles.title}>{t('common.signup')}</h1>
                    <p className={styles.subTitle}>{t('signup.subtitle')}</p>
                </div>

                <form onSubmit={handleSignup}>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>{t('signup.name_label')}</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className={styles.input}
                            placeholder={t('signup.name_placeholder')}
                            required
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>{t('signup.email_label')}</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={styles.input}
                            placeholder="user@example.com"
                            required
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>{t('signup.country_label')}</label>
                        <select
                            value={countryCode}
                            onChange={(e) => handleCountryChange(e.target.value)}
                            className={styles.select}
                            required
                        >
                            {LANGUAGES.map(lang => (
                                <option key={lang.code} value={lang.code}>
                                    {lang.flag} {lang.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>{t('signup.password_label')}</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={styles.input}
                            placeholder="••••••••"
                            required
                            minLength={6}
                        />
                    </div>

                    {/* Consent Section */}
                    <div className={styles.consentSection}>
                        <label className={`${styles.consentItem} ${styles.allAgree}`}>
                            <input 
                                type="checkbox" 
                                checked={isAllAgreed}
                                onChange={(e) => handleAgreeAll(e.target.checked)}
                                className={styles.checkbox}
                            />
                            <span className={styles.consentText}>{t('signup_consent.all_agree')}</span>
                        </label>
                        
                        <div className={styles.consentItem}>
                            <input 
                                type="checkbox" 
                                checked={termsRequired}
                                onChange={(e) => setTermsRequired(e.target.checked)}
                                className={styles.checkbox}
                                required
                            />
                            <span className={styles.consentText}>{t('signup_consent.terms_required')}</span>
                            <span 
                                onClick={() => router.push('/terms')}
                                className={styles.link}
                            >
                                {t('signup_consent.view_detail')}
                            </span>
                        </div>

                        <div className={styles.consentItem}>
                            <input 
                                type="checkbox" 
                                checked={privacyRequired}
                                onChange={(e) => setPrivacyRequired(e.target.checked)}
                                className={styles.checkbox}
                                required
                            />
                            <span className={styles.consentText}>{t('signup_consent.privacy_required')}</span>
                            <span 
                                onClick={() => router.push('/privacy')}
                                className={styles.link}
                            >
                                {t('signup_consent.view_detail')}
                            </span>
                        </div>

                        <label className={styles.consentItem}>
                            <input 
                                type="checkbox" 
                                checked={marketingOptional}
                                onChange={(e) => setMarketingOptional(e.target.checked)}
                                className={styles.checkbox}
                            />
                            <span className={styles.consentText}>{t('signup_consent.privacy_optional')}</span>
                        </label>
                    </div>

                    {error && (
                        <div style={{ color: '#ef4444', fontSize: '0.875rem', textAlign: 'center', marginBottom: '16px' }}>
                            {error}
                        </div>
                    )}

                    {success && (
                        <div style={{ color: '#22c55e', fontSize: '0.875rem', textAlign: 'center', marginBottom: '16px', padding: '10px', background: '#f0fdf4', borderRadius: '8px' }}>
                            ✅ {success}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !!success || !privacyRequired || !termsRequired}
                        className={styles.submitBtn}
                    >
                        {loading ? t('signup.loading') : t('common.signup')}
                    </button>
                </form>

                <div className={styles.footer} style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.9rem', color: 'var(--gray-500)' }}>
                    {t('signup.login_prompt')}{" "}
                    <span
                        onClick={() => router.push('/auth/login')}
                        style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: '600' }}
                    >
                        {t('signup.login_link')}
                    </span>
                </div>
            </div>
        </div>
    );
}
