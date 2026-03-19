'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './today.module.css';

// Mock today's schedule — 실제로는 planner state/DB에서 읽어옴
const TODAY_SCHEDULE = [
    {
        id: 1,
        time: '10:00',
        endTime: '12:00',
        title: '아모레스토어 성수 스파 예약',
        location: '성수동 2가 273-12',
        type: 'beauty',
        status: 'confirmed',   // confirmed | pending | done
        bookingRef: 'KT-2847',
        lat: 37.5445,
        lng: 127.0557,
    },
    {
        id: 2,
        time: '13:00',
        endTime: '14:30',
        title: '광장시장 먹거리 탐방',
        location: '종로구 창경궁로 88',
        type: 'food',
        status: 'confirmed',
        bookingRef: null,
        lat: 37.5700,
        lng: 126.9994,
    },
    {
        id: 3,
        time: '15:00',
        endTime: '17:00',
        title: '경복궁 관람',
        location: '세종로 1-91',
        type: 'attraction',
        status: 'confirmed',
        bookingRef: 'KT-2901',
        lat: 37.5796,
        lng: 126.9770,
    },
    {
        id: 4,
        time: '19:00',
        endTime: '21:00',
        title: '전통 한정식 저녁',
        location: '종로구 북촌로 84',
        type: 'food',
        status: 'confirmed',
        bookingRef: 'KT-2915',
        lat: 37.5831,
        lng: 126.9849,
    },
];

const TYPE_META: Record<string, { icon: string; color: string }> = {
    beauty: { icon: '💆', color: '#a78bfa' },
    food: { icon: '🍽️', color: '#fb923c' },
    attraction: { icon: '🏯', color: '#34d399' },
    move: { icon: '🚇', color: '#60a5fa' },
    default: { icon: '📍', color: '#94a3b8' },
};

function getMinutes(timeStr: string) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

import { useTrip } from '@/lib/contexts/TripContext';
import { useTranslation } from 'react-i18next';

