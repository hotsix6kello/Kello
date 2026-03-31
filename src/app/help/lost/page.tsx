'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

type StepKey = 'taxi' | 'subway' | 'airport' | 'street';

const whereIcons: Record<StepKey, string> = { taxi: '🚕', subway: '🚇', airport: '✈️', street: '🛤️' };

// Step keys for each location type — each has s1..s4 (some have fewer)
const stepCounts: Record<StepKey, number> = { taxi: 4, subway: 3, airport: 3, street: 3 };

export default function LostFoundPage() {
    const router = useRouter();
    const { t } = useTranslation('common');
    const [step, setStep] = useState<'where' | 'steps'>('where');
    const [selected, setSelected] = useState<StepKey | null>(null);

    const whereOptions: StepKey[] = ['taxi', 'subway', 'airport', 'street'];
    const placeNames: Record<StepKey, string> = { 
        taxi: t('help_page.taxi'), 
        subway: t('help_page.subway'), 
        airport: t('help_page.airport'), 
        street: t('help_page.street') 
    };

    const handleSelect = (place: StepKey) => {
        setSelected(place);
        setStep('steps');
    };

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f8fafc', paddingBottom: 24 }}>
            <header style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', padding: '20px 20px 24px', color: 'white' }}>
                <button
                    onClick={step === 'steps' ? () => setStep('where') : () => router.back()}
                    style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.4rem', cursor: 'pointer', marginBottom: 8 }}
                >←</button>
                <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>🔍 {t('help_page.lost_header')}</h1>
            </header>

            {step === 'where' ? (
                <div style={{ padding: '24px 20px' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 6 }}>{t('help_page.lost_where_title')}</h2>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 20 }}>{t('help_page.lost_where_desc')}</p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        {whereOptions.map(place => (
                            <button
                                key={place}
                                onClick={() => handleSelect(place)}
                                style={{
                                    padding: '28px 16px', borderRadius: 20, border: '2px solid #e2e8f0',
                                    background: 'white', cursor: 'pointer', textAlign: 'center',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)', transition: 'transform 0.15s'
                                }}
                            >
                                <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>{whereIcons[place]}</div>
                                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1e293b' }}>
                                    {placeNames[place]}
                                </div>
                            </button>
                        ))}
                    </div>

                    <div style={{ marginTop: 28 }}>
                        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>{t('help_page.lost_quick_title')}</h2>
                        {[
                            { label: t('help_page.lost112_label'), url: 'https://www.lost112.go.kr', color: '#3b82f6', icon: '🌐' },
                            { label: t('help_page.embassy_label'), url: 'https://www.mofa.go.kr/eng/wpge/m_5484/contents.do', color: '#8b5cf6', icon: '🛂' },
                        ].map((link, i) => (
                            <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', borderRadius: 14, padding: '14px 16px', marginBottom: 10, border: `2px solid ${link.color}30`, color: link.color, fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                                {link.icon} {link.label} <span>→</span>
                            </a>
                        ))}
                        
                        {/* 1330 Dual Action Card */}
                        <div style={{ background: 'white', borderRadius: 14, padding: '16px', marginBottom: 10, border: '2px solid #f59e0b30', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                            <div style={{ fontWeight: 700, color: '#f59e0b', fontSize: '0.9rem', marginBottom: 10 }}>📞 {t('help_page.interp_hotline_title')}</div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <a href="tel:1330" style={{ background: '#f59e0b15', color: '#d97706', padding: '8px 14px', borderRadius: 18, fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none' }}>
                                    {t('help_page.call_btn', { defaultValue: '전화 연결' })}
                                </a>
                                <a href="https://visitkorea.or.kr/helper/main.do" target="_blank" rel="noopener noreferrer" style={{ background: '#fffbeb', color: '#b45309', padding: '8px 14px', borderRadius: 18, fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none', border: '1px solid #fde68a' }}>
                                    💬 {t('help_page.interp_chat_label')}
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                selected && (
                    <div style={{ padding: '24px 20px' }}>
                        <div style={{ fontSize: '3rem', textAlign: 'center', marginBottom: 8 }}>{whereIcons[selected]}</div>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 20, textAlign: 'center' }}>
                            {t('help_page.lost_steps_title', { place: placeNames[selected] })}
                        </h2>

                        {Array.from({ length: stepCounts[selected] }, (_, i) => i + 1).map(n => {
                            const titleKey = `help_page.lost.${selected}_s${n}_t`;
                            const descKey = `help_page.lost.${selected}_s${n}_d`;
                            const title = t(titleKey);
                            const desc = t(descKey);
                            if (!title || title === titleKey) return null;
                            return (
                                <div key={n} style={{ background: 'white', borderRadius: 16, padding: '18px 16px', marginBottom: 12, border: '1px solid #e2e8f0', borderLeft: '5px solid #f59e0b', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b', marginBottom: 6 }}>{title}</div>
                                    <div style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 }}>{desc}</div>
                                </div>
                            );
                        })}

                        <a href="https://www.lost112.go.kr" target="_blank" rel="noopener noreferrer"
                            style={{ display: 'block', marginTop: 16, background: '#f59e0b', color: 'white', textAlign: 'center', padding: '16px', borderRadius: 14, fontWeight: 700, fontSize: '1rem', textDecoration: 'none' }}>
                            🌐 {t('help_page.lost_go_lost112')}
                        </a>
                    </div>
                )
            )}
        </div>
    );
}
