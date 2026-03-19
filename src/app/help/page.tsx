'use client';

import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import styles from './help.module.css';

export default function HelpPage() {
    const router = useRouter();
    const { t } = useTranslation('common');

    const emergencyData = [
        {
            id: 'medical',
            icon: '🏥',
            title: t('help_page.medical_title'),
            desc: t('help_page.medical_desc'),
            color: '#ef4444',
            bg: '#fef2f2',
            path: '/help/medical',
        },
        {
            id: 'lost',
            icon: '🔍',
            title: t('help_page.lost_title'),
            desc: t('help_page.lost_desc'),
            color: '#f59e0b',
            bg: '#fffbeb',
            path: '/help/lost',
        },
        {
            id: 'police',
            icon: '🚔',
            title: t('help_page.police_title'),
            desc: t('help_page.police_desc'),
            color: '#3b82f6',
            bg: '#eff6ff',
            path: '/help/police',
        },
        {
            id: 'interpreter',
            icon: '🌐',
            title: t('help_page.interp_title'),
            desc: t('help_page.interp_desc'),
            color: '#8b5cf6',
            bg: '#f5f3ff',
            path: '/help/interpretation',
        },
    ];

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerBadge}>🆘 {t('help_page.badge')}</div>
                <h1 className={styles.title}>{t('help_page.title')}</h1>
                <p className={styles.subtitle}>{t('help_page.subtitle')}</p>
            </div>

            {/* Main Grid */}
            <div className={styles.grid}>
                {emergencyData.map((item) => (
                    <button
                        key={item.id}
                        className={styles.card}
                        style={{ background: item.bg, borderColor: item.color + '30' }}
                        onClick={() => router.push(item.path)}
                    >
                        <div className={styles.cardIcon} style={{ background: item.color + '15' }}>
                            <span style={{ fontSize: '2.4rem' }}>{item.icon}</span>
                        </div>
                        <div className={styles.cardTitle} style={{ color: item.color }}>
                            {item.title}
                        </div>
                        <div className={styles.cardDesc}>{item.desc}</div>
                    </button>
                ))}
            </div>

            {/* Useful Numbers */}
            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>📞 {t('help_page.numbers_title')}</h2>
                <div className={styles.numberList}>
                    {[
                        { number: '119', label: 'Fire & Ambulance', icon: '🚑', color: '#ef4444' },
                        { number: '112', label: 'Police', icon: '🚔', color: '#3b82f6' },
                        { number: '1330', label: 'Tourism Helpline (EN/JA/ZH)', icon: '🌐', color: '#8b5cf6' },
                        { number: '021-2277', label: 'Seoul Foreign Clinic', icon: '🏥', color: '#10b981' },
                    ].map((n) => (
                        <a
                            key={n.number}
                            href={`tel:${n.number}`}
                            className={styles.numberCard}
                            style={{ borderLeftColor: n.color }}
                        >
                            <span className={styles.numberIcon}>{n.icon}</span>
                            <div>
                                <div className={styles.numberValue} style={{ color: n.color }}>{n.number}</div>
                                <div className={styles.numberLabel}>{n.label}</div>
                            </div>
                            <span className={styles.callIcon}>📲</span>
                        </a>
                    ))}
                </div>
            </div>

            {/* Floating Quick-dial Buttons */}
            <div className={styles.fab}>
                <a href="tel:119" className={styles.fabBtn} style={{ background: '#ef4444' }}>🚑 119</a>
                <a href="tel:1330" className={styles.fabBtn} style={{ background: '#8b5cf6' }}>🌐 1330</a>
            </div>
            <div style={{ height: 120 }} />
        </div>
    );
}
