'use client';

import { useState, Suspense, ChangeEvent, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';

function CardPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 1. Get URL parameters
  const room = searchParams.get('room') || '';
  const rawDate = searchParams.get('date') || '';
  const time = searchParams.get('time') || '';
  const program = searchParams.get('program') || '';
  const price = searchParams.get('price') || '90€';

  // Mock user data
  const user = {
    name: 'Sofia Ross',
    email: 'sofia.ross@example.com',
  };

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Format card number with spaces every 4 digits
  const handleCardNumberChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = value.match(/.{1,4}/g)?.join(' ') || value;
    setCardNumber(formatted);
  };

  // Format expiration date (MM/YY)
  const handleExpiryChange = (e: ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (value.length >= 3) {
      value = `${value.slice(0, 2)}/${value.slice(2)}`;
    }
    setExpiry(value);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!cardNumber || !cardName || !expiry || !cvv) {
      alert('Please fill in all card details.');
      return;
    }

    if (cardNumber.replace(/\s/g, '').length < 16) {
      alert('Please enter a valid 16-digit card number.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Clean Price Value
      const cleanPrice = price.replace(/€/g, '').trim();
      const bookingCode = `REF-${Math.floor(100000 + Math.random() * 900000)}`;

      if (supabase) {
        // บันทึกลงตาราง bookings (หักเงินอัตโนมัติ ไม่ต้องใส่ slip_url)
        const { error: dbError } = await supabase.from('bookings').insert([
          {
            booking_code: bookingCode,
            customer_name: user.name,
            customer_email: user.email,
            room_type: room,
            address: room,
            booking_date: rawDate,
            booking_time: time,
            program: program,
            price: cleanPrice,
            amount: cleanPrice,
            payment_method: 'Credit/Debit Card (Automatic)',
            payment_status: 'Paid',
            status: 'Pending',
            card_last_digits: cardNumber.replace(/\s/g, '').slice(-4),
            created_at: new Date().toISOString(),
          },
        ]);

        if (dbError) {
          throw new Error('Database Error: ' + dbError.message);
        }

        // 📧 ยิง API ส่งอีเมลแจ้งเตือนลูกค้า และ Admin
        try {
          await fetch('/api/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customerName: user.name,
              email: user.email,
              room: room,
              date: rawDate,
              time: time,
              amount: price,
              paymentMethod: 'Credit/Debit Card (Automatic Charge)',
            }),
          });
        } catch (notifyErr) {
          console.error('Failed to send email notification:', notifyErr);
        }
      }

      // ไปยังหน้า Confirmation
      const query = new URLSearchParams({
        room,
        date: rawDate,
        time,
        program,
        price,
        payment_method: 'Credit/Debit Card',
      }).toString();

      router.push(`/customer/confirmation?${query}`);
    } catch (err: any) {
      alert('Payment processing failed: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 w-full max-w-md relative flex flex-col items-center">
      {/* Profile Button Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <button
          type="button"
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          className="flex items-center gap-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition active:scale-95 cursor-pointer"
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
              onClick={() => router.push('/login')}
              className="w-full text-left text-xs font-medium text-red-600 hover:bg-red-50 p-1.5 rounded-md transition"
            >
              Log out
            </button>
          </div>
        )}
      </div>

      {/* Logo */}
      <div className="flex justify-center mb-6 pt-2">
        <Image
          src="/logo.jpeg"
          alt="Company Logo"
          width={120}
          height={120}
          className="object-contain w-auto h-auto"
          priority
        />
      </div>

      <h2 className="text-lg font-bold text-gray-800 mb-6 text-center">Payment</h2>

      <form onSubmit={handleSubmit} className="w-full space-y-4">
        <h3 className="text-xs font-bold text-gray-700 mb-2">Credit / Debit Card Payment</h3>

        {/* Card Number */}
        <div>
          <label className="block text-xs text-gray-600 font-medium mb-1">Card Number</label>
          <input
            type="text"
            placeholder="1234 5678 9012 3456"
            value={cardNumber}
            onChange={handleCardNumberChange}
            disabled={isSubmitting}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none text-black font-mono"
            maxLength={19}
            required
          />
        </div>

        {/* Cardholder Name */}
        <div>
          <label className="block text-xs text-gray-600 font-medium mb-1">Cardholder Name</label>
          <input
            type="text"
            placeholder="SOFIA ROSS"
            value={cardName}
            onChange={(e) => setCardName(e.target.value.toUpperCase())}
            disabled={isSubmitting}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none text-black"
            required
          />
        </div>

        {/* Expiry & CVV */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-600 font-medium mb-1">Expiry (MM/YY)</label>
            <input
              type="text"
              placeholder="MM/YY"
              value={expiry}
              onChange={handleExpiryChange}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs text-center focus:ring-2 focus:ring-emerald-500 outline-none text-black font-mono"
              maxLength={5}
              required
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 font-medium mb-1">CVV/CVC</label>
            <input
              type="password"
              placeholder="123"
              value={cvv}
              onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs text-center focus:ring-2 focus:ring-emerald-500 outline-none text-black font-mono"
              maxLength={4}
              required
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-center pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold rounded-xl text-xs transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-md flex items-center justify-center gap-2"
          >
            {isSubmitting ? <span>Processing Payment...</span> : <span>Pay {price} Now</span>}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function CardPaymentPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 relative">
      <Suspense fallback={<div className="text-xs text-gray-500">Loading...</div>}>
        <CardPaymentContent />
      </Suspense>
    </main>
  );
}