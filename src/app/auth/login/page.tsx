"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./login.module.css";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // --- Real Supabase Google OAuth ---
    const handleGoogleLogin = async () => {
        setGoogleLoading(true);
        setError(null);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
        if (error) {
            setError(error.message);
            setGoogleLoading(false);
        }
        // On success, browser redirects to Google — no need to setLoading(false)
    };

    // --- Real Supabase Email/Password Sign-in ---
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            // Supabase returns 'Invalid login credentials' when email is unconfirmed
            if (error.message.toLowerCase().includes('invalid login credentials')) {
                setError('로그인 실패: 이메일/비밀번호를 확인하거나, Supabase에서 "Confirm email" 설정을 꺼주세요.');
            } else {
                setError(error.message);
            }
            setLoading(false);
            return;
        }

        if (data.user) {
            // Persist basic info to localStorage for backward compat with existing UI
            const name = data.user.user_metadata?.full_name || data.user.user_metadata?.name || email.split('@')[0];
            localStorage.setItem('user', JSON.stringify({ name, email: data.user.email }));
        }

        setLoading(false);
        router.push('/');
    };

    return (
        <div className={styles.container}>
            {/* Background Orbs */}
            <div className={`${styles.orb} ${styles.orbTop}`} />
            <div className={`${styles.orb} ${styles.orbBottom}`} />

            <div className={styles.formCard}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Welcome Back</h1>
                    <p className={styles.subTitle}>Sign in to access your Kello OS</p>
                </div>

                {/* Google Login Button */}
                <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={googleLoading || loading}
                    style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        padding: '12px',
                        borderRadius: '12px',
                        border: '1.5px solid #e2e8f0',
                        background: '#fff',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        marginBottom: '20px',
                        color: '#374151',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 48 48">
                        <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-8 20-20 0-1.3-.1-2.7-.4-4z" />
                        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                        <path fill="#4CAF50" d="M24 44c5.2 0 10-1.9 13.7-5l-6.3-5.2C29.6 35.6 26.9 36.5 24 36.5c-5.3 0-9.7-3-11.2-7.3l-6.5 5C9.5 40.3 16.3 44 24 44z" />
                        <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.5l6.3 5.2C41.3 35.3 44 30.1 44 24c0-1.3-.1-2.7-.4-4z" />
                    </svg>
                    {googleLoading ? "Redirecting..." : "Sign in with Google"}
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                    <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>or</span>
                    <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                </div>

                <form onSubmit={handleLogin}>
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
                        <label className={styles.label}>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={styles.input}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {error && <div style={{ color: '#ef4444', fontSize: '0.875rem', textAlign: 'center', marginBottom: '16px' }}>{error}</div>}

                    <button
                        type="submit"
                        disabled={loading || googleLoading}
                        className={styles.submitBtn}
                    >
                        {loading ? "Signing in..." : "Sign In"}
                    </button>
                </form>

                <div className={styles.footer} style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.9rem', color: 'var(--gray-500)' }}>
                    Don&apos;t have an account?{" "}
                    <span
                        onClick={() => router.push('/auth/signup')}
                        style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: '600' }}
                    >
                        Sign up
                    </span>
                </div>

                {/* 협력업체 가입 링크 */}
                <div style={{
                    marginTop: '16px',
                    paddingTop: '16px',
                    borderTop: '1px solid rgba(0,0,0,0.06)',
                    textAlign: 'center',
                }}>
                    <button
                        type="button"
                        onClick={() => router.push('/auth/partner-signup')}
                        style={{
                            background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(217,119,6,0.06))',
                            border: '1.5px solid rgba(245,158,11,0.35)',
                            borderRadius: '12px',
                            padding: '10px 20px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            color: '#b45309',
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            transition: 'background 0.2s, transform 0.15s',
                        }}
                        onMouseOver={e => (e.currentTarget.style.background = 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,119,6,0.1))')}
                        onMouseOut={e => (e.currentTarget.style.background = 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(217,119,6,0.06))')}
                    >
                        🤝 협력업체 가입 신청
                    </button>
                </div>
            </div>
        </div>
    );
}
