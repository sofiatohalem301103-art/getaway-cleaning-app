'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const STAFF_DATABASE = [
  { id: 'GW-S1', code: 'GW - S1', name: 'GW - S1', password: 'Getaway01' },
  { id: 'GW-S2', code: 'GW - S2', name: 'GW - S2', password: 'Getaway02' },
  { id: 'GW-S3', code: 'GW - S3', name: 'GW - S3', password: 'Getaway03' },
  { id: 'GW-S4', code: 'GW - S4', name: 'GW - S4', password: 'Getaway04' },
  { id: 'GW-S5', code: 'GW - S5', name: 'GW - S5', password: 'Getaway05' },
];

export default function StaffLoginPage() {
  const router = useRouter();
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // ฟังก์ชันจัดฟอร์แมต Staff ID เติมขีดให้อัตโนมัติ และเป็นตัวพิมพ์ใหญ่ทั้งหมด
  const handleStaffIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (value.startsWith('GW') && value.length > 2) {
      value = `GW-${value.slice(2)}`;
    }

    setStaffId(value);
  };

  // ฟังก์ชันจัดฟอร์แมต Password ตัวอักษรแรกเป็นตัวพิมพ์ใหญ่ ตัวที่เหลือพิมพ์เล็ก
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.length === 0) {
      setPassword('');
      return;
    }
    const formattedPassword = val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
    setPassword(formattedPassword);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const formattedInputId = staffId.trim().replace(/\s+/g, '');
    const formattedPassword = password.trim();

    const foundStaff = STAFF_DATABASE.find((staff) => {
      const cleanDbId = staff.id.replace(/\s+/g, '');
      return cleanDbId === formattedInputId && staff.password === formattedPassword;
    });

    if (foundStaff) {
      localStorage.setItem('currentStaff', JSON.stringify(foundStaff));
      localStorage.setItem('staff_id', foundStaff.id);
      localStorage.setItem('staff_name', foundStaff.name);
      router.push('/staff/dashboard');
    } else {
      setErrorMessage('Invalid Staff ID or Password. Please try again.');
    }
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
              Staff Operations Portal
            </span>
          </div>
        </div>

        {/* Main Content ฝั่งซ้าย */}
        <div className="relative z-10 my-auto py-6 space-y-4 max-w-xl w-full">
          <h1 className="text-3xl lg:text-4xl xl:text-5xl font-extrabold text-[#1E3A5F] tracking-tight leading-tight">
            Getaway Field Service
          </h1>
          <p className="text-[#5A7B9C] text-sm lg:text-base font-normal leading-relaxed">
            Access cleaning schedules, property checklists, and real-time job status updates.
          </p>

          {/* Mini Cards */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="bg-white/80 p-4 rounded-2xl border border-white shadow-xs">
              <p className="text-[#6C84A3] text-xs font-medium">Daily Roster</p>
              <p className="text-[#1E3A5F] font-bold text-sm lg:text-base mt-0.5">Assigned Tasks</p>
            </div>
            <div className="bg-white/80 p-4 rounded-2xl border border-white shadow-xs">
              <p className="text-[#6C84A3] text-xs font-medium">Property Details</p>
              <p className="text-[#1E3A5F] font-bold text-sm lg:text-base mt-0.5">Keys & Access</p>
            </div>
          </div>
        </div>

        {/* Footer ฝั่งซ้าย */}
        <div className="relative z-10 flex items-center justify-between text-xs text-[#829AB1] pt-3 border-t border-blue-200/60 w-full">
          <span>Internal Staff Access Only</span>
          <span>Security Protocol 256-bit</span>
        </div>
      </div>

      {/* 🔵 ฝั่งขวา: ฟอร์ม Staff Login */}
      <div className="w-full md:w-1/2 lg:w-5/12 min-h-screen bg-[#F8FAFC] md:bg-white flex flex-col justify-between items-center p-6 lg:p-10 xl:p-12 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] md:py-8 overflow-y-auto">
        
        {/* Top Mobile Badge */}
        <div className="w-full flex justify-center pt-1 md:pt-0">
          <div className="md:hidden inline-flex items-center gap-2 bg-white border border-blue-100/80 px-4 py-1.5 rounded-full shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#2C7A39] animate-pulse" />
            <span className="text-[11px] font-bold tracking-wider uppercase text-[#1E3A5F]">
              Getaway Staff Portal
            </span>
          </div>
        </div>

        {/* Center Login Form Block */}
        <div className="w-full max-w-md my-auto py-4">
          
          {/* Header Section */}
          <div className="w-full text-center">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1E2B37] tracking-tight">
              Staff Log In
            </h2>
            <p className="text-xs sm:text-sm text-[#1E1E1E]/60 mt-1 font-medium">
              Sign in to access your work schedule
            </p>
          </div>

          {/* Form Section */}
          <div className="w-full my-5">
            {errorMessage && (
              <div className="w-full bg-[#EF8B8D]/20 border border-[#C94A4E]/60 text-[#C94A4E] text-xs py-2.5 px-4 rounded-2xl mb-4 text-center font-bold shadow-xs">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="w-full space-y-4">
              
              {/* Staff ID */}
              <div className="text-left">
                <label className="block text-xs font-bold text-[#1E2B37] mb-1">
                  Staff ID
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="GW-S1"
                  value={staffId}
                  onChange={handleStaffIdChange}
                  className="w-full px-4 py-3 border border-[#1E2B37]/30 rounded-2xl text-[16px] md:text-sm bg-white text-[#1E2B37] font-medium placeholder-[#1E1E1E]/30 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition uppercase"
                />
              </div>

              {/* Password */}
              <div className="text-left">
                <label className="block text-xs font-bold text-[#1E2B37] mb-1">
                  Password
                </label>
                <div className="relative w-full flex items-center">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={handlePasswordChange}
                    className="w-full px-4 py-3 pr-11 border border-[#1E2B37]/30 rounded-2xl text-[16px] md:text-sm bg-white text-[#1E2B37] font-medium placeholder-[#1E1E1E]/30 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-[#1E1E1E]/40 hover:text-[#1E2B37] p-1 cursor-pointer transition-colors"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.018 10.018 0 014.222-1.063c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21M3 3l18 18" /></svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full min-h-[48px] bg-[#2563EB] hover:bg-[#006AFF] active:scale-[0.98] text-white font-bold py-3 rounded-2xl text-sm transition duration-150 shadow-md cursor-pointer flex items-center justify-center select-none"
                >
                  Log In
                </button>
              </div>
            </form>
          </div>

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
            © Getaway Cleaning Service — Staff Only
          </p>
        </div>

      </div>

    </main>
  );
}