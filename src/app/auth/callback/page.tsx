'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AuthCallbackPage() {
    const router = useRouter();

    useEffect(() => {
        let redirected = false;

        async function handleUser(userId: string, email: string | undefined, metadata: Record<string, string>) {
            if (redirected) return;
            redirected = true;

            // Check if this is a new user (profile has no display_name yet)
            const { data: profile } = await supabase
                .from('profiles')
                .select('display_name')
                .eq('id', userId)
                .single();

            const name =
                metadata?.full_name ||
                metadata?.name ||
                email?.split('@')[0] ||
                'User';

            localStorage.setItem('user', JSON.stringify({ name, email }));

            // New user: display_name is null → send to signup form to complete profile
            if (!profile?.display_name) {
                router.replace('/auth/signup');
            } else {
                router.replace('/');
            }
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                handleUser(session.user.id, session.user.email, session.user.user_metadata);
            }
        });

        supabase.auth.getSession().then(({ data }) => {
            if (data?.session?.user) {
                handleUser(data.session.user.id, data.session.user.email, data.session.user.user_metadata);
            }
        });

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
