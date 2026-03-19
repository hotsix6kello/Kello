'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import styles from './admin.module.css';

interface Stats {
    totalUsers: number;
    adminUsers: number;
    pendingPartners: number;
    approvedPartners: number;
}

export default function AdminDashboard() {
    const router = useRouter();
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const [stats, setStats] = useState<Stats>({ totalUsers: 0, adminUsers: 0, pendingPartners: 0, approvedPartners: 0 });

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { setIsAdmin(false); return; }

            const { data: profile } = await supabase
                .from('profiles')
                .select('is_admin')
                .eq('id', user.id)
                .maybeSingle();

            if (!profile?.is_admin) { setIsAdmin(false); return; }
            setIsAdmin(true);

            // 통계 조회
            const [{ count: totalUsers }, { count: adminUsers }, { count: pendingPartners }, { count: approvedPartners }] = await Promise.all([
                supabase.from('profiles').select('*', { count: 'exact', head: true }),
                supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_admin', true),
                supabase.from('partners').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
                supabase.from('partners').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
            ]);

            setStats({
                totalUsers: totalUsers ?? 0,
                adminUsers: adminUsers ?? 0,
                pendingPartners: pendingPartners ?? 0,
                approvedPartners: approvedPartners ?? 0,
            });
        };
        init();
    }, []);

    if (isAdmin === null) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
                <div style={{ width: 36, height: 36, border: '3px solid #7c3aed', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (isAdmin === false) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: 'var(--background)', padding: 24 }}>
                <div style={{ fontSize: '3rem' }}>🔒</div>
                <h2 style={{ fontWeight: 700, fontSize: '1.2rem', margin: 0 }}>관리자 전용 페이지</h2>
                <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem', textAlign: 'center' }}>접근 권한이 없습니다.</p>
                <button onClick={() => router.push('/')} style={{ padding: '12px 28px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 14, fontWeight: 700, cursor: 'pointer' }}>홈으로</button>
            </div>
        );
    }

    const STAT_CARDS = [
        { icon: '👥', value: stats.totalUsers, label: '전체 회원', color: '#3b82f6', path: '/admin/users?tab=all' },
        { icon: '🛡️', value: stats.adminUsers, label: '관리자', color: '#7c3aed', path: '/admin/users?tab=admin' },
        { icon: '⏳', value: stats.pendingPartners, label: '승인 대기', color: '#f59e0b', path: '/admin/partners?tab=pending' },
        { icon: '✅', value: stats.approvedPartners, label: '승인 업체', color: '#10b981', path: '/admin/partners?tab=approved' },
    ];

    const MENU_ITEMS = [
        {
            icon: '🤝', bg: 'rgba(245,158,11,0.1)', title: '협력업체 관리',
            desc: '가입 신청 승인 · 거절 처리', path: '/admin/partners',
            highlight: stats.pendingPartners > 0 ? `${stats.pendingPartners}건 대기 중` : null,
        },
        {
            icon: '🛡️', bg: 'rgba(124,58,237,0.1)', title: '관리자 계정 관리',
            desc: '관리자 권한 부여 · 해제', path: '/admin/users',
            highlight: null,
        },
        {
            icon: '🗂️', bg: 'rgba(15,118,110,0.1)', title: '번역 용어집',
            desc: '뷰티 용어집 편집 및 언어별 우선순위 관리', path: '/admin/glossary',
            highlight: null,
        },
        {
            icon: '💼', bg: 'rgba(236,72,153,0.1)', title: '뷰티 예약 관리',
            desc: '예약 요청 조회 및 진행 상태 변경', path: '/admin/bookings/beauty',
            highlight: null,
        },
    ];

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--foreground)' }}>←</button>
                <h1 className={styles.headerTitle}>⚙️ 관리자 대시보드</h1>
                <span className={styles.adminBadge}>ADMIN</span>
            </header>

            <div className={styles.content}>
                {/* 통계 */}
                <div className={styles.grid}>
                    {STAT_CARDS.map((s) => (
                        <div
                            key={s.label}
                            className={styles.statCard}
                            onClick={() => router.push(s.path)}
                            style={{ cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                            onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.96)')}
                            onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
                        >
                            <div className={styles.statIcon}>{s.icon}</div>
                            <div className={styles.statValue} style={{ color: s.color }}>{s.value}</div>
                            <div className={styles.statLabel}>{s.label}</div>
                            <div style={{ fontSize: '0.68rem', color: s.color, marginTop: 4, fontWeight: 600, opacity: 0.7 }}>바로가기 →</div>
                        </div>
                    ))}
                </div>

                {/* 메뉴 */}
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>관리 메뉴</p>
                {MENU_ITEMS.map((m) => (
                    <div key={m.path} className={styles.menuCard} onClick={() => router.push(m.path)}>
                        <div className={styles.menuIcon} style={{ background: m.bg }}>{m.icon}</div>
                        <div className={styles.menuInfo}>
                            <div className={styles.menuTitle}>{m.title}</div>
                            <div className={styles.menuDesc}>{m.desc}</div>
                        </div>
                        {m.highlight && (
                            <span style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: 999 }}>{m.highlight}</span>
                        )}
                        <span className={styles.menuArrow}>›</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
