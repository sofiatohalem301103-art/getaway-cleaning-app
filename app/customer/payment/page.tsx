'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

function PaymentOptionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ดึงค่า Booking Details จาก Query String
  const room = searchParams.get('room') || '';
  const date = searchParams.get('date') || '';
  const time = searchParams.get('time') || '';
  const program = searchParams.get('program') || '';
  const price = searchParams.get('price') || '90€';

  // เก็บค่าช่องทางที่ผู้ใช้เลือก ('bank' หรือ 'card')
  const [selectedMethod, setSelectedMethod] = useState<'bank' | 'card'>('card');

  const handleNext = () => {
    // สร้าง Query Params ส่งต่อไปยังหน้าถัดไป
    const query = new URLSearchParams({
      room,
      date,
      time,
      program,
      price,
    }).toString();

    if (selectedMethod === 'card') {
      // พาไปหน้ากรอกบัตร
      router.push(`/customer/cardpayment?${query}`);
    } else {
      // พาไปหน้าโอนธนาคาร (Alpha Bank)
      router.push(`/customer/banktransfer?${query}`);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 w-full max-w-md relative flex flex-col items-center">
      {/* Logo */}
      <div className="flex justify-center mb-4 pt-2">
        <Image src="/logo.jpeg" alt="Logo" width={100} height={100} className="object-contain" priority />
      </div>

      <h2 className="text-lg font-bold text-gray-800 mb-1 text-center">Select Payment Method</h2>
      <p className="text-xs text-gray-500 mb-6 text-center">Please choose how you would like to pay.</p>

      {/* Transfer Amount Summary */}
      <div className="w-full bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3 mb-6 text-center">
        <span className="text-xs text-emerald-800 font-medium">Total Amount: </span>
        <span className="text-base font-bold text-emerald-700">{price}</span>
      </div>

      {/* Payment Options Selection */}
      <div className="w-full space-y-3 mb-6">
        {/* Option 1: Credit / Debit Card */}
        <label
          onClick={() => setSelectedMethod('card')}
          className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition ${
            selectedMethod === 'card'
              ? 'border-emerald-600 bg-emerald-50/30 ring-1 ring-emerald-600'
              : 'border-gray-200 hover:border-gray-300 bg-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
              💳
            </div>
            <div>
              <p className="text-xs font-bold text-gray-800">Credit / Debit Card</p>
              <p className="text-[11px] text-gray-500">Pay securely with Visa, Mastercard</p>
            </div>
          </div>
          <input
            type="radio"
            name="payment_method"
            checked={selectedMethod === 'card'}
            onChange={() => setSelectedMethod('card')}
            className="accent-emerald-600 w-4 h-4"
          />
        </label>

        {/* Option 2: Bank Transfer */}
        <label
          onClick={() => setSelectedMethod('bank')}
          className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition ${
            selectedMethod === 'bank'
              ? 'border-emerald-600 bg-emerald-50/30 ring-1 ring-emerald-600'
              : 'border-gray-200 hover:border-gray-300 bg-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
              🏦
            </div>
            <div>
              <p className="text-xs font-bold text-gray-800">Bank Transfer</p>
              <p className="text-[11px] text-gray-500">Alpha Bank & upload slip</p>
            </div>
          </div>
          <input
            type="radio"
            name="payment_method"
            checked={selectedMethod === 'bank'}
            onChange={() => setSelectedMethod('bank')}
            className="accent-emerald-600 w-4 h-4"
          />
        </label>
      </div>

      {/* Buttons */}
      <div className="flex justify-between items-center w-full pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold rounded-lg text-xs transition"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs transition shadow-sm"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <Suspense fallback={<div className="text-xs text-gray-500">Loading payment options...</div>}>
        <PaymentOptionsContent />
      </Suspense>
    </main>
  );
}