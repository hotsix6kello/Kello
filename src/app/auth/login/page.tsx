"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./login.module.css";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [emailLoading, setEmailLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [magicLinkSent, setMagicLinkSent] = useState(false);

    // --- Google OAuth ---
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
        // 성공 시 Google 페이지로 리다이렉트됨
    };

    // --- Email Magic Link ---
    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;

        setEmailLoading(true);
        setError(null);

        const { error } = await supabase.auth.signInWithOtp({
            email: email.trim(),
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`,
                shouldCreateUser: true,
            },
        });

        if (error) {
            setError(error.message);
        } else {
            setMagicLinkSent(true);
        }

        setEmailLoading(false);
    };

    return (
        <div className={styles.container}>
            {/* Background Orbs */}
            <div className={`${styles.orb} ${styles.orbTop}`} />
            <div className={`${styles.orb} ${styles.orbBottom}`} />

            <div style={{ width: '100%', maxWidth: '400px', zIndex: 10 }}>
                {/* 홈 바로가기 */}
                <div className={styles.homeShortcut}>
                    <Link href="/" className={styles.homeLink}>
                        <span>←</span>
                        <span>홈 바로가기</span>
                    </Link>
                </div>

                <div className={styles.formCard}>
                    <div className={styles.header}>
                        <h1 className={styles.title}>Kello 시작하기</h1>
                        <p className={styles.subTitle}>
                            Google 또는 이메일로 간편하게 로그인하고<br />예약을 시작해보세요
                        </p>
                    </div>

                    {/* Google 로그인 버튼 */}
                    <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={googleLoading || emailLoading}
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
                        {googleLoading ? "연결 중..." : "Google로 계속하기"}
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                        <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>or</span>
                        <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                    </div>

                    {/* 매직 링크 발송 완료 상태 */}
                    {magicLinkSent ? (
                        <div style={{
                            background: 'rgba(16, 185, 129, 0.08)',
                            border: '1.5px solid rgba(16, 185, 129, 0.3)',
                            borderRadius: '16px',
                            padding: '24px 20px',
                            textAlign: 'center',
                        }}>
                            <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📬</div>
                            <p style={{ fontWeight: 700, fontSize: '1rem', color: '#065f46', marginBottom: '8px' }}>
                                입력한 이메일로 로그인 링크를 보냈어요.
                            </p>
                            <p style={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.6 }}>
                                메일함을 확인하고 링크를 눌러 계속해주세요.
                            </p>
                            <button
                                type="button"
                                onClick={() => { setMagicLinkSent(false); setEmail(''); }}
                                style={{
                                    marginTop: '16px',
                                    background: 'none',
                                    border: 'none',
                                    color: '#94a3b8',
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    textDecoration: 'underline',
                                }}
                            >
                                다른 이메일로 재시도
                            </button>
                        </div>
                    ) : (
                        /* 이메일 입력 폼 */
                        <form onSubmit={handleEmailLogin}>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>이메일</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={styles.input}
                                    placeholder="user@example.com"
                                    required
                                />
                            </div>

                            {error && (
                                <div style={{ color: '#ef4444', fontSize: '0.875rem', textAlign: 'center', marginBottom: '16px' }}>
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={emailLoading || googleLoading}
                                className={styles.submitBtn}
                            >
                                {emailLoading ? "링크 전송 중..." : "이메일로 계속하기"}
                            </button>
                        </form>
                    )}

                    {/* 협력업체 가입 신청 */}
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
        </div>
    );
}
