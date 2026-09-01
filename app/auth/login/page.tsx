'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const router = useRouter();

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    const cleanEmail = email.trim();
    
    if (cleanEmail) {
      // 1. เคลียร์และล้างคีย์อีเมลเก่าทิ้งเพื่อป้องกันการดึงค่าค้าง
      localStorage.removeItem('user_email');
      
      // 2. บันทึกอีเมลใหม่ลง localStorage ทั้งสองชื่อที่ระบบอาจเรียกใช้
      localStorage.setItem('temp_email', cleanEmail);
      localStorage.setItem('user_email', cleanEmail);
      
      // 3. แนบ Query Parameter ไปยังหน้า verify-otp ด้วยเพื่อความแม่นยำ 100%
      router.push(`/auth/verify-otp?email=${encodeURIComponent(cleanEmail)}`);
    }
  };

  return (
    <main className="min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center p-4 text-slate-800 font-sans">
      
      {/* Container หลัก */}
      <div className="w-full max-w-md bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center my-auto">
        
        {/* Header & Logo */}
        <div className="w-full flex flex-col items-center mb-6">
          <div className="mb-3">
            <Image 
              src="/logo.jpeg" 
              alt="Company Logo" 
              width={140} 
              height={140} 
              className="object-contain"
              style={{ width: 'auto', height: 'auto' }}
              priority
            />
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
            Sign In
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 text-center">
            Enter your email address to continue
          </p>
        </div>

        {/* Form Input & Action Buttons */}
        <div className="w-full">
          <form onSubmit={handleNext} className="space-y-4">
            <div className="text-left">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Email Address
              </label>
              <input 
                type="email" 
                required
                placeholder="name@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-base bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition duration-150 text-slate-800 placeholder:text-slate-400"
              />
            </div>

            {/* ปุ่ม Next */}
            <button 
              type="submit" 
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 active:scale-[0.98] text-white font-semibold rounded-2xl text-sm transition duration-150 shadow-sm touch-manipulation cursor-pointer flex items-center justify-center"
            >
              Next
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="w-full pt-6 text-center">
          <p className="text-[11px] text-slate-400">
            © Getaway Cleaning Service
          </p>
        </div>

      </div>
    </main>
  );
}