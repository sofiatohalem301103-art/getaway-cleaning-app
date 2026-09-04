'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

function PaymentOptionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ดึงค่าจาก Query String
  const room = searchParams.get('room') || '';
  const date = searchParams.get('date') || '';
  const time = searchParams.get('time') || '';
  const program = searchParams.get('program') || '';
  const price = searchParams.get('price') || '70€';

  // เก็บค่าช่องทางที่ผู้ใช้เลือก ('card' หรือ 'bank')
  const [selectedMethod, setSelectedMethod] = useState<'card' | 'bank'>('card');

  const handleNext = () => {
    const query = new URLSearchParams({
      room,
      date,
      time,
      program,
      price,
    }).toString();

    if (selectedMethod === 'card') {
      router.push(`/customer/cardpayment?${query}`);
    } else {
      router.push(`/customer/banktransfer?${query}`);
    }
  };

  return (
    <div className="w-full min-h-[100dvh] sm:min-h-0 sm:max-w-md bg-white p-5 sm:p-6 rounded-none sm:rounded-[32px] shadow-none sm:shadow-sm border-0 sm:border border-slate-100 flex flex-col justify-between items-center relative overflow-y-auto my-auto">
      
      {/* Header Section */}
      <div className="w-full relative shrink-0">
        {/* Logo Section */}
        <div className="w-full flex justify-center pt-6 sm:pt-4 pb-1">
          <Image
            src="/logo.jpeg"
            alt="Getaway Cleaning"
            width={160}
            height={65}
            className="object-contain max-h-[60px] w-auto"
            priority
          />
        </div>

        {/* Title */}
        <h2 className="text-base font-bold text-[#1E2B37] text-center mt-3">
          Select Payment
        </h2>
      </div>

      {/* Form Body */}
      <div className="w-full flex-1 flex flex-col justify-between py-5 space-y-4 my-auto shrink-0">
        <div className="space-y-4 my-auto">
          {/* Total Amount Summary - ปรับเป็นสีเทาอ่อน */}
          <div className="w-full bg-slate-100 border border-slate-200 rounded-2xl p-3.5 text-center">
            <span className="text-xs text-[#1E2B37] font-medium">Total Amount: </span>
            <span className="text-base font-bold text-[#1E2B37]">{price}</span>
          </div>

          {/* Payment Options Selection - สีฟ้าอ่อน */}
          <div className="w-full space-y-3">
            {/* Option 1: Credit / Debit Card */}
            <label
              onClick={() => setSelectedMethod('card')}
              className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition touch-manipulation ${
                selectedMethod === 'card'
                  ? 'border-[#93C5FD] bg-[#EAF3F9] ring-1 ring-[#93C5FD]'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-[#1E2B37] flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-[#1E2B37]">Credit / Debit Card</p>
                  <p className="text-[11px] text-slate-500">Pay securely with Visa, Mastercard</p>
                </div>
              </div>
              <input
                type="radio"
                name="payment_method"
                checked={selectedMethod === 'card'}
                onChange={() => setSelectedMethod('card')}
                className="accent-[#1E2B37] w-4 h-4 cursor-pointer shrink-0"
              />
            </label>

            {/* Option 2: Bank Transfer */}
            <label
              onClick={() => setSelectedMethod('bank')}
              className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition touch-manipulation ${
                selectedMethod === 'bank'
                  ? 'border-[#93C5FD] bg-[#EAF3F9] ring-1 ring-[#93C5FD]'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-[#1E2B37] flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM2 22h19v-3H2v3zm14-12v7h3v-7h-3zm-4.5-9L2 6v2h19V6l-9.5-5z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-[#1E2B37]">Bank Transfer</p>
                  <p className="text-[11px] text-slate-500">Alpha Bank & upload slip</p>
                </div>
              </div>
              <input
                type="radio"
                name="payment_method"
                checked={selectedMethod === 'bank'}
                onChange={() => setSelectedMethod('bank')}
                className="accent-[#1E2B37] w-4 h-4 cursor-pointer shrink-0"
              />
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2.5 min-h-[44px] bg-[#D9D9D9] hover:bg-slate-300 active:bg-slate-400 text-[#1E2B37] font-semibold rounded-2xl text-sm transition duration-150 cursor-pointer touch-manipulation"
          >
            ← Back
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="px-8 py-2.5 min-h-[44px] bg-[#1E2B37] hover:bg-slate-800 active:bg-slate-900 active:scale-[0.98] text-white font-semibold rounded-2xl text-sm transition duration-150 cursor-pointer touch-manipulation"
          >
            Continue
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full pt-2 pb-1 text-center shrink-0">
        <p className="text-[11px] text-slate-400">
          © Getaway Cleaning Service
        </p>
      </div>

    </div>
  );
}

export default function PaymentPage() {
  return (
    <main className="w-full min-h-[100dvh] bg-white sm:bg-[#f8fafc] flex flex-col items-center justify-center p-0 sm:p-4 text-slate-800 font-sans overflow-x-hidden">
      <Suspense fallback={<div className="text-xs text-slate-500 p-4">Loading payment options...</div>}>
        <PaymentOptionsContent />
      </Suspense>
    </main>
  );
}