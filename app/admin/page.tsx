'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function AdminPortalPage() {
  return (
    <main className="min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center p-0 sm:p-4 text-slate-800 font-sans">
      
      {/* การ์ดหลัก: บนมือถือขยายเต็มจอ พอดีกับหน้าจอสมาร์ทโฟนทุกรุ่น */}
      <div className="w-full min-h-[100dvh] sm:min-h-0 sm:max-w-md bg-white p-6 sm:p-8 sm:rounded-3xl shadow-none sm:shadow-sm border-none sm:border border-slate-100 flex flex-col justify-between sm:justify-center items-center text-center">
        
        {/* Header & Logo */}
        <div className="w-full flex flex-col items-center pt-8 sm:pt-0">
          <div className="mb-6">
            <Image 
              src="/logo.jpeg" 
              alt="Company Logo" 
              width={160} 
              height={180} 
              className="object-contain"
              style={{ width: 'auto', height: 'auto' }}
              priority
            />
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
            Internal Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Please select your role to log in
          </p>
        </div>

        {/* ปุ่มกดเลือกประเภทผู้ใช้ (กดง่ายบนหน้าจอมือถือ Touch-friendly) */}
        <div className="w-full space-y-3 my-auto sm:my-8">
          
          {/* ปุ่ม Staff */}
          <Link 
            href="/staff/login" 
            className="flex items-center justify-center w-full min-h-[52px] bg-slate-800 hover:bg-slate-900 active:bg-black active:scale-[0.98] text-white font-semibold py-3 rounded-2xl transition duration-150 text-sm touch-manipulation shadow-sm cursor-pointer"
          >
            Staff Login
          </Link>

          {/* ปุ่ม Admin */}
          <Link 
            href="/admin/login" 
            className="flex items-center justify-center w-full min-h-[52px] bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 active:scale-[0.98] text-white font-semibold py-3 rounded-2xl transition duration-150 text-sm touch-manipulation shadow-sm cursor-pointer"
          >
            Admin Login
          </Link>

        </div>

        {/* Footer & ลิงก์ย้อนกลับ */}
        <div className="w-full pb-6 sm:pb-0 space-y-2">
          <p className="text-[11px] text-slate-400">
            © Getaway Cleaning Service — Internal Portal
          </p>
          <div>
            <Link 
              href="/" 
              className="text-[11px] text-slate-400 hover:text-slate-600 underline underline-offset-2 transition-colors"
            >
              ← Back to Customer Site
            </Link>
          </div>
        </div>

      </div>
    </main>
  );
}