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
            number: '119',
        },
        {
            id: 'police',
            icon: '🚔',
            title: t('help_page.police_title'),
            desc: t('help_page.police_desc'),
            color: 'var(--secondary)',
            bg: 'var(--hanji-ivory)',
            path: '/help/police',
            number: '112',
        },
        {
            id: 'interpreter',
            icon: '🌐',
            title: t('help_page.interp_title'),
            desc: t('help_page.interp_desc'),
            color: 'var(--dancheong-teal)',
            bg: 'var(--hanji-ivory)',
            path: '/help/interpretation',
            number: '1330',
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
    ];

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <h1 className={styles.title}>{t('help_page.title')}</h1>
            </div>

            {/* Main Grid */}
            <div className={styles.grid}>
                {emergencyData.map((item) => (
                    <div
                        key={item.id}
                        className={styles.card}
                        style={{ borderColor: item.color }}
                        onClick={() => router.push(item.path)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                router.push(item.path);
                            }
                        }}
                    >
                        <div className={styles.cardIcon}>
                            <span style={{ fontSize: '2.4rem' }}>{item.icon}</span>
                        </div>
                        <div className={styles.cardTitle} style={{ color: item.color }}>
                            {item.title}
                        </div>
                        <div className={styles.cardDesc}>{item.desc}</div>

                        {item.number && (
                            <a
                                href={`tel:${item.number}`}
                                className={styles.phoneNumber}
                                style={{ color: item.color, borderColor: item.color }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                📞 {item.number}
                            </a>
                        )}
                    </div>
                ))}
            </div>
            <div style={{ height: 60 }} />
        </div>
    );
}

