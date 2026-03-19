'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import LanguagePicker from './LanguagePicker';
import styles from './GlobalLangButton.module.css';

/**
 * Floating language selector — visible on all pages.
 * Also responsible for calling initClientLanguage() after hydration
 * so SSR and client render start with the same language ("en"),
 * then switch to the user's saved language after mount.
 */
export default function GlobalLangButton() {
    const pathname = usePathname();

    // Language persistence is handled by LanguageInitializer in RootLayout

    // auth 페이지 및 홈 페이지(헤더 통합)에선 숨김
    if (pathname.startsWith('/auth') || pathname === '/') return null;

    return (
        <div className={styles.floatWrap}>
            <LanguagePicker compact />
        </div>
    );
}
