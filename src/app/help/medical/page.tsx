'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';

const getMedicineItems = (t: TFunction) => [
    { name: t('help_page.medical.medicines.tylenol'), desc: t('help_page.medical.medicines.tylenol_desc'), icon: '💊' },
    { name: t('help_page.medical.medicines.cold'), desc: t('help_page.medical.medicines.cold_desc'), icon: '🤧' },
    { name: t('help_page.medical.medicines.digestive'), desc: t('help_page.medical.medicines.digestive_desc'), icon: '🥣' },
];

const symptomKeys = [
    { id: 'stomach', icon: '🤢', korean: '배가 아파요', romanized: 'Bae-ga a-pa-yo', english: 'I have a stomachache.', japanese: 'お腹が痛いです', chinese: '我肚子疼。' },
    { id: 'fever', icon: '🤒', korean: '열이 나요', romanized: 'Yeori na-yo', english: 'I have a fever.', japanese: '熱があります', chinese: '我发烧了。' },
    { id: 'injury', icon: '🩹', korean: '다쳤어요', romanized: 'Da-chyeo-sseo-yo', english: 'I am injured.', japanese: 'けがをしました', chinese: '我受伤了。' },
    { id: 'allergy', icon: '😮‍💨', korean: '알레르기가 있어요', romanized: 'Al-le-reu-gi-ga i-sseo-yo', english: 'I have an allergy.', japanese: 'アレルギーがあります', chinese: '我有过敏。' },
    { id: 'breathing', icon: '😤', korean: '숨이 가빠요', romanized: 'Sum-i ga-bba-yo', english: 'I have difficulty breathing.', japanese: '息が苦しい입니다', chinese: '我呼吸困难。' },
    { id: 'pain', icon: '😖', korean: '가슴이 아파요', romanized: 'Ga-seum-i a-pa-yo', english: 'I have chest pain.', japanese: '胸が痛いです', chinese: '我胸口疼。' },
];

export default function MedicalPage() {
    const router = useRouter();
    const { t } = useTranslation('common');
    const [selectedSymptom, setSelectedSymptom] = useState<string | null>(null);
    const selected = symptomKeys.find(s => s.id === selectedSymptom);
    const medicineItems = getMedicineItems(t);

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f8fafc', paddingBottom: 24 }}>
            <header style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', padding: '20px 20px 24px', color: 'white' }}>
                <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.4rem', cursor: 'pointer', marginBottom: 8 }}>←</button>
                <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>🏥 {t('help_page.medical_header')}</h1>
            </header>

            {/* Quick call */}
            <div style={{ background: '#fef2f2', margin: '0 20px', marginTop: 16, borderRadius: 16, padding: '16px', border: '1.5px solid #fecaca', boxShadow: '0 2px 10px rgba(220, 38, 38, 0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: '#dc2626' }}>🚑 {t('help_page.emergency_119_title')}</div>
                        <div style={{ fontSize: '0.82rem', color: '#64748b' }}>{t('help_page.emergency_119_desc')}</div>
                    </div>
                    <a href="tel:119" style={{ background: '#ef4444', color: 'white', padding: '10px 20px', borderRadius: 30, fontWeight: 700, textDecoration: 'none', boxShadow: '0 2px 6px rgba(239, 68, 68, 0.3)' }}>📞 {t('help_page.call_btn')}</a>
                </div>
                
                <div style={{ borderTop: '1px dashed #fecaca', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#334155' }}>🩺 {t('help_page.consult_1339_title')}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{t('help_page.consult_1339_desc')}</div>
                    </div>
                    <a href="tel:1339" style={{ background: 'white', color: '#dc2626', padding: '7px 16px', borderRadius: 20, fontWeight: 700, textDecoration: 'none', fontSize: '0.85rem', border: '1px solid #fecaca' }}>{t('help_page.call_btn')}</a>
                </div>
            </div>

            {/* Symptom Expressions */}
            <div style={{ padding: '24px 20px 0' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 12px' }}>🗣 {t('help_page.symptoms_title')}</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    {symptomKeys.map(s => (
                        <button
                            key={s.id}
                            onClick={() => setSelectedSymptom(s.id === selectedSymptom ? null : s.id)}
                            style={{
                                padding: '16px 8px', borderRadius: 14,
                                border: `2.5px solid ${s.id === selectedSymptom ? '#ef4444' : '#e2e8f0'}`,
                                background: s.id === selectedSymptom ? '#fef2f2' : 'white',
                                cursor: 'pointer', textAlign: 'center',
                                boxShadow: '0 1px 4px rgba(0,0,0,0.06)', transition: 'all 0.15s'
                            }}
                        >
                            <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>{s.icon}</div>
                            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#1e293b' }}>
                                {t(`help_page.medical.symptoms.${s.id}`)}
                            </div>
                        </button>
                    ))}
                </div>

                {/* Expanded phrase card */}
                {selected && (
                    <div style={{ marginTop: 16, background: 'white', borderRadius: 20, padding: 20, border: '2px solid #ef4444', boxShadow: '0 4px 20px rgba(239,68,68,0.12)' }}>
                        <div style={{ fontSize: '2.5rem', textAlign: 'center', marginBottom: 12 }}>{selected.icon}</div>
                        <div style={{ fontSize: '2rem', fontWeight: 900, color: '#ef4444', textAlign: 'center', marginBottom: 4 }}>{selected.korean}</div>
                        <div style={{ fontSize: '0.85rem', color: '#94a3b8', textAlign: 'center', marginBottom: 16 }}>{selected.romanized}</div>
                        {[
                            { flag: '🇺🇸', text: selected.english },
                            { flag: '🇯🇵', text: selected.japanese },
                            { flag: '🇨🇳', text: selected.chinese },
                        ].map((l, i) => (
                            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
                                <span>{l.flag}</span>
                                <span style={{ fontSize: '0.88rem', color: '#374151' }}>{l.text}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Pharmacy / OTC Medicines */}
            <div style={{ padding: '24px 20px 0' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 12px' }}>💊 {t('help_page.medical.pharmacy_title')}</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {medicineItems.map((m, i) => (
                        <div key={i} style={{ background: 'white', borderRadius: 14, padding: '14px 16px', border: '1px solid #e2e8f0', display: 'flex', gap: 14, alignItems: 'center' }}>
                            <div style={{ fontSize: '2rem', flexShrink: 0 }}>{m.icon}</div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>{m.name}</div>
                                <div style={{ fontSize: '0.82rem', color: '#dc2626', fontWeight: 600 }}>{m.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
