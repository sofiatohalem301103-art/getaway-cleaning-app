'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

function ConfirmationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isMounted, setIsMounted] = useState(false);
  const hasSentEmail = useRef(false);

  const getParam = (key: string) => {
    const val = searchParams.get(key);
    if (!val) return '';
    try {
      return decodeURIComponent(val);
    } catch {
      return val;
    }
  };

  // Query Parameters / Booking Data
  const room = getParam('room') || getParam('location') || 'Beautiful Apartment in Harbour Paphos | Central';
  const rawDate = getParam('date') || '28 Aug 2026';
  const time = getParam('time') || getParam('serviceTime') || '10:00 - 11:00';
  const program = getParam('program') || 'General cleaning';
  const price = getParam('price') || getParam('amount') || '70€';
  const rawPaymentMethod = getParam('paymentMethod') || getParam('method') || 'Bank Transfer';
  
  const [bookingRef, setBookingRef] = useState('');

  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    setIsMounted(true);
    const initialRef = getParam('bookingRef') || getParam('ref');
    setBookingRef(initialRef || `REF-${Math.floor(100000 + Math.random() * 900000)}`);
    
    setCustomerInfo({
      name: getParam('customerName') || getParam('name') || '',
      email: getParam('email') || '',
      phone: getParam('phone') || '',
    });
  }, [searchParams]);

  // ระบบดึงข้อมูล Profile จาก Supabase & LocalStorage
  useEffect(() => {
    if (!isMounted) return;

    const fetchUserProfile = async () => {
      let fetchedName = customerInfo.name;
      let fetchedEmail = customerInfo.email;
      let fetchedPhone = customerInfo.phone;

      try {
        if (supabase) {
          const { data: { user } } = await supabase.auth.getUser();

          if (user) {
            if (!fetchedName || fetchedName === 'Customer' || fetchedName === 'Guest') {
              fetchedName = user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.display_name || '';
            }
            if (!fetchedEmail) {
              fetchedEmail = user.email || user.user_metadata?.email || '';
            }
            if (!fetchedPhone) {
              fetchedPhone = user.phone || user.user_metadata?.phone || user.user_metadata?.mobile || '';
            }

            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .maybeSingle();

            if (profile) {
              if (!fetchedName || fetchedName === 'Customer' || fetchedName === 'Guest') {
                fetchedName = profile.full_name || profile.name || profile.display_name || profile.username || fetchedName;
              }
              if (!fetchedEmail) {
                fetchedEmail = profile.email || fetchedEmail;
              }
              if (!fetchedPhone) {
                fetchedPhone = profile.phone || profile.mobile || profile.phone_number || profile.tel || fetchedPhone;
              }
            }
          }
        }
      } catch (err) {
        console.error('Error fetching profile from Supabase:', err);
      }

      if (!fetchedName || fetchedName === 'Customer' || fetchedName === 'Guest' || !fetchedEmail || !fetchedPhone) {
        try {
          const keys = ['user', 'booking_customer', 'profile', 'customer_info', 'userData', 'sb-user'];
          for (const key of keys) {
            const rawData = localStorage.getItem(key);
            if (rawData) {
              try {
                const parsed = JSON.parse(rawData);
                if (!fetchedName || fetchedName === 'Customer' || fetchedName === 'Guest') {
                  fetchedName = parsed.name || parsed.full_name || parsed.customerName || parsed.displayName || fetchedName;
                }
                if (!fetchedEmail) {
                  fetchedEmail = parsed.email || parsed.customerEmail || fetchedEmail;
                }
                if (!fetchedPhone) {
                  fetchedPhone = parsed.phone || parsed.mobile || parsed.phone_number || parsed.tel || fetchedPhone;
                }
              } catch {
                if (key === 'user' && !fetchedName) fetchedName = rawData;
              }
            }
          }
        } catch (err) {
          console.error('Error reading LocalStorage:', err);
        }
      }

      setCustomerInfo({
        name: fetchedName || 'Customer',
        email: fetchedEmail || '',
        phone: fetchedPhone || '',
      });
    };

    fetchUserProfile();
  }, [isMounted]);

  // ส่งอีเมลอัตโนมัติ
  useEffect(() => {
    if (!isMounted || !customerInfo.email || !bookingRef || hasSentEmail.current) {
      return;
    }

    const controller = new AbortController();
    hasSentEmail.current = true;

    const sendEmailAuto = async () => {
      try {
        const res = await fetch('/api/notify', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          signal: controller.signal,
          body: JSON.stringify({
            email: customerInfo.email,
            customerName: customerInfo.name,
            phone: customerInfo.phone,
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

        console.log('✅ Confirmation email sent successfully to:', customerInfo.email);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error('❌ Auto email sending error:', err?.message || err);
        hasSentEmail.current = false;
      }
    };

    sendEmailAuto();

    return () => {
      controller.abort();
    };
  }, [isMounted, customerInfo.email, customerInfo.name, customerInfo.phone, bookingRef, room, program, price, rawDate, time, rawPaymentMethod]);

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
    return <div className="text-xs text-[#8E9B9E] my-auto p-4">Loading confirmation...</div>;
  }

  return (
    <div className="w-full sm:max-w-md mx-auto flex flex-col justify-center flex-1 my-auto px-4 sm:px-0 py-6 sm:py-0">
      <div className="bg-white p-0 sm:p-7 rounded-none sm:rounded-[32px] sm:shadow-sm sm:border sm:border-slate-100 w-full flex flex-col items-center">
        
        {/* Checkmark Icon */}
        <div className="w-20 h-20 rounded-full bg-[#EAF3F9] border-2 border-[#B8D7ED] flex items-center justify-center mb-5 shrink-0 shadow-xs">
          <svg className="w-10 h-10 text-[#1E2B37]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-[#1E2B37] mb-1.5 text-center">
          Payment Successful!
        </h2>
        <p className="text-xs text-slate-500 mb-4 text-center font-medium">
          Thank you. Your booking has been confirmed.
        </p>

        {/* Notification Badge */}
        <div className="w-full bg-[#EAF3F9] border border-[#B8D7ED] rounded-full py-2.5 px-4 mb-6 flex items-center justify-center gap-2 overflow-hidden">
          <span className="text-xs shrink-0">✉️</span>
          <span className="text-[11px] font-medium text-[#1E2B37] whitespace-nowrap truncate sm:whitespace-normal">
            A receipt & voucher PDF has been sent to your email
          </span>
        </div>

        {/* Details Box */}
        <div className="w-full bg-white border-2 border-[#8E9B9E]/60 rounded-2xl p-4 sm:p-5 mb-6 space-y-3.5 text-[#1E2B37]">
          <div className="flex justify-between items-center border-b border-[#8E9B9E]/30 pb-3">
            <span className="text-xs font-semibold text-slate-700">Booking Ref</span>
            <span className="text-xs font-bold font-mono">{bookingRef}</span>
          </div>

          {/* Customer Info */}
          <div className="space-y-3 pt-0.5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-700">Customer Name</span>
              <span className="text-xs font-bold">{customerInfo.name || 'Customer'}</span>
            </div>
            {customerInfo.email && (
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-700">Email</span>
                <span className="text-xs font-bold truncate max-w-[60%]">{customerInfo.email}</span>
              </div>
            )}
            {customerInfo.phone && (
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-700">Phone</span>
                <span className="text-xs font-bold">{customerInfo.phone}</span>
              </div>
            )}

            <div className="border-t border-[#8E9B9E]/20 pt-2 my-1" />

            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-slate-700 shrink-0">Location</span>
              <span className="text-xs font-bold text-right max-w-[65%] leading-relaxed">{room}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-700">Date</span>
              <span className="text-xs font-bold">{rawDate.includes('-') ? formatDate(rawDate) : rawDate}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-700">Time</span>
              <span className="text-xs font-bold">{time}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-700">Program</span>
              <span className="text-xs font-bold">{program}</span>
            </div>
          </div>

          <div className="flex justify-between items-center border-t border-[#8E9B9E]/30 pt-3 mt-2">
            <span className="text-sm font-bold">Total Paid</span>
            <span className="text-lg font-bold">{price.includes('€') ? price : `${price} €`}</span>
          </div>
        </div>

        {/* Back to Home Button */}
        <button
          type="button"
          onClick={() => router.push('/customer/booking')}
          className="w-full py-3.5 bg-[#B8B8B8] hover:bg-[#a3a3a3] active:bg-[#8e8e8e] text-[#1E2B37] font-bold rounded-2xl text-xs transition cursor-pointer touch-manipulation mb-6 text-center"
        >
          Back To Home
        </button>

        {/* Logo */}
        <div className="flex justify-center mb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src="/logo.jpeg" 
            alt="Getaway Cleaning Logo" 
            className="h-10 w-auto object-contain"
          />
        </div>
      </div>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <main className="min-h-screen bg-white sm:bg-[#EAF3F9] flex flex-col items-center justify-between text-[#1E2B37] font-sans p-0 sm:p-4">
      <Suspense fallback={<div className="text-xs text-slate-500 my-auto p-4">Loading...</div>}>
        <ConfirmationContent />
      </Suspense>
      <footer className="py-4 text-center text-[11px] text-slate-500 shrink-0 bg-white sm:bg-transparent w-full font-medium">
        © Getaway Cleaning Service
      </footer>
    </main>
  );
}