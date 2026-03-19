import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import styles from '../explore.module.css';
import { CategoryId } from '../mock/data';

interface FilterSheetProps {
    isOpen: boolean;
    onClose: () => void;
    category: string; // "all" | CategoryId
    onApply: (filters: Record<string, string[]>) => void;
}

export default function FilterSheet({ isOpen, onClose, category, onApply }: FilterSheetProps) {
    const { t } = useTranslation('common');
    const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});

    // Mock filter options based on category
    const renderFilters = () => {
        switch (category) {
            case 'beauty':
                return (
                    <>
                        <h4>{t('explore_page.filters.show')}</h4>
                        <div className={styles.filterSection}>
                            {['skin_care', 'hair_makeup', 'nails'].map(opt => (
                                <button className={styles.filterChip} key={opt}>{t(`explore_page.filters.options.${opt}`)}</button>
                            ))}
                        </div>
                        <h4>{t('explore_page.filters.price')}</h4>
                        <div className={styles.filterSection}>
                            {['₩', '₩₩', '₩₩₩'].map(opt => (
                                <button className={styles.filterChip} key={opt}>{opt}</button>
                            ))}
                        </div>
                    </>
                );
            case 'food':
                return (
                    <>
                        <h4>{t('explore_page.filters.diet')}</h4>
                        <div className={styles.filterSection}>
                            {['vegan', 'vegetarian', 'no_pork', 'halal'].map(opt => (
                                <button className={styles.filterChip} key={opt}>{t(`explore_page.filters.options.${opt}`)}</button>
                            ))}
                        </div>
                        <h4>{t('explore_page.filters.ingredients')}</h4>
                        <div className={styles.filterSection}>
                            {['beef', 'pork', 'chicken', 'seafood', 'dairy', 'egg'].map(opt => (
                                <button className={styles.filterChip} key={opt}>{t(`explore_page.filters.options.${opt}`)}</button>
                            ))}
                        </div>
                    </>
                );
            case 'event':
                return (
                    <>
                        <h4>{t('explore_page.filters.date')}</h4>
                        <div className={styles.filterSection}>
                            {['today', 'weekend', 'select'].map(opt => (
                                <button className={styles.filterChip} key={opt}>{t(`explore_page.filters.options.${opt}`)}</button>
                            ))}
                        </div>
                        <h4>{t('explore_page.filters.type')}</h4>
                        <div className={styles.filterSection}>
                            {['concert', 'show', 'popup', 'club', 'exhibition'].map(opt => (
                                <button className={styles.filterChip} key={opt}>{t(`explore_page.filters.options.${opt}`)}</button>
                            ))}
                        </div>
                    </>
                );
            default:
                return <p>{t('explore_page.no_specific_filters')}</p>;
        }
    }

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={`${styles.bottomSheet} slide-up`} onClick={e => e.stopPropagation()}>
                <div className={styles.sheetHeader}>
                    <button onClick={() => setSelectedFilters({})} className={styles.resetBtn}>{t('explore_page.reset')}</button>
                    <h3>{t('explore_page.filters_title')}</h3>
                    <button onClick={() => { onApply(selectedFilters); onClose(); }} className={styles.applyBtn}>{t('explore_page.apply')}</button>
                </div>
                <div className={styles.sheetContent}>
                    {renderFilters()}
                </div>
            </div>
        </div>
    );
}
