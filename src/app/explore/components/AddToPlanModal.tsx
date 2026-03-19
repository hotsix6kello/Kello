import { useTranslation } from 'react-i18next';
import { useTrip } from '@/lib/contexts/TripContext';
import styles from '../explore.module.css';

interface AddToPlanModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectDay: (day: number) => void;
    itemTitle: string;
}

export default function AddToPlanModal({ isOpen, onClose, onSelectDay, itemTitle }: AddToPlanModalProps) {
    const { t } = useTranslation('common');
    const { tripDays } = useTrip();
    if (!isOpen) return null;

    const days = Array.from({ length: tripDays }, (_, i) => i + 1);

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.bottomSheet} onClick={e => e.stopPropagation()}>
                <div className={styles.sheetHeader}>
                    <h3>{t('explore_page.add_to_plan')}</h3>
                    <button onClick={onClose} className={styles.closeBtn}>X</button>
                </div>
                <div className={styles.sheetContent}>
                    <p className={styles.sheetSubTitle}>{t('explore_page.adding_item_to', { title: itemTitle })}</p>
                    <div className={styles.dayList}>
                        {days.map(day => (
                            <button
                                key={day}
                                className={styles.dayOption}
                                onClick={() => {
                                    onSelectDay(day);
                                    onClose();
                                }}
                            >
                                <span className={styles.dayIcon}>📅</span>
                                {t('planner_page.day', { n: day })}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
