'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface Profile {
    id: string;
    email: string;
    nickname: string;
    created_at: string;
}

export default function MembersPage() {
    const router = useRouter();
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProfiles = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('id, email, nickname, created_at')
                .order('created_at', { ascending: false });

            if (error) {
                setError(error.message);
            } else {
                setProfiles(data || []);
            }
            setLoading(false);
        };

        fetchProfiles();
    }, []);

    const formatDate = (iso: string) => {
        try {
            return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
        } catch {
            return iso;
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--background)', paddingBottom: 100 }}>
            {/* Header */}
            <header style={{
                padding: '20px 20px 12px',
                position: 'sticky', top: 0,
                background: 'var(--background)',
                zIndex: 10,
                borderBottom: '1px solid var(--gray-100)',
                display: 'flex', alignItems: 'center', gap: 12
            }}>
                <button onClick={() => router.back()} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--foreground)' }}>←</button>
                <h1 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>👥 회원 목록</h1>
                <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: 'var(--gray-500)' }}>{profiles.length}명</span>
            </header>

            <div style={{ padding: '16px 20px' }}>
                {loading && (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--gray-400)' }}>
                        불러오는 중...
                    </div>
                )}

                {error && (
                    <div style={{
                        background: '#fef2f2', border: '1px solid #fecaca',
                        borderRadius: 12, padding: 16, marginBottom: 16,
                        color: '#dc2626', fontSize: '0.9rem'
                    }}>
                        <strong>⚠️ 오류:</strong> {error}
                        <br /><br />
                        <small>
                            Supabase Dashboard → SQL Editor에서 아래 SQL을 실행해 주세요:<br />
                            <code>ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;<br />
                                CREATE POLICY &quot;Allow read profiles&quot; ON public.profiles FOR SELECT USING (true);</code>
                        </small>
                    </div>
                )}

                {!loading && !error && profiles.length === 0 && (
                    <div style={{
                        textAlign: 'center', padding: '60px 20px',
                        background: 'white', borderRadius: 16, border: '1px solid var(--gray-100)'
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: 12 }}>👤</div>
                        <p style={{ color: 'var(--gray-500)', fontSize: '0.95rem' }}>
                            아직 회원이 없습니다.<br />
                            Supabase SQL Editor에서 트리거 SQL을 실행해 주세요.
                        </p>
                    </div>
                )}

                {!loading && profiles.map((profile, idx) => (
                    <div key={profile.id} style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        background: 'white', borderRadius: 14, padding: '14px 16px',
                        marginBottom: 10, border: '1px solid var(--gray-100)',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
                    }}>
                        <div style={{
                            width: 44, height: 44, borderRadius: '50%',
                            background: `hsl(${(idx * 53) % 360}, 70%, 60%)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, color: 'white', fontSize: '1.1rem', flexShrink: 0
                        }}>
                            {(profile.nickname || profile.email || '?')[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {profile.nickname || '(닉네임 없음)'}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {profile.email}
                            </div>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--gray-400)', flexShrink: 0 }}>
                            {formatDate(profile.created_at)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
