import { TFunction } from 'i18next';

export const homeTab = (t: TFunction) => ({
    path: "/",
    icon: "✦",
    label: t('common.home_nav', { defaultValue: 'Home' }),
    activeKey: "/"
});
