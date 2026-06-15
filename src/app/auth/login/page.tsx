"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import styles from "./login.module.css";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

// 인앱브라우저(WebView) 감지: UA 키워드 + Android wv 플래그 + iOS Safari 없음
function detectWebView(): boolean {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent;
    const inAppKeywords = /KAKAOTALK|Instagram|FBAN|FBAV|Line\/|NaverApp|MicroMessenger|Snapchat|Twitter/i;
    if (inAppKeywords.test(ua)) return true;
    if (/Android/i.test(ua) && /wv/.test(ua)) return true;
    if (/iPhone|iPod|iPad/.test(ua) && !/Safari/.test(ua)) return true;
    return false;
}

// Android: intent:// 스킴으로 Chrome 강제 오픈. iOS: 클립보드 복사 후 true 반환
function tryOpenInExternalBrowser(url: string): "android-intent" | "ios-copy" {
    const ua = navigator.userAgent;
    if (/Android/i.test(ua)) {
        const path = url.replace(/^https?:\/\//, "");
        window.location.href = `intent://${path}#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;package=com.android.chrome;end`;
        return "android-intent";
    }
    navigator.clipboard?.writeText(url).catch(() => {
        // clipboard API 미지원 시 무시
    });
    return "ios-copy";
}

export default function LoginPage() {
    const { t } = useTranslation("common");
    const [email, setEmail] = useState("");
    const [emailLoading, setEmailLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [xLoading, setXLoading] = useState(false);
    const [facebookLoading, setFacebookLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [magicLinkSent, setMagicLinkSent] = useState(false);
    const [webViewWarning, setWebViewWarning] = useState<"idle" | "android" | "ios">("idle");
    const [linkCopied, setLinkCopied] = useState(false);

    // --- Google OAuth ---
    const handleGoogleLogin = async () => {
        // WebView 감지 시 외부 브라우저 유도 UI 표시
        if (detectWebView()) {
            const currentUrl = window.location.href;
            const result = tryOpenInExternalBrowser(currentUrl);
            setWebViewWarning(result === "android-intent" ? "android" : "ios");
            return;
        }

        setGoogleLoading(true);
        setError(null);

        try {
            const redirectTo = new URL("/auth/callback", window.location.origin).toString();
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo,
                    skipBrowserRedirect: true,
                },
            });

            if (error) {
                throw error;
            }

            if (!data?.url) {
                throw new Error("Google login could not start. Please try again.");
            }

            window.location.assign(data.url);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Google login could not start. Please try again.");
        } finally {
            setGoogleLoading(false);
        }
    };

    const handleCopyLink = () => {
        const url = window.location.href;
        navigator.clipboard?.writeText(url).catch(() => {});
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2500);
    };

    // --- X OAuth ---
    const handleXLogin = async () => {
        if (detectWebView()) {
            const currentUrl = window.location.href;
            const result = tryOpenInExternalBrowser(currentUrl);
            setWebViewWarning(result === "android-intent" ? "android" : "ios");
            return;
        }

        setXLoading(true);
        setError(null);

        try {
            const redirectTo = new URL("/auth/callback", window.location.origin).toString();
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: "x",
                options: {
                    redirectTo,
                    skipBrowserRedirect: true,
                },
            });

            if (error) throw error;
            if (!data?.url) throw new Error("X 로그인을 시작할 수 없습니다. 다시 시도해 주세요.");

            window.location.assign(data.url);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "X 로그인을 시작할 수 없습니다. 다시 시도해 주세요.");
            setXLoading(false);
        }
    };

    // --- Facebook OAuth (TODO: 앱 게시 승인 후 버튼 활성화) ---
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handleFacebookLogin = async () => {
        setFacebookLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: "facebook",
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            });

            if (error) {
                throw error;
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Facebook 로그인을 시작할 수 없습니다. 다시 시도해 주세요.");
            setFacebookLoading(false);
        }
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
                        disabled={googleLoading || xLoading || facebookLoading || emailLoading}
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
                            marginBottom: '10px',
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

                    {/* WebView 감지 시 외부 브라우저 유도 배너 */}
                    {webViewWarning !== "idle" && (
                        <div style={{
                            background: 'rgba(239,68,68,0.06)',
                            border: '1.5px solid rgba(239,68,68,0.25)',
                            borderRadius: '12px',
                            padding: '16px',
                            marginBottom: '10px',
                            fontSize: '0.85rem',
                            color: '#7f1d1d',
                            lineHeight: 1.6,
                        }}>
                            <p style={{ fontWeight: 700, marginBottom: '6px' }}>
                                🚫 {t('webview_banner.title')}
                            </p>
                            {webViewWarning === "android" ? (
                                <p style={{ marginBottom: '10px' }}>
                                    {t('webview_banner.desc_android')}
                                </p>
                            ) : (
                                <p style={{ marginBottom: '10px' }}>
                                    {t('webview_banner.desc_ios')}
                                </p>
                            )}
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    onClick={handleCopyLink}
                                    style={{
                                        flex: 1,
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        border: '1.5px solid rgba(239,68,68,0.35)',
                                        background: linkCopied ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.08)',
                                        color: linkCopied ? '#065f46' : '#991b1b',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        fontSize: '0.82rem',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {linkCopied ? `✓ ${t('webview_banner.copy_btn_copied')}` : `🔗 ${t('webview_banner.copy_btn')}`}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setWebViewWarning("idle")}
                                    style={{
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        border: '1.5px solid #e2e8f0',
                                        background: 'transparent',
                                        color: '#94a3b8',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        fontSize: '0.82rem',
                                    }}
                                >
                                    {t('webview_banner.close')}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* X (Twitter) 로그인 버튼 */}
                    <button
                        type="button"
                        onClick={handleXLogin}
                        disabled={googleLoading || xLoading || facebookLoading || emailLoading}
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            padding: '12px',
                            borderRadius: '12px',
                            border: '1.5px solid #000',
                            background: '#000',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '0.95rem',
                            marginBottom: '20px',
                            color: '#fff',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                        }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.736-8.849L1.254 2.25H8.08l4.259 5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                        {xLoading ? "연결 중..." : "X로 계속하기"}
                    </button>

                    {/* TODO: Facebook 로그인 - 앱 게시 승인 후 활성화 */}
                    {/* <button
                        type="button"
                        onClick={handleFacebookLogin}
                        disabled={googleLoading || xLoading || facebookLoading || emailLoading}
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            padding: '12px',
                            borderRadius: '12px',
                            border: '1.5px solid #1877F2',
                            background: '#1877F2',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '0.95rem',
                            marginBottom: '20px',
                            color: '#fff',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                        }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                            <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.027 4.388 11.022 10.125 11.927v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796v8.437C19.612 23.095 24 18.1 24 12.073z" />
                        </svg>
                        {facebookLoading ? "연결 중..." : "Facebook으로 계속하기"}
                    </button> */}

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

                </div>
            </div>
        </div>
    );
}
