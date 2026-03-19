'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './partner-signup.module.css';
import { supabase } from '@/lib/supabaseClient';

const BUSINESS_TYPES = [
    { value: 'beauty_hair', label: '✂️ 뷰티 · 헤어', group: '💅 뷰티' },
    { value: 'beauty_nail', label: '💅 뷰티 · 네일', group: '💅 뷰티' },
    { value: 'beauty_body', label: '🛁 뷰티 · 바디', group: '💅 뷰티' },
    { value: 'beauty_makeup', label: '💄 뷰티 · 메이크업', group: '💅 뷰티' },
    { value: 'food_general', label: '🍽️ 맛집 · 일반', group: '🍽️ 맛집' },
    { value: 'food_vegan', label: '🥗 맛집 · 비건', group: '🍽️ 맛집' },
    { value: 'food_halal', label: '🕌 맛집 · 할랄', group: '🍽️ 맛집' },
    { value: 'landmark', label: '🗺️ 랜드마크', group: '랜드마크' },
    { value: 'other', label: '📋 기타', group: '기타' },
];


export default function PartnerSignupPage() {
    const router = useRouter();

    const [form, setForm] = useState({
        company_name: '',
        business_type: '',
        contact_name: '',
        email: '',
        phone: '',
        address: '',
        website: '',
        description: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // 이메일 중복 확인
        const { data: existing } = await supabase
            .from('partners')
            .select('id, status')
            .eq('email', form.email)
            .maybeSingle();

        if (existing) {
            if (existing.status === 'pending') {
                setError('이미 신청된 이메일입니다. 관리자 승인을 기다려주세요.');
            } else if (existing.status === 'approved') {
                setError('이미 승인된 이메일입니다. 협력업체 로그인을 이용해주세요.');
            } else {
                setError('이 이메일로 이미 가입 신청 이력이 있습니다. 문의: admin@kello.app');
            }
            setLoading(false);
            return;
        }

        const { error: insertError } = await supabase
            .from('partners')
            .insert([
                {
                    ...form,
                    status: 'pending', // 기본값: 관리자 승인 대기
                },
            ]);

        if (insertError) {
            setError('신청 중 오류가 발생했습니다: ' + insertError.message);
            setLoading(false);
            return;
        }

        setSuccess(true);
        setLoading(false);
    };

    if (success) {
        return (
            <div className={styles.container}>
                <div className={`${styles.orb} ${styles.orbTop}`} />
                <div className={`${styles.orb} ${styles.orbBottom}`} />
                <div className={styles.formCard} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🎉</div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '12px' }}>
                        신청이 완료되었습니다!
                    </h2>
                    <p style={{ color: 'var(--gray-500)', fontSize: '0.92rem', lineHeight: 1.7, marginBottom: '24px' }}>
                        <strong>{form.company_name}</strong>의 협력업체 가입 신청을 접수했습니다.<br />
                        관리자 검토 후 <strong>{form.email}</strong>로 결과를 안내해 드립니다.<br />
                        승인까지 <strong>1~3 영업일</strong>이 소요될 수 있습니다.
                    </p>
                    <div style={{
                        background: 'rgba(245,158,11,0.08)',
                        border: '1px solid rgba(245,158,11,0.25)',
                        borderRadius: '12px',
                        padding: '14px',
                        fontSize: '0.82rem',
                        color: '#92400e',
                        marginBottom: '24px',
                        lineHeight: 1.6
                    }}>
                        ⏳ 승인 전에는 협력업체 로그인이 제한됩니다.
                    </div>
                    <button
                        onClick={() => router.push('/auth/login')}
                        style={{
                            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                            color: 'white',
                            border: 'none',
                            padding: '14px 32px',
                            borderRadius: '14px',
                            fontWeight: 700,
                            fontSize: '0.95rem',
                            cursor: 'pointer',
                            width: '100%',
                        }}
                    >
                        로그인 페이지로 이동
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={`${styles.orb} ${styles.orbTop}`} />
            <div className={`${styles.orb} ${styles.orbBottom}`} />

            <div className={styles.formCard}>
                {/* 상단 네비게이션 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <button
                        onClick={() => router.back()}
                        style={{
                            background: 'rgba(0,0,0,0.05)',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '8px 14px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            color: 'var(--gray-500)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                        }}
                    >
                        ← 뒤로
                    </button>
                    <button
                        onClick={() => router.push('/')}
                        style={{
                            background: 'rgba(0,0,0,0.05)',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '8px 14px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            color: 'var(--gray-500)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                        }}
                    >
                        🏠 홈
                    </button>
                </div>

                <div className={styles.header}>
                    <div className={styles.badge}>🤝 협력업체 신청</div>
                    <h1 className={styles.title}>파트너 가입 신청</h1>
                    <p className={styles.subTitle}>Kello과 함께 더 많은 여행객에게 소개되세요</p>
                </div>

                <div className={styles.infoBox}>
                    <span className={styles.infoIcon}>ℹ️</span>
                    <span>
                        신청서 제출 후 <strong>관리자 승인</strong>이 완료되면 협력업체로 등록됩니다.
                        승인까지 1~3 영업일이 소요될 수 있습니다.
                    </span>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* 기본 정보 */}
                    <div className={styles.sectionLabel}>📋 기본 정보</div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>
                            업체명 <span className={styles.required}>*</span>
                        </label>
                        <input
                            type="text"
                            name="company_name"
                            value={form.company_name}
                            onChange={handleChange}
                            className={styles.input}
                            placeholder="예: 서울 게스트하우스"
                            required
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>
                            업종 <span className={styles.required}>*</span>
                        </label>
                        <select
                            name="business_type"
                            value={form.business_type}
                            onChange={handleChange}
                            className={styles.select}
                            required
                        >
                            <option value="">업종을 선택해주세요</option>
                            <optgroup label="💅 뷰티">
                                <option value="beauty_hair">✂️ 헤어</option>
                                <option value="beauty_nail">💅 네일</option>
                                <option value="beauty_body">🛁 바디</option>
                                <option value="beauty_makeup">💄 메이크업</option>
                            </optgroup>
                            <optgroup label="🍽️ 맛집">
                                <option value="food_general">🍽️ 일반</option>
                                <option value="food_vegan">🥗 비건</option>
                                <option value="food_halal">🕌 할랄</option>
                            </optgroup>
                            <option value="landmark">🗺️ 랜드마크</option>
                            <option value="other">📋 기타</option>
                        </select>
                    </div>


                    <div className={styles.inputGroup}>
                        <label className={styles.label}>주소</label>
                        <input
                            type="text"
                            name="address"
                            value={form.address}
                            onChange={handleChange}
                            className={styles.input}
                            placeholder="예: 서울특별시 종로구 ..."
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>웹사이트</label>
                        <input
                            type="url"
                            name="website"
                            value={form.website}
                            onChange={handleChange}
                            className={styles.input}
                            placeholder="https://example.com"
                        />
                    </div>

                    {/* 담당자 정보 */}
                    <div className={styles.sectionLabel}>👤 담당자 정보</div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>
                            담당자명 <span className={styles.required}>*</span>
                        </label>
                        <input
                            type="text"
                            name="contact_name"
                            value={form.contact_name}
                            onChange={handleChange}
                            className={styles.input}
                            placeholder="홍길동"
                            required
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>
                            이메일 <span className={styles.required}>*</span>
                        </label>
                        <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            className={styles.input}
                            placeholder="partner@example.com"
                            required
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>
                            연락처 <span className={styles.required}>*</span>
                        </label>
                        <input
                            type="tel"
                            name="phone"
                            value={form.phone}
                            onChange={handleChange}
                            className={styles.input}
                            placeholder="010-0000-0000"
                            required
                        />
                    </div>

                    {/* 업체 소개 */}
                    <div className={styles.sectionLabel}>📝 업체 소개</div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>업체 소개</label>
                        <textarea
                            name="description"
                            value={form.description}
                            onChange={handleChange}
                            className={styles.textarea}
                            placeholder="업체 서비스 및 특징을 간략히 소개해주세요..."
                        />
                    </div>

                    {error && (
                        <div style={{
                            color: '#ef4444',
                            fontSize: '0.875rem',
                            textAlign: 'center',
                            marginBottom: '12px',
                            padding: '10px',
                            background: '#fef2f2',
                            borderRadius: '10px',
                            border: '1px solid #fecaca',
                        }}>
                            ⚠️ {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className={styles.submitBtn}
                    >
                        {loading ? '신청 중...' : '🤝 협력업체 가입 신청'}
                    </button>
                </form>

                <div className={styles.footer}>
                    이미 승인된 계정이 있으신가요?{' '}
                    <span
                        onClick={() => router.push('/auth/login')}
                        style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}
                    >
                        로그인
                    </span>
                </div>
            </div>
        </div>
    );
}
