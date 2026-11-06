'use client';

import Link from 'next/link';

export default function AdminPortalPage() {
  return (
    <main className="min-h-[100dvh] w-full flex flex-col md:flex-row font-sans text-[#1E2B37] bg-[#F8FAFC] md:bg-white overflow-x-hidden">
      
      {/* 🟢 ฝั่งซ้าย: Split Screen บนคอมพิวเตอร์และ iPad แนวนอน (ซ่อนบนมือถือเพื่อคืนพื้นที่) */}
      <div className="hidden md:flex w-full md:w-1/2 lg:w-7/12 bg-gradient-to-br from-[#EBF5FC] via-[#E2F0FD] to-[#D5E8F8] p-8 lg:p-16 text-[#1E3A5F] flex-col justify-between relative overflow-hidden">
        
        {/* Soft Background Accent Lights */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/60 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-[#86D892]/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Badge */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2.5 bg-white/90 border border-blue-200/80 px-3.5 py-1.5 rounded-full shadow-xs backdrop-blur-md">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2C7A39] animate-pulse" />
            <span className="text-xs font-semibold tracking-wider uppercase text-[#2C5282]">
              Management System
            </span>
          </div>
        </div>

        {/* Content หลักฝั่งซ้าย */}
        <div className="relative z-10 my-auto py-8 space-y-5 max-w-lg">
          <h1 className="text-3xl lg:text-5xl font-extrabold text-[#1E3A5F] tracking-tight leading-tight">
            Getaway Control Center
          </h1>
          <p className="text-[#5A7B9C] text-sm md:text-base font-normal leading-relaxed">
            Centralized operations portal for system administrators and staff supervisors.
          </p>

          {/* Mini Cards */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="bg-white/80 p-4 rounded-2xl border border-white shadow-xs">
              <p className="text-[#6C84A3] text-xs font-medium">Staff Management</p>
              <p className="text-[#1E3A5F] font-bold text-sm mt-1">Schedule & Status</p>
            </div>
            <div className="bg-white/80 p-4 rounded-2xl border border-white shadow-xs">
              <p className="text-[#6C84A3] text-xs font-medium">Booking System</p>
              <p className="text-[#1E3A5F] font-bold text-sm mt-1">Service Dispatch</p>
            </div>
          </div>
        </div>

        {/* Footer ฝั่งซ้าย */}
        <div className="relative z-10 flex items-center justify-between text-xs text-[#829AB1] pt-4 border-t border-blue-200/60">
          <span>Authorized Access Only</span>
          <span>Security Protocol 256-bit</span>
        </div>
      </div>

      {/* 🔵 ฝั่งขวา: ฟอร์มสิทธิ์ล็อกอินหลัก (จัดวางกึ่งกลางบาลานซ์สมบูรณ์แบบบนมือถือ) */}
      <div className="w-full md:w-1/2 lg:w-5/12 bg-[#F8FAFC] md:bg-white flex flex-col justify-between items-center p-4 sm:p-8 lg:p-16 min-h-[100dvh] md:min-h-screen pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] box-border">
        
        {/* Top Spacer / Mobile Badge (หลบระยะ Notch / Dynamic Island พอดี) */}
        <div className="w-full flex justify-center pt-1 md:pt-0">
          <div className="md:hidden inline-flex items-center gap-2 bg-white border border-blue-100/80 px-3.5 py-1 rounded-full shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#2C7A39] animate-pulse" />
            <span className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase text-[#1E3A5F]">
              Getaway Control Center
            </span>
          </div>
        </div>

        {/* Center Main Card Block */}
        <div className="w-full max-w-md my-auto py-4 sm:py-6">
          
          {/* Title Header */}
          <div className="w-full text-center">
            <h2 className="text-xl sm:text-3xl font-extrabold text-[#1E3A5F] tracking-tight">
              Sign In to Portal
            </h2>
            <p className="text-xs sm:text-sm text-[#6C84A3] mt-1.5 sm:mt-2.5">
              Select your account level to proceed
            </p>
          </div>

          {/* User Role Selection Buttons */}
          <div className="w-full space-y-3 sm:space-y-4 my-6 sm:my-10">
            
            {/* Staff Member Button */}
            <Link 
              href="/staff/login" 
              className="group flex items-center justify-between w-full min-h-[58px] sm:h-16 px-4 sm:px-6 py-2.5 sm:py-0 bg-white border-2 border-slate-200/80 hover:border-[#86D892] text-[#1E3A5F] font-bold rounded-xl sm:rounded-2xl transition-all duration-200 shadow-xs hover:shadow-md cursor-pointer select-none touch-manipulation active:scale-[0.98]"
            >
              <div className="text-left pr-2">
                <p className="text-sm sm:text-base font-bold text-[#1E3A5F] group-hover:text-[#2C7A39] transition-colors leading-snug">
                  Staff Member
                </p>
                <p className="text-[11px] sm:text-xs text-[#6C84A3] font-normal leading-tight">
                  For cleaning staff and supervisors
                </p>
              </div>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#86D892]/20 group-hover:bg-[#86D892] text-[#2C7A39] group-hover:text-white flex items-center justify-center font-bold text-sm sm:text-base transition-all shrink-0">
                →
              </div>
            </Link>

            {/* Administrator Button */}
            <Link 
              href="/admin/login" 
              className="group flex items-center justify-between w-full min-h-[58px] sm:h-16 px-4 sm:px-6 py-2.5 sm:py-0 bg-[#006AFF] hover:bg-[#0052CC] text-white font-bold rounded-xl sm:rounded-2xl transition-all duration-200 shadow-md hover:shadow-lg cursor-pointer select-none touch-manipulation active:scale-[0.98]"
            >
              <div className="text-left pr-2">
                <p className="text-sm sm:text-base font-bold leading-snug">
                  Administrator
                </p>
                <p className="text-[11px] sm:text-xs text-blue-100/80 font-normal leading-tight">
                  Full access to system settings
                </p>
              </div>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/20 group-hover:bg-white text-white group-hover:text-[#006AFF] flex items-center justify-center font-bold text-sm sm:text-base transition-all shrink-0">
                →
              </div>
            </Link>

          </div>

          {/* Sub Link */}
          <div className="w-full text-center">
            <Link 
              href="/" 
              className="text-xs text-[#6C84A3] hover:text-[#006AFF] underline underline-offset-4 transition-colors font-semibold touch-manipulation inline-block py-1"
            >
              ← Back to Customer Site
            </Link>
          </div>

        </div>

        {/* Bottom Footer */}
        <div className="w-full text-center pt-3 sm:pt-4 border-t border-slate-200/60 md:border-slate-100 max-w-md shrink-0">
          <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
            © {new Date().getFullYear()} Getaway Cleaning Service — Internal System
          </p>
        </div>

      </div>

    </main>
  );
}