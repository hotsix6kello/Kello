'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import styles from './KRideGlobalFAB.module.css';

import { useTrip } from '@/lib/contexts/TripContext';
import { useTranslation } from 'react-i18next';

// FAB를 숨기는 경로
const HIDE_ROUTES = ['/auth', '/my', '/lang-test', '/community'];

export default function KRideGlobalFAB() {
    const { t, i18n } = useTranslation('common');
    const { tripStatus, itinerary } = useTrip();
    const pathname = usePathname();
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [shrink, setShrink] = useState(false);
    const [showCard, setShowCard] = useState(false);

    // Get next destination from itinerary
    const nextDest = itinerary.find(item => item.status === 'confirmed');

    // MOCK_NEXT_DEST mapping
    const destInfo = nextDest ? {
        name: nextDest.name,
        nameKo: '서울특별시 성동구 성수이로 5', // Placeholder for Korean address
        lat: nextDest.lat,
        lng: nextDest.lng,
        travelMinutes: 20
    } : null;

    useEffect(() => {
        let lastY = window.scrollY;
        const onScroll = () => {
            const now = window.scrollY;
            setShrink(now > lastY && now > 80);
            lastY = now;
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // Config based on tripStatus from context
    const getFABConfig = () => {
        switch (tripStatus) {
            case 'idle': return { label: t('fab.idle'), icon: '✨', color: '#6B7280' };
            case 'pre-trip': return { label: t('fab.pre_trip'), icon: '📍', color: '#3B82F6' };
            case 'on-trip': return { label: t('fab.on_trip'), icon: '🏃', color: '#10B981' };
            case 'near-deadline': return { label: t('fab.near_deadline', { defaultValue: 'Late Risk' }), icon: '🚕', color: 'gradient' };
            default: return { label: t('fab.idle'), icon: '✨', color: '#6B7280' };
        }
    };

    const cfg = getFABConfig();

    const handleKRide = useCallback(() => {
        if (!destInfo) return;
        navigator.clipboard.writeText(destInfo.nameKo).catch(() => { });
        const deeplink = `kride://route?dest_lat=${destInfo.lat}&dest_lng=${destInfo.lng}&dest_name=${encodeURIComponent(destInfo.nameKo)}`;
        window.location.href = deeplink;
        setTimeout(() => {
            const ua = navigator.userAgent;
            if (ua.includes('iPhone') || ua.includes('iPad')) {
                window.open('https://apps.apple.com/kr/app/kakao-t/id981110422', '_blank');
            } else {
                window.open('https://play.google.com/store/apps/details?id=com.kakao.taxi', '_blank');
            }
        }, 1200);
        setOpen(false);
    }, [destInfo]);

    const handleTransit = useCallback(() => {
        if (!destInfo) return;
        const origin = 'My Location';
        const dest = `${destInfo.lat},${destInfo.lng}`;
        const lang = i18n.language;
        const googleUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&destination_place_id=${encodeURIComponent(destInfo.name)}&travelmode=transit&hl=${lang}`;
        window.open(googleUrl, '_blank');
        setOpen(false);
    }, [destInfo, i18n.language]);

    const handleCopy = useCallback(async () => {
        if (!destInfo) return;
        await navigator.clipboard.writeText(destInfo.nameKo);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [destInfo]);

    const shouldHide = HIDE_ROUTES.some(r => pathname.startsWith(r)) || tripStatus === 'idle';
    if (shouldHide) return null;

    return (
        <>
            <button
                className={`${styles.fab} ${tripStatus === 'near-deadline' ? styles.fabImminent : ''} ${shrink ? styles.fabShrink : ''}`}
                onClick={() => setOpen(true)}
                aria-label="Concierge Navigation"
            >
                <span className={styles.fabIcon}>{cfg.icon}</span>
                {!shrink && <span className={styles.fabLabel}>{cfg.label}</span>}
            </button>

            {open && destInfo && (
                <div className={styles.overlay} onClick={() => setOpen(false)}>
                    <div className={styles.sheet} onClick={e => e.stopPropagation()}>
                        <div className={styles.sheetHandle} />
                        <div className={styles.destBanner}>
                            <span className={styles.destIcon}>📍</span>
                            <div>
                                <div className={styles.destName}>{destInfo.name}</div>
                                <div className={styles.destAddr}>{destInfo.nameKo}</div>
                            </div>
                        </div>

                        <button className={`${styles.option} ${styles.optionKride}`} onClick={handleKRide}>
                            <span className={styles.optionIcon}>🚕</span>
                            <div className={styles.optionText}>
                                <span className={styles.optionTitle}>{t('fab.kride')}</span>
                                <span className={styles.optionSub}>{t('fab.kride_sub', { defaultValue: 'Arrives in 5m', mins: destInfo.travelMinutes })}</span>
                            </div>
                            <span className={styles.optionArrow}>→</span>
                        </button>

                        <button className={styles.option} onClick={handleTransit}>
                            <span className={styles.optionIcon}>🚇</span>
                            <div className={styles.optionText}>
                                <span className={styles.optionTitle}>{t('fab.transit')}</span>
                                <span className={styles.optionSub}>{t('fab.transit_sub', { defaultValue: 'Fastest route' })}</span>
                            </div>
                            <span className={styles.optionArrow}>→</span>
                        </button>

                        <button className={styles.option} onClick={handleCopy}>
                            <span className={styles.optionIcon}>📋</span>
                            <div className={styles.optionText}>
                                <span className={styles.optionTitle}>{t('fab.copy')}</span>
                                <span className={styles.optionSub}>{copied ? t('fab.copy_done', { defaultValue: 'Copied!' }) : t('fab.copy')}</span>
                            </div>
                        </button>

                        <button className={styles.option} onClick={() => { setOpen(false); setShowCard(true); }}>
                            <span className={styles.optionIcon}>🗺️</span>
                            <div className={styles.optionText}>
                                <span className={styles.optionTitle}>{t('fab.card')}</span>
                                <span className={styles.optionSub}>{t('fab.card_sub', { defaultValue: 'Show this to driver' })}</span>
                            </div>
                            <span className={styles.optionArrow}>→</span>
                        </button>

                        <button className={styles.cancelBtn} onClick={() => setOpen(false)}>{t('fab.cancel')}</button>
                    </div>
                </div>
            )}

            {showCard && destInfo && (
                <div className={styles.overlay} onClick={() => setShowCard(false)}>
                    <div className={styles.addressCard} onClick={e => e.stopPropagation()}>
                        <div className={styles.cardTitle}>{t('fab.card_modal_title', { defaultValue: '🗺️ Please go to this address' })}</div>
                        <div className={styles.cardAddress}>{destInfo.nameKo}</div>
                        <div className={styles.cardName}>{destInfo.name}</div>
                        <button className={styles.cardCopyBtn} onClick={handleCopy}>
                            {copied ? t('fab.copy_done', { defaultValue: '✅ Copied' }) : t('fab.copy', { defaultValue: '📋 Copy Address' })}
                        </button>
                        <button className={styles.cardCloseBtn} onClick={() => setShowCard(false)}>{t('fab.cancel', { defaultValue: 'Close' })}</button>
                    </div>
                </div>
            )}
        </>
    );
}
