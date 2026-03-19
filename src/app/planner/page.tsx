'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './planner.module.css';
import { useTrip } from '@/lib/contexts/TripContext';
import { useTranslation } from 'react-i18next';
import {
    MOCK_TRIP_DAYS,
    SLOTS,
    TYPE_COLORS,
    SlotType,
    PlanCard
} from './mock/data';

// ─── helper ──────────────────────────────────────────────────────────────────
function TypeBadge({ type }: { type: PlanCard['type'] }) {
    const c = TYPE_COLORS[type] || { bg: '#333', text: '#fff' };
    return (
        <span className={styles.typeBadge} style={{ background: c.bg, color: c.text }}>
            {type}
        </span>
    );
}

function StatusBadge({ status }: { status: string }) {
    const { t } = useTranslation('common');
    const statusKey = status.toLowerCase();
    const className = `${styles.statusBadge} ${styles['status' + status.charAt(0).toUpperCase() + status.slice(1)]}`;
    return (
        <span className={className}>
            {t(`planner_page.status.${statusKey}`)}
        </span>
    );
}

// ─── Plan Card Component ──────────────────────────────────────────────────────
function PlanCardItem({ card, onRemove }: { card: any; onRemove: () => void; }) {
    const { t } = useTranslation('common');
    return (
        <div className={styles.planCard}>
            <div className={styles.cardColorBar} style={{ background: card.image_color || '#555' }} />
            <div className={styles.cardBody}>
                <div className={styles.cardTopRow}>
                    <TypeBadge type={card.type} />
                    <span className={styles.cardTitle}>{t(`explore_items.${card.id}.title`, { defaultValue: card.title || card.name })}</span>
                    <StatusBadge status={card.status || 'draft'} />
                </div>
                <div className={styles.cardMeta}>
                    {t(`explore_items.${card.id}.area`, { defaultValue: card.area })}
                    {card.time && <> · {card.time}</>}
                </div>
                <div className={styles.cardBadges}>
                    {card.badges?.map((b: string, idx: number) => (
                        <span key={idx} className={styles.miniBadge}>
                            {t(`explore_items.${card.id}.badges.${idx}`, { defaultValue: t(`common.badges.${b.toLowerCase().replace(/ /g, '_').replace(/-/g, '_')}`, { defaultValue: b }) })}
                        </span>
                    ))}
                </div>
            </div>
            <button className={styles.cardRemove} onClick={onRemove} title="Remove">×</button>
        </div>
    );
}

