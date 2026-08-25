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
    // บันทึกข้อมูลลง localStorage สำหรับดึงไปใช้ต่อในหน้า OTP และ Profile
    localStorage.setItem('temp_phone', formData.phone);
    localStorage.setItem('user_profile', JSON.stringify(formData));
    
    router.push('/auth/verify-otp'); // เติม / นำหน้า
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 w-full max-w-md">
        
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <Image 
            src="/logo.jpeg" 
            alt="Company Logo" 
            width={120} 
            height={120} 
            className="object-contain w-auto h-auto"
            priority
          />
        </div>

        <h2 className="text-xl font-bold text-gray-800 text-center mb-6">
          Register
        </h2>

        <form onSubmit={handleRegister} className="space-y-3.5">
          {/* Name & Surname */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Name</label>
              <input 
                type="text"
                name="name"
                required
                placeholder="Name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition text-gray-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Surname</label>
              <input 
                type="text"
                name="surname"
                required
                placeholder="Surname"
                value={formData.surname}
                onChange={handleChange}
                className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition text-gray-800"
              />
            </div>
          </div>

          {/* E-mail */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">E-mail</label>
            <input 
              type="email"
              name="email"
              required
              placeholder="e.g. name@email.com"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition text-gray-800"
            />
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Phone Number</label>
            <input 
              type="tel"
              name="phone"
              required
              placeholder="e.g. 0812345678"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition text-gray-800"
            />
          </div>

          {/* Age & Sex */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Age</label>
              <input 
                type="number"
                name="age"
                required
                placeholder="Age"
                min="1"
                value={formData.age}
                onChange={handleChange}
                className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition text-gray-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Sex</label>
              <select
                name="sex"
                required
                value={formData.sex}
                onChange={handleChange}
                className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition bg-white text-gray-800 cursor-pointer"
              >
                <option value="">Select Sex</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button 
              type="button" 
              onClick={() => router.push('/auth/login')} // แก้เป็น /auth/login
              className="flex-1 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 font-semibold py-2.5 border border-gray-300 rounded-xl text-sm transition active:scale-95 duration-150 cursor-pointer"
            >
              Back
            </button>

            <button 
              type="submit" 
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl text-sm transition shadow-sm active:scale-95 duration-150 cursor-pointer"
            >
              Register
            </button>
          </div>
        </form>

      </div>
    </main>
  );
}