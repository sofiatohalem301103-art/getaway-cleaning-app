'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function LoginPage() {
  const [contact, setContact] = useState('');
  const router = useRouter();

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    const cleanContact = contact.trim();
    
    if (cleanContact) {
      localStorage.setItem('temp_phone', cleanContact);
      
      setTimeout(() => {
        router.push('/auth/verify-otp');
      }, 100);
    }
  };

  return (
    <main className="min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center p-0 sm:p-4 text-slate-800 font-sans">
      
      <div className="w-full min-h-[100dvh] sm:min-h-0 sm:max-w-md bg-white p-6 sm:p-8 sm:rounded-3xl shadow-none sm:shadow-sm border-none sm:border border-slate-100 flex flex-col justify-between sm:justify-center items-center">
        
        {/* Header & Logo */}
        <div className="w-full flex flex-col items-center pt-8 sm:pt-0">
          <div className="mb-6">
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
            Enter your email or phone number to continue
          </p>
        </div>

        {/* Form Input & Action Buttons */}
        <div className="w-full my-auto sm:my-6">
          <form onSubmit={handleNext} className="space-y-4">
            <div className="text-left">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Email or Phone Number
              </label>
              {/* เปลี่ยนจาก text-sm เป็น text-base เพื่อป้องกัน iOS Auto-Zoom */}
              <input 
                type="text" 
                required
                placeholder="Your Email or Phone Number"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-base bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition duration-150 text-slate-800 placeholder:text-slate-400"
              />
            </div>

            {/* ปุ่ม Next */}
            <button 
              type="submit" 
              className="w-full min-h-[50px] bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 active:scale-[0.98] text-white font-semibold py-3 rounded-2xl text-sm transition duration-150 shadow-sm touch-manipulation cursor-pointer flex items-center justify-center"
            >
              Next
            </button>
          </form>

          {/* Divider & Sign Up Link */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 mb-3">
              Don't have an account?
            </p>
            <Link
              href="/auth/register"
              prefetch={false}
              className="w-full min-h-[48px] bg-white hover:bg-emerald-50/50 active:bg-emerald-100/50 active:scale-[0.98] text-emerald-600 font-semibold py-2.5 border border-emerald-600/30 rounded-2xl text-sm transition duration-150 touch-manipulation cursor-pointer flex items-center justify-center"
            >
              Create New Account
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="w-full pb-4 sm:pb-0 text-center">
          <p className="text-[11px] text-slate-400">
            © Getaway Cleaning Service
          </p>
        </div>

      </div>
    </main>
  );
}