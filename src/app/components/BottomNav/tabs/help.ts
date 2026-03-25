import { TFunction } from 'i18next';

export const helpTab = (t: TFunction) => ({
    path: "/help",
    icon: "🆘",
    label: t('common.help_nav', { defaultValue: 'Help' }),
    activeKey: "/help"
});
