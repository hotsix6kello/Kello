'use client';

import { usePathname } from 'next/navigation';
import LanguagePicker from './LanguagePicker';
import styles from './GlobalLangButton.module.css';

/**
 * Floating language selector for routes that do not provide
 * their own local language entry point.
 */
export default function GlobalLangButton() {
    const pathname = usePathname();
    const SHOW_FLOATING_LANG_BUTTON_PATHS = new Set<string>([]);

    // Home keeps its existing top-left language control in HomeTopNav.
    // Sub pages should not render the floating top-right language button.
    if (pathname.startsWith('/auth')) return null;
    if (!SHOW_FLOATING_LANG_BUTTON_PATHS.has(pathname)) return null;

    return (
        <div className={styles.floatWrap}>
            <LanguagePicker compact />
        </div>
    );
}
