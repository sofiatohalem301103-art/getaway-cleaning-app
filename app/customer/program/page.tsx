'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

function SelectProgramContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 1. ดึงค่าจากหน้า Booking มาเตรียมไว้
  const room = searchParams.get('room') || '';
  const date = searchParams.get('date') || '';
  const time = searchParams.get('time') || '';

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<string>('general');

  const user = { name: 'Sofia Ross', email: 'sofia.ross@example.com' };

  const programs = [
    { id: 'general', title: 'General cleaning', subtitle: '', price: '90€' },
    { id: 'turnover', title: 'Turn over Cleaning', subtitle: '(Cleaning & change all sheets and towels)', price: '150€' }
  ];

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    const programObj = programs.find((p) => p.id === selectedProgram);

    // 2. ส่งค่าทั้งหมดต่อไปยังหน้า Payment ผ่าน Query String
    const query = new URLSearchParams({
      room,
      date,
      time,
      program: programObj?.title || 'General cleaning',
      price: programObj?.price || '90€',
    }).toString();

    router.push(`/customer/payment?${query}`);
  };

  const handleLogout = () => {
    // 🛠️ แก้ไข: ลบ Session และส่งกลับไปหน้า Booking (แทนที่จะไป /login)
    localStorage.removeItem('temp_booking');
    router.push('/customer/booking');
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 w-full max-w-md relative flex flex-col items-center">
      {/* Profile */}
      <div className="absolute top-4 right-4 z-10">
        <button
          type="button"
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          className="flex items-center gap-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition cursor-pointer"
        >
          <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
            {user.name.charAt(0)}
          </div>
          <span>Profile</span>
        </button>

        {showProfileMenu && (
          <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-left z-20">
            <div className="border-b border-gray-100 pb-2 mb-2">
              <p className="text-xs font-bold text-gray-800">{user.name}</p>
              <p className="text-[11px] text-gray-500 truncate">{user.email}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full text-left text-xs font-medium text-red-600 hover:bg-red-50 p-1.5 rounded-md transition cursor-pointer"
            >
              Log out
            </button>
          </div>
        )}
      </div>

      {/* Logo */}
      <div className="flex justify-center mb-6 pt-2">
        <Image src="/logo.jpeg" alt="Logo" width={120} height={120} className="object-contain w-auto h-auto" priority />
      </div>

      <h2 className="text-lg font-bold text-gray-800 mb-6 text-center">Select The Program</h2>

      <form onSubmit={handleNext} className="w-full space-y-4">
        <div className="space-y-4">
          {programs.map((item) => {
            const isSelected = selectedProgram === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedProgram(item.id)}
                className={`w-full p-4 rounded-xl border text-center transition flex flex-col items-center justify-center cursor-pointer ${
                  isSelected ? 'border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-500' : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
              >
                <span className="text-xs font-bold text-gray-800">{item.title}</span>
                {item.subtitle && <span className="text-[10px] text-gray-500 mt-0.5">{item.subtitle}</span>}
                <span className="text-xs font-bold text-gray-800 mt-1">{item.price}</span>
              </button>
            );
          })}
        </div>

        {/* 🛠️ เพิ่มปุ่ม Back คู่กับ ปุ่ม Next */}
        <div className="flex justify-between items-center pt-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold rounded-lg text-xs transition cursor-pointer"
          >
            ← Back
          </button>
          
          <button 
            type="submit" 
            className="px-6 py-2 bg-[#3d4d5c] hover:bg-[#2c3844] text-white font-semibold rounded-lg text-xs transition cursor-pointer shadow-sm"
          >
            Next
          </button>
        </div>
      </form>
    </div>
  );
}

export default function SelectProgramPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 relative">
      <Suspense fallback={<div className="text-xs text-gray-500">Loading...</div>}>
        <SelectProgramContent />
      </Suspense>
    </main>
  );
}