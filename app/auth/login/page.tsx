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
      localStorage.removeItem('user_email');
      localStorage.setItem('temp_email', cleanEmail);
      localStorage.setItem('user_email', cleanEmail);
      router.push(`/auth/verify-otp?email=${encodeURIComponent(cleanEmail)}`);
    }
  };

  return (
    <main className="w-full min-h-[100dvh] bg-white sm:bg-[#EAF3F9] flex flex-col items-center justify-center p-0 sm:p-4 text-[#1E1E1E] font-sans">
      
      {/* Container Card */}
      <div className="w-full max-w-md bg-[#FFFFFF] p-6 sm:p-8 sm:rounded-3xl sm:shadow-sm sm:border sm:border-[#D9D9D9] flex flex-col items-center justify-center my-auto">
        
        {/* Header & Logo */}
        <div className="w-full flex flex-col items-center mb-6 text-center">
          {/* Logo แบบไม่มีกรอบ */}
          <div className="mb-4 flex items-center justify-center">
            <Image 
              src="/logo.jpeg" 
              alt="Getaway Cleaning Logo" 
              width={140} 
              height={140} 
              className="object-contain"
              style={{ width: 'auto', height: 'auto' }}
              priority
            />
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-[#1E1E1E] tracking-tight">
            Cleaning Service Booking
          </h1>
          <p className="text-xs sm:text-sm text-[#1E1E1E]/60 mt-1">
            Book professional cleaning service in just a few clicks
          </p>
        </div>

        {/* Form Input & Action Buttons */}
        <div className="w-full">
          <form onSubmit={handleNext} className="space-y-4">
            <div className="text-left">
              <label className="block text-xs font-semibold text-[#1E1E1E]/80 mb-1.5">
                Email Address
              </label>
              <input 
                type="email" 
                required
                placeholder="name@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-[#D9D9D9] rounded-2xl text-base bg-[#EAF3F9]/30 focus:bg-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition duration-150 text-[#1E1E1E] placeholder:text-[#1E1E1E]/40"
              />
            </div>

            {/* ปุ่ม Get Start / Sign in - ใช้โทนสี Palette #2563EB -> #006AFF */}
            <button 
              type="submit" 
              className="w-full h-12 bg-[#2563EB] hover:bg-[#006AFF] active:scale-[0.98] text-[#FFFFFF] font-semibold rounded-2xl text-sm transition duration-150 shadow-sm touch-manipulation cursor-pointer flex items-center justify-center"
            >
              Get Start / Sign in
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="w-full pt-6 text-center">
          <p className="text-[11px] text-[#1E1E1E]/40">
            © Getaway Cleaning Service
          </p>
        </div>

      </div>
    </main>
  );
}