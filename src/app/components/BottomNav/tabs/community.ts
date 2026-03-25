import { TFunction } from 'i18next';

export const communityTab = (t: TFunction) => ({
    path: "/community",
    icon: "💬",
    label: t('common.community_nav', { defaultValue: 'Community' }),
    activeKey: "/community"
});
