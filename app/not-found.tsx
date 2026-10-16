'use client';

import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <h2 className="text-3xl font-bold text-slate-800 mb-2">404 - Page Not Found</h2>
      <p className="text-slate-500 mb-6">Could not find the requested resource.</p>
      <Link 
        href="/customer/booking" 
        className="px-6 py-3 bg-[#0F172A] text-white font-semibold rounded-xl hover:bg-[#1E293B] transition"
      >
        Return to Booking
      </Link>
    </div>
  );
}