'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import styles from '../my/my.module.css';

interface VisitorStats {
    today: number;
    total: number;
}

export default function AdminStatsDashboard() {
    const [stats, setStats] = useState<VisitorStats | null>(null);
    const [realtimeCount, setRealtimeCount] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Fetch DB Stats (Today & Total)
        const fetchDbStats = async () => {
            try {
                // Using the RPC function we created in the migration
                const { data, error } = await supabase.rpc('get_visitor_counts');
                
                if (error) throw error;
                
                if (data && data.length > 0) {
                    setStats({
                        today: Number(data[0].today_count),
                        total: Number(data[0].total_count)
                    });
                }
            } catch (err) {
                console.error('[AdminStats] Failed to fetch DB stats:', err);
            } finally {
                setLoading(false);
            }
        };

        // 2. Real-time Presence
        const channel = supabase.channel('online-users', {
            config: {
                presence: {
                    key: 'user',
                },
            },
        });

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                // Presence state returns objects keyed by 'key' (user)
                // We count unique presence entries
                const count = Object.keys(state).length;
                setRealtimeCount(count);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    // Track this admin's presence too
                    await channel.track({ online_at: new Date().toISOString() });
                }
            });

        void fetchDbStats();

        return () => {
            void channel.unsubscribe();
        };
    }, []);

    if (loading) {
        return (
            <div className={styles.section} style={{ background: 'var(--hanji-ivory)', borderStyle: 'dashed' }}>
                <div className={styles.sectionHeader}>
                    <h4 className={styles.sectionTitle}>계정 통계 부하 중...</h4>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    {[1, 2, 3].map((i) => (
                        <div key={i} style={{ height: '60px', background: 'var(--warm-sand)', borderRadius: '8px', animation: 'pulse 1.5s infinite' }} />
                    ))}
                </div>
                <style>{`@keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 0.3; } 100% { opacity: 0.6; } }`}</style>
            </div>
        );
    }

    return (
        <div className={styles.section} style={{ border: '2px solid var(--secondary)', background: 'var(--surface)' }}>
            <div className={styles.sectionHeader}>
                <h4 className={styles.sectionTitle} style={{ color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '1.2rem' }}>📊</span> 실시간 방문자 대시보드 (Admin)
                </h4>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <div className={styles.savedSummaryCard} style={{ border: '1px solid var(--dancheong-teal)', background: 'rgba(45, 90, 86, 0.05)' }}>
                    <span className={styles.savedSummaryLabel} style={{ color: 'var(--dancheong-teal)' }}>실시간</span>
                    <span className={styles.savedSummaryValue} style={{ color: 'var(--dancheong-teal)' }}>
                        {realtimeCount} <span style={{ fontSize: '0.7rem', fontWeight: 500 }}>명</span>
                    </span>
                </div>
                
                <div className={styles.savedSummaryCard}>
                    <span className={styles.savedSummaryLabel}>오늘</span>
                    <span className={styles.savedSummaryValue}>
                        {stats?.today ?? 0} <span style={{ fontSize: '0.7rem', fontWeight: 500 }}>명</span>
                    </span>
                </div>
                
                <div className={styles.savedSummaryCard}>
                    <span className={styles.savedSummaryLabel}>전체 누적</span>
                    <span className={styles.savedSummaryValue}>
                        {stats?.total ?? 0} <span style={{ fontSize: '0.7rem', fontWeight: 500 }}>명</span>
                    </span>
                </div>
            </div>
            
            <p style={{ fontSize: '0.65rem', color: 'var(--gray-400)', marginTop: '10px', textAlign: 'right' }}>
                * 고유 방문자(IP/디바이스) 기준 집계
            </p>
        </div>
    );
}
