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
  const date = searchParams.get('date') || searchParams.get('scheduled_date') || new Date().toISOString().split('T')[0];
  const time = searchParams.get('time') || searchParams.get('scheduled_time') || '09:00';
  const program = searchParams.get('program') || '';
  const price = searchParams.get('price') || '70€';
  const address = searchParams.get('address') || searchParams.get('address_line') || room || 'N/A';
  const serviceId = searchParams.get('serviceId') || searchParams.get('service_id') || null;

  // แปลงค่าราคาให้เป็นตัวเลขบริสุทธิ์สำหรับลงคอลัมน์ Numeric ใน DB
  const parsedAmount = parseFloat(price.replace(/[^0-9.]/g, '')) || 0;

  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    email: string;
    phone: string;
  } | null>(null);

  // State สำหรับดึงเบอร์โทรเบื้องหลัง (ไม่ต้องแสดง Input)
  const [phoneNumber, setPhoneNumber] = useState('');
  
  // State สำหรับช่องกรอกข้อมูลบัตร
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // ดึงข้อมูล User และ Phone เบื้องหลัง
  const loadUserData = async () => {
    try {
      const nameParam = searchParams.get('customerName') || searchParams.get('name') || '';
      const emailParam = searchParams.get('email') || '';
      const phoneParam = searchParams.get('phone') || searchParams.get('mobile') || searchParams.get('phone_number') || '';
      const idParam = searchParams.get('userId') || searchParams.get('id') || '';

      const localPhone =
        localStorage.getItem('user_phone') ||
        localStorage.getItem('phone') ||
        localStorage.getItem('customer_phone') ||
        '';

      const { data: { session } } = await supabase.auth.getSession();
      let user = session?.user;

      if (!user) {
        const { data: userData } = await supabase.auth.getUser();
        user = userData?.user ?? undefined;
      }

      const finalPhone = phoneParam || localPhone || '';
      const finalName = nameParam || user?.email?.split('@')[0] || 'Sofia';
      const finalEmail = emailParam || user?.email || localStorage.getItem('user_email') || '';
      const finalId = idParam || user?.id || '';

      if (finalPhone) {
        setPhoneNumber(finalPhone);
      }

      const userDataObj = {
        id: finalId,
        name: finalName,
        email: finalEmail,
        phone: finalPhone,
      };

      setCurrentUser(userDataObj);
    } catch (err) {
      console.warn('Failed to load user:', err);
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
      const finalPhone = phoneNumber.trim() || currentUser?.phone || '';
      const userEmail = currentUser?.email || searchParams.get('email') || localStorage.getItem('user_email') || '';

      if (!userEmail) {
        throw new Error('User email not found.');
      }

      if (finalPhone) {
        localStorage.setItem('user_phone', finalPhone);
      }

      // ==========================================
      // FLOW STEP 1: อัปเดต/สร้างข้อมูลในตาราง users
      // ==========================================
      let customerId = currentUser?.id || null;

      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', userEmail)
        .maybeSingle();

      if (existingUser?.id) {
        customerId = existingUser.id;
        if (finalPhone) {
          await supabase.from('users').update({ phone: finalPhone }).eq('id', customerId);
          await supabase.from('users').update({ phone_number: finalPhone }).eq('id', customerId);
          await supabase.from('users').update({ mobile: finalPhone }).eq('id', customerId);
        }
      } else {
        const { data: newUser } = await supabase
          .from('users')
          .insert([
            {
              email: userEmail,
              full_name: currentUser?.name || userEmail.split('@')[0] || 'Sofia',
              phone: finalPhone,
              role: 'customer'
            }
          ])
          .select('id')
          .single();

        if (newUser?.id) {
          customerId = newUser.id;
        }
      }

      // ==========================================
      // FLOW STEP 2: ตัดเงินผ่าน API Stripe
      // ==========================================
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
          email: userEmail,
        }),
      });

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('API route /api/process-card-payment not found or server error.');
      }

      const paymentResult = await res.json();

      if (!res.ok || !paymentResult.success) {
        throw new Error(paymentResult.error || 'Payment failed. Please check your card details.');
      }

      // ==========================================
      // FLOW STEP 3: บันทึกลงตาราง bookings
      // ==========================================
      const bookingRef = `REF-${Math.floor(100000 + Math.random() * 900000)}`;

      const phoneFieldsToTry = ['phone', 'customer_phone', 'phone_number', 'mobile', 'contact_number'];
      let insertedBooking = null;

      for (const fieldName of phoneFieldsToTry) {
        const payload: Record<string, any> = {
          booking_ref: bookingRef,
          status: 'confirmed',
          payment_method: 'card',
          scheduled_date: date,
          scheduled_time: time,
          address_line: address,
          total_amount: parsedAmount,
          price: parsedAmount, // ✅ ส่งเฉพาะตัวเลข (เช่น 70) ไม่ส่ง "70€"
          email: userEmail,
          customer_email: userEmail,
          [fieldName]: finalPhone,
          ...(customerId ? { customer_id: customerId, user_id: customerId } : {}),
          ...(serviceId ? { service_id: serviceId } : {}),
        };

        const { data, error } = await supabase
          .from('bookings')
          .insert([payload])
          .select('*')
          .single();

        if (!error && data) {
          insertedBooking = data;
          break;
        }
      }

      if (!insertedBooking) {
        const basePayload: Record<string, any> = {
          booking_ref: bookingRef,
          status: 'confirmed',
          payment_method: 'card',
          scheduled_date: date,
          scheduled_time: time,
          address_line: address,
          total_amount: parsedAmount,
          price: parsedAmount, // ✅ ส่งเฉพาะตัวเลข
          ...(customerId ? { customer_id: customerId } : {}),
        };

        const { data: fallbackData, error: fallbackError } = await supabase
          .from('bookings')
          .insert([basePayload])
          .select('*')
          .single();

        if (fallbackError) {
          throw new Error(fallbackError.message || 'Failed to save booking.');
        }
        insertedBooking = fallbackData;
      }

      // ==========================================
      // FLOW STEP 4: บันทึกลงตาราง payments
      // ==========================================
      if (insertedBooking?.id) {
        const fallbackStatuses = ['success', 'completed', 'paid', 'successful'];

        const defaultInsert = await supabase.from('payments').insert([
          {
            booking_id: insertedBooking.id,
            amount: parsedAmount,
            payment_method: 'card',
            paid_at: new Date().toISOString()
          }
        ]);

        if (defaultInsert.error) {
          for (const statusVal of fallbackStatuses) {
            const retryPayment = await supabase.from('payments').insert([
              {
                booking_id: insertedBooking.id,
                amount: parsedAmount,
                payment_method: 'card',
                status: statusVal as any,
                paid_at: new Date().toISOString()
              }
            ]);
            if (!retryPayment.error) break;
          }
        }
      }

      // ==========================================
      // FLOW STEP 5: ส่ง Email Notification
      // ==========================================
      try {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName: currentUser?.name || 'Guest',
            email: userEmail,
            phone: finalPhone,
            room,
            date,
            time,
            amount: price,
            paymentMethod: 'Credit / Debit Card',
            refNumber: bookingRef,
          }),
        });
      } catch (notifyErr) {
        console.warn('Failed to send email notification:', notifyErr);
      }

      // ==========================================
      // FLOW STEP 6: Redirect ไปหน้า Confirmation
      // ==========================================
      const query = new URLSearchParams({
        ref: bookingRef,
        userId: customerId || '',
        customerName: currentUser?.name || '',
        email: userEmail,
        phone: finalPhone,
        room,
        date,
        time,
        program,
        price,
        paymentMethod: 'Credit / Debit Card',
      }).toString();

      router.push(`/customer/confirmation?${query}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-[100dvh] sm:min-h-0 sm:max-w-md bg-white p-5 sm:p-6 rounded-none sm:rounded-[32px] shadow-none sm:shadow-sm border-0 sm:border border-slate-100 flex flex-col justify-between items-center relative overflow-y-auto my-auto">
      
      {/* Header Section */}
      <div className="w-full relative shrink-0">
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

        <h2 className="text-base font-bold text-[#1E2B37] text-center mt-3">
          Credit / Debit Card Payment
        </h2>
      </div>

      {/* Form Body */}
      <form onSubmit={handleNext} autoComplete="off" className="w-full my-auto py-4 space-y-4 text-left flex-1 flex flex-col justify-between shrink-0">
        <div className="space-y-4 my-auto">

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium break-words">
              {errorMessage}
            </div>
          )}

          <div className="w-full space-y-3">
            {/* 1. Card Number */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Card Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
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
                Cardholder Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                autoComplete="off"
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
                  Expiry (MM/YY) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  required
                  placeholder="MM / YY"
                  value={expiryDate}
                  onChange={handleExpiryChange}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 focus:border-[#1E2B37] focus:ring-1 focus:ring-[#1E2B37] text-base text-slate-700 placeholder-slate-400 outline-none transition touch-manipulation text-center"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  CVV/CVC <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
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