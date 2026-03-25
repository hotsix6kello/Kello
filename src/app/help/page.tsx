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
            color: 'var(--korean-red)',
            bg: 'var(--hanji-ivory)',
            path: '/help/medical',
        },
        {
            id: 'lost',
            icon: '🔍',
            title: t('help_page.lost_title'),
            desc: t('help_page.lost_desc'),
            color: 'var(--accent)',
            bg: 'var(--hanji-ivory)',
            path: '/help/lost',
        },
        {
            id: 'police',
            icon: '🚔',
            title: t('help_page.police_title'),
            desc: t('help_page.police_desc'),
            color: 'var(--secondary)',
            bg: 'var(--hanji-ivory)',
            path: '/help/police',
        },
        {
            id: 'interpreter',
            icon: '🌐',
            title: t('help_page.interp_title'),
            desc: t('help_page.interp_desc'),
            color: 'var(--dancheong-teal)',
            bg: 'var(--hanji-ivory)',
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
                        style={{ borderBottomColor: item.color }}
                        onClick={() => router.push(item.path)}
                    >
                        <div className={styles.cardIcon}>
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
                        { id: 'fire', number: '119', label: 'Fire & Ambulance', icon: '🚑', color: 'var(--korean-red)' },
                        { id: 'police', number: '112', label: 'Police', icon: '🚔', color: 'var(--secondary)' },
                        { id: 'tourism', number: '1330', label: 'Tourism Helpline (EN/JA/ZH)', icon: '🌐', color: 'var(--dancheong-teal)' },
                        { id: 'clinic', number: '021-2277', label: 'Seoul Foreign Clinic', icon: '🏥', color: 'var(--dancheong-teal)' },
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
                                <div className={styles.numberLabel}>{t(`help_page_labels.${n.id}`)}</div>
                            </div>
                            <span className={styles.callIcon}>📲</span>
                        </a>
                    ))}
                </div>
            </div>

            {/* Floating Quick-dial Buttons */}
            <div className={styles.fab}>
                <a href="tel:119" className={styles.fabBtn} style={{ background: 'var(--korean-red)' }}>🚑 119</a>
                <a href="tel:1330" className={styles.fabBtn} style={{ background: 'var(--secondary)' }}>🌐 1330</a>
            </div>
            <div style={{ height: 120 }} />
        </div>
    );
}
