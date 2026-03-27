import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import styles from '../explore.module.css';
import { CITIES, CityId } from '../mock/data';

interface ExploreHeaderProps {
    currentCity: string;
    onCityChange: (cityId: CityId) => void;
    currentCategory: string; // "all" | CategoryId
    onCategoryChange: (catId: string) => void;
    searchTerm: string;
    onSearchChange: (val: string) => void;
    onSearchSubmit: (val?: string) => void;
}

export default function ExploreHeader({
    currentCity,
    onCityChange,
    currentCategory,
    onCategoryChange,
    searchTerm,
    onSearchChange,
    onSearchSubmit
}: ExploreHeaderProps) {
    const { t, i18n } = useTranslation('common');
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
                            onKeyDown={(e) => e.key === 'Enter' && onSearchSubmit(searchTerm)}
                        />
                    </div>

                    {/* Filter Action Removed based on User Request */}
                </div>

                {/* Category and Distance Filters Removed based on User Request */}
            </header>

            {/* City Selection Modal */}
            {isCityModalOpen && (
                <div
                    dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}
                    className={`${styles.modalOverlay} fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-300 ease-in-out ${isCityModalOpen ? 'opacity-100' : 'opacity-0'}`}
                    onClick={() => setIsCityModalOpen(false)}
                >
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

                    <div
                        className={`${styles.modalContent} relative w-[92vw] max-w-[420px] max-h-[85vh] bg-[var(--surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] overflow-hidden flex flex-col transform transition-all duration-300 ease-out ${isCityModalOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-8'} ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`}
                        onClick={(e) => e.stopPropagation()}
                    >
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
