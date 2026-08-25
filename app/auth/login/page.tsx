'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LoginPage() {
  const [contact, setContact] = useState('');
  const router = useRouter();

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (contact) {
      localStorage.setItem('temp_phone', contact); // บันทึกข้อมูลเพื่อนำไปใช้ต่อในหน้า OTP
      router.push('/auth/verify-otp'); // เติม / ข้างหน้า
    }
  };

  const handleSignUp = () => {
    router.push('/auth/register'); // เติม / ข้างหน้า
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 w-full max-w-sm">
        
        {/* Company Logo */}
        <div className="flex justify-center mb-6">
          <Image 
            src="/logo.jpeg" 
            alt="Company Logo" 
            width={120} 
            height={120} 
            className="object-contain w-auto h-auto"
            priority
          />
        </div>

        <h2 className="text-xl font-bold text-gray-800 text-center mb-1">
          Sign In
        </h2>
        <p className="text-xs text-gray-400 text-center mb-6">
          Enter your email or phone number to continue
        </p>

        <form onSubmit={handleNext} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Email or Phone Number
            </label>
            <input 
              type="text" 
              required
              placeholder="Your Email or Phone Number"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-xl text-sm transition shadow-sm cursor-pointer"
          >
            Next
          </button>
        </form>

        {/* Divider & Sign Up Button */}
        <div className="mt-6 pt-6 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-500 mb-3">
            Don't have an account?
          </p>
          <button
            type="button"
            onClick={handleSignUp}
            className="w-full bg-white hover:bg-gray-50 text-emerald-600 font-semibold py-2.5 border border-emerald-600 rounded-xl text-sm transition cursor-pointer"
          >
            Create New Account
          </button>
        </div>

      </div>
    </main>
  );
}