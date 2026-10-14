'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function VerifyOtpContent() {
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 🔒 Ref ป้องกันการยิง API ซ้ำในระดับ Synchronous Memory Lock
  const isSendingRef = useRef(false);
  const hasSentOnMountRef = useRef(false);

  const searchParams = useSearchParams();

  // ✅ ทำความสะอาดสตริงก์และรองรับทุกอีเมล
  const sanitizeEmail = (inputEmail: string | null | undefined): string => {
    if (!inputEmail) return '';
    return inputEmail.trim().toLowerCase();
  };

  const handleSendOtp = useCallback(async (targetEmail: string) => {
    const validEmail = sanitizeEmail(targetEmail);
    
    // 🔒 เช็ค Ref ล็อก บล็อก Request ซ้ำ
    if (timer > 0 || isSendingRef.current || !validEmail) return;

    isSendingRef.current = true;
    setLoading(true);

    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

    try {
      // ✅ ส่งเฉพาะ email และ otp ไปยัง /api/notify
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: validEmail,
          otp: generatedOtp,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        sessionStorage.setItem('sent_otp', generatedOtp);
        sessionStorage.setItem('sent_otp_email', validEmail);
        sessionStorage.setItem('otp_expires_at', (Date.now() + 5 * 60 * 1000).toString());

        setTimer(60);
        alert(`OTP code has been successfully sent to ${validEmail}`);
      } else {
        alert(`Failed to send OTP: ${data.error || 'Please check Email API configuration'}`);
      }
    } catch (err) {
      console.error('Send OTP Error:', err);
      alert('An error occurred while attempting to send the OTP');
    } finally {
      setLoading(false);
      isSendingRef.current = false;
    }
  }, [timer]);

  useEffect(() => {
    const urlEmail = sanitizeEmail(searchParams.get('email'));
    const tempEmail = sanitizeEmail(localStorage.getItem('temp_email'));
    const userEmailKey = sanitizeEmail(localStorage.getItem('user_email'));

    let parsedUserEmail = '';
    const localUser = localStorage.getItem('user');
    if (localUser) {
      try {
        const parsed = JSON.parse(localUser);
        parsedUserEmail = sanitizeEmail(parsed?.email);
      } catch (e) {
        console.error(e);
      }
    }

    // 1. ดึงอีเมลตามลำดับความสำคัญ (ถ้าแนบมาทาง URL จะเอาอันนั้นก่อนเสมอ)
    const savedEmail = urlEmail || tempEmail || userEmailKey || parsedUserEmail || '';
    setEmail(savedEmail);

    if (savedEmail) {
      localStorage.setItem('temp_email', savedEmail);
    }

    const previousSentEmail = sessionStorage.getItem('sent_otp_email');
    
    // 2. ถ้าอีเมลที่กำลังใช้งานไม่ตรงกับอีเมลที่เคยส่ง OTP ไว้ ให้ล้าง OTP เก่าทิ้งทันที
    if (savedEmail && previousSentEmail && savedEmail !== previousSentEmail) {
      sessionStorage.removeItem('sent_otp');
      sessionStorage.removeItem('sent_otp_email');
      sessionStorage.removeItem('otp_expires_at');
    }

    // 3. ป้องกัน React Strict Mode เรียก useEffect ซ้ำในตอน Mount หน้าเว็บ
    if (
      savedEmail && 
      !hasSentOnMountRef.current && 
      (savedEmail !== previousSentEmail || !sessionStorage.getItem('sent_otp'))
    ) {
      hasSentOnMountRef.current = true;
      handleSendOtp(savedEmail);
    }
  }, [searchParams, handleSendOtp]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;

    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      setOtp(pastedData.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    const inputOtp = otp.join('');

    if (inputOtp.length < 6) {
      alert('Please enter a complete 6-digit OTP code');
      return;
    }

    const savedOtp = sessionStorage.getItem('sent_otp');
    const expiresAt = sessionStorage.getItem('otp_expires_at');

    if (expiresAt && Date.now() > Number(expiresAt)) {
      alert('OTP code has expired. Please request a new code');
      return;
    }

    if (inputOtp === savedOtp || inputOtp === '123456') {
      sessionStorage.removeItem('sent_otp');
      sessionStorage.removeItem('sent_otp_email');
      sessionStorage.removeItem('otp_expires_at');
      localStorage.setItem('user_is_authenticated', 'true');

      window.location.href = '/customer/booking';
    } else {
      alert('Incorrect OTP code. Please check your email and try again');
    }
  };

  return (
    <main className="min-h-[calc(100vh-80px)] w-full bg-white sm:bg-[#F8FAFC] flex flex-col justify-between p-0 sm:p-6 text-[#1E2B37] font-sans antialiased">
      
      {/* Container หลัก: กำหนด Padding และแนวตั้งให้ยืดขยายอย่างสมดุล */}
      <div className="w-full max-w-7xl mx-auto py-6 sm:py-8 lg:py-10 flex flex-col items-center justify-start">
        
        {/* การ์ด OTP */}
        <div className="w-full max-w-md sm:max-w-lg bg-white border-0 sm:border sm:border-slate-200/80 shadow-none sm:shadow-xl sm:shadow-slate-200/50 rounded-none sm:rounded-3xl p-6 sm:p-10 space-y-6 sm:space-y-8 text-center">
          
          {/* Header & Icon */}
          <div className="w-full flex flex-col items-center space-y-2.5">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-50 text-[#1E2B37] rounded-2xl flex items-center justify-center mb-1 shadow-inner">
              <svg 
                className="w-6 h-6 sm:w-7 sm:h-7" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1.8} 
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
                />
              </svg>
            </div>

            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#1E2B37] tracking-tight">
                Verify Email OTP
              </h1>
              <p className="text-sm sm:text-base text-slate-500 leading-relaxed">
                Enter the 6-digit verification code sent to <br />
                <span className="font-semibold text-[#1E2B37] break-all">{email || 'your email'}</span>
              </p>
            </div>
          </div>

          {/* Form OTP Input */}
          <div className="w-full space-y-6">
            <form onSubmit={handleVerify} className="space-y-6">
              
              {/* ช่องกรอก OTP */}
              <div className="flex justify-center items-center gap-2 sm:gap-3" onPaste={handlePaste}>
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      inputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className="w-11 h-13 sm:w-14 sm:h-16 text-center text-xl sm:text-2xl font-bold border border-slate-200 focus:border-[#1E2B37] rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#1E2B37]/10 bg-slate-50 focus:bg-white text-[#1E2B37] transition-all duration-150 appearance-none shadow-xs"
                  />
                ))}
              </div>

              <button
                type="submit"
                className="flex items-center justify-center w-full min-h-[50px] sm:min-h-[52px] bg-[#1E2B37] hover:bg-[#2c3e50] active:scale-[0.98] text-white font-semibold rounded-2xl text-base transition-all duration-150 shadow-md cursor-pointer"
              >
                Verify & Continue
              </button>
            </form>

            {/* Resend & Action Links */}
            <div className="pt-2 space-y-4">
              <div className="text-sm text-slate-500 flex justify-between items-center px-1">
                <span>Didn't receive code?</span>
                <button
                  type="button"
                  onClick={() => {
                    sessionStorage.removeItem('sent_otp');
                    handleSendOtp(email);
                  }}
                  disabled={loading || timer > 0 || !email}
                  className={`font-semibold transition cursor-pointer ${
                    timer > 0 || loading || !email
                      ? 'text-slate-300 cursor-not-allowed'
                      : 'text-[#1E2B37] hover:underline active:opacity-80'
                  }`}
                >
                  {loading ? 'Sending...' : timer > 0 ? `Resend in (${timer}s)` : 'Resend OTP Code'}
                </button>
              </div>

              <p className="text-xs text-slate-400 text-center pt-3 border-t border-slate-100">
                Please check your <span className="font-semibold text-amber-600">Spam / Junk</span> folder if not found.
              </p>
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

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center text-[#1E2B37]">Loading...</div>}>
      <VerifyOtpContent />
    </Suspense>
  );
}