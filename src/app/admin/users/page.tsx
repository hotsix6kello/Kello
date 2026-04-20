'use client';

import dynamic from 'next/dynamic';

const AdminUsersContent = dynamic(() => import('./AdminUsersContent'), {
    loading: () => (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
            <div style={{ width: 36, height: 36, border: '3px solid #7c3aed', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    ),
    ssr: false,
});

export default function AdminUsersPage() {
    return <AdminUsersContent />;
}
