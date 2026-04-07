import { TFunction } from 'i18next';

export const myTab = (t: TFunction) => ({
    path: "/my",
    icon: "👤",
    label: t('common.my_nav', { defaultValue: 'My Info' }),
    activeKey: "/my"
});