// ─── Slot Component ───────────────────────────────────────────────────────────
function SlotSection({ slotType, label, icon, cards, onRemove, onOpenDrawer }: any) {
    const { t } = useTranslation('common');
    return (
        <div className={styles.slotSection}>
            <div className={styles.slotHeader}>
                <span className={styles.slotIcon}>{icon}</span>
                <span className={styles.slotLabel}>{t(`planner_page.slots.${slotType}`, { defaultValue: label })}</span>
                <span className={styles.slotCount}>{cards.length} / 3</span>
            </div>
            <div className={styles.slotBody}>
                {cards.map((card: any) => (
                    <PlanCardItem key={card.id} card={card} onRemove={() => onRemove(card.id)} />
                ))}
                {cards.length < 3 && (
                    <div className={styles.emptySlot} onClick={() => onOpenDrawer(slotType)}>
                        <span>+</span>
                        <span>{t('planner_page.add_to', { slot: label })}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function PlannerPage() {
    const { t } = useTranslation('common');
    const { itinerary, removeItineraryItem, setTripStatus, tripDays } = useTrip();
    const router = useRouter();

    const [activeDay, setActiveDay] = useState(1);
    const [targetSlot, setTargetSlot] = useState<SlotType | null>(null);
    const [toast, setToast] = useState<string | null>(null);
    const [bookingOpen, setBookingOpen] = useState(false);
    const [bookingStatus, setBookingStatus] = useState<'idle' | 'submitting' | 'accepted' | 'unavailable'>("idle");
    const [bookingForm, setBookingForm] = useState({ date: '', people: '2', note: '' });

    // Generate dynamic day list based on tripDays
    const daysList = Array.from({ length: tripDays }, (_, i) => ({
        day: i + 1,
        city_label: itinerary.find(item => item.day === i + 1)?.type === 'attraction' ? 'Dest' : 'Seoul'
    }));

    const currentDay = daysList.find((d) => d.day === activeDay) || daysList[0];

    const showToast = useCallback((msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 2500);
    }, []);

    const handleBookingSubmit = useCallback(() => {
        setBookingStatus('submitting');
        setTimeout(() => {
            setBookingStatus('accepted');
            setTripStatus('pre-trip');
        }, 1800);
    }, [setTripStatus]);

    // Group itinerary by day then slot
    const daySlots = {
        am: itinerary.filter(i => (i.day === activeDay) && i.slot === 'am'),
        pm: itinerary.filter(i => (i.day === activeDay) && i.slot === 'pm'),
        night: itinerary.filter(i => (i.day === activeDay) && i.slot === 'night')
    };

    return (
        <div className={styles.container}>
            <div className={styles.tripStrip}>
                {daysList.map((day) => (
                    <div key={day.day} className={`${styles.dayTab} ${activeDay === day.day ? styles.active : ''}`} onClick={() => setActiveDay(day.day)}>
                        <span className={styles.dayLabel}>{t('planner_page.day', { n: day.day })}</span>
                        <span className={styles.cityLabel}>{day.city_label}</span>
                    </div>
                ))}
            </div>

            <div className={styles.dayBoard}>
                <div className={styles.boardActions}>
                    <button className={`${styles.ctaBtn} ${styles.ctaDiscover}`} onClick={() => router.push(`/explore`)}>
                        {t('planner_page.add_from_discover')}
                    </button>
                    <button className={`${styles.ctaBtn} ${styles.ctaAuto}`} onClick={() => showToast('Auto-build coming soon')}>
                        {t('planner_page.auto_build')}
                    </button>
                </div>

                {SLOTS.map(({ type, label, icon }) => (
                    <SlotSection
                        key={type}
                        slotType={type}
                        label={label}
                        icon={icon}
                        cards={daySlots[type as SlotType] || []}
                        onRemove={(id: string) => removeItineraryItem(id)}
                        onOpenDrawer={(slot: SlotType) => {
                            setTargetSlot(slot);
                            router.push('/explore');
                        }}
                    />
                ))}

                <button className={styles.bookAllBtn} onClick={() => setBookingOpen(true)}>
                    {t('planner_page.book_all')}
                </button>
            </div>

            {bookingOpen && (
                <div className={styles.bookingOverlay} onClick={() => setBookingOpen(false)}>
                    <div className={styles.bookingSheet} onClick={e => e.stopPropagation()}>
                        <div className={styles.sheetHandle} />
                        {bookingStatus === 'accepted' ? (
                            <div className={styles.bookingResult}>
                                <div className={styles.resultIcon}>✅</div>
                                <div className={styles.resultTitle}>{t('planner_page.booking_modal.success_title')}</div>
                                <div className={styles.resultDesc}>{t('planner_page.booking_modal.success_desc')}</div>
                                <button className={styles.bookingCloseBtn} onClick={() => { setBookingOpen(false); router.push('/my'); }}>
                                    {t('planner_page.booking_modal.view_status')}
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className={styles.sheetTitle}>{t('planner_page.booking_modal.title')}</div>
                                <div className={styles.bookingForm}>
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>{t('planner_page.booking_modal.date')}</label>
                                        <input type="date" className={styles.formInput} value={bookingForm.date} onChange={e => setBookingForm(f => ({ ...f, date: e.target.value }))} />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>{t('planner_page.booking_modal.people')}</label>
                                        <div className={styles.peopleRow}>
                                            {['1', '2', '3', '4+'].map(n => (
                                                <button key={n} className={`${styles.peopleChip} ${bookingForm.people === n ? styles.peopleChipActive : ''}`} onClick={() => setBookingForm(f => ({ ...f, people: n }))}>
                                                    {t('planner_page.booking_modal.people_count', { n })}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>{t('planner_page.booking_modal.notes')}</label>
                                        <textarea className={styles.formTextarea} value={bookingForm.note} onChange={e => setBookingForm(f => ({ ...f, note: e.target.value }))} rows={2} />
                                    </div>
                                </div>
                                <button className={styles.bookingSubmitBtn} disabled={bookingStatus === 'submitting'} onClick={handleBookingSubmit}>
                                    {bookingStatus === 'submitting' ? t('planner_page.booking_modal.submitting') : t('planner_page.booking_modal.submit')}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
            {toast && <div className={styles.toast}>{toast}</div>}
        </div>
    );
}
