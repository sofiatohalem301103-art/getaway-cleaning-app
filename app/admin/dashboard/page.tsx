'use client';

import dynamic from 'next/dynamic';

const DashboardClient = dynamic(() => import('./DashboardClient'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen font-medium text-sm text-slate-400">
      Loading Admin Dashboard...
    </div>
  ),
});

export default function AdminDashboardPage() {
  return <DashboardClient />;
}