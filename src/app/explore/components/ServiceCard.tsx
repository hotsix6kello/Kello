import { useTranslation } from 'react-i18next';
import { ServiceItem } from '../mock/data';
import styles from '../explore.module.css';

interface ServiceCardProps {
    item: ServiceItem;
    onSave: (id: string) => void;
    onAddToPlan: (id: string) => void;
    onDetails: (id: string) => void;
    isSaved: boolean;
    distance?: string;
}

export default function ServiceCard({ item, onSave, onAddToPlan, onDetails, isSaved, distance }: ServiceCardProps) {
    const { t } = useTranslation('common');

    const renderBadges = () => {
        return (
            <div className={styles.badges}>
                {item.badges.map((badge, idx) => (
                    <span key={idx} className={styles.badge}>
                        {t(`explore_items.${item.id}.badges.${idx}`, { defaultValue: t(`common.badges.${badge.toLowerCase().replace(/ /g, '_').replace(/-/g, '_')}`, { defaultValue: badge }) })}
                    </span>
                ))}
                {item.vegan_option && (
                    <span className={`${styles.badge} ${styles.veganBadge}`}>
                        {item.vegan_option === 'all_vegan' ? t('explore_page.badges.vegan_only') : t('explore_page.badges.vegan_option')}
                    </span>
                )}
            </div>
        );
    };

    const renderTypeSpecificInfo = () => {
        switch (item.type) {
            case 'food':
                return (
                    <div className={styles.foodTags}>
                        {item.ingredients?.map((ing, idx) => (
                            <span key={idx} className={styles.ingredientTag}>
                                {t(`explore_items.${item.id}.ingredients.${idx}`, { defaultValue: t(`common.ingredients.${ing.toLowerCase()}`, { defaultValue: ing }) })}
                            </span>
                        ))}
                        {item.diet_tags?.map((diet, idx) => (
                            <span key={idx} className={styles.dietTag}>
                                {t(`explore_items.${item.id}.diet_tags.${idx}`, { defaultValue: t(`common.diet.${diet.toLowerCase().replace(/-/g, '_')}`, { defaultValue: diet }) })}
                            </span>
                        ))}
                    </div>
                );
            case 'event':
                return (
                    <div className={styles.eventTimeStrip}>
                        {t('explore_page.today')} {item.start_time}
                    </div>
                );
            case 'beauty':
                return (
                    <div className={styles.beautyInfo}>
                        <span>⏱ {item.duration_min} {t('common.min_unit', { defaultValue: 'min' })}</span>
                        <span>{t('explore_page.starts_from', { price: item.price_from?.toLocaleString() })}</span>
                    </div>
                );
            case 'festival':
                return (
                    <div className={styles.festivalInfo}>
                        <span>📅 {item.date_range}</span>
                        <span className={item.indoor_outdoor === 'indoor' ? styles.indoor : styles.outdoor}>
                            {item.indoor_outdoor === 'indoor' ? t('explore_page.indoor') : t('explore_page.outdoor')}
                        </span>
                    </div>
                );
            case 'attraction':
                return (
                    <div className={styles.attractionInfo}>
                        <span className="text-xs text-[var(--soft-ink)] leading-relaxed">{item.description}</span>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className={styles.cardHorizontal} onClick={() => onDetails(item.id)}>
            {/* Left Content Area */}
            <div className={styles.cardInfoSection}>
                <div className={styles.cardTextContent}>
                    <h3 className={styles.cardTitle}>{t(`explore_items.${item.id}.title`, { defaultValue: item.title || 'Standard Store' })}</h3>
                    
                    {/* Rating Row (Image Style) */}
                    <div className={styles.ratingRow}>
                        <span className={styles.ratingLabel}>{item.rating || '0.0'}</span>
                        <div className={styles.stars}>
                            {'★'.repeat(Math.floor(item.rating || 0))}{'☆'.repeat(5 - Math.floor(item.rating || 0))}
                        </div>
                        <span className={styles.reviewCount}>({item.reviews || 0})</span>
                    </div>

                    {/* Category and Area Info (Removed full address) */}
                    <div className={styles.descriptionRow}>
                        {item.type && <span className={styles.categoryLabel}>{t(`common.categories.${item.type}`, { defaultValue: item.type })}</span>}
                        <span className={styles.dot}> · </span>
                        <span className={styles.areaText}>{t(`explore_items.${item.id}.area`, { defaultValue: item.area })}</span>
                    </div>

                    {/* Status Info */}
                    <div className={styles.statusRow}>
                        <span className={styles.openNow}>{t('explore_page.open_now', { defaultValue: '지금 영업 중' })}</span>
                        {item.type === 'beauty' && <span className={styles.closingTime}> · {t('explore_page.closes_at', { time: '9:00 PM', hour: '9:00 PM' })}</span>}
                    </div>

                    {/* Review Snippet (Optional/Mock) */}
                    <div className={styles.reviewSnippet}>
                        <span className={styles.quoteIcon}>💬</span>
                        <p className={styles.snippetText}>
                            {t(`explore_items.${item.id}.snippet`, { defaultValue: '매장이 깔끔하고 친절합니다.' })}
                        </p>
                    </div>
                </div>

                {/* Badges and Tags moved below info */}
                <div className={styles.cardFooter}>
                    {renderTypeSpecificInfo()}
                    {renderBadges()}
                </div>
            </div>

            {/* Right Image/Thumbnail Area */}
            <div className={styles.cardImageSection}>
                <div 
                    className={styles.thumbnailRect}
                    style={{ backgroundColor: item.image_color || '#F3F4F6' }}
                >
                    {/* Save Button on the top of Image */}
                    <button
                        className={`${styles.saveIconOverlay} ${isSaved ? styles.savedIcon : ''}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            onSave(item.id);
                        }}
                    >
                        {isSaved ? '❤️' : '🤍'}
                    </button>
                </div>
            </div>
        </div>
    );
}