export default function TodayPage() {
    const { t, i18n } = useTranslation('common');
    const { itinerary, removeItineraryItem } = useTrip();
    const router = useRouter();
    const [now, setNow] = useState(new Date());
    const [checkedIds, setCheckedIds] = useState<string[]>([]);

    useEffect(() => {
        const tInterval = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(tInterval);
    }, []);

    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    // Map itinerary to TODAY_SCHEDULE format
    const todaySchedule = itinerary.map((item, idx) => ({
        id: item.id,
        time: item.time,
        endTime: '12:00', // Mock end time
        title: item.name,
        location: 'Seoul', // Placeholder
        type: 'beauty', // Placeholder
        status: item.status,
        bookingRef: item.status === 'confirmed' ? `KT-${1000 + idx}` : null,
        lat: item.lat,
        lng: item.lng
    })).sort((a, b) => getMinutes(a.time) - getMinutes(b.time));

    const pastEvents = todaySchedule.filter(e => getMinutes(e.endTime) <= nowMinutes);
    const activeEvent = todaySchedule.find(
        e => getMinutes(e.time) <= nowMinutes && getMinutes(e.endTime) > nowMinutes
    );
    const upcomingEvents = todaySchedule.filter(e => getMinutes(e.time) > nowMinutes);
    const nextEvent = upcomingEvents[0];
    const minutesToNext = nextEvent ? getMinutes(nextEvent.time) - nowMinutes : null;

    const handleNavigate = useCallback((lat: number, lng: number, title: string) => {
        const origin = 'My Location'; // Or real coordinates if available
        const dest = `${lat},${lng}`;
        const lang = i18n.language;
        const googleUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&destination_place_id=${encodeURIComponent(title)}&travelmode=transit&hl=${lang}`;
        window.open(googleUrl, '_blank');
    }, [i18n.language]);

    const toggleCheck = useCallback((id: string) => {
        setCheckedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    }, []);

    if (todaySchedule.length === 0) {
        return (
            <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📋</div>
                <h2 className={styles.emptyTitle}>{t('today_page.empty.title')}</h2>
                <p className={styles.emptyDesc}>{t('today_page.empty.desc')}</p>
                <button className={styles.emptyBtn} onClick={() => router.push('/explore')}>
                    {t('today_page.empty.cta')} →
                </button>
            </div>
        );
    }

    const renderTodayContent = () => {
        return (
            <div className={styles.page}>
                <header className={styles.header}>
                    <div className={styles.headerDate}>
                        {now.toLocaleDateString(i18n.language, { month: 'long', day: 'numeric', weekday: 'short' })}
                    </div>
                    <h1 className={styles.headerTitle}>{t('today_page.title')}</h1>
                    <div className={styles.headerTime}>
                        {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </div>
                </header>

                {activeEvent && (
                    <section className={styles.activeCard}>
                        <div className={styles.activeNowBadge}>● {t('today_page.active_now')}</div>
                        <div className={styles.activeMain}>
                            <span className={styles.activeIcon}>💆</span>
                            <div>
                                <div className={styles.activeTitle}>{t(`explore_items.${activeEvent.id}.title`, { defaultValue: activeEvent.title })}</div>
                                <div className={styles.activeLoc}>📍 {activeEvent.location}</div>
                            </div>
                        </div>
                        <div className={styles.activeActions}>
                            <button className={styles.navBtn} onClick={() => handleNavigate(activeEvent.lat, activeEvent.lng, activeEvent.title)}>
                                🗺️ {t('today_page.navigate')}
                            </button>
                            {activeEvent.bookingRef && (
                                <div className={styles.refBadge}>{t('today_page.booking_ref', { ref: activeEvent.bookingRef })}</div>
                            )}
                        </div>
                    </section>
                )}

                {nextEvent && minutesToNext !== null && (
                    <section className={styles.countdownCard}>
                        <div className={styles.countdownLabel}>{t('today_page.next_up')}</div>
                        <div className={styles.countdownTime}>
                            {minutesToNext >= 60
                                ? t('today_page.minutes_left', { mins: minutesToNext }) // Simplified for demo
                                : t('today_page.minutes_left', { mins: minutesToNext })}
                        </div>
                        <div className={styles.countdownEvent}>
                            {nextEvent.time} · {t(`explore_items.${nextEvent.id}.title`, { defaultValue: nextEvent.title })}
                        </div>
                        <button className={styles.miniNavBtn} onClick={() => handleNavigate(nextEvent.lat, nextEvent.lng, nextEvent.title)}>
                            {t('today_page.depart_early')}
                        </button>
                    </section>
                )}

                <section className={styles.timeline}>
                    <div className={styles.timelineTitle}>{t('today_page.timeline')}</div>
                    {todaySchedule.map((event, idx) => {
                        const isPast = getMinutes(event.endTime) <= nowMinutes;
                        const isActive = activeEvent?.id === event.id;
                        const isChecked = checkedIds.includes(event.id);
                        const meta = TYPE_META[event.type] ?? TYPE_META.default;

                        return (
                            <div key={event.id} className={`${styles.timelineItem} ${isActive ? styles.timelineActive : ''} ${isPast ? styles.timelinePast : ''}`}>
                                <div className={styles.timeCol}>
                                    <div className={styles.timeText}>{event.time}</div>
                                    {idx < todaySchedule.length - 1 && <div className={styles.timeConnector} />}
                                </div>

                                <div className={styles.dot} style={{ background: isActive ? meta.color : isPast ? '#374151' : meta.color + '80' }}>
                                    {isActive && <div className={styles.dotPulse} />}
                                </div>

                                <div className={styles.eventCard}>
                                    <div className={styles.eventHeader}>
                                        <span className={styles.eventIcon}>{meta.icon}</span>
                                        <div className={styles.eventInfo}>
                                            <div className={styles.eventTitle}>{t(`explore_items.${event.id}.title`, { defaultValue: event.title })}</div>
                                            <div className={styles.eventTime}>{event.time} – {event.endTime}</div>
                                        </div>
                                        <button className={`${styles.checkBtn} ${isChecked ? styles.checkBtnDone : ''}`} onClick={() => toggleCheck(event.id)}>
                                            {isChecked ? '✓' : '○'}
                                        </button>
                                    </div>
                                    {event.bookingRef && (
                                        <div className={styles.eventRef}>{t('today_page.booking_ref', { ref: event.bookingRef })}</div>
                                    )}
                                    {!isPast && (
                                        <div className={styles.eventActions}>
                                            <button className={styles.eventNavBtn} onClick={() => handleNavigate(event.lat, event.lng, event.title)}>
                                                🗺️ {t('today_page.navigate')}
                                            </button>
                                            <button className={styles.eventDelBtn} onClick={() => removeItineraryItem(String(event.id))}>
                                                {t('planner_page.remove', { defaultValue: 'Delete' })}
                                            </button>
                                        </div>
                                    )}
                                    {isPast && (
                                        <div className={styles.eventActions}>
                                            <button className={styles.eventDelBtn} onClick={() => removeItineraryItem(String(event.id))}>
                                                {t('planner_page.remove', { defaultValue: 'Delete' })}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    <div className={styles.addEventRow}>
                        <button className={styles.addEventBtn} onClick={() => router.push('/explore?action=add')}>
                            + {t('planner_page.add_from_discover', { defaultValue: 'Add new plan' })}
                        </button>
                    </div>
                </section>

                {nextEvent && minutesToNext !== null && minutesToNext <= 30 && minutesToNext > 0 && (
                    <div className={styles.alertBanner}>
                        {t('today_page.departure_warning', { title: t(`explore_items.${nextEvent.id}.title`, { defaultValue: nextEvent.title }), mins: minutesToNext })}
                    </div>
                )}

                <div style={{ height: 100 }} />
            </div>
        );
    };

    return renderTodayContent();
}
