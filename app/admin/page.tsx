'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function AdminPortalPage() {
  return (
    <main className="min-h-[100dvh] bg-[#EAF3F9] flex flex-col items-center justify-center p-0 sm:p-4 text-[#1E2B37] font-sans">
      
      {/* การ์ดหลัก */}
      <div className="w-full min-h-[100dvh] sm:min-h-0 sm:max-w-md bg-[#FFFFFF] p-6 sm:p-8 sm:rounded-[32px] shadow-none sm:shadow-xl border-none sm:border border-[#D9D9D9] flex flex-col justify-between sm:justify-center items-center text-center">
        
        {/* Header & Logo */}
        <div className="w-full flex flex-col items-center pt-8 sm:pt-0">
          <div className="mb-6 relative w-44 h-18 sm:w-48 sm:h-20">
            <Image 
              src="/logo.jpeg" 
              alt="Company Logo" 
              fill
              className="object-contain"
              priority
            />
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-[#1E2B37] tracking-tight">
            Internal Management
          </h1>
          <p className="text-xs sm:text-sm text-[#1E1E1E]/60 mt-1">
            Please select your role to log in
          </p>
        </div>

        {/* ปุ่มกดเลือกประเภทผู้ใช้ (คนละสี โทนสบายตาตามชาร์ต) */}
        <div className="w-full space-y-3.5 my-auto sm:my-8">
          
          {/* ปุ่ม Staff Log In (สีเขียวพาสเทลสบายตา #86D892) */}
          <Link 
            href="/staff/login" 
            className="flex items-center justify-center w-full min-h-[52px] bg-[#86D892] hover:bg-[#00CC00] hover:text-white active:scale-[0.98] text-[#1E2B37] font-bold py-3 rounded-2xl transition duration-200 text-sm touch-manipulation shadow-sm cursor-pointer select-none"
          >
            Staff Log In
          </Link>

          {/* ปุ่ม Admin Log In (สีฟ้าสบายตา #006AFF) */}
          <Link 
            href="/admin/login" 
            className="flex items-center justify-center w-full min-h-[52px] bg-[#006AFF] hover:bg-[#2563EB] active:scale-[0.98] text-white font-bold py-3 rounded-2xl transition duration-200 text-sm touch-manipulation shadow-md cursor-pointer select-none"
          >
            Admin Log In
          </Link>

        </div>

        {/* Footer & ลิงก์ย้อนกลับ */}
        <div className="w-full pb-6 sm:pb-0 space-y-2">
          <p className="text-[11px] text-[#1E1E1E]/50 font-medium">
            © Getaway Cleaning Service — Internal Portal
          </p>
          <div>
            <Link 
              href="/" 
              className="text-[11px] text-[#1E2B37] hover:text-[#006AFF] underline underline-offset-2 transition-colors"
            >
              ← Back to Customer Site
            </Link>
          </div>
        </div>

      </div>
    </main>
  );
}