'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    email: '',
    phone: '',
    age: '',
    sex: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. ซ่อนคีย์บอร์ดมือถือทันทีเมื่อกดปุ่ม
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    // 2. บันทึกข้อมูลลง localStorage
    localStorage.setItem('temp_phone', formData.phone);
    localStorage.setItem('temp_email', formData.email);
    localStorage.setItem('user_profile', JSON.stringify(formData));

    // 3. หน่วงเวลาเล็กน้อยก่อนเปลี่ยนหน้า
    setTimeout(() => {
      router.push('/auth/verify-otp');
    }, 100);
  };

  return (
    <main className="min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center p-4 text-slate-800 font-sans">
      
      {/* Container หลัก: ปรับโครงสร้างระยะห่างให้อยู่ตรงกลางอย่างสมดุล */}
      <div className="w-full max-w-md bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center my-auto">
        
        {/* Header & Logo (คืนค่าขนาด Logo เท่าเดิม) */}
        <div className="w-full flex flex-col items-center mb-5">
          <div className="mb-2">
            <Image 
              src="/logo.jpeg" 
              alt="Company Logo" 
              width={130} 
              height={130} 
              className="object-contain"
              style={{ width: 'auto', height: 'auto' }}
              priority
            />
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
            Register
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5 text-center">
            Create an account to get started
          </p>
        </div>

        {/* Form Inputs & Action Buttons */}
        <div className="w-full">
          <form onSubmit={handleRegister} className="space-y-3">
            
            {/* Name & Surname */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Name
                </label>
                <input 
                  type="text"
                  name="name"
                  required
                  placeholder="Name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition duration-150 text-slate-800 placeholder:text-slate-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Surname
                </label>
                <input 
                  type="text"
                  name="surname"
                  required
                  placeholder="Surname"
                  value={formData.surname}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition duration-150 text-slate-800 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* E-mail */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                E-mail
              </label>
              <input 
                type="email"
                name="email"
                required
                placeholder="e.g. name@email.com"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition duration-150 text-slate-800 placeholder:text-slate-400"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Phone Number
              </label>
              <input 
                type="tel"
                name="phone"
                required
                placeholder="e.g. 0812345678"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition duration-150 text-slate-800 placeholder:text-slate-400"
              />
            </div>

            {/* Age & Sex */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Age
                </label>
                <input 
                  type="number"
                  name="age"
                  required
                  placeholder="Age"
                  min="1"
                  value={formData.age}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition duration-150 text-slate-800 placeholder:text-slate-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Sex
                </label>
                <select
                  name="sex"
                  required
                  value={formData.sex}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition duration-150 text-slate-800 cursor-pointer"
                >
                  <option value="" disabled hidden>Select Sex</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-3">
              <button 
                type="button" 
                onClick={() => router.push('/auth/login')}
                className="flex-1 h-11 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 active:scale-[0.98] text-slate-700 font-semibold rounded-2xl text-sm transition duration-150 touch-manipulation cursor-pointer flex items-center justify-center"
              >
                Back
              </button>

              <button 
                type="submit" 
                className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 active:scale-[0.98] text-white font-semibold rounded-2xl text-sm transition duration-150 shadow-md shadow-emerald-600/10 touch-manipulation cursor-pointer flex items-center justify-center"
              >
                Register
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="w-full pt-5 text-center">
          <p className="text-[11px] text-slate-400">
            © Getaway Cleaning Service
          </p>
        </div>

      </div>
    </main>
  );
}