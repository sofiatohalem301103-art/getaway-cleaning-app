'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // เงื่อนไขการตรวจสอบ
  const hasMinLength = newPassword.length >= 8;
  const hasUpperCase = /[A-Z]/.test(newPassword);
  const isMatching = newPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasMinLength || !hasUpperCase) {
      alert('Please satisfy all password requirements.');
      return;
    }

    if (!isMatching) {
      alert('Passwords do not match.');
      return;
    }

    alert('Password updated successfully! Please verify your account.');
    // เติม / ด้านหน้า เพื่อให้เป็น Absolute Path
    router.push('/staff/verify-otp');
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

        {/* Title */}
        <h1 className="text-2xl font-bold text-slate-800 mb-1 text-center">
          Set New Password
        </h1>
        <p className="text-xs text-gray-400 mb-6 text-center">
          This is your first login. Please set a new password.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col space-y-4">
          
          {/* Password Requirements Checklist */}
          <div className="p-3 bg-gray-50 rounded-xl space-y-1.5 text-xs border border-gray-100">
            <p className="font-semibold text-gray-500 mb-1">Password must contain:</p>
            
            <div className={`flex items-center space-x-2 ${hasMinLength ? 'text-emerald-600 font-medium' : 'text-gray-400'}`}>
              <span>{hasMinLength ? '✓' : '○'}</span>
              <span>At least 8 characters</span>
            </div>

            <div className={`flex items-center space-x-2 ${hasUpperCase ? 'text-emerald-600 font-medium' : 'text-gray-400'}`}>
              <span>{hasUpperCase ? '✓' : '○'}</span>
              <span>At least one uppercase letter (A-Z)</span>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              New Password
            </label>
            <div className="relative w-full flex items-center">
              <input
                type={showNewPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 pr-11 text-sm border border-gray-300 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition bg-white text-gray-800"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 text-gray-400 hover:text-gray-600 focus:outline-none p-1"
              >
                {showNewPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.018 10.018 0 014.222-1.063c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21M3 3l18 18" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Confirm New Password
            </label>
            <div className="relative w-full flex items-center">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 pr-11 text-sm border border-gray-300 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition bg-white text-gray-800"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 text-gray-400 hover:text-gray-600 focus:outline-none p-1"
              >
                {showConfirmPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.018 10.018 0 014.222-1.063c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21M3 3l18 18" />
                  </svg>
                )}
              </button>
            </div>
            {confirmPassword.length > 0 && (
              <p className={`text-[11px] mt-1 ${isMatching ? 'text-emerald-600' : 'text-rose-500'}`}>
                {isMatching ? '✓ Passwords match' : '✕ Passwords do not match'}
              </p>
            )}
          </div>

          {/* Save Button */}
          <button
            type="submit"
            disabled={!hasMinLength || !hasUpperCase || !isMatching}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-semibold rounded-xl text-sm transition shadow-sm mt-2 cursor-pointer disabled:cursor-not-allowed"
          >
            Save Password & Continue
          </button>
        </form>

      </div>
    </main>
  );
}