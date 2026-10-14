'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('getawaycleaning.paphos@gmail.com');
  const [password, setPassword] = useState('Paphos2026');
  const [selectedAdmin, setSelectedAdmin] = useState('Sam');
  const router = useRouter();

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('admin_user', selectedAdmin);
    router.push('/admin/dashboard');
  };

  return (
    <main className="w-full min-h-screen flex flex-col md:flex-row font-sans text-[#1E2B37] bg-[#F8FAFC] md:bg-white touch-manipulation">
      
      {/* 🟢 ฝั่งซ้าย: Split Screen บนคอมพิวเตอร์ */}
      <div className="hidden md:flex w-full md:w-1/2 lg:w-7/12 min-h-screen bg-gradient-to-br from-[#EBF5FC] via-[#E2F0FD] to-[#D5E8F8] p-8 lg:p-12 xl:p-16 text-[#1E3A5F] flex-col justify-between relative overflow-hidden">
        
        {/* Soft Background Accent Lights */}
        <div className="absolute top-0 left-1/4 w-[30rem] h-[30rem] bg-white/60 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[25rem] h-[25rem] bg-[#86D892]/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Badge */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2.5 bg-white/90 border border-blue-200/80 px-3.5 py-1.5 rounded-full shadow-xs backdrop-blur-md">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2C7A39] animate-pulse" />
            <span className="text-xs font-semibold tracking-wider uppercase text-[#2C5282]">
              Administrator Portal
            </span>
          </div>
        </div>

        {/* Main Content ฝั่งซ้าย */}
        <div className="relative z-10 my-auto py-6 space-y-4 max-w-xl w-full">
          <h1 className="text-3xl lg:text-4xl xl:text-5xl font-extrabold text-[#1E3A5F] tracking-tight leading-tight">
            Getaway Control Center
          </h1>
          <p className="text-[#5A7B9C] text-sm lg:text-base font-normal leading-relaxed">
            Centralized operations portal for system administrators and staff supervisors.
          </p>

          {/* Mini Cards */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="bg-white/80 p-4 rounded-2xl border border-white shadow-xs">
              <p className="text-[#6C84A3] text-xs font-medium">Staff Management</p>
              <p className="text-[#1E3A5F] font-bold text-sm lg:text-base mt-0.5">Schedule & Status</p>
            </div>
            <div className="bg-white/80 p-4 rounded-2xl border border-white shadow-xs">
              <p className="text-[#6C84A3] text-xs font-medium">Booking System</p>
              <p className="text-[#1E3A5F] font-bold text-sm lg:text-base mt-0.5">Service Dispatch</p>
            </div>
          </div>
        </div>

        {/* Footer ฝั่งซ้าย */}
        <div className="relative z-10 flex items-center justify-between text-xs text-[#829AB1] pt-3 border-t border-blue-200/60 w-full">
          <span>Authorized Access Only</span>
          <span>Security Protocol 256-bit</span>
        </div>
      </div>

      {/* 🔵 ฝั่งขวา: แสดงผลพอดีจอปกติ แต่ถ้าซูมเข้าจะยอมให้มี Scrollbar เลื่อนได้ทันที */}
      <div className="w-full md:w-1/2 lg:w-5/12 min-h-screen bg-[#F8FAFC] md:bg-white flex flex-col justify-between items-center p-6 lg:p-10 xl:p-12 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] md:py-8 overflow-y-auto">
        
        {/* Top Spacer / Mobile Badge */}
        <div className="w-full flex justify-center pt-1 md:pt-0">
          <div className="md:hidden inline-flex items-center gap-2 bg-white border border-blue-100/80 px-4 py-1.5 rounded-full shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#2C7A39] animate-pulse" />
            <span className="text-[11px] font-bold tracking-wider uppercase text-[#1E3A5F]">
              Getaway Control Center
            </span>
          </div>
        </div>

        {/* Center Login Form Block */}
        <div className="w-full max-w-md my-auto py-4">
          
          {/* Header Section */}
          <div className="w-full text-center">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1E2B37] tracking-tight">
              Admin Login
            </h2>
            <p className="text-xs sm:text-sm text-[#1E1E1E]/60 mt-1 font-medium">
              Sign in to manage bookings
            </p>
          </div>

          {/* Form Section */}
          <form onSubmit={handleAdminLogin} className="w-full space-y-3.5 my-5">
            
            {/* Select Admin Profile */}
            <div className="text-left">
              <label className="block text-xs font-bold text-[#1E2B37] mb-1.5">
                Select Admin Profile
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { name: 'Sam', label: 'Sam' },
                  { name: 'Sylvia', label: 'Sylvia' },
                  { name: 'Zaza', label: 'Zaza' },
                ].map((admin) => (
                  <button
                    key={admin.name}
                    type="button"
                    onClick={() => setSelectedAdmin(admin.name)}
                    className={`py-2 px-3 text-xs font-bold rounded-full border transition-all duration-150 cursor-pointer flex items-center justify-center select-none ${
                      selectedAdmin === admin.name
                        ? 'bg-[#EAF3F9] border-[#2563EB] text-[#2563EB] shadow-xs'
                        : 'bg-[#EAF3F9]/50 border-[#93C5FD]/60 text-[#1E2B37]/70 hover:bg-[#EAF3F9]'
                    }`}
                  >
                    {admin.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Admin Email */}
            <div className="text-left">
              <label className="block text-xs font-bold text-[#1E2B37] mb-1">
                Admin Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-[#1E2B37]/30 rounded-2xl text-[16px] md:text-sm bg-white text-[#1E2B37] font-medium focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition"
              />
            </div>

            {/* Password */}
            <div className="text-left">
              <label className="block text-xs font-bold text-[#1E2B37] mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-[#1E2B37]/30 rounded-2xl text-[16px] md:text-sm bg-white text-[#1E2B37] font-medium focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-1">
              <button
                type="submit"
                className="w-full min-h-[46px] bg-[#2563EB] hover:bg-[#006AFF] active:scale-[0.98] text-white font-bold py-2.5 rounded-full text-sm transition duration-150 shadow-md cursor-pointer flex items-center justify-center select-none"
              >
                Sign In as Admin
              </button>
            </div>
          </form>

          {/* Sub Link */}
          <div className="w-full text-center">
            <Link 
              href="/admin" 
              className="text-xs text-[#1E2B37]/70 hover:text-[#2563EB] underline font-semibold transition"
            >
              ← Back to Select Role
            </Link>
          </div>

        </div>

        {/* Bottom Footer */}
        <div className="w-full text-center pt-2 border-t border-slate-200/60 md:border-slate-100 max-w-md">
          <p className="text-[11px] text-slate-400 font-medium">
            © Getaway Cleaning Service — Internal System
          </p>
        </div>

      </div>

    </main>
  );
}