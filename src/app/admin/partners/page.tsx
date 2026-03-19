'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import styles from '../admin.module.css';

const BUSINESS_TYPE_LABELS: Record<string, string> = {
    beauty_hair: '✂️ 뷰티 · 헤어',
    beauty_nail: '💅 뷰티 · 네일',
    beauty_body: '🛁 뷰티 · 바디',
    beauty_makeup: '💄 뷰티 · 메이크업',
    food_general: '🍽️ 맛집 · 일반',
    food_vegan: '🥗 맛집 · 비건',
    food_halal: '🕌 맛집 · 할랄',
    landmark: '🗺️ 랜드마크',
    other: '📋 기타',
};


type PartnerStatus = 'pending' | 'approved' | 'rejected';

interface Partner {
    id: number;
    company_name: string;
    business_type: string;
    contact_name: string;
    email: string;
    phone: string;
    address: string | null;
    website: string | null;
    description: string | null;
    status: PartnerStatus;
    reject_reason: string | null;
    created_at: string;
    reviewed_at: string | null;
}

function AdminPartnersContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [partners, setPartners] = useState<Partner[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<PartnerStatus | 'all'>(
        (searchParams.get('tab') as PartnerStatus | 'all') ?? 'pending'
    );
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    const [rejectTarget, setRejectTarget] = useState<Partner | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

    // 관리자 여부 확인
    useEffect(() => {
        const checkAdmin = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { setIsAdmin(false); return; }

            const { data: profile } = await supabase
                .from('profiles')
                .select('is_admin')
                .eq('id', user.id)
                .maybeSingle();

            setIsAdmin(profile?.is_admin === true);
        };
        checkAdmin();
    }, []);

    const fetchPartners = useCallback(async () => {
        setLoading(true);
        let query = supabase
            .from('partners')
            .select('*')
            .order('created_at', { ascending: false });

        if (tab !== 'all') {
            query = query.eq('status', tab);
        }

        const { data, error } = await query;
        if (!error) setPartners((data as Partner[]) || []);
        setLoading(false);
    }, [tab]);

    useEffect(() => {
        if (isAdmin) fetchPartners();
    }, [isAdmin, fetchPartners]);

    const handleApprove = async (partner: Partner) => {
        setActionLoading(partner.id);
        await supabase
            .from('partners')
            .update({ status: 'approved', reviewed_at: new Date().toISOString() })
            .eq('id', partner.id);
        await fetchPartners();
        setActionLoading(null);
    };

    const handleRejectSubmit = async () => {
        if (!rejectTarget) return;
        setActionLoading(rejectTarget.id);
        await supabase
            .from('partners')
            .update({
                status: 'rejected',
                reject_reason: rejectReason || '관리자에 의해 거절되었습니다.',
                reviewed_at: new Date().toISOString(),
            })
            .eq('id', rejectTarget.id);
        setRejectTarget(null);
        setRejectReason('');
        await fetchPartners();
        setActionLoading(null);
    };

    const counts = {
        all: partners.length,
        pending: partners.filter(p => p.status === 'pending').length,
        approved: partners.filter(p => p.status === 'approved').length,
        rejected: partners.filter(p => p.status === 'rejected').length,
    };

    const formatDate = (iso: string) => {
        try {
            return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
        } catch { return iso; }
    };

    // 비관리자 접근 차단
    if (isAdmin === false) {
        return (
            <div style={{
                minHeight: '100vh', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 16, background: 'var(--background)', padding: 24,
            }}>
                <div style={{ fontSize: '3rem' }}>🔒</div>
                <h2 style={{ fontWeight: 700, fontSize: '1.2rem', margin: 0 }}>관리자 전용 페이지</h2>
                <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem', textAlign: 'center' }}>
                    이 페이지는 관리자만 접근할 수 있습니다.<br />
                    Supabase에서 is_admin 권한을 부여받으세요.
                </p>
                <button
                    onClick={() => router.push('/')}
                    style={{
                        padding: '12px 28px', background: 'var(--primary)', color: 'white',
                        border: 'none', borderRadius: 14, fontWeight: 700, cursor: 'pointer'
                    }}
                >홈으로 이동</button>
            </div>
        );
    }

    if (isAdmin === null) {
        return (
            <div style={{
                minHeight: '100vh', display: 'flex', alignItems: 'center',
                justifyContent: 'center', background: 'var(--background)',
            }}>
                <div style={{
                    width: 36, height: 36, border: '3px solid var(--primary)',
                    borderTopColor: 'transparent', borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    const displayed = tab === 'all' ? partners : partners.filter(p => p.status === tab);

    const TAB_CONFIG: { key: PartnerStatus | 'all'; label: string }[] = [
        { key: 'pending', label: `⏳ 대기 ${counts.pending}` },
        { key: 'approved', label: `✅ 승인 ${counts.approved}` },
        { key: 'rejected', label: `❌ 거절 ${counts.rejected}` },
        { key: 'all', label: `📋 전체` },
    ];

    return (
        <div className={styles.container}>
            {/* Header */}
            <header className={styles.header}>
                <button
                    onClick={() => router.push('/admin')}
                    style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--foreground)' }}
                >←</button>
                <h1 className={styles.headerTitle}>🤝 협력업체 관리</h1>
                <span className={styles.adminBadge}>ADMIN</span>
            </header>

            {/* Tab Bar */}
            <div className={styles.tabBar}>
                {TAB_CONFIG.map(t => (
                    <button
                        key={t.key}
                        className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`}
                        onClick={() => setTab(t.key)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className={styles.content}>
                {loading && (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--gray-400)' }}>불러오는 중...</div>
                )}

                {!loading && displayed.length === 0 && (
                    <div className={styles.empty}>
                        <div className={styles.emptyIcon}>
                            {tab === 'pending' ? '⏳' : tab === 'approved' ? '✅' : '📋'}
                        </div>
                        <p style={{ color: 'var(--gray-500)', fontSize: '0.95rem' }}>
                            {tab === 'pending' ? '대기 중인 신청이 없습니다.' : `해당 목록이 비어있습니다.`}
                        </p>
                    </div>
                )}

                {!loading && displayed.map(partner => (
                    <div key={partner.id} className={styles.card}>
                        <div className={styles.cardHeader}>
                            <div className={styles.avatar}>
                                {BUSINESS_TYPE_LABELS[partner.business_type]?.split(' ')[0] ?? '🏢'}
                            </div>
                            <div className={styles.cardInfo}>
                                <div className={styles.companyName}>{partner.company_name}</div>
                                <div className={styles.meta}>
                                    {BUSINESS_TYPE_LABELS[partner.business_type] ?? partner.business_type} · {formatDate(partner.created_at)}
                                </div>
                            </div>
                            <span className={`${styles.statusBadge} ${partner.status === 'pending' ? styles.statusPending :
                                partner.status === 'approved' ? styles.statusApproved :
                                    styles.statusRejected
                                }`}>
                                {partner.status === 'pending' ? '대기' : partner.status === 'approved' ? '승인' : '거절'}
                            </span>
                        </div>

                        {/* 상세 정보 */}
                        <div className={styles.details}>
                            <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>담당자</span>
                                <span className={styles.detailValue}>{partner.contact_name}</span>
                            </div>
                            <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>연락처</span>
                                <span className={styles.detailValue}>{partner.phone}</span>
                            </div>
                            <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>이메일</span>
                                <span className={styles.detailValue}>{partner.email}</span>
                            </div>
                            {partner.address && (
                                <div className={styles.detailRow}>
                                    <span className={styles.detailLabel}>주소</span>
                                    <span className={styles.detailValue}>{partner.address}</span>
                                </div>
                            )}
                            {partner.website && (
                                <div className={styles.detailRow}>
                                    <span className={styles.detailLabel}>웹사이트</span>
                                    <a href={partner.website} target="_blank" rel="noreferrer"
                                        className={styles.detailValue}
                                        style={{ color: 'var(--primary)', textDecoration: 'underline' }}
                                    >
                                        {partner.website}
                                    </a>
                                </div>
                            )}
                        </div>

                        {partner.description && (
                            <div className={styles.desc}>{partner.description}</div>
                        )}

                        {partner.status === 'rejected' && partner.reject_reason && (
                            <div style={{
                                background: '#fef2f2', border: '1px solid #fecaca',
                                borderRadius: 10, padding: '10px 12px',
                                fontSize: '0.82rem', color: '#dc2626',
                                marginBottom: 10, lineHeight: 1.5,
                            }}>
                                <strong>거절 사유:</strong> {partner.reject_reason}
                            </div>
                        )}

                        {/* 액션 버튼 (대기 중일 때만) */}
                        {partner.status === 'pending' && (
                            <div className={styles.actionRow}>
                                <button
                                    className={styles.approveBtn}
                                    disabled={actionLoading === partner.id}
                                    onClick={() => handleApprove(partner)}
                                >
                                    ✅ 승인
                                </button>
                                <button
                                    className={styles.rejectBtn}
                                    disabled={actionLoading === partner.id}
                                    onClick={() => { setRejectTarget(partner); setRejectReason(''); }}
                                >
                                    ❌ 거절
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* 거절 사유 모달 */}
            {rejectTarget && (
                <div className={styles.rejectModal} onClick={() => setRejectTarget(null)}>
                    <div className={styles.rejectSheet} onClick={e => e.stopPropagation()}>
                        <h3 className={styles.rejectSheetTitle}>❌ 거절 사유 입력</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginBottom: 12 }}>
                            <strong>{rejectTarget.company_name}</strong> 신청을 거절합니다.
                        </p>
                        <textarea
                            className={styles.rejectInput}
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            placeholder="거절 사유를 입력하세요 (선택사항)"
                        />
                        <button
                            className={styles.rejectConfirmBtn}
                            onClick={handleRejectSubmit}
                            disabled={actionLoading !== null}
                        >
                            거절 확정
                        </button>
                        <button className={styles.cancelBtn} onClick={() => setRejectTarget(null)}>
                            취소
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function AdminPartnersPage() {
    return (
        <Suspense fallback={
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
                <div style={{ width: 36, height: 36, border: '3px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        }>
            <AdminPartnersContent />
        </Suspense>
    );
}
