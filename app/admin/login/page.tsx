'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('getawaycleaning.paphos@gmail.com');
  const [password, setPassword] = useState('Paphos2026');
  const [selectedAdmin, setSelectedAdmin] = useState('Zaza');
  const router = useRouter();

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('admin_user', selectedAdmin);
    router.push('/admin/dashboard');
  };

  return (
    <main className="min-h-[100dvh] bg-[#EAF3F9] flex flex-col items-center justify-center p-0 sm:p-4 text-[#1E2B37] font-sans">
      
      {/* Container หลัก */}
      <div className="w-full min-h-[100dvh] sm:min-h-0 sm:max-w-md bg-[#FFFFFF] p-6 sm:p-8 sm:rounded-[32px] shadow-none sm:shadow-xl border-none sm:border border-[#D9D9D9] flex flex-col justify-between sm:justify-center items-center space-y-6">
        
        {/* Header Section */}
        <div className="w-full flex flex-col items-center pt-8 sm:pt-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1E2B37] tracking-tight text-center">
            Admin Login
          </h1>
          <p className="text-xs sm:text-sm text-[#1E1E1E]/60 mt-1.5 text-center font-medium">
            Sign in to manage bookings
          </p>
        </div>

        {/* Form Section */}
        <form onSubmit={handleAdminLogin} className="w-full space-y-5 my-auto sm:my-0">
          
          {/* Select Admin Profile */}
          <div className="text-left">
            <label className="block text-xs font-bold text-[#1E2B37] mb-2">
              Select Admin Profile
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { name: 'Zaza', label: 'Zaza' },
                { name: 'Sam', label: 'Sam' },
                { name: 'Sylvia', label: 'Sylvia' },
              ].map((admin) => (
                <button
                  key={admin.name}
                  type="button"
                  onClick={() => setSelectedAdmin(admin.name)}
                  className={`py-2.5 px-3 text-xs font-bold rounded-full border transition-all duration-150 cursor-pointer flex items-center justify-center select-none ${
                    selectedAdmin === admin.name
                      ? 'bg-[#EAF3F9] border-[#2563EB] text-[#2563EB] shadow-xs'
                      : 'bg-[#EAF3F9]/50 border-[#93C5FD]/60 text-[#1E2B37]/70 hover:bg-[#EAF3F9]'
                  }`}
                >
                  {admin.label}
                </button>
              ))}
            </div>
          </div>

          {/* Admin Email */}
          <div className="text-left">
            <label className="block text-xs font-bold text-[#1E2B37] mb-1.5">
              Admin Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-[#1E2B37]/40 rounded-2xl text-sm bg-[#FFFFFF] text-[#1E2B37] font-medium focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition"
            />
          </div>

          {/* Password */}
          <div className="text-left">
            <label className="block text-xs font-bold text-[#1E2B37] mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-[#1E2B37]/40 rounded-2xl text-sm bg-[#FFFFFF] text-[#1E2B37] font-medium focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full min-h-[50px] bg-[#2563EB] hover:bg-[#006AFF] active:scale-[0.98] text-white font-bold py-3 rounded-full text-sm transition duration-150 shadow-md cursor-pointer flex items-center justify-center select-none"
            >
              Sign In as Admin
            </button>
          </div>
        </form>

        {/* Footer Link */}
        <div className="w-full pb-4 sm:pb-0 text-center">
          <Link 
            href="/admin" 
            className="text-xs text-[#1E2B37]/70 hover:text-[#1E2B37] underline font-medium transition"
          >
            ← Back to Customer Site
          </Link>
        </div>

      </div>
    </main>
  );
}