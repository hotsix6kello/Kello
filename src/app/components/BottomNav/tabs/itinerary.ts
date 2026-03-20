import { TFunction } from 'i18next';

export const itineraryTab = (t: TFunction) => ({
    path: "/navigation",
    icon: "📍",
    label: t('common.today_nav', { defaultValue: 'Itinerary' }),
    activeKey: "/navigation"
});
