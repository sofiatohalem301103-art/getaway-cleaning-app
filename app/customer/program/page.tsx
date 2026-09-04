'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

function SelectProgramContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Query Parameters
  const room = searchParams.get('room') || '';
  const date = searchParams.get('date') || '';
  const time = searchParams.get('time') || '';

  const [selectedProgram, setSelectedProgram] = useState<string>('general');

  const programs = [
    { id: 'general', title: 'General cleaning', subtitle: '', price: '70€' },
    {
      id: 'turnover',
      title: 'Turn over Cleaning',
      subtitle: '(Cleaning& change all sheets and towels)',
      price: '120€',
    },
  ];

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    const programObj = programs.find((p) => p.id === selectedProgram);

    // ส่งเฉพาะข้อมูลที่จำเป็นเพื่อนำไปยืนยันในหน้าสุดท้าย
    const query = new URLSearchParams({
      room,
      date,
      time,
      program: programObj?.title || 'General cleaning',
      price: programObj?.price || '70€',
    }).toString();

    router.push(`/customer/payment?${query}`);
  };

  return (
    <div className="w-full min-h-[100dvh] sm:min-h-0 sm:max-w-md bg-white p-6 sm:p-8 rounded-none sm:rounded-[40px] shadow-none sm:shadow-sm border-0 sm:border border-slate-100 flex flex-col justify-between items-center relative overflow-y-auto my-auto">
      
      {/* Header Section */}
      <div className="w-full relative shrink-0">
        {/* Logo Section */}
        <div className="w-full flex justify-center pt-6 sm:pt-4 pb-2">
          <Image
            src="/logo.jpeg"
            alt="Getaway Cleaning"
            width={160}
            height={65}
            className="object-contain max-h-[65px] w-auto"
            priority
          />
        </div>

        {/* Title */}
        <h2 className="text-base font-bold text-[#1E2B37] text-center mt-3">
          Select The Program
        </h2>
      </div>

      {/* Form Options */}
      <form onSubmit={handleNext} className="w-full flex-1 flex flex-col justify-between py-6 space-y-6 my-auto shrink-0">
        
        <div className="space-y-4 my-auto">
          {programs.map((item) => {
            const isSelected = selectedProgram === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedProgram(item.id)}
                className={`w-full py-6 px-5 rounded-[32px] border-2 text-center transition flex flex-col items-center justify-center cursor-pointer touch-manipulation ${
                  isSelected
                    ? 'border-[#B8D7ED] bg-[#EAF3F9] shadow-xs'
                    : 'border-[#B8D7ED]/50 bg-[#EAF3F9]/40 hover:bg-[#EAF3F9]'
                }`}
              >
                <span className="text-sm font-bold text-[#1E2B37]">
                  {item.title}
                </span>
                {item.subtitle && (
                  <span className="text-[12px] text-[#1E2B37]/80 font-medium mt-0.5">
                    {item.subtitle}
                  </span>
                )}
                <span className="text-sm font-bold text-[#1E2B37] mt-1">
                  {item.price}
                </span>
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center gap-4 pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2.5 min-h-[42px] bg-[#B8D7ED]/60 hover:bg-[#B8D7ED] active:bg-[#a1c8e5] text-[#1E2B37] font-medium rounded-2xl text-xs transition duration-150 cursor-pointer touch-manipulation"
          >
            ← Back
          </button>

          <button
            type="submit"
            className="px-8 py-2.5 min-h-[42px] bg-[#1E2B37] hover:bg-[#2c3d4e] active:bg-[#121b23] active:scale-[0.98] text-white font-medium rounded-2xl text-xs transition duration-150 cursor-pointer touch-manipulation shadow-md"
          >
            Next
          </button>
        </div>
      </form>

      {/* Footer */}
      <div className="w-full pt-2 pb-1 text-center shrink-0">
        <p className="text-[11px] text-[#1E2B37]/60 font-medium">
          © Getaway Cleaning Service
        </p>
      </div>

    </div>
  );
}

export default function SelectProgramPage() {
  return (
    <main className="w-full min-h-[100dvh] bg-white sm:bg-[#f8fafc] flex flex-col items-center justify-center p-0 sm:p-4 text-[#1E2B37] font-sans overflow-x-hidden">
      <Suspense fallback={<div className="text-xs text-slate-500 p-4">Loading...</div>}>
        <SelectProgramContent />
      </Suspense>
    </main>
  );
}