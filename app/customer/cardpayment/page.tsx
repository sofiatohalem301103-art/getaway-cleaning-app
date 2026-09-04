'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';

function CardPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 1. ดึงค่าจาก Query String
  const room = searchParams.get('room') || '';
  const date = searchParams.get('date') || '';
  const time = searchParams.get('time') || '';
  const program = searchParams.get('program') || '';
  const price = searchParams.get('price') || '70€';

  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    email: string;
    phone: string;
  } | null>(null);

  // State สำหรับช่องกรอกบัตร
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // ดึงข้อมูล User
  const loadUserData = async () => {
    try {
      const nameParam = searchParams.get('customerName') || searchParams.get('name');
      const emailParam = searchParams.get('email');
      const phoneParam = searchParams.get('phone');
      const idParam = searchParams.get('userId') || searchParams.get('id');

      if (nameParam || emailParam || phoneParam) {
        const userDataFromUrl = {
          id: idParam || '',
          name: nameParam || 'Guest',
          email: emailParam || '',
          phone: phoneParam || '',
        };
        setCurrentUser(userDataFromUrl);
        localStorage.setItem('user', JSON.stringify(userDataFromUrl));
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      let user = session?.user;

      if (!user) {
        const { data: userData } = await supabase.auth.getUser();
        user = userData?.user ?? undefined;
      }

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        const name =
          profile?.full_name ||
          profile?.name ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.user_metadata?.user_name ||
          user.email?.split('@')[0] ||
          'User';

        const email = profile?.email || user.email || '';
        const phone =
          profile?.phone ||
          profile?.phone_number ||
          profile?.mobile ||
          user.user_metadata?.phone ||
          user.user_metadata?.phone_number ||
          '';

        const fetchedUser = { id: user.id, name, email, phone };
        setCurrentUser(fetchedUser);
        localStorage.setItem('user', JSON.stringify(fetchedUser));
        return;
      }

      const localUser = localStorage.getItem('user') || localStorage.getItem('sb-user');
      if (localUser) {
        const parsed = JSON.parse(localUser);
        setCurrentUser({
          id: parsed.id || '',
          name: parsed.name || parsed.full_name || 'User',
          email: parsed.email || localStorage.getItem('user_email') || '',
          phone: parsed.phone || parsed.phone_number || parsed.mobile || '',
        });
        return;
      }

      setCurrentUser(null);
    } catch (err) {
      console.error('Failed to load user:', err);
      setCurrentUser(null);
    }
  };

  useEffect(() => {
    loadUserData();
  }, [searchParams]);

  // ฟอร์แมตเลขบัตร
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
  };

  // ฟอร์แมต MM/YY
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (value.length >= 2) {
      value = value.slice(0, 2) + '/' + value.slice(2);
    }
    setExpiryDate(value);
  };

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      // 1. ตัดเงินผ่าน API Stripe ฝั่ง Back-end
      const expMonth = expiryDate.split('/')[0];
      const expYear = expiryDate.split('/')[1];

      const res = await fetch('/api/process-card-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: price,
          cardNumber: cardNumber.replace(/\s/g, ''),
          expMonth,
          expYear,
          cvc: cvv,
          holderName: cardHolder,
          email: currentUser?.email || '',
        }),
      });

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('API route /api/process-card-payment not found or server error. Please restart the dev server.');
      }

      const paymentResult = await res.json();

      if (!res.ok || !paymentResult.success) {
        throw new Error(paymentResult.error || 'Payment failed. Please check your card details.');
      }

      // 2. บันทึกลง Supabase Bookings เมื่อชำระเงินสำเร็จ
      const bookingRef = `REF-${Math.floor(100000 + Math.random() * 900000)}`;

      const { error: insertError } = await supabase.from('bookings').insert([
        {
          booking_code: bookingRef,
          customer_name: currentUser?.name || 'Guest',
          customer_email: currentUser?.email || '',
          room_type: room,
          address: room,
          booking_date: date,
          booking_time: time,
          program: program,
          amount: price,
          status: 'Confirmed',
        },
      ]);

      if (insertError) {
        console.error('Insert booking error:', insertError);
      }

      // 3. ส่ง Email Notification
      try {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName: currentUser?.name || 'Guest',
            email: currentUser?.email || '',
            phone: currentUser?.phone || '',
            room,
            date,
            time,
            amount: price,
            paymentMethod: 'Credit / Debit Card',
            refNumber: bookingRef,
          }),
        });
      } catch (notifyErr) {
        console.error('Failed to send email notification:', notifyErr);
      }

      // 4. Redirect ไปยังหน้า Confirmation
      const query = new URLSearchParams({
        ref: bookingRef,
        userId: currentUser?.id || '',
        customerName: currentUser?.name || '',
        email: currentUser?.email || '',
        phone: currentUser?.phone || '',
        room,
        date,
        time,
        program,
        price,
        paymentMethod: 'Credit / Debit Card',
      }).toString();

      router.push(`/customer/confirmation?${query}`);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
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
          Credit / Debit Card Payment
        </h2>
      </div>

      {/* Form Body */}
      <form onSubmit={handleNext} className="w-full my-auto py-4 space-y-4 text-left flex-1 flex flex-col justify-between shrink-0">
        <div className="space-y-4 my-auto">

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
              {errorMessage}
            </div>
          )}

          <div className="w-full space-y-3">
            {/* 1. Card Number */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Card Number
              </label>
              <input
                type="text"
                inputMode="numeric"
                required
                placeholder="xxxx xxxx xxxx xxxx"
                value={cardNumber}
                onChange={handleCardNumberChange}
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 focus:border-[#1E2B37] focus:ring-1 focus:ring-[#1E2B37] text-base text-slate-700 placeholder-slate-400 outline-none transition touch-manipulation tracking-wider"
              />
            </div>

            {/* 2. Cardholder Name */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Cardholder Name
              </label>
              <input
                type="text"
                required
                placeholder="NAME ON CARD"
                value={cardHolder}
                onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck="false"
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 focus:border-[#1E2B37] focus:ring-1 focus:ring-[#1E2B37] text-base text-slate-700 placeholder-slate-400 outline-none transition touch-manipulation uppercase"
              />
            </div>

            {/* 3. Expiry & CVV/CVC */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Expiry (MM/YY)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  placeholder="MM / YY"
                  value={expiryDate}
                  onChange={handleExpiryChange}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 focus:border-[#1E2B37] focus:ring-1 focus:ring-[#1E2B37] text-base text-slate-700 placeholder-slate-400 outline-none transition touch-manipulation text-center"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  CVV/CVC
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  required
                  maxLength={4}
                  placeholder="xxx"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 focus:border-[#1E2B37] focus:ring-1 focus:ring-[#1E2B37] text-base text-slate-700 placeholder-slate-400 outline-none transition touch-manipulation text-center"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2.5 min-h-[44px] bg-[#D9D9D9] hover:bg-slate-300 active:bg-slate-400 text-[#1E2B37] font-semibold rounded-2xl text-sm transition duration-150 cursor-pointer touch-manipulation text-center"
          >
            ← Back
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-2.5 min-h-[44px] bg-[#1E2B37] hover:bg-slate-800 active:bg-slate-900 text-white font-bold rounded-2xl text-sm transition duration-150 cursor-pointer touch-manipulation disabled:opacity-50 text-center"
          >
            {isSubmitting ? 'Processing...' : 'Pay Now'}
          </button>
        </div>
      </form>

      {/* Footer */}
      <div className="w-full pt-2 pb-1 text-center shrink-0">
        <p className="text-[11px] text-slate-400">
          © Getaway Cleaning Service
        </p>
      </div>

    </div>
  );
}

export default function CardPaymentPage() {
  return (
    <main className="w-full min-h-[100dvh] bg-white sm:bg-[#f8fafc] flex flex-col items-center justify-center p-0 sm:p-4 text-slate-800 font-sans overflow-x-hidden">
      <Suspense fallback={<div className="text-xs text-slate-500 p-4">Loading card payment...</div>}>
        <CardPaymentContent />
      </Suspense>
    </main>
  );
}