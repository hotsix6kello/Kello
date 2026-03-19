'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import styles from '../admin.module.css';

interface Profile {
    id: string;
    email: string;
    nickname: string | null;
    is_admin: boolean;
    created_at: string;
    partnerStatus?: 'pending' | 'approved' | 'rejected' | null;
}

function AdminUsersContent() {
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
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { setIsAdmin(false); return; }
            setMyId(user.id);

            const { data: profile } = await supabase
                .from('profiles')
                .select('is_admin')
                .eq('id', user.id)
                .maybeSingle();

            setIsAdmin(profile?.is_admin === true);
        };
        init();
    }, []);

    const fetchProfiles = useCallback(async () => {
        setLoading(true);

        // profiles + partners 동시 조회
        const [{ data: profileData }, { data: partnerData }] = await Promise.all([
            supabase
                .from('profiles')
                .select('id, email, nickname, is_admin, created_at')
                .order('created_at', { ascending: false }),
            supabase
                .from('partners')
                .select('email, status'),
        ]);

        // partners 이메일 → 상태 맵
        const partnerMap = new Map<string, string>();
        (partnerData ?? []).forEach((p: any) => partnerMap.set(p.email, p.status));

        const merged: Profile[] = (profileData ?? []).map((p: any) => ({
            ...p,
            partnerStatus: partnerMap.get(p.email) ?? null,
        }));

        setProfiles(merged);
        setLoading(false);
    }, []);

    useEffect(() => {
        if (isAdmin) fetchProfiles();
    }, [isAdmin, fetchProfiles]);

    const handleToggle = async () => {
        if (!confirmTarget) return;
        setActionLoading(true);
        await supabase
            .from('profiles')
            .update({ is_admin: !confirmTarget.is_admin })
            .eq('id', confirmTarget.id);
        setConfirmTarget(null);
        await fetchProfiles();
        setActionLoading(false);
    };

    const formatDate = (iso: string) => {
        try { return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' }); }
        catch { return iso; }
    };

    const filtered = profiles
        .filter(p =>
            p.email?.toLowerCase().includes(search.toLowerCase()) ||
            (p.nickname ?? '').toLowerCase().includes(search.toLowerCase())
        );

    // 탭 필터링
    const tabFiltered = tab === 'admin'
        ? filtered.filter(p => p.is_admin)
        : tab === 'partner'
            ? filtered.filter(p => !p.is_admin && p.partnerStatus === 'approved')
            : tab === 'normal'
                ? filtered.filter(p => !p.is_admin && p.partnerStatus !== 'approved')
                : filtered;

    const adminList = tabFiltered.filter(p => p.is_admin);
    const partnerList = tabFiltered.filter(p => !p.is_admin && p.partnerStatus === 'approved');
    const normalList = tabFiltered.filter(p => !p.is_admin && p.partnerStatus !== 'approved');

    // 접근 제어
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

    return (
        <div className={styles.container}>
            {/* Header */}
            <header className={styles.header}>
                <button onClick={() => router.push('/admin')} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--foreground)' }}>←</button>
                <h1 className={styles.headerTitle}>🛡️ 관리자 계정 관리</h1>
                <span className={styles.adminBadge}>ADMIN</span>
            </header>

            {/* Tab */}
            <div className={styles.tabBar}>
                <button className={`${styles.tab} ${tab === 'all' ? styles.tabActive : ''}`} onClick={() => setTab('all')}>
                    👥 전체
                </button>
                <button className={`${styles.tab} ${tab === 'admin' ? styles.tabActive : ''}`} onClick={() => setTab('admin')}>
                    🛡️ 관리자
                </button>
                <button className={`${styles.tab} ${tab === 'partner' ? styles.tabActive : ''}`} onClick={() => setTab('partner')}>
                    🤝 협력업체
                </button>
                <button className={`${styles.tab} ${tab === 'normal' ? styles.tabActive : ''}`} onClick={() => setTab('normal')}>
                    👤 일반
                </button>
            </div>

            <div className={styles.content}>
                {/* 검색 */}
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

                {/* 안내 박스 */}
                <div style={{
                    background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.18)',
                    borderRadius: 12, padding: '10px 14px',
                    fontSize: '0.8rem', color: '#5b21b6', marginBottom: 14, lineHeight: 1.5,
                }}>
                    🛡️ <strong>관리자 권한</strong>을 부여하면 협력업체 승인/거절 및 관리자 관리 페이지에 접근할 수 있습니다.<br />
                    ⚠️ 본인 계정의 권한은 해제할 수 없습니다.
                </div>

                {loading && <div className={styles.empty}>불러오는 중...</div>}

                {!loading && filtered.length === 0 && (
                    <div className={styles.empty}>검색 결과가 없습니다.</div>
                )}

                {!loading && filtered.length === 0 && (
                    <div className={styles.empty}>검색 결과가 없습니다.</div>
                )}

                {/* 관리자 섹션 */}
                {!loading && adminList.length > 0 && (
                    <>
                        <div style={{
                            fontSize: '0.72rem', fontWeight: 700, color: '#7c3aed',
                            textTransform: 'uppercase', letterSpacing: '0.08em',
                            marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                            🛡️ 관리자 &nbsp;
                            <span style={{ background: '#ede9fe', color: '#7c3aed', padding: '1px 8px', borderRadius: 999, fontSize: '0.7rem' }}>{adminList.length}명</span>
                        </div>
                        {adminList.map((profile, idx) => (
                            <div key={profile.id} className={styles.card} style={{
                                borderLeft: '4px solid #7c3aed',
                                background: 'rgba(124,58,237,0.04)',
                            }}>
                                <div className={styles.avatar} style={{ background: `linear-gradient(135deg, #7c3aed, #6d28d9)` }}>
                                    {(profile.nickname || profile.email || '?')[0].toUpperCase()}
                                </div>
                                <div className={styles.userInfo}>
                                    <div className={styles.userName}>
                                        {profile.nickname || '(닉네임 없음)'}
                                        {profile.id === myId && (
                                            <span style={{ marginLeft: 6, fontSize: '0.7rem', background: '#dbeafe', color: '#1d4ed8', padding: '1px 6px', borderRadius: 999, fontWeight: 700 }}>나</span>
                                        )}
                                    </div>
                                    <div className={styles.userEmail}>{profile.email}</div>
                                    <div style={{ fontSize: '0.72rem', color: '#a78bfa', marginTop: 2 }}>
                                        가입: {formatDate(profile.created_at)}
                                    </div>
                                </div>
                                <button
                                    className={`${styles.adminToggle} ${styles.adminOn}`}
                                    onClick={() => { if (profile.id !== myId) setConfirmTarget(profile); }}
                                    disabled={profile.id === myId}
                                    title={profile.id === myId ? '본인 권한은 변경할 수 없습니다' : '권한 해제'}
                                >
                                    🛡️ 관리자
                                </button>
                            </div>
                        ))}
                    </>
                )}

                {/* 협력업체 섹션 */}
                {!loading && partnerList.length > 0 && tab !== 'admin' && (
                    <>
                        <div style={{
                            fontSize: '0.72rem', fontWeight: 700, color: '#d97706',
                            textTransform: 'uppercase', letterSpacing: '0.08em',
                            margin: '16px 0 8px', display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                            🤝 협력업체 &nbsp;
                            <span style={{ background: '#fef3c7', color: '#92400e', padding: '1px 8px', borderRadius: 999, fontSize: '0.7rem' }}>{partnerList.length}명</span>
                        </div>
                        {partnerList.map((profile, idx) => (
                            <div key={profile.id} className={styles.card} style={{
                                borderLeft: '4px solid #f59e0b',
                                background: 'rgba(245,158,11,0.04)',
                            }}>
                                <div className={styles.avatar} style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                                    {(profile.nickname || profile.email || '?')[0].toUpperCase()}
                                </div>
                                <div className={styles.userInfo}>
                                    <div className={styles.userName}>{profile.nickname || '(닉네임 없음)'}</div>
                                    <div className={styles.userEmail}>{profile.email}</div>
                                    <div style={{ fontSize: '0.72rem', color: '#d97706', marginTop: 2 }}>
                                        가입: {formatDate(profile.created_at)}
                                    </div>
                                </div>
                                <span style={{
                                    background: '#fef3c7', color: '#92400e',
                                    fontSize: '0.72rem', fontWeight: 700,
                                    padding: '4px 10px', borderRadius: 999, flexShrink: 0,
                                }}>🤝 협력업체</span>
                            </div>
                        ))}
                    </>
                )}

                {/* 일반 사용자 섹션 */}
                {!loading && normalList.length > 0 && tab !== 'admin' && tab !== 'partner' && (
                    <>
                        <div style={{
                            fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray-400)',
                            textTransform: 'uppercase', letterSpacing: '0.08em',
                            margin: '16px 0 8px', display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                            👤 일반 사용자 &nbsp;
                            <span style={{ background: 'var(--gray-100)', color: 'var(--gray-500)', padding: '1px 8px', borderRadius: 999, fontSize: '0.7rem' }}>{normalList.length}명</span>
                        </div>
                        {normalList.map((profile, idx) => (
                            <div key={profile.id} className={styles.card}>
                                <div className={styles.avatar} style={{ background: `hsl(${(idx * 53) % 360}, 60%, 58%)` }}>
                                    {(profile.nickname || profile.email || '?')[0].toUpperCase()}
                                </div>
                                <div className={styles.userInfo}>
                                    <div className={styles.userName}>{profile.nickname || '(닉네임 없음)'}</div>
                                    <div className={styles.userEmail}>{profile.email}</div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginTop: 2 }}>
                                        가입: {formatDate(profile.created_at)}
                                    </div>
                                </div>
                                <button
                                    className={`${styles.adminToggle} ${styles.adminOff}`}
                                    onClick={() => setConfirmTarget(profile)}
                                >
                                    일반
                                </button>
                            </div>
                        ))}
                    </>
                )}
            </div>

            {/* 확인 모달 */}
            {confirmTarget && (
                <div className={styles.confirmModal} onClick={() => setConfirmTarget(null)}>
                    <div className={styles.confirmSheet} onClick={e => e.stopPropagation()}>
                        <h3 className={styles.confirmTitle}>
                            {confirmTarget.is_admin ? '🔓 관리자 권한 해제' : '🛡️ 관리자 권한 부여'}
                        </h3>
                        <p className={styles.confirmDesc}>
                            <strong>{confirmTarget.nickname || confirmTarget.email}</strong> 계정의<br />
                            관리자 권한을 {confirmTarget.is_admin ? '해제' : '부여'}하시겠습니까?
                        </p>
                        <button
                            className={`${styles.confirmBtn} ${confirmTarget.is_admin ? styles.confirmRevoke : styles.confirmGrant}`}
                            onClick={handleToggle}
                            disabled={actionLoading}
                        >
                            {actionLoading ? '처리 중...' : confirmTarget.is_admin ? '권한 해제' : '권한 부여'}
                        </button>
                        <button className={styles.cancelBtn} onClick={() => setConfirmTarget(null)}>취소</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function AdminUsersPage() {
    return (
        <Suspense fallback={
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
                <div style={{ width: 36, height: 36, border: '3px solid #7c3aed', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        }>
            <AdminUsersContent />
        </Suspense>
    );
}
