import { TFunction } from 'i18next';

export const exploreTab = (t: TFunction) => ({
    path: "/explore",
    icon: "🔍",
    label: t('common.explore_nav', { defaultValue: 'Explore' }),
    activeKey: "/explore"
});
