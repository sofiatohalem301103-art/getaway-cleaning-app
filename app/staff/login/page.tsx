'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const STAFF_DATABASE = [
  { id: 'GW-S1', name: 'Staff 01', password: 'Getaway01' },
  { id: 'GW-S2', name: 'Staff 02', password: 'Getaway02' },
  { id: 'GW-S3', name: 'Staff 03', password: 'Getaway03' },
  { id: 'GW-S4', name: 'Staff 04', password: 'Getaway04' },
  { id: 'GW-S5', name: 'Staff 05', password: 'Getaway05' },
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

    const formattedInputId = staffId.trim();
    const formattedPassword = password.trim();

    const foundStaff = STAFF_DATABASE.find(
      (staff) => staff.id === formattedInputId && staff.password === formattedPassword
    );

    if (foundStaff) {
      localStorage.setItem('currentStaff', JSON.stringify(foundStaff));
      router.push('/staff/dashboard');
    } else {
      setErrorMessage('Invalid Staff ID or Password. Please try again.');
    }
  };

  return (
    <main className="min-h-[100dvh] bg-[#EAF3F9] flex flex-col items-center justify-center p-0 sm:p-4 text-[#1E2B37] font-sans">
      
      {/* Container หลัก */}
      <div className="w-full min-h-[100dvh] sm:min-h-0 sm:max-w-md bg-[#FFFFFF] p-6 sm:p-8 sm:rounded-[32px] shadow-none sm:shadow-xl border-none sm:border border-[#D9D9D9] flex flex-col justify-between sm:justify-center items-center">
        
        {/* Header & Logo */}
        <div className="w-full flex flex-col items-center pt-8 sm:pt-0">
          <div className="mb-6 relative w-48 h-20">
            <Image 
              src="/logo.jpeg" 
              alt="Getaway Cleaning Logo" 
              fill
              className="object-contain"
              priority 
            />
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-[#1E2B37] tracking-tight text-center">
            Staff Log In
          </h1>
          <p className="text-xs sm:text-sm text-[#1E1E1E]/60 mt-1 text-center">
            Sign in to access your work schedule
          </p>
        </div>

        {/* Form Input Section */}
        <div className="w-full my-auto sm:my-6">
          {errorMessage && (
            /* กล่อง Error แบบเข้ม ชัดเจนขึ้น */
            <div className="w-full bg-[#EF8B8D]/25 border-2 border-[#C94A4E] text-[#C94A4E] text-xs py-2.5 px-4 rounded-full mb-4 text-center font-bold shadow-xs">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="w-full space-y-4">
            
            {/* Staff ID */}
            <div className="text-left">
              <label className="block text-xs font-semibold text-[#1E2B37] mb-1.5">
                Staff ID
              </label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="GW-S1"
                value={staffId}
                onChange={handleStaffIdChange}
                className="w-full px-4 py-3 border border-[#D9D9D9] rounded-2xl text-base bg-[#FFFFFF] focus:outline-none focus:border-[#93C5FD] focus:ring-2 focus:ring-[#93C5FD]/50 transition duration-150 text-[#1E2B37] placeholder-[#1E1E1E]/40 font-medium uppercase"
              />
            </div>

            {/* Password */}
            <div className="text-left">
              <label className="block text-xs font-semibold text-[#1E2B37] mb-1.5">
                Password
              </label>
              <div className="relative w-full flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={handlePasswordChange}
                  className="w-full px-4 py-3 pr-11 border border-[#D9D9D9] rounded-2xl text-base bg-[#FFFFFF] focus:outline-none focus:border-[#93C5FD] focus:ring-2 focus:ring-[#93C5FD]/50 transition duration-150 text-[#1E2B37] placeholder-[#1E1E1E]/40 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-[#1E1E1E]/50 hover:text-[#1E2B37] p-1 cursor-pointer transition-colors"
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
                className="w-full min-h-[50px] bg-[#2563EB] hover:bg-[#006AFF] active:scale-[0.98] text-[#FFFFFF] font-bold py-3 rounded-2xl text-sm transition duration-150 shadow-md touch-manipulation cursor-pointer flex items-center justify-center select-none"
              >
                Log In
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="w-full pb-4 sm:pb-0 text-center">
          <p className="text-[11px] text-[#1E1E1E]/50 font-medium">
            © Getaway Cleaning Service — Staff Only
          </p>
        </div>

      </div>
    </main>
  );
}