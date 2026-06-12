"use client";

import { usePathname, useRouter } from "next/navigation";
import styles from "./BottomNav.module.css";
import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { navItems } from "./navigationConfig";
import { Home, Search, Users, User } from "lucide-react";

interface NavItem {
    id: string;
    path: string;
    icon: string;
    labelKey: string;
    defaultLabel: string;
    activeKey: string;
}

interface LocalizedNavItem extends NavItem {
    label: string;
}

const PurpleChatIcon = ({ size = 42 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <mask id="talk-chat-mask">
                {/* 전체 영역 통과 */}
                <rect x="0" y="0" width="100" height="100" fill="white" />
                {/* 큰 말풍선 내부를 깎아내어 작은 말풍선이 겹치는 라인 제거 */}
                <path d="M45 22C28.43 22 15 32.75 15 46C15 52.88 18.47 59.1 24 63.5L20.5 76L33.5 73.5C37.05 74.47 40.91 75 45 75C61.57 75 75 64.25 75 51C75 37.75 61.57 22 45 22Z" fill="black" />
            </mask>
        </defs>

        {/* 큰 말풍선 */}
        <path d="M45 22C28.43 22 15 32.75 15 46C15 52.88 18.47 59.1 24 63.5L20.5 76L33.5 73.5C37.05 74.47 40.91 75 45 75C61.57 75 75 64.25 75 51C75 37.75 61.57 22 45 22Z" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="34" cy="48" r="3" fill="currentColor" />
        <circle cx="45" cy="48" r="3" fill="currentColor" />
        <circle cx="56" cy="48" r="3" fill="currentColor" />

        {/* 작은 말풍선 (마스크 적용) */}
        <path d="M72 52C62.06 52 54 58.72 54 67C54 71.3 56.16 75.19 59.6 78.1L57 86L64.8 84.44C67 85.12 69.41 85.5 72 85.5C81.94 85.5 90 78.78 90 70.5C90 62.22 81.94 52 72 52Z" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" mask="url(#talk-chat-mask)" />
        <circle cx="65" cy="69" r="2.2" fill="currentColor" />
        <circle cx="72" cy="69" r="2.2" fill="currentColor" />
        <circle cx="79" cy="69" r="2.2" fill="currentColor" />

        {/* 반짝이 */}
        <path d="M75 14C75 18 78 21 82 21C78 21 75 24 75 28C75 24 72 21 68 21C72 21 75 18 75 14Z" fill="currentColor" fillOpacity={0.6} />
        <path d="M86 25C86 28 88 30 91 30C88 30 86 32 86 35C86 32 84 30 81 30C84 30 86 28 86 25Z" fill="currentColor" fillOpacity={0.6} />
    </svg>
);

const renderIcon = (iconName: string, isActive: boolean) => {
    const strokeWidth = isActive ? 2.5 : 2;
    const color = isActive ? "var(--foreground)" : "currentColor";
    switch (iconName) {
        case "home":
            return <Home size={24} strokeWidth={strokeWidth} color={color} />;
        case "search":
            return <Search size={24} strokeWidth={strokeWidth} color={color} />;
        case "talk":
            return <PurpleChatIcon size={42} />;
        case "community":
            return <Users size={24} strokeWidth={strokeWidth} color={color} />;
        case "my":
            return <User size={24} strokeWidth={strokeWidth} color={color} />;
        default:
            return null;
    }
};

export default function BottomNav() {
    const { t, i18n } = useTranslation('common');
    const router = useRouter();
    const pathname = usePathname();
    const [activeTab, setActiveTab] = useState("/");

    const localizedNavItems = useMemo<LocalizedNavItem[]>(() => {
        return (navItems as NavItem[]).map(item => ({
            ...item,
            label: t(item.labelKey, { 
                defaultValue: item.defaultLabel,
                lng: i18n.language 
            })
        }));
    }, [t, i18n.language]);

    useEffect(() => {
        const matched = localizedNavItems.find((item: LocalizedNavItem) => {
            if (item.activeKey === "/") return pathname === "/";
            return pathname.startsWith(item.activeKey);
        });
        setActiveTab(matched?.activeKey ?? "");
    }, [pathname, localizedNavItems]);

    // auth 페이지 및 lang-test에서는 숨김
    if (pathname.startsWith("/auth") || pathname.startsWith("/lang-test") || pathname.startsWith("/admin")) return null;

    return (
        <nav className={styles.navBar}>
            {localizedNavItems.map((item: LocalizedNavItem) => {
                const isActive = activeTab === item.activeKey;
                return (
                    <div
                        key={item.path}
                        className={`${styles.navItem} ${isActive ? styles.active : ""}`}
                        onClick={() => router.push(item.path)}
                    >
                        {isActive && <div className={styles.indicator} />}
                        <span className={styles.navIcon}>
                            {renderIcon(item.icon, isActive)}
                        </span>
                        <span className={styles.navLabel}>{item.label}</span>
                    </div>
                );
            })}
        </nav>
    );
}
