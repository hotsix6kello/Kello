'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import styles from './partner-signup.module.css';
import { supabase } from '@/lib/supabaseClient';

export default function PartnerSignupPage() {
    const router = useRouter();
    const { t } = useTranslation('common');

    const [form, setForm] = useState({
        company_name: '',
        business_type: '',
        contact_name: '',
        email: '',
        phone: '',
        address: '',
        website: '',
        description: '',
        business_license_url: '',
    });
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            const file = e.target.files?.[0];
            if (!file) return;

            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
            const filePath = `licenses/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('partner_documents')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('partner_documents').getPublicUrl(filePath);
            setForm(prev => ({ ...prev, business_license_url: data.publicUrl }));
        } catch (err: unknown) {
            console.error('Document upload error:', err);
            const errorMessage = err instanceof Error ? err.message : String(err);
            setError(t('partner_signup.error_upload') + errorMessage);
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!form.business_license_url) {
            setError(t('partner_signup.error_no_license'));
            return;
        }

        const { data: existing } = await supabase
            .from('partners')
            .select('id, status')
            .eq('email', form.email)
            .maybeSingle();

        if (existing) {
            if (existing.status === 'pending') {
                setError(t('partner_signup.error_pending'));
            } else if (existing.status === 'approved') {
                setError(t('partner_signup.error_approved'));
            } else {
                setError(t('partner_signup.error_exists'));
            }
            return;
        }

        const { error: insertError } = await supabase
            .from('partners')
            .insert([{ ...form, status: 'pending' }]);

        if (insertError) {
            setError(t('partner_signup.error_submit') + insertError.message);
            return;
        }

        setSuccess(true);
    };

    if (success) {
        return (
            <div className={styles.container}>
                <div className={`${styles.orb} ${styles.orbTop}`} />
                <div className={`${styles.orb} ${styles.orbBottom}`} />
                <div className={styles.formCard} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🎉</div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '12px' }}>
                        {t('partner_signup.success_title')}
                    </h2>
                    <p style={{ color: 'var(--gray-500)', fontSize: '0.92rem', lineHeight: 1.7, marginBottom: '24px' }}>
                        <strong>{form.company_name}</strong> {t('partner_signup.success_body').replace('{email}', form.email).split(form.email).map((part, i, arr) => (
                            i < arr.length - 1 ? <span key={i}>{part}<strong>{form.email}</strong></span> : part
                        ))}
                    </p>
                    <div style={{
                        background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
                        borderRadius: '12px', padding: '14px', fontSize: '0.82rem',
                        color: '#92400e', marginBottom: '24px', lineHeight: 1.6
                    }}>
                        {t('partner_signup.pending_notice')}
                    </div>
                    <button
                        onClick={() => router.push('/auth/login')}
                        style={{
                            background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white',
                            border: 'none', padding: '14px 32px', borderRadius: '14px',
                            fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', width: '100%',
                        }}
                    >
                        {t('partner_signup.go_login')}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <button
                        onClick={() => router.back()}
                        style={{
                            background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '10px',
                            padding: '8px 14px', cursor: 'pointer', fontSize: '0.85rem',
                            fontWeight: 600, color: 'var(--gray-500)', display: 'flex', alignItems: 'center', gap: '4px',
                        }}
                    >
                        {t('partner_signup.back')}
                    </button>
                    <button
                        onClick={() => router.push('/')}
                        style={{
                            background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '10px',
                            padding: '8px 14px', cursor: 'pointer', fontSize: '0.85rem',
                            fontWeight: 600, color: 'var(--gray-500)', display: 'flex', alignItems: 'center', gap: '4px',
                        }}
                    >
                        {t('partner_signup.home')}
                    </button>
                </div>

                <div className={styles.header}>
                    <div className={styles.badge}>{t('partner_signup.badge')}</div>
                    <h1 className={styles.title}>{t('partner_signup.title')}</h1>
                    <p className={styles.subTitle}>{t('partner_signup.subtitle')}</p>
                </div>

                <div className={styles.infoBox}>
                    <span className={styles.infoIcon}>ℹ️</span>
                    <span>{t('partner_signup.info')}</span>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className={styles.sectionLabel}>{t('partner_signup.section_basic')}</div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>
                            {t('partner_signup.company_name')} <span className={styles.required}>*</span>
                        </label>
                        <input
                            type="text" name="company_name" value={form.company_name}
                            onChange={handleChange} className={styles.input}
                            placeholder={t('partner_signup.company_placeholder')} required
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>
                            {t('partner_signup.business_type')} <span className={styles.required}>*</span>
                        </label>
                        <select
                            name="business_type" value={form.business_type}
                            onChange={handleChange} className={styles.select} required
                        >
                            <option value="">{t('partner_signup.business_type_placeholder')}</option>
                            <optgroup label={t('partner_signup.group_beauty')}>
                                <option value="beauty_hair">{t('partner_signup.opt_hair')}</option>
                                <option value="beauty_nail">{t('partner_signup.opt_nail')}</option>
                                <option value="beauty_body">{t('partner_signup.opt_body')}</option>
                                <option value="beauty_makeup">{t('partner_signup.opt_makeup')}</option>
                            </optgroup>
                            <optgroup label={t('partner_signup.group_food')}>
                                <option value="food_general">{t('partner_signup.opt_food_general')}</option>
                                <option value="food_vegan">{t('partner_signup.opt_food_vegan')}</option>
                                <option value="food_halal">{t('partner_signup.opt_food_halal')}</option>
                            </optgroup>
                            <option value="landmark">{t('partner_signup.opt_landmark')}</option>
                            <option value="other">{t('partner_signup.opt_other')}</option>
                        </select>
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>
                            {t('partner_signup.license_label')} <span className={styles.required}>*</span>
                        </label>
                        <div style={{
                            border: '2px dashed var(--warm-sand)', borderRadius: '12px', padding: '16px',
                            textAlign: 'center',
                            background: form.business_license_url ? 'rgba(5,150,105,0.05)' : 'rgba(0,0,0,0.02)',
                            borderColor: form.business_license_url ? '#059669' : 'var(--warm-sand)', transition: 'all 0.2s'
                        }}>
                            {form.business_license_url ? (
                                <div style={{ color: '#059669', fontSize: '0.88rem', fontWeight: 600 }}>
                                    {t('partner_signup.license_uploaded')}
                                    <div
                                        style={{ fontSize: '0.75rem', marginTop: 4, opacity: 0.8, textDecoration: 'underline', cursor: 'pointer' }}
                                        onClick={() => window.open(form.business_license_url)}
                                    >
                                        {t('partner_signup.license_view')}
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div style={{ fontSize: '1.4rem', marginBottom: 6 }}>📄</div>
                                    <div style={{ fontSize: '0.82rem', color: 'var(--gray-500)', marginBottom: 12 }}>
                                        {t('partner_signup.license_hint')}
                                    </div>
                                    <label style={{
                                        background: 'var(--primary)', color: 'white', padding: '8px 16px',
                                        borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700,
                                        cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.7 : 1
                                    }}>
                                        {uploading ? t('partner_signup.uploading') : t('partner_signup.choose_file')}
                                        <input
                                            type="file" accept="image/*,.pdf"
                                            onChange={handleFileChange}
                                            style={{ display: 'none' }} disabled={uploading}
                                        />
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>{t('partner_signup.address')}</label>
                        <input
                            type="text" name="address" value={form.address}
                            onChange={handleChange} className={styles.input}
                            placeholder={t('partner_signup.address_placeholder')}
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>{t('partner_signup.website')}</label>
                        <input
                            type="url" name="website" value={form.website}
                            onChange={handleChange} className={styles.input}
                            placeholder="https://example.com"
                        />
                    </div>

                    <div className={styles.sectionLabel}>{t('partner_signup.section_contact')}</div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>
                            {t('partner_signup.contact_name')} <span className={styles.required}>*</span>
                        </label>
                        <input
                            type="text" name="contact_name" value={form.contact_name}
                            onChange={handleChange} className={styles.input}
                            placeholder={t('partner_signup.contact_placeholder')} required
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>
                            {t('partner_signup.email')} <span className={styles.required}>*</span>
                        </label>
                        <input
                            type="email" name="email" value={form.email}
                            onChange={handleChange} className={styles.input}
                            placeholder="partner@example.com" required
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>
                            {t('partner_signup.phone')} <span className={styles.required}>*</span>
                        </label>
                        <input
                            type="tel" name="phone" value={form.phone}
                            onChange={handleChange} className={styles.input}
                            placeholder="010-0000-0000" required
                        />
                    </div>

                    <div className={styles.sectionLabel}>{t('partner_signup.section_desc')}</div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>{t('partner_signup.desc_label')}</label>
                        <textarea
                            name="description" value={form.description}
                            onChange={handleChange} className={styles.textarea}
                            placeholder={t('partner_signup.desc_placeholder')}
                        />
                    </div>

                    {error && (
                        <div style={{
                            color: '#ef4444', fontSize: '0.875rem', textAlign: 'center',
                            marginBottom: '12px', padding: '10px', background: '#fef2f2',
                            borderRadius: '10px', border: '1px solid #fecaca',
                        }}>
                            ⚠️ {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        style={{
                            width: '100%', padding: '14px', borderRadius: '14px',
                            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                            color: 'white', border: 'none', fontWeight: 700,
                            fontSize: '0.95rem', cursor: 'pointer', marginBottom: '16px',
                        }}
                    >
                        {t('partner_signup.badge')}
                    </button>
                </form>

                <div className={styles.footer}>
                    {t('partner_signup.already_account')}{' '}
                    <span
                        onClick={() => router.push('/auth/login')}
                        style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}
                    >
                        {t('partner_signup.login_link')}
                    </span>
                </div>
            </div>
        </div>
    );
}
