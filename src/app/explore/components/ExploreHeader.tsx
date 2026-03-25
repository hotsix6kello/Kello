import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import styles from '../explore.module.css';
import { CITIES, CATEGORIES, CityId } from '../mock/data';

interface ExploreHeaderProps {
    currentCity: CityId;
    onCityChange: (cityId: CityId) => void;
    currentCategory: string; // "all" | CategoryId
    onCategoryChange: (catId: string) => void;
    onFilterClick: () => void;
    filterCount: number;
    radius: number;
    onRadiusChange: (r: number) => void;
    searchTerm: string;
    onSearchChange: (val: string) => void;
    onSearchSubmit: (val: string) => void;
}

export default function ExploreHeader({
    currentCity,
    onCityChange,
    currentCategory,
    onCategoryChange,
    onFilterClick,
    filterCount,
    radius,
    onRadiusChange,
    searchTerm,
    onSearchChange,
    onSearchSubmit
}: ExploreHeaderProps) {
    const { t } = useTranslation('common');
    const [isCityModalOpen, setIsCityModalOpen] = useState(false);

    const handleCitySelect = (cityId: CityId) => {
        onCityChange(cityId);
        setIsCityModalOpen(false);
    };

    const getPlaceholder = () => {
        const key = `explore_page.search_placeholders.${currentCategory}`;
        return t(key, { defaultValue: 'Search for beauty, food...' });
    };

    return (
        <>
            <header className={styles.stickyHeader}>
                <div className={styles.searchContainer}>
                    <div className={styles.searchWrapper}>
                        <span className={styles.searchIcon}>🔍</span>
                        <input
                            type="text"
                            placeholder={getPlaceholder()}
                            className={styles.searchInput}
                            value={searchTerm}
                            onChange={(e) => onSearchChange(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    onSearchSubmit(searchTerm);
                                }
                            }}
                        />
                    </div>

                    <div className={styles.headerActions}>
                        <button className={styles.filterBtn} onClick={onFilterClick}>
                            <span className={styles.filterIcon}>⚡</span>
                            {filterCount > 0 && <span className={styles.filterBadge}>{filterCount}</span>}
                        </button>
                    </div>
                </div>

                {/* Category and Distance Filters Removed based on User Request */}
            </header>

            {/* City Selection Modal */}
            {isCityModalOpen && (
                <div className={styles.modalOverlay} onClick={() => setIsCityModalOpen(false)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>{t('explore_page.select_city')}</h3>
                        <div className={styles.cityGrid}>
                            {CITIES.map(city => (
                                <button
                                    key={city.id}
                                    className={`${styles.cityOption} ${currentCity === city.id ? styles.selected : ''}`}
                                    onClick={() => handleCitySelect(city.id as CityId)}
                                >
                                    {t(`common.cities.${city.id}`, { defaultValue: city.label })}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
