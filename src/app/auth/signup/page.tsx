"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./signup.module.css";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabaseClient";

// Country selection mapping (Helper)
function toI18nKey(code: string) {
    const LANG_MAP: Record<string, string> = {
        'ko': 'ko', 'en': 'en', 'ja': 'jp', 'zh-CN': 'cn', 'zh-TW': 'tw',
        'vi': 'vi', 'th': 'th', 'id': 'id', 'ms': 'ms'
    };
    return LANG_MAP[code] ?? 'en';
}

const LANGUAGES = [
    { code: 'ko', label: 'South Korea', flag: '🇰🇷' },
    { code: 'en', label: 'United States / Global', flag: '🇺🇸' },
    { code: 'ja', label: 'Japan', flag: '🇯🇵' },
    { code: 'zh-CN', label: 'China', flag: '🇨🇳' },
    { code: 'zh-TW', label: 'Taiwan / HK', flag: '🇭🇰' },
    { code: 'vi', label: 'Vietnam', flag: '🇻🇳' },
    { code: 'th', label: 'Thailand', flag: '🇹🇭' },
    { code: 'id', label: 'Indonesia', flag: '🇮🇩' },
    { code: 'ms', label: 'Malaysia', flag: '🇲🇾' },
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

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        const selectedLang = LANGUAGES.find(l => l.code === countryCode);
        const i18nKey = selectedLang ? toI18nKey(selectedLang.code) : 'en';

        // 1. Create user in Supabase Auth
        const { data, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name, // stored in raw_user_meta_data
                },
            },
        });

        if (signUpError) {
            setError(signUpError.message);
            setLoading(false);
            return;
        }

        // 2. Supabase returns a session immediately when email confirmation is disabled.
        //    In that case the user is already logged in — save to localStorage and go home.
        if (data.session) {
            localStorage.setItem('user', JSON.stringify({ name, email }));
            localStorage.setItem('ktrip_lang', i18nKey);
            setLoading(false);
            router.push('/');
            return;
        }

        // 3. Email confirmation is enabled: session is null.
        //    Do NOT attempt an immediate signInWithPassword — it will always fail
        //    because the email hasn't been verified yet.
        //    Just show a clear message and redirect to login.
        setLoading(false);
        setSuccess("계정이 생성됐어요! 이메일을 확인하고 인증 후 로그인해주세요.");
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
                    <p className={styles.subTitle}>Experience Korea like a local</p>
                </div>

                <form onSubmit={handleSignup}>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className={styles.input}
                            placeholder="Enter your name"
                            required
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Email</label>
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
                        <label className={styles.label}>Country</label>
                        <select
                            value={countryCode}
                            onChange={(e) => setCountryCode(e.target.value)}
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
                        <label className={styles.label}>Password</label>
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
                        disabled={loading || !!success}
                        className={styles.submitBtn}
                    >
                        {loading ? "Creating Account..." : t('common.signup')}
                    </button>
                </form>

                <div className={styles.footer} style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.9rem', color: 'var(--gray-500)' }}>
                    Already have an account?{" "}
                    <span
                        onClick={() => router.push('/auth/login')}
                        style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: '600' }}
                    >
                        Log in
                    </span>
                </div>
            </div>
        </div>
    );
}
