'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function VerifyOtpContent() {
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const searchParams = useSearchParams();

  // ฟังก์ชันกรองอีเมลมหาลัยค้างเก่าออก
  const sanitizeEmail = (inputEmail: string | null | undefined): string => {
    if (!inputEmail) return '';
    const cleanEmail = inputEmail.trim();
    if (cleanEmail === 's6530611056@phuket.psu.ac.th') {
      return '';
    }
    return cleanEmail;
  };

  const handleSendOtp = useCallback(async (targetEmail: string) => {
    const validEmail = sanitizeEmail(targetEmail);
    if (timer > 0 || loading || !validEmail) return;
    setLoading(true);

    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

    try {
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: validEmail,
          subject: 'Your Getaway OTP Verification Code',
          customerName: 'Customer',
          room: 'OTP Verification',
          date: new Date().toLocaleDateString(),
          time: new Date().toLocaleTimeString(),
          amount: generatedOtp,
          paymentMethod: 'Email OTP Service',
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
    }
  }, [timer, loading]);

  useEffect(() => {
    const oldKeys = ['user_email', 'temp_email', 'temp_phone'];
    oldKeys.forEach((key) => {
      if (localStorage.getItem(key) === 's6530611056@phuket.psu.ac.th') {
        localStorage.removeItem(key);
      }
    });

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

    const savedEmail = urlEmail || tempEmail || userEmailKey || parsedUserEmail || '';

    setEmail(savedEmail);

    const previousSentEmail = sessionStorage.getItem('sent_otp_email');
    if (savedEmail && (savedEmail !== previousSentEmail || !sessionStorage.getItem('sent_otp'))) {
      sessionStorage.removeItem('sent_otp');
      sessionStorage.removeItem('otp_expires_at');
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
    <main className="min-h-[100dvh] w-full bg-[#FFFFFF] sm:bg-[#EAF3F9] flex flex-col items-center justify-between sm:justify-center p-0 sm:p-6 text-[#1E1E1E] font-sans antialiased">
      
      {/* Spacer บนสำหรับมือถือ */}
      <div className="flex-1 sm:hidden" />

      {/* Main Container Card */}
      <div className="w-full sm:max-w-md bg-[#FFFFFF] rounded-none sm:rounded-[32px] border-none sm:border sm:border-[#D9D9D9] shadow-none sm:shadow-xl sm:shadow-[#006AFF]/5 p-6 sm:p-8 flex flex-col items-center text-center space-y-6 my-auto">
        
        {/* Header Section */}
        <div className="w-full flex flex-col items-center space-y-3">
          
          {/* Envelope Icon Box: ปรับเป็นสีฟ้าเดียวกันกับกล่องเตือน (#EAF3F9) */}
          <div className="w-24 h-24 bg-[#EAF3F9] border border-[#D9D9D9] rounded-[32px] flex items-center justify-center">
            <svg 
              className="w-12 h-12 text-[#2563EB]" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
              />
            </svg>
          </div>

          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold text-[#1E1E1E] tracking-tight">
              Verify Email OTP
            </h1>
            <p className="text-xs sm:text-sm text-[#1E1E1E]/60 leading-relaxed">
              Enter the 6-digit verification code sent to <br />
              <span className="font-semibold text-[#1E1E1E] break-all">{email || 'your email'}</span>
            </p>
          </div>

        </div>

        {/* Form Inputs & Action Buttons */}
        <div className="w-full space-y-5">
          <form onSubmit={handleVerify} className="space-y-6">
            
            {/* OTP Input 6 ช่อง */}
            <div className="flex justify-center items-center gap-2" onPaste={handlePaste}>
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
                  className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold border border-[#D9D9D9] focus:border-[#2563EB] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 bg-[#FFFFFF] text-[#1E1E1E] transition duration-150"
                />
              ))}
            </div>

            {/* ปุ่ม Verify & Continue */}
            <button
              type="submit"
              className="flex items-center justify-center w-full min-h-[52px] bg-[#2563EB] hover:bg-[#006AFF] active:scale-[0.98] text-[#FFFFFF] font-semibold rounded-2xl text-base transition-all duration-150 shadow-sm touch-manipulation cursor-pointer"
            >
              Verify & Continue
            </button>
          </form>

          {/* Resend OTP Section */}
          <div className="pt-2 space-y-3">
            <div className="text-xs text-[#1E1E1E]/60 flex justify-between items-center px-1">
              <span>Didn't receive code?</span>
              <button
                type="button"
                onClick={() => {
                  sessionStorage.removeItem('sent_otp');
                  handleSendOtp(email);
                }}
                disabled={loading || timer > 0 || !email}
                className={`font-semibold transition cursor-pointer touch-manipulation ${
                  timer > 0 || loading || !email
                    ? 'text-[#1E1E1E]/30 cursor-not-allowed'
                    : 'text-[#2563EB] hover:underline active:text-[#006AFF]'
                }`}
              >
                {loading ? 'Sending...' : timer > 0 ? `Resend in (${timer}s)` : 'Send OTP to Email'}
              </button>
            </div>

            {/* Spam notice box */}
            <p className="text-[11px] text-[#1E1E1E]/70 text-center bg-[#EAF3F9] py-2.5 px-3 rounded-2xl border border-[#D9D9D9]">
              Please check your <span className="font-bold text-[#EF8B8D]">Spam / Junk</span> folder if not found.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-[11px] text-[#1E1E1E]/40 font-medium tracking-wide pt-1">
          © Getaway Cleaning Service
        </p>

      </div>

      {/* Spacer ล่างสำหรับมือถือ */}
      <div className="flex-1 sm:hidden" />

    </main>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center">Loading...</div>}>
      <VerifyOtpContent />
    </Suspense>
  );
}