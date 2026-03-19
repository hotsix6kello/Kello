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
                        <span>⏳ {t(`explore_items.${item.id}.time_needed`, { defaultValue: item.time_needed })}</span>
                        <span className={styles.themeBadge}>{t(`explore_items.${item.id}.theme`, { defaultValue: item.theme })}</span>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className={styles.card}>
            {/* Thumbnail */}
            <div
                className={styles.cardThumbnail}
                style={{ backgroundColor: item.image_color || '#eee' }}
                onClick={() => onDetails(item.id)}
            >
                {/* Event specific overlay */}
                {item.type === 'event' && (
                    <div className={styles.eventOverlay}>
                        {t('explore_page.tonight')} {item.start_time}
                    </div>
                )}
                {/* Save Button */}
                <button
                    className={`${styles.saveBtn} ${isSaved ? styles.saved : ''}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        onSave(item.id);
                    }}
                >
                    {isSaved ? '♥' : '♡'}
                </button>
            </div>

            {/* Content */}
            <div className={styles.cardContent} onClick={() => onDetails(item.id)}>
                <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>{t(`explore_items.${item.id}.title`, { defaultValue: item.title })}</h3>
                    <div className={styles.cardMeta}>
                        <span className={styles.area}>
                            {distance && <strong className={styles.distance}>{distance} · </strong>}
                            {t(`explore_items.${item.id}.area`, { defaultValue: item.area })}
                        </span>
                        {item.rating && (
                            <span className={styles.rating}>
                                ⭐ {item.rating} ({item.reviews})
                            </span>
                        )}
                    </div>
                </div>

                {renderTypeSpecificInfo()}
                {renderBadges()}
            </div>

            {/* Actions */}
            <div className={styles.cardActions}>
                <button
                    className={styles.addToPlanBtn}
                    onClick={(e) => {
                        e.stopPropagation();
                        onAddToPlan(item.id);
                    }}
                >
                    {t('explore_page.add_to_plan')}
                </button>
            </div>
        </div>
    );
}

