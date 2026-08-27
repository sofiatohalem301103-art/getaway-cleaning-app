'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedAdmin, setSelectedAdmin] = useState('zaza');
  const router = useRouter();

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (email === 'info@getaway-homes.com' && password === '123456') {
      localStorage.setItem('admin_user', selectedAdmin);
      router.push('/admin/dashboard');
    } else {
      alert('Invalid Admin email or password.');
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-black">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 w-full max-w-sm">
        <h1 className="text-xl font-bold text-indigo-900 mb-2 text-center">Admin Login</h1>
        <p className="text-xs text-gray-500 mb-6 text-center">Sign in to manage bookings</p>

        <form onSubmit={handleAdminLogin} className="space-y-4">
          {/* ตัวเลือก Admin (zaza / sam / sylvia) */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Select Admin Profile</label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedAdmin('zaza')}
                className={`py-2 px-2 text-xs font-bold rounded-lg border transition flex items-center justify-center gap-1 cursor-pointer ${
                  selectedAdmin === 'zaza'
                    ? 'bg-indigo-50 border-indigo-600 text-indigo-700'
                    : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                }`}
              >
                👱‍♀️ zaza
              </button>

              <button
                type="button"
                onClick={() => setSelectedAdmin('sam')}
                className={`py-2 px-2 text-xs font-bold rounded-lg border transition flex items-center justify-center gap-1 cursor-pointer ${
                  selectedAdmin === 'sam'
                    ? 'bg-indigo-50 border-indigo-600 text-indigo-700'
                    : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                }`}
              >
                👨‍💼 sam
              </button>

              <button
                type="button"
                onClick={() => setSelectedAdmin('sylvia')}
                className={`py-2 px-2 text-xs font-bold rounded-lg border transition flex items-center justify-center gap-1 cursor-pointer ${
                  selectedAdmin === 'sylvia'
                    ? 'bg-indigo-50 border-indigo-600 text-indigo-700'
                    : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                }`}
              >
                👩‍💼 sylvia
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Admin Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm text-black focus:outline-indigo-600"
              placeholder="info@getaway-homes.com"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm text-black focus:outline-indigo-600"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white font-medium py-2.5 rounded-xl hover:bg-indigo-700 transition text-sm cursor-pointer"
          >
            Sign In as Admin
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link href="/admin" className="text-xs text-gray-500 hover:underline">
            ← Back to Portal Selection
          </Link>
        </div>
      </div>
    </main>
  );
}