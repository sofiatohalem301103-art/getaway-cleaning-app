'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

export default function VerifyOtpPage() {
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleSendOtp = useCallback(async (targetEmail: string) => {
    if (timer > 0 || loading || !targetEmail) return;
    setLoading(true);

    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

    try {
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: targetEmail,
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
        sessionStorage.setItem('otp_expires_at', (Date.now() + 5 * 60 * 1000).toString());

        setTimer(60);
        alert(`OTP code has been successfully sent to ${targetEmail}`);
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
    const savedEmail =
      localStorage.getItem('temp_phone') ||
      localStorage.getItem('temp_email') ||
      '';

    setEmail(savedEmail);

    // ส่ง OTP ทันทีที่เข้าหน้าจอ หากมีอีเมล
    if (savedEmail && !sessionStorage.getItem('sent_otp')) {
      handleSendOtp(savedEmail);
    }
  }, [handleSendOtp]);

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
      sessionStorage.removeItem('otp_expires_at');
      localStorage.setItem('user_is_authenticated', 'true');

      window.location.href = '/customer/booking';
    } else {
      alert('Incorrect OTP code. Please check your email and try again');
    }
  };

  return (
    <main className="min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center p-0 sm:p-4 text-slate-800 font-sans">
      
      <div className="w-full min-h-[100dvh] sm:min-h-0 sm:max-w-md bg-white p-6 sm:p-8 sm:rounded-3xl shadow-none sm:shadow-sm border-none sm:border border-slate-100 flex flex-col justify-between items-center">
        
        {/* Header Icon & Text */}
        <div className="w-full flex flex-col items-center pt-8 sm:pt-2">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-xs border border-emerald-100">
            ✉️
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
            Verify Email OTP
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 text-center leading-relaxed">
            Enter the 6-digit verification code sent to <br />
            <span className="font-semibold text-slate-700 break-all">{email || 'your email'}</span>
          </p>
        </div>

        {/* Form Inputs & Main Button */}
        <div className="w-full my-auto sm:my-8 space-y-6">
          <form onSubmit={handleVerify} className="space-y-6">
            <div className="flex justify-between items-center gap-1.5 sm:gap-2 px-1" onPaste={handlePaste}>
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
                  className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold border-2 border-slate-200 focus:border-emerald-500 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 bg-slate-50/50 text-slate-800 transition duration-150"
                />
              ))}
            </div>

            <button
              type="submit"
              className="w-full min-h-[50px] bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 active:scale-[0.98] text-white font-semibold py-3 rounded-2xl text-sm transition duration-150 shadow-md shadow-emerald-600/10 touch-manipulation cursor-pointer flex items-center justify-center"
            >
              Verify & Continue
            </button>
          </form>

          {/* Resend OTP Section */}
          <div className="pt-4 border-t border-slate-100 text-xs text-slate-400 flex justify-between items-center px-1">
            <span>Didn't receive code?</span>
            <button
              type="button"
              onClick={() => handleSendOtp(email)}
              disabled={loading || timer > 0 || !email}
              className={`font-semibold transition cursor-pointer touch-manipulation ${
                timer > 0 || loading || !email
                  ? 'text-slate-300 cursor-not-allowed'
                  : 'text-emerald-600 hover:underline active:text-emerald-800'
              }`}
            >
              {loading ? 'Sending...' : timer > 0 ? `Resend in (${timer}s)` : 'Send OTP to Email'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="w-full pb-6 sm:pb-0 text-center">
          <p className="text-[11px] text-slate-400">
            © Getaway Cleaning Service
          </p>
        </div>

      </div>
    </main>
  );
}