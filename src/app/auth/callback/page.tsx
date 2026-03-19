'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

// This page handles the OAuth redirect from Google back into the app.
// Supabase PKCE flow: exchange the code for a session, then redirect home.
export default function AuthCallbackPage() {
    const router = useRouter();

    useEffect(() => {
        let redirected = false;

        // Listen for the SIGNED_IN event which fires once the code has been
        // exchanged for a session (including PKCE flows).
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (redirected) return;

            if (event === 'SIGNED_IN' && session?.user) {
                redirected = true;
                const user = session.user;
                const name =
                    user.user_metadata?.full_name ||
                    user.user_metadata?.name ||
                    user.email?.split('@')[0] ||
                    'User';
                localStorage.setItem('user', JSON.stringify({ name, email: user.email }));
                router.replace('/');
            }
        });

        // Also try getSession immediately in case the session is already ready
        // (e.g. hash-based OAuth or a page reload).
        supabase.auth.getSession().then(({ data }) => {
            if (redirected) return;
            if (data?.session?.user) {
                redirected = true;
                const user = data.session.user;
                const name =
                    user.user_metadata?.full_name ||
                    user.user_metadata?.name ||
                    user.email?.split('@')[0] ||
                    'User';
                localStorage.setItem('user', JSON.stringify({ name, email: user.email }));
                router.replace('/');
            }
        });

        // Fallback: if nothing happens within 8 seconds just go home
        const fallback = setTimeout(() => {
            if (!redirected) {
                redirected = true;
                router.replace('/');
            }
        }, 8000);

        return () => {
            subscription.unsubscribe();
            clearTimeout(fallback);
        };
    }, [router]);

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '16px',
            background: 'var(--background)',
        }}>
            <div style={{
                width: '40px', height: '40px',
                border: '3px solid var(--primary)',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
            }} />
            <p style={{ color: 'var(--gray-600)', fontSize: '0.95rem' }}>Signing you in...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
