'use client';

import { useEffect } from 'react';
import { initClientLanguage } from '@/lib/i18n/client';

/**
 * Centrally manages language initialization.
 * Placed in RootLayout to ensure language is applied consistently across all pages,
 * regardless of whether specific UI elements (like GlobalLangButton) are visible.
 */
export default function LanguageInitializer() {
    useEffect(() => {
        initClientLanguage();
    }, []);

    return null; // This component doesn't render anything
}
