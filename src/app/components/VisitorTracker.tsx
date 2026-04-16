'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function VisitorTracker() {
    useEffect(() => {
        const trackVisit = async () => {
            try {
                // Get or create unique visitor ID
                let visitorId = localStorage.getItem('kello_visitor_id');
                if (!visitorId) {
                    visitorId = crypto.randomUUID();
                    localStorage.setItem('kello_visitor_id', visitorId);
                }

                // If logged in, we could use user ID instead, but keeping it simple with device ID
                // to track unique browsers/devices.
                const { data: userData } = await supabase.auth.getUser();
                const trackingId = userData.user?.id || visitorId;

                // Attempt to log visit for today
                // Unique index (visitor_id, visit_date) will handle deduplication
                await supabase.from('visitor_logs').insert({
                    visitor_id: trackingId
                });
            } catch (error) {
                // Fail silently for analytics
                console.error('[VisitorTracker] Error tracking visit:', error);
            }
        };

        void trackVisit();
    }, []);

    return null;
}
