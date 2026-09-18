'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';

function BankTransferContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 1. ดึงค่าทั้งหมดจาก Query Parameters
  const room = searchParams.get('room') || searchParams.get('room_type') || searchParams.get('location') || '';
  const rawDate = searchParams.get('date') || searchParams.get('scheduled_date') || new Date().toISOString().split('T')[0];
  const rawTime = searchParams.get('time') || searchParams.get('scheduled_time') || '09:00';
  const program = searchParams.get('program') || '';
  const price = searchParams.get('price') || searchParams.get('amount') || '0 €';
  const initialName = searchParams.get('customerName') || searchParams.get('name') || '';
  const initialEmail = searchParams.get('email') || '';
  const initialPhone = searchParams.get('phone') || '';
  const initialAddress = searchParams.get('address') || searchParams.get('address_line') || searchParams.get('location') || room || 'N/A';
  const serviceId = searchParams.get('serviceId') || searchParams.get('service_id') || null;

  // State ข้อมูลลูกค้า
  const [customerName, setCustomerName] = useState<string>(initialName);
  const [email, setEmail] = useState<string>(initialEmail);
  const [phone, setPhone] = useState<string>(initialPhone);
  const [address, setAddress] = useState<string>(initialAddress);
  const [userId, setUserId] = useState<string | null>(searchParams.get('userId') || null);

  // ดึงข้อมูลจาก Supabase Auth/Profile
  useEffect(() => {
    async function fetchUserProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          if (!email && user.email) setEmail(user.email);

          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (profile) {
            if (!customerName) setCustomerName(profile.full_name || profile.name || 'Sofia');
            if (!email) setEmail(profile.email || user.email || '');
            if (!phone) setPhone(profile.phone || profile.phone_number || '');
            if (address === 'N/A' && profile.address) setAddress(profile.address);
          }
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
      }
    }
    fetchUserProfile();
  }, [customerName, email, phone, address]);

  // ตัดเอาเฉพาะเวลาเริ่มต้น เช่น "15:00"
  const cleanTime = rawTime.includes('-') ? rawTime.split('-')[0].trim() : rawTime.trim();

  // แปลง String ตัวเลข ให้เป็น Numeric ล้วน
  const parsedAmount = parseFloat(price.replace(/[^0-9.]/g, '')) || 0;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const bankDetails = {
    bankName: 'ALPHA BANK 1 (Rental - Sublets)',
    accountName: 'REALSOL CYPRUS LTD',
    accountNo: '651-101-012445-8',
    iban: 'CY61009006510006511010124458',
    bic: 'ABKLCY2N',
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const bookingRef = `REF-${Math.floor(100000 + Math.random() * 900000)}`;

      // 1. เตรียม Payload บันทึกลง Database
      let insertPayload: Record<string, any> = {
        booking_ref: bookingRef,
        status: 'pending',
        payment_status: 'Pending Verification',
        payment_method: 'Bank Transfer',
        scheduled_date: rawDate,
        scheduled_time: cleanTime,
        booking_time: cleanTime,
        address_line: address,
        address: address,
        location: address,
        total_amount: parsedAmount,
        price: parsedAmount,
        customer_name: customerName || 'Customer',
        name: customerName || 'Customer',
        email: email,
        customer_email: email,
        phone: phone,
        customer_phone: phone,
        program: program,
        room: room,
        room_type: room,
        ...(serviceId ? { service_id: serviceId } : {}),
        ...(userId ? { user_id: userId, customer_id: userId } : {}),
      };

      // 2. บันทึกข้อมูลเข้า Supabase Table
      let { error: insertError } = await supabase
        .from('bookings')
        .insert([insertPayload]);

      // ลูป Auto-retry กรณีคอลัมน์ไม่ตรงกัน
      while (insertError && insertError.message.includes('Could not find the')) {
        const missingColMatch = insertError.message.match(/Could not find the '([^']+)' column/);
        if (missingColMatch && missingColMatch[1]) {
          const missingCol = missingColMatch[1];
          delete insertPayload[missingCol];
          const res = await supabase.from('bookings').insert([insertPayload]);
          insertError = res.error;
        } else {
          break;
        }
      }

      if (insertError && insertError.message.includes('invalid input value for enum')) {
        delete insertPayload.status;
        const res = await supabase.from('bookings').insert([insertPayload]);
        insertError = res.error;
      }

      if (insertError) throw new Error(`Insert booking failed: ${insertError.message}`);

      // 3. ส่ง Email แจ้งเตือน
      try {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName: customerName || 'Customer',
            email,
            phone,
            room,
            date: rawDate,
            time: cleanTime,
            amount: price,
            paymentMethod: 'Bank Transfer',
            refNumber: bookingRef,
          }),
        });
      } catch (notifyErr) {
        console.error('Failed to send email notification:', notifyErr);
      }

      // 4. ไปยังหน้า Confirmation
      const query = new URLSearchParams({
        ref: bookingRef,
        room,
        date: rawDate,
        time: cleanTime,
        program,
        price,
        paymentMethod: 'Bank Transfer',
        customerName: customerName || 'Customer',
        email,
        phone,
      }).toString();

      router.push(`/customer/confirmation?${query}`);
    } catch (err: unknown) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full sm:max-w-md bg-white p-6 sm:rounded-[32px] sm:border-2 border-[#1E2B37]/20 sm:shadow-lg flex flex-col justify-between items-center relative min-h-[100dvh] sm:min-h-0 sm:my-auto space-y-4">
      
      {/* Header Section */}
      <div className="w-full flex flex-col items-center">
        <div className="pt-2 pb-1">
          <Image
            src="/logo.jpeg"
            alt="Getaway Cleaning"
            width={160}
            height={60}
            className="object-contain max-h-[60px] w-auto"
            priority
          />
        </div>

        <h2 className="text-lg font-bold text-[#1E2B37] text-center mt-2">
          Payment
        </h2>
      </div>

      {/* Main Body */}
      <div className="w-full space-y-4 flex-1 flex flex-col justify-center">
        
        {/* Bank Account Info Card */}
        <div className="space-y-1.5">
          <h3 className="text-xs font-bold text-[#1E2B37]">
            Bank Account Info
          </h3>
          <div className="bg-white border-2 border-[#8E9B9E]/60 rounded-2xl p-4 text-xs space-y-3 text-[#1E2B37]">
            <div className="font-semibold pb-1">
              {bankDetails.bankName}
            </div>

            <div className="border-t border-[#8E9B9E]/30 pt-2">
              <span className="text-[11px] block font-semibold">Account Name</span>
              <span className="font-bold text-xs">{bankDetails.accountName}</span>
            </div>

            <div className="bg-[#EAF3F9] p-2.5 rounded-xl border border-[#B8D7ED]">
              <span className="text-[10px] block font-semibold text-slate-600">Account No.</span>
              <span className="font-mono font-bold text-xs">{bankDetails.accountNo}</span>
            </div>

            <div className="bg-[#EAF3F9] p-2.5 rounded-xl border border-[#B8D7ED]">
              <span className="text-[10px] block font-semibold text-slate-600">IBAN</span>
              <span className="font-mono font-bold break-all text-[11px]">{bankDetails.iban}</span>
            </div>

            <div className="bg-[#EAF3F9] p-2.5 rounded-xl border border-[#B8D7ED]">
              <span className="text-[10px] block font-semibold text-slate-600">BIC</span>
              <span className="font-mono font-bold text-xs">{bankDetails.bic}</span>
            </div>

            <div className="text-center pt-2 border-t border-[#8E9B9E]/30">
              <span className="text-[#1E2B37] font-extrabold text-base">
                Amount to pay: {price.includes('€') ? price : `${price} €`}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <form onSubmit={handleConfirm} className="w-full pt-1">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="w-1/3 py-3 bg-[#D9D9D9] hover:bg-[#c5c5c5] active:bg-[#b0b0b0] text-[#1E2B37] font-bold rounded-3xl text-sm transition duration-150 cursor-pointer text-center"
            >
              ← Back
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-2/3 py-3 bg-[#1E2B37] hover:bg-[#2c3d4e] active:bg-[#121b23] text-white font-bold rounded-3xl text-sm transition duration-150 cursor-pointer disabled:opacity-50 shadow-md text-center"
            >
              {isSubmitting ? 'Processing...' : 'Confirm'}
            </button>
          </div>
        </form>
      </div>

      {/* Footer */}
      <div className="w-full pt-1 text-center">
        <p className="text-[11px] text-[#1E2B37]/50 font-medium">
          © Getaway Cleaning Service
        </p>
      </div>

    </div>
  );
}

export default function BankTransferPage() {
  return (
    <main className="min-h-[100dvh] bg-white sm:bg-[#EAF3F9] flex flex-col items-center justify-center sm:p-4 text-[#1E2B37] font-sans">
      <Suspense fallback={<div className="text-xs text-slate-500">Loading payment options...</div>}>
        <BankTransferContent />
      </Suspense>
    </main>
  );
}