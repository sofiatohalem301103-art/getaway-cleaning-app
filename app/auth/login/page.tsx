'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    localStorage.setItem('temp_email', cleanEmail);
    router.push(`/auth/verify-otp?email=${encodeURIComponent(cleanEmail)}`);
  };

  const handleSocialLogin = async (provider: 'google') => {
    try {
      if (!supabase) return;
      await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/customer/booking`,
        },
      });
    } catch (error) {
      console.error('Social login error:', error);
    }
  };

  return (
    <main className="w-full min-h-screen bg-white flex flex-col justify-between p-4 sm:p-6 lg:p-8 text-[#1E2B37] font-sans antialiased box-border">
      
      {/* Container หลัก */}
      <div className="w-full max-w-6xl mx-auto my-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center py-4">
        
        {/* ==========================================
            ฝั่งซ้าย: ข้อความต้อนรับ
           ========================================== */}
        <div className="hidden lg:flex lg:col-span-7 flex-col justify-center space-y-4 pr-4">
          <h1 className="text-3xl lg:text-4xl xl:text-5xl font-extrabold text-[#1E2B37] tracking-tight leading-[1.2]">
            Book your cleaning service <br />
            <span className="text-[#1E2B37]">with absolute confidence.</span>
          </h1>
          <p className="text-sm lg:text-base text-slate-500 font-normal max-w-lg leading-relaxed">
            Trusted housekeeping experts dedicated to making your home impeccably clean and inviting.
          </p>
        </div>

        {/* ==========================================
            ฝั่งขวา: แบบฟอร์มการ์ด
           ========================================== */}
        <div className="lg:col-span-5 w-full max-w-md mx-auto">
          
          <div className="bg-white border-0 sm:border sm:border-slate-200/80 shadow-none sm:shadow-xl sm:shadow-slate-200/50 rounded-none sm:rounded-3xl p-6 sm:p-8 space-y-5">
            
            {/* Header */}
            <div className="space-y-1 text-center lg:text-left">
              <h2 className="text-xl sm:text-2xl font-bold text-[#1E2B37] tracking-tight">Sign In / Register</h2>
              <p className="text-xs sm:text-sm text-slate-400">Enter your email to receive an OTP</p>
            </div>

            {/* Form Email */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-semibold text-[#1E2B37] px-0.5">Email Address</label>
                
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@email.com"
                  required
                  className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[16px] sm:text-sm text-[#1E2B37] placeholder:text-slate-400 focus:outline-none focus:border-[#1E2B37] focus:bg-white transition-all shadow-xs"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-[#1E2B37] hover:bg-[#2c3e50] active:scale-98 disabled:opacity-50 text-white font-semibold rounded-2xl text-xs sm:text-sm transition-all shadow-md cursor-pointer"
              >
                {isLoading ? 'Sending OTP...' : 'Continue with Email'}
              </button>
            </form>

            {/* Divider */}
            <div className="relative flex py-0.5 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-3 text-[10px] sm:text-xs text-slate-400 font-semibold uppercase tracking-wider">or continue with</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            {/* Social Logins */}
            <div className="flex flex-col gap-2.5">
              
              {/* Google */}
              <button
                type="button"
                onClick={() => handleSocialLogin('google')}
                className="w-full py-3 px-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-700 flex items-center justify-center space-x-3 transition cursor-pointer active:scale-98 shadow-xs"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google</span>
              </button>

            </div>

          </div>
        </div>

      </div>

      {/* Footer */}
      <footer className="w-full text-center py-2 max-w-7xl mx-auto shrink-0">
        <p className="text-[11px] text-slate-400 font-medium">
          © {new Date().getFullYear()} Getaway Cleaning Service
        </p>
      </footer>

    </main>
  );
}