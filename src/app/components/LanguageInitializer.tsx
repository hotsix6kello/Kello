'use client';

import { useLayoutEffect } from 'react';
import { initClientLanguage, syncI18nLanguage } from '@/lib/i18n/client';

/**
 * Centrally manages language initialization.
 * Placed in RootLayout to ensure language is applied consistently across all pages,
 * regardless of whether specific UI elements (like GlobalLangButton) are visible.
 * 
 * locale: server-resolved locale passed from layout.tsx to minimize first-render flash.
 */
export default function LanguageInitializer({ locale }: { locale?: string }) {
    useLayoutEffect(() => {
        syncI18nLanguage(locale);
        initClientLanguage(locale);
        document.body.dataset.i18nReady = 'true';
    }, [locale]);

    return null; // This component doesn't render anything
}
