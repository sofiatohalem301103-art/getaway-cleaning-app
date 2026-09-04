'use client';

import { useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';

function BankTransferContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ดึงค่า Query Parameters
  const room = searchParams.get('room') || '';
  const rawDate = searchParams.get('date') || '';
  const time = searchParams.get('time') || '';
  const program = searchParams.get('program') || '';
  const price = searchParams.get('price') || '0 €';
  const customerName = searchParams.get('customerName') || searchParams.get('name') || 'Guest';
  const email = searchParams.get('email') || '';
  const phone = searchParams.get('phone') || '';

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const bankDetails = {
    bankName: 'ALPHA BANK 1 (Rental - Sublets)',
    accountName: 'REALSOL CYPRUS LTD',
    accountNo: '651-101-012445-8',
    iban: 'CY61009006510006511010124458',
    bic: 'ABKLCY2N',
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      alert('Please upload your payment slip.');
      return;
    }

    setIsSubmitting(true);

    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('slips')
        .upload(filePath, selectedFile, { cacheControl: '3600', upsert: false });

      if (uploadError) throw new Error(`Upload slip failed: ${uploadError.message}`);

      const { data: publicUrlData } = supabase.storage.from('slips').getPublicUrl(filePath);
      const slipUrl = publicUrlData.publicUrl;
      const bookingRef = `REF-${Math.floor(100000 + Math.random() * 900000)}`;

      const { error: insertError } = await supabase.from('bookings').insert([
        {
          booking_code: bookingRef,
          customer_name: customerName,
          customer_email: email,
          room_type: room,
          address: room,
          booking_date: rawDate,
          booking_time: time,
          program: program,
          amount: price,
          payment_slip: slipUrl,
          status: 'Pending',
        },
      ]);

      if (insertError) throw new Error(`Insert booking failed: ${insertError.message}`);

      try {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName,
            email,
            phone,
            room,
            date: rawDate,
            time,
            amount: price,
            paymentMethod: 'Bank Transfer (Slip Uploaded)',
            refNumber: bookingRef,
          }),
        });
      } catch (notifyErr) {
        console.error('Failed to send email notification:', notifyErr);
      }

      const query = new URLSearchParams({
        ref: bookingRef,
        room,
        date: rawDate,
        time,
        program,
        price,
        paymentMethod: 'Bank Transfer',
        customerName,
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
        {/* Logo Section */}
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

        {/* Title */}
        <h2 className="text-lg font-bold text-[#1E2B37] text-center mt-2">
          Payment
        </h2>
      </div>

      {/* Main Body */}
      <div className="w-full space-y-4 flex-1 flex flex-col justify-center">
        
        {/* Bank Account Info Card (เปลี่ยนพื้นหลังการ์ดหลักเป็นสีขาว bg-white) */}
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

            {/* ช่อง Account No. (ปรับเป็นสีฟ้าอ่อน bg-[#EAF3F9]) */}
            <div className="bg-[#EAF3F9] p-2.5 rounded-xl border border-[#B8D7ED]">
              <span className="text-[10px] block font-semibold text-slate-600">Account No.</span>
              <span className="font-mono font-bold text-xs">{bankDetails.accountNo}</span>
            </div>

            {/* ช่อง IBAN (ปรับเป็นสีฟ้าอ่อน bg-[#EAF3F9]) */}
            <div className="bg-[#EAF3F9] p-2.5 rounded-xl border border-[#B8D7ED]">
              <span className="text-[10px] block font-semibold text-slate-600">IBAN</span>
              <span className="font-mono font-bold break-all text-[11px]">{bankDetails.iban}</span>
            </div>

            {/* ช่อง BIC (ปรับเป็นสีฟ้าอ่อน bg-[#EAF3F9]) */}
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

        {/* Upload Slip Section */}
        <div className="space-y-1.5">
          <h3 className="text-xs font-bold text-[#1E2B37]">
            Upload Slip
          </h3>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3.5 px-4 bg-[#EAF3F9] border-2 border-[#B8D7ED] rounded-3xl text-xs font-medium text-[#1E2B37] hover:bg-[#d8ebfa] transition active:scale-[0.99] flex items-center justify-center cursor-pointer shadow-sm"
          >
            {selectedFile ? (
              <span className="text-emerald-700 font-bold truncate">
                ✓ {selectedFile.name}
              </span>
            ) : (
              <span>Choose File / Photo / Camera</span>
            )}
          </button>
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
              {isSubmitting ? 'Uploading Slip...' : 'Confirm'}
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