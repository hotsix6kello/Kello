'use client';

import { useEffect } from 'react';
import { initLanguage } from '@/lib/i18n/initLanguage';

/**
 * 앱 최초 진입 시 자동 언어 감지를 실행하는 컴포넌트.
 * RootLayout에 배치하여 모든 페이지에서 1회 실행되도록 한다.
 */
export default function AutoLanguageDetector() {
    useEffect(() => {
        initLanguage();
    }, []);

    return null;
}
