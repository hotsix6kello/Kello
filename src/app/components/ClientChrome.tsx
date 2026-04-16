'use client';

import { useState, useEffect } from 'react';
import GlobalLangButton from './GlobalLangButton';
import BottomNav from './BottomNav';
import VisitorTracker from './VisitorTracker';

/**
 * Ensures global chrome UI (that uses next/navigation hooks) 
 * only renders on the client after hydration.
 * This prevents Next.js build-time InvariantErrors by completely 
 * bypassing these components during server-side prerendering.
 */
export default function ClientChrome() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return null;
    }

    return (
        <>
            <VisitorTracker />
            <GlobalLangButton />
            <BottomNav />
        </>
    );
}
