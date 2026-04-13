"use client";

import { usePathname, useRouter } from "next/navigation";
import styles from "./BottomNav.module.css";
import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { navItems } from "./navigationConfig";

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
    if (pathname.startsWith("/auth") || pathname.startsWith("/lang-test")) return null;

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
                        <span className={styles.navIcon}>{item.icon}</span>
                        <span className={styles.navLabel}>{item.label}</span>
                    </div>
                );
            })}
        </nav>
    );
}
