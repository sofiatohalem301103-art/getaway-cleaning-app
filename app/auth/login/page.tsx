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

  const handleSocialLogin = async (provider: 'google' | 'facebook' | 'apple') => {
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
    <main className="min-h-[calc(100dvh-80px)] w-full bg-white sm:bg-[#F8FAFC] flex flex-col justify-between p-0 sm:p-8 text-[#1E2B37] font-sans antialiased overflow-x-hidden">
      
      {/* Container หลัก: บนมือถือดันขึ้นด้านบน (pt-4) / บนคอมพิวเตอร์กึ่งกลางพอดี */}
      <div className="w-full max-w-6xl mx-auto pt-4 sm:pt-8 lg:my-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start lg:items-center">
        
        {/* ==========================================
            ฝั่งซ้าย: ข้อความต้อนรับ (แสดงเฉพาะบน Desktop)
           ========================================== */}
        <div className="hidden lg:flex lg:col-span-7 flex-col justify-center space-y-4 pr-6">
          <h1 className="text-4xl lg:text-[2.85rem] font-bold text-[#1E2B37] tracking-tight leading-[1.2]">
            Book your cleaning service <br />
            <span className="text-slate-800">in just a few clicks.</span>
          </h1>
          <p className="text-base text-slate-500 font-normal max-w-lg leading-relaxed">
            Experience effortless home cleaning with our trusted & background-checked professional maids.
          </p>
        </div>

        {/* ==========================================
            ฝั่งขวา: แบบฟอร์มการ์ด (ปรับขยายความกว้างและระยะห่าง)
           ========================================== */}
        <div className="lg:col-span-5 w-full max-w-lg mx-auto">
          
          <div className="bg-white border-0 sm:border sm:border-slate-200/80 shadow-none sm:shadow-xl sm:shadow-slate-200/50 rounded-none sm:rounded-3xl p-8 sm:p-12 space-y-6 sm:space-y-8">
            
            {/* Header */}
            <div className="space-y-1.5 text-center lg:text-left">
              <h2 className="text-2xl sm:text-3xl font-bold text-[#1E2B37] tracking-tight">Sign In / Register</h2>
              <p className="text-sm text-slate-400">Enter your email to receive an OTP</p>
            </div>

            {/* Form Email */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2 text-left">
                <label className="text-sm font-semibold text-[#1E2B37] px-0.5">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@email.com"
                  required
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-base text-[#1E2B37] placeholder:text-slate-400 focus:outline-none focus:border-[#1E2B37] focus:bg-white transition-all shadow-xs"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-[#1E2B37] hover:bg-[#2c3e50] active:scale-98 disabled:opacity-50 text-white font-semibold rounded-2xl text-base transition-all shadow-md cursor-pointer"
              >
                {isLoading ? 'Sending OTP...' : 'Continue with Email'}
              </button>
            </form>

            {/* Divider */}
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-3 text-xs text-slate-400 font-semibold uppercase tracking-wider">or continue with</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            {/* Social Logins: เรียงลงมาเป็นแนวตั้ง 1-2-3 เต็มความกว้าง */}
            <div className="flex flex-col gap-3 pb-2 sm:pb-0">
              
              {/* Google */}
              <button
                type="button"
                onClick={() => handleSocialLogin('google')}
                className="w-full py-3.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-700 flex items-center justify-center space-x-3 transition cursor-pointer active:scale-98 shadow-xs"
              >
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google</span>
              </button>

              {/* Facebook */}
              <button
                type="button"
                onClick={() => handleSocialLogin('facebook')}
                className="w-full py-3.5 px-4 bg-[#1877F2] hover:bg-[#166FE5] text-white rounded-2xl text-sm font-semibold flex items-center justify-center space-x-3 transition cursor-pointer active:scale-98 shadow-xs"
              >
                <svg className="w-5 h-5 fill-current flex-shrink-0" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span>Continue with Facebook</span>
              </button>

              {/* Apple */}
              <button
                type="button"
                onClick={() => handleSocialLogin('apple')}
                className="w-full py-3.5 px-4 bg-black hover:bg-slate-800 text-white rounded-2xl text-sm font-semibold flex items-center justify-center space-x-3 transition cursor-pointer active:scale-98 shadow-xs"
              >
                <svg className="w-5 h-5 fill-current flex-shrink-0" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.13c.67-.82 1.12-1.96.99-3.13-.97.04-2.14.65-2.83 1.46-.62.72-1.16 1.88-1.01 3.02 1.08.08 2.18-.53 2.85-1.35z" />
                </svg>
                <span>Continue with Apple</span>
              </button>

            </div>

          </div>
        </div>

      </div>

      {/* Footer */}
      <footer className="w-full text-center py-4 max-w-7xl mx-auto">
        <p className="text-xs text-slate-400 font-medium">
          © Getaway Cleaning Service
        </p>
      </footer>

    </main>
  );
}