'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

function ConfirmationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ตัวแปรเช็คว่าเริ่ม Render บน Browser หรือยัง (แก้ Hydration Mismatch)
  const [isMounted, setIsMounted] = useState(false);

  // ตัวแปรล็อกป้องกันการส่งอีเมลซ้ำซ้อนใน React StrictMode
  const hasSentEmail = useRef(false);

  // ข้ามหน้า Confirm ไปหน้า Success ทันที
  const [step] = useState<'success'>('success');

  // Query Parameters / Booking Data
  const room = searchParams.get('room') || searchParams.get('location') || 'Beautiful Apartment in Harbour Paphos | Central';
  const rawDate = searchParams.get('date') || '27 Aug 2026';
  const time = searchParams.get('time') || searchParams.get('serviceTime') || '10:00 - 11:00';
  const program = searchParams.get('program') || 'General cleaning';
  const price = searchParams.get('price') || searchParams.get('amount') || '90€';
  const rawPaymentMethod = searchParams.get('paymentMethod') || searchParams.get('method') || 'Bank Transfer';
  
  const [bookingRef, setBookingRef] = useState(
    searchParams.get('bookingRef') || searchParams.get('ref') || ''
  );

  const [customerInfo, setCustomerInfo] = useState({
    name: searchParams.get('customerName') || searchParams.get('name') || 'Customer',
    email: searchParams.get('email') || '',
    phone: searchParams.get('phone') || '',
  });

  // ตั้งค่า isMounted เป็น true เมื่อ Client โหลดเสร็จแล้วเท่านั้น
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // สร้าง Booking Ref สุ่มเมื่อโหลดหน้า (ถ้าไม่มี)
  useEffect(() => {
    if (!bookingRef) {
      setBookingRef(`REF-${Math.floor(100000 + Math.random() * 900000)}`);
    }
  }, [bookingRef]);

  // ดึงข้อมูล User เพิ่มเติมจาก Supabase / LocalStorage
  useEffect(() => {
    const loadUserData = async () => {
      let currentName = customerInfo.name;
      let currentEmail = customerInfo.email;
      let currentPhone = customerInfo.phone;

      try {
        if (supabase && (!currentEmail || currentName === 'Customer')) {
          const { data: { session } } = await supabase.auth.getSession();
          const user = session?.user;
          if (user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .maybeSingle();

            if (currentName === 'Customer') currentName = profile?.full_name || profile?.name || user.user_metadata?.full_name || 'Customer';
            if (!currentEmail) currentEmail = profile?.email || user.email || '';
            if (!currentPhone) currentPhone = profile?.phone || profile?.mobile || '';
          }
        }
      } catch (e) {
        console.error('Supabase load error:', e);
      }

      if (!currentEmail || currentName === 'Customer') {
        try {
          const localUser = localStorage.getItem('user') || localStorage.getItem('booking_customer');
          if (localUser) {
            const parsed = JSON.parse(localUser);
            if (currentName === 'Customer') currentName = parsed.name || parsed.full_name || 'Customer';
            if (!currentEmail) currentEmail = parsed.email || '';
            if (!currentPhone) currentPhone = parsed.phone || '';
          }
        } catch (e) {
          console.error('LocalStorage load error:', e);
        }
      }

      setCustomerInfo({ name: currentName, email: currentEmail, phone: currentPhone });
    };

    loadUserData();
  }, []);

  // ส่งอีเมลยืนยันอัตโนมัติพร้อมแนบ PDF ทางอีเมล
  useEffect(() => {
    const sendEmailAuto = async () => {
      if (!customerInfo.email || !bookingRef || hasSentEmail.current) {
        return;
      }

      hasSentEmail.current = true; // ล็อกทันทีไม่ให้ยิงซ้ำ

      try {
        const res = await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: customerInfo.email,
            customerName: customerInfo.name,
            bookingRef,
            room,
            program,
            price,
            date: rawDate,
            time,
            paymentMethod: rawPaymentMethod,
          }),
        });

        if (!res.ok) {
          throw new Error(`Server status: ${res.status}`);
        }

        console.log('✅ Auto confirmation email sent!');
      } catch (err: any) {
        console.error('❌ Auto email sending error:', err?.message || err);
        hasSentEmail.current = false; // ปลดล็อกหากเกิด error เพื่อให้ทำงานใหม่ได้
      }
    };

    sendEmailAuto();
  }, [customerInfo.email, bookingRef, room, program, price, rawDate, time, rawPaymentMethod, customerInfo.name]);

  // ฟังก์ชันจัดฟอร์แมตวันที่แบบคงที่
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const day = String(d.getDate()).padStart(2, '0');
      const month = months[d.getMonth()];
      const year = d.getFullYear();

      return `${day} ${month} ${year}`;
    } catch {
      return dateStr;
    }
  };

  if (!isMounted) {
    return <div className="text-xs text-slate-400 my-auto p-4">Loading confirmation...</div>;
  }

  return (
    <div className="w-full sm:max-w-md mx-auto flex flex-col justify-center flex-1 my-auto px-4 sm:px-0 py-6 sm:py-0">
      {step === 'success' && (
        <div 
          className="bg-white p-0 sm:p-7 rounded-none sm:rounded-[32px] sm:shadow-sm sm:border sm:border-slate-100 w-full flex flex-col items-center"
        >
          {/* Icon */}
          <div 
            style={{ backgroundColor: '#d1fae5', color: '#059669' }}
            className="w-16 h-16 rounded-full flex items-center justify-center mb-4 text-3xl font-bold shrink-0"
          >
            ✓
          </div>

          {/* Title */}
          <h2 style={{ color: '#1e293b' }} className="text-2xl font-bold mb-1 text-center">
            Payment Successful!
          </h2>
          <p style={{ color: '#64748b' }} className="text-xs mb-3 text-center font-medium">
            Thank you. Your booking has been confirmed.
          </p>
          <p style={{ color: '#059669' }} className="text-[11px] mb-6 text-center font-medium bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-100">
            ✉️ A receipt & voucher PDF has been sent to your email.
          </p>

          {/* Info Box */}
          <div 
            style={{ backgroundColor: '#f8fafc', borderColor: '#f1f5f9' }}
            className="w-full border rounded-2xl p-4 sm:p-5 mb-5 space-y-3"
          >
            <div style={{ borderColor: '#e2e8f0' }} className="flex justify-between items-center border-b pb-3">
              <span style={{ color: '#94a3b8' }} className="text-xs font-medium">Booking Ref</span>
              <span style={{ color: '#1e293b' }} className="text-xs font-bold">{bookingRef}</span>
            </div>
            
            <div className="space-y-2.5 pt-0.5">
              <div className="flex justify-between items-start">
                <span style={{ color: '#94a3b8' }} className="text-xs font-medium shrink-0">Location</span>
                <span style={{ color: '#334155' }} className="text-xs font-semibold text-right max-w-[65%] leading-relaxed">{room}</span>
              </div>
              <div className="flex justify-between items-center">
                <span style={{ color: '#94a3b8' }} className="text-xs font-medium">Date</span>
                <span style={{ color: '#334155' }} className="text-xs font-semibold">{rawDate.includes('-') ? formatDate(rawDate) : rawDate}</span>
              </div>
              <div className="flex justify-between items-center">
                <span style={{ color: '#94a3b8' }} className="text-xs font-medium">Time</span>
                <span style={{ color: '#334155' }} className="text-xs font-semibold">{time}</span>
              </div>
              <div className="flex justify-between items-center">
                <span style={{ color: '#94a3b8' }} className="text-xs font-medium">Program</span>
                <span style={{ color: '#334155' }} className="text-xs font-semibold">{program}</span>
              </div>
            </div>

            <div style={{ borderColor: '#e2e8f0' }} className="flex justify-between items-center border-t pt-3 mt-2">
              <span style={{ color: '#1e293b' }} className="text-xs sm:text-sm font-bold">Total Paid</span>
              <span style={{ color: '#059669' }} className="text-base sm:text-lg font-bold">{price}</span>
            </div>
          </div>

          {/* Button */}
          <button
            type="button"
            onClick={() => router.push('/customer/booking')}
            className="w-full py-3.5 bg-[#2c3e50] hover:bg-[#1a252f] active:bg-black text-white font-semibold rounded-2xl text-xs transition cursor-pointer touch-manipulation shadow-sm mb-5"
          >
            Back to Home
          </button>

          {/* Logo */}
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/logo.jpeg" 
              alt="Getaway Cleaning Logo" 
              className="h-9 w-auto object-contain opacity-90"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <main className="min-h-screen bg-white sm:bg-slate-50 flex flex-col items-center justify-between text-slate-800 font-sans p-0 sm:p-4">
      <Suspense fallback={<div className="text-xs text-slate-500 my-auto p-4">Loading...</div>}>
        <ConfirmationContent />
      </Suspense>
      <footer className="py-3 text-center text-[11px] text-slate-400 shrink-0 bg-white sm:bg-transparent w-full">
        © Getaway Cleaning Service
      </footer>
    </main>
  );
}