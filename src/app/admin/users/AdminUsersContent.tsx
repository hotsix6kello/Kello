'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import styles from '../admin.module.css';

interface Profile {
    id: string;
    email: string;
    display_name: string | null;
    nickname: string | null;
    phone: string | null;
    sns: string | null;
    role: string | null;
    created_at: string;
    partnerStatus?: 'pending' | 'approved' | 'rejected' | null;
}

async function getAccessToken(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
}

export default function AdminUsersContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const [myId, setMyId] = useState<string>('');
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'all' | 'admin' | 'partner' | 'normal'>(
        (searchParams.get('tab') as 'all' | 'admin' | 'partner' | 'normal') ?? 'all'
    );
    const [search, setSearch] = useState('');
    const [confirmTarget, setConfirmTarget] = useState<Profile | null>(null);
    const [detailTarget, setDetailTarget] = useState<Profile | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { setIsAdmin(false); return; }
            setMyId(user.id);

            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .maybeSingle();

            setIsAdmin(profile?.role === 'admin' || profile?.role === 'super_admin');
        };
        init();
    }, []);

    const fetchProfiles = useCallback(async () => {
        setLoading(true);
        try {
            const token = await getAccessToken();
            const res = await fetch('/api/admin/users', {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            const json = await res.json() as { ok: boolean; users?: Profile[]; error?: string };
            if (json.ok && json.users) {
                setProfiles(json.users);
            } else {
                console.error('[admin-users] fetch failed:', json.error);
            }
        } catch (e) {
            console.error('[admin-users] fetch error:', e);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        if (isAdmin) fetchProfiles();
    }, [isAdmin, fetchProfiles]);

    const handleToggle = async () => {
        if (!confirmTarget) return;
        setActionLoading(true);
        try {
            const token = await getAccessToken();
            const isTargetAdmin = confirmTarget.role === 'admin' || confirmTarget.role === 'super_admin';
            await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ userId: confirmTarget.id, role: isTargetAdmin ? 'customer' : 'admin' }),
            });
        } catch (e) {
            console.error('[admin-users] toggle error:', e);
        }
        setConfirmTarget(null);
        await fetchProfiles();
        setActionLoading(false);
    };

    const formatDate = (iso: string) => {
        try { return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' }); }
        catch { return iso; }
    };

    const displayName = (p: Profile) => p.nickname || p.display_name || '(닉네임 없음)';

    const filtered = profiles.filter(p =>
        p.email?.toLowerCase().includes(search.toLowerCase()) ||
        (p.nickname ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (p.display_name ?? '').toLowerCase().includes(search.toLowerCase())
    );

    const tabFiltered = tab === 'admin'
        ? filtered.filter(p => p.role === 'admin' || p.role === 'super_admin')
        : tab === 'partner'
            ? filtered.filter(p => p.role !== 'admin' && p.role !== 'super_admin' && p.partnerStatus === 'approved')
            : tab === 'normal'
                ? filtered.filter(p => p.role !== 'admin' && p.role !== 'super_admin' && p.partnerStatus !== 'approved')
                : filtered;

    const adminList = tabFiltered.filter(p => p.role === 'admin' || p.role === 'super_admin');
    const partnerList = tabFiltered.filter(p => p.role !== 'admin' && p.role !== 'super_admin' && p.partnerStatus === 'approved');
    const normalList = tabFiltered.filter(p => p.role !== 'admin' && p.role !== 'super_admin' && p.partnerStatus !== 'approved');

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

    const renderUserCard = (profile: Profile, idx: number, accentColor: string, avatarBg: string, badge?: React.ReactNode) => (
        <div
            key={profile.id}
            className={styles.card}
            style={{ borderLeft: `4px solid ${accentColor}`, background: `rgba(${accentColor === '#7c3aed' ? '124,58,237' : accentColor === '#f59e0b' ? '245,158,11' : `${(idx * 53) % 255},${(idx * 97) % 255},150`},0.04)`, cursor: 'pointer' }}
            onClick={() => setDetailTarget(profile)}
        >
            <div className={styles.avatar} style={{ background: avatarBg }}>
                {(profile.nickname || profile.display_name || profile.email || '?')[0].toUpperCase()}
            </div>
            <div className={styles.userInfo}>
                <div className={styles.userName} style={{ color: 'inherit' }}>
                    {displayName(profile)}
                    {profile.id === myId && (
                        <span style={{ marginLeft: 6, fontSize: '0.7rem', background: '#dbeafe', color: '#1d4ed8', padding: '1px 6px', borderRadius: 999, fontWeight: 700 }}>나</span>
                    )}
                </div>
                <div className={styles.userEmail}>{profile.email}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginTop: 2 }}>가입: {formatDate(profile.created_at)}</div>
            </div>
            {badge}
        </div>
    );

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button onClick={() => router.back()} style={{ background: 'none', border: 'none', padding: '4px 0', color: '#64748b', display: 'flex', alignItems: 'center', cursor: 'pointer' }} aria-label="뒤로가기">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                </button>
                <h1 className={styles.headerTitle}>👥 사용자 관리</h1>
                <span className={styles.adminBadge}>ADMIN</span>
            </header>

            <div className={styles.tabBar}>
                <button className={`${styles.tab} ${tab === 'all' ? styles.tabActive : ''}`} onClick={() => setTab('all')}>👥 전체</button>
                <button className={`${styles.tab} ${tab === 'admin' ? styles.tabActive : ''}`} onClick={() => setTab('admin')}>🛡️ 관리자</button>
                <button className={`${styles.tab} ${tab === 'partner' ? styles.tabActive : ''}`} onClick={() => setTab('partner')}>🤝 협력업체</button>
                <button className={`${styles.tab} ${tab === 'normal' ? styles.tabActive : ''}`} onClick={() => setTab('normal')}>👤 일반</button>
            </div>

            <div className={styles.content}>
                <div className={styles.searchBar}>
                    <span style={{ color: 'var(--gray-400)' }}>🔍</span>
                    <input
                        className={styles.searchInput}
                        placeholder="이메일 또는 닉네임으로 검색"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    {search && (
                        <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: '0.9rem' }}>✕</button>
                    )}
                </div>

                <div style={{
                    background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.18)',
                    borderRadius: 12, padding: '10px 14px',
                    fontSize: '0.8rem', color: '#1d4ed8', marginBottom: 14, lineHeight: 1.5,
                }}>
                    👤 회원 카드를 클릭하면 상세 정보(연락처·SNS ID)를 확인할 수 있습니다.<br />
                    🛡️ <strong>관리자 권한</strong>은 상세 모달에서 변경할 수 있습니다.
                </div>

                {loading && <div className={styles.empty}>불러오는 중...</div>}

                {!loading && filtered.length === 0 && (
                    <div className={styles.empty}>검색 결과가 없습니다.</div>
                )}

                {!loading && adminList.length > 0 && (
                    <>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                            🛡️ 관리자 &nbsp;
                            <span style={{ background: '#ede9fe', color: '#7c3aed', padding: '1px 8px', borderRadius: 999, fontSize: '0.7rem' }}>{adminList.length}명</span>
                        </div>
                        {adminList.map((profile) =>
                            renderUserCard(profile, 0, '#7c3aed', 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                                <span style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: 'white', fontSize: '0.72rem', fontWeight: 700, padding: '4px 10px', borderRadius: 999, flexShrink: 0 }}>🛡️ 관리자</span>
                            )
                        )}
                    </>
                )}

                {!loading && partnerList.length > 0 && tab !== 'admin' && (
                    <>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '16px 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                            🤝 협력업체 &nbsp;
                            <span style={{ background: '#fef3c7', color: '#92400e', padding: '1px 8px', borderRadius: 999, fontSize: '0.7rem' }}>{partnerList.length}명</span>
                        </div>
                        {partnerList.map((profile) =>
                            renderUserCard(profile, 0, '#f59e0b', 'linear-gradient(135deg, #f59e0b, #d97706)',
                                <span style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.72rem', fontWeight: 700, padding: '4px 10px', borderRadius: 999, flexShrink: 0 }}>🤝 협력업체</span>
                            )
                        )}
                    </>
                )}

                {!loading && normalList.length > 0 && tab !== 'admin' && tab !== 'partner' && (
                    <>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '16px 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                            👤 일반 사용자 &nbsp;
                            <span style={{ background: 'var(--gray-100)', color: 'var(--gray-500)', padding: '1px 8px', borderRadius: 999, fontSize: '0.7rem' }}>{normalList.length}명</span>
                        </div>
                        {normalList.map((profile, idx) =>
                            renderUserCard(profile, idx, `hsl(${(idx * 53) % 360}, 60%, 58%)`, `hsl(${(idx * 53) % 360}, 60%, 58%)`,
                                <span style={{ background: 'var(--gray-100)', color: 'var(--gray-500)', fontSize: '0.72rem', fontWeight: 600, padding: '4px 10px', borderRadius: 999, flexShrink: 0 }}>일반</span>
                            )
                        )}
                    </>
                )}
            </div>

            {/* 회원 상세 정보 모달 */}
            {detailTarget && (
                <div className={styles.confirmModal} onClick={() => setDetailTarget(null)}>
                    <div className={styles.confirmSheet} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>👤 회원 상세 정보</h3>
                            <button onClick={() => setDetailTarget(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: '1.2rem', lineHeight: 1 }}>✕</button>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, padding: '14px 16px', background: 'var(--gray-50,#f8f9fa)', borderRadius: 14 }}>
                            <div style={{
                                width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                                background: detailTarget.role === 'admin' || detailTarget.role === 'super_admin'
                                    ? 'linear-gradient(135deg,#7c3aed,#6d28d9)'
                                    : detailTarget.partnerStatus === 'approved'
                                        ? 'linear-gradient(135deg,#f59e0b,#d97706)'
                                        : 'linear-gradient(135deg,#64748b,#475569)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'white', fontWeight: 700, fontSize: '1.2rem',
                            }}>
                                {(detailTarget.nickname || detailTarget.display_name || detailTarget.email || '?')[0].toUpperCase()}
                            </div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{displayName(detailTarget)}</div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)', marginTop: 2 }}>
                                    {detailTarget.role === 'admin' || detailTarget.role === 'super_admin' ? '🛡️ 관리자' : detailTarget.partnerStatus === 'approved' ? '🤝 협력업체' : '👤 일반 사용자'}
                                    {detailTarget.id === myId && <span style={{ marginLeft: 8, background: '#dbeafe', color: '#1d4ed8', padding: '1px 6px', borderRadius: 999, fontWeight: 700, fontSize: '0.7rem' }}>나</span>}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--gray-100)', marginBottom: 20 }}>
                            {[
                                { icon: '✏️', label: '닉네임', value: detailTarget.nickname || detailTarget.display_name || '-' },
                                { icon: '📧', label: '이메일', value: detailTarget.email || '-' },
                                { icon: '📱', label: '연락처', value: detailTarget.phone || '-' },
                                { icon: '🔗', label: 'SNS ID', value: detailTarget.sns || '-' },
                                { icon: '📅', label: '가입일', value: formatDate(detailTarget.created_at) },
                            ].map((row, i) => (
                                <div key={row.label} style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '12px 16px',
                                    background: i % 2 === 0 ? 'white' : 'var(--gray-50,#f8f9fa)',
                                    borderBottom: i < 4 ? '1px solid var(--gray-100)' : 'none',
                                }}>
                                    <span style={{ fontSize: '1rem', flexShrink: 0, width: 22, textAlign: 'center' }}>{row.icon}</span>
                                    <span style={{ fontSize: '0.78rem', color: 'var(--gray-400)', fontWeight: 600, width: 56, flexShrink: 0 }}>{row.label}</span>
                                    <span style={{ fontSize: '0.88rem', color: row.value === '-' ? 'var(--gray-300)' : 'var(--foreground)', fontWeight: row.value === '-' ? 400 : 500, flex: 1, wordBreak: 'break-all' }}>{row.value}</span>
                                </div>
                            ))}
                        </div>

                        {detailTarget.id !== myId && (
                            <button
                                className={`${styles.confirmBtn} ${(detailTarget.role === 'admin' || detailTarget.role === 'super_admin') ? styles.confirmRevoke : styles.confirmGrant}`}
                                onClick={() => { setConfirmTarget(detailTarget); setDetailTarget(null); }}
                            >
                                {(detailTarget.role === 'admin' || detailTarget.role === 'super_admin') ? '🔓 관리자 권한 해제' : '🛡️ 관리자 권한 부여'}
                            </button>
                        )}
                        <button className={styles.cancelBtn} onClick={() => setDetailTarget(null)}>닫기</button>
                    </div>
                </div>
            )}

            {/* 권한 변경 확인 모달 */}
            {confirmTarget && (
                <div className={styles.confirmModal} onClick={() => setConfirmTarget(null)}>
                    <div className={styles.confirmSheet} onClick={e => e.stopPropagation()}>
                        <h3 className={styles.confirmTitle}>
                            {(confirmTarget.role === 'admin' || confirmTarget.role === 'super_admin') ? '🔓 관리자 권한 해제' : '🛡️ 관리자 권한 부여'}
                        </h3>
                        <p className={styles.confirmDesc}>
                            <strong>{displayName(confirmTarget)}</strong> 계정의<br />
                            관리자 권한을 {(confirmTarget.role === 'admin' || confirmTarget.role === 'super_admin') ? '해제' : '부여'}하시겠습니까?
                        </p>
                        <button
                            className={`${styles.confirmBtn} ${(confirmTarget.role === 'admin' || confirmTarget.role === 'super_admin') ? styles.confirmRevoke : styles.confirmGrant}`}
                            onClick={handleToggle}
                            disabled={actionLoading}
                        >
                            {actionLoading ? '처리 중...' : (confirmTarget.role === 'admin' || confirmTarget.role === 'super_admin') ? '권한 해제' : '권한 부여'}
                        </button>
                        <button className={styles.cancelBtn} onClick={() => setConfirmTarget(null)}>취소</button>
                    </div>
                </div>
            )}
            <div style={{ height: '160px', minHeight: '160px', flexShrink: 0, width: '100%', pointerEvents: 'none' }} />
        </div>
    );
}
