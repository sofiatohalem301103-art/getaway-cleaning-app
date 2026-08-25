'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// 1. รายชื่อพนักงานและรหัสผ่าน Getaway01 - Getaway05
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const formattedInputId = staffId.trim().toUpperCase();

    // 2. ตรวจสอบรหัสพนักงานและรหัสผ่าน
    const foundStaff = STAFF_DATABASE.find(
      (staff) => staff.id === formattedInputId && staff.password === password
    );

    if (foundStaff) {
      // บันทึกข้อมูลพนักงานลง localStorage
      localStorage.setItem('currentStaff', JSON.stringify(foundStaff));
      
      // ล็อกอินสำเร็จ -> ส่งเข้าหน้า Staff Dashboard ทันที
      router.push('/staff/dashboard');
    } else {
      setErrorMessage('Invalid Staff ID or Password. Please try again.');
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 w-full max-w-md flex flex-col items-center">
        
        {/* Logo */}
        <div className="flex justify-center mb-6 w-full">
          <Image 
            src="/logo.jpeg" 
            alt="Getaway Cleaning Logo" 
            width={120} 
            height={80} 
            className="object-contain w-auto h-auto"
            priority 
          />
        </div>

        <h1 className="text-2xl font-bold text-slate-800 mb-6 text-center">
          Staff Log In
        </h1>

        {/* Error Alert */}
        {errorMessage && (
          <div className="w-full bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-xl mb-4 text-center">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-full flex flex-col space-y-5">
          {/* Staff ID */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Staff ID
            </label>
            <input
              type="text"
              placeholder="xx-xx"
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition bg-white text-gray-800"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Password
            </label>
            <div className="relative w-full flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-11 text-sm border border-gray-300 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition bg-white text-gray-800"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-gray-400 hover:text-gray-600 p-1"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.018 10.018 0 014.222-1.063c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21M3 3l18 18" /></svg>
                )}
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 bg-slate-700 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs transition shadow-sm cursor-pointer"
            >
              Log in
            </button>
          </div>
        </form>

      </div>
    </main>
  );
}