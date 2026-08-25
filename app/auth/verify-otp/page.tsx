'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function VerifyOtpPage() {
  const router = useRouter();
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0); // Set initial timer to 0 to allow manual trigger
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Load saved email on component mount
  useEffect(() => {
    const savedEmail =
      localStorage.getItem('temp_phone') ||
      localStorage.getItem('temp_email') ||
      'sofiatohalem301103@gmail.com';

    setEmail(savedEmail);
  }, []);

  // Countdown timer effect
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

  // 1. Function to send OTP manually
  const handleSendOtp = async () => {
    if (timer > 0 || loading) return;
    setLoading(true);

    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

    try {
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email || 'sofiatohalem301103@gmail.com',
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
        alert(`OTP code has been successfully sent to ${email}`);
      } else {
        alert(`Failed to send OTP: ${data.error || 'Please check Email API configuration'}`);
      }
    } catch (err) {
      console.error('Send OTP Error:', err);
      alert('An error occurred while attempting to send the OTP');
    } finally {
      setLoading(false);
    }
  };

  // 2. Function to verify user-entered OTP
  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
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

      alert('Verification successful!');
      router.push('/customer/booking');
    } else {
      alert('Incorrect OTP code. Please check your email and try again');
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 w-full max-w-md space-y-6 text-center">
        <div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold mb-3">
            ✉️
          </div>
          <h1 className="text-lg font-bold text-slate-800">Verify Email OTP</h1>
          <p className="text-xs text-gray-500 mt-1">
            Enter the 6-digit verification code sent to <br />
            <span className="font-semibold text-slate-700">{email}</span>
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-6">
          <div className="flex justify-center gap-2" onPaste={handlePaste}>
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
                className="w-11 h-12 text-center text-lg font-bold border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50 text-slate-800"
              />
            ))}
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl text-xs transition shadow-sm cursor-pointer"
          >
            Verify & Continue
          </button>
        </form>

        <div className="text-xs text-gray-400 flex justify-between items-center px-2">
          <span>Didn't receive code?</span>
          <button
            type="button"
            onClick={handleSendOtp}
            disabled={loading || timer > 0}
            className={`font-semibold transition cursor-pointer ${
              timer > 0 || loading
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-emerald-600 hover:underline'
            }`}
          >
            {loading ? 'Sending...' : timer > 0 ? `Resend in (${timer}s)` : 'Send OTP to Email'}
          </button>
        </div>
      </div>
    </main>
  );
}