'use client';

import dynamic from 'next/dynamic';

const DashboardClient = dynamic(() => import('./DashboardClient'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-[100dvh] w-full font-medium text-xs sm:text-sm text-slate-400 bg-slate-50 px-4 text-center overflow-x-hidden">
      Loading Admin Dashboard...
    </div>
  ),
});

export default function AdminDashboardPage() {
  return <DashboardClient />;
}