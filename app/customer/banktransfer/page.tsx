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
  const price = searchParams.get('price') || '';

  // Mock User Data
  const user = {
    name: 'Sofia Ross',
    email: 'sofia.ross@example.com',
  };

  const [showProfileMenu, setShowProfileMenu] = useState(false);
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
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw new Error(`Upload slip failed: ${uploadError.message}`);

      const { data: publicUrlData } = supabase.storage
        .from('slips')
        .getPublicUrl(filePath);

      const slipUrl = publicUrlData.publicUrl;
      const bookingRef = `REF-${Math.floor(100000 + Math.random() * 900000)}`;

      const { error: insertError } = await supabase.from('bookings').insert([
        {
          booking_code: bookingRef,
          customer_name: user.name,
          customer_email: user.email,
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
            customerName: user.name,
            email: user.email,
            room: room,
            date: rawDate,
            time: time,
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
    <div className="w-full max-w-md mx-auto flex flex-col justify-between flex-1 py-2 px-1">
      <div>
        {/* Top Bar: Profile */}
        <div className="w-full flex justify-start mb-2 relative">
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-full transition active:scale-95 cursor-pointer border border-emerald-200/80 shadow-sm"
          >
            <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px] font-bold">
              {user.name.charAt(0)}
            </div>
            <span>Profile</span>
          </button>

          {showProfileMenu && (
            <div className="absolute top-9 left-0 w-52 bg-white border border-gray-200 rounded-xl shadow-lg p-2.5 text-left z-30">
              <div className="border-b border-gray-100 pb-1.5 mb-1.5">
                <p className="text-xs font-bold text-gray-800">{user.name}</p>
                <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
              </div>
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="w-full text-left text-xs font-medium text-red-600 hover:bg-red-50 p-1 rounded-md transition cursor-pointer"
              >
                Log out
              </button>
            </div>
          )}
        </div>

        {/* Logo Section */}
        <div className="flex justify-center my-2">
          <div className="relative w-48 h-20">
            <Image
              src="/logo.jpeg"
              alt="Company Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
          Payment
        </h2>

        {/* Bank Account Info Card */}
        <div className="space-y-4">
          <div>
            <h3 className="text-xs font-bold text-gray-700 mb-2">
              Bank Account Info
            </h3>
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 text-xs space-y-2.5">
              <div className="font-bold text-emerald-700 border-b border-slate-200 pb-2 text-xs">
                {bankDetails.bankName}
              </div>

              <div>
                <span className="text-gray-400 text-[10px] block uppercase font-medium">Account Name</span>
                <span className="font-bold text-slate-800 text-xs">{bankDetails.accountName}</span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-gray-400 text-[10px] block uppercase font-medium">Account No.</span>
                <span className="font-mono font-semibold text-slate-800 text-xs">{bankDetails.accountNo}</span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-gray-400 text-[10px] block uppercase font-medium">IBAN</span>
                <span className="font-mono font-semibold text-slate-800 break-all text-[11px]">{bankDetails.iban}</span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-gray-400 text-[10px] block uppercase font-medium">BIC</span>
                <span className="font-mono font-semibold text-slate-800 text-xs">{bankDetails.bic}</span>
              </div>

              {price && (
                <div className="text-center pt-2 border-t border-slate-200">
                  <span className="text-emerald-700 font-bold text-sm">
                    Amount to pay: {price}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Upload Slip Section */}
          <div>
            <h3 className="text-xs font-bold text-gray-700 mb-2">
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
              className="w-full py-3 px-3 border border-dashed border-gray-300 hover:border-emerald-600 bg-gray-50/50 hover:bg-emerald-50/30 rounded-xl text-xs font-semibold text-gray-700 hover:text-emerald-700 transition active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
            >
              {selectedFile ? (
                <span className="text-emerald-700 font-bold truncate text-xs">
                  ✓ {selectedFile.name}
                </span>
              ) : (
                <span className="text-gray-600 font-medium flex items-center gap-1.5 text-xs">
                  <span>📁</span> Choose File / Photo / Camera
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <form onSubmit={handleConfirm} className="w-full pt-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-1/3 py-3.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition active:scale-95 duration-150 cursor-pointer text-center"
          >
            ← Back
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-2/3 py-3.5 px-3 bg-[#2c3e50] hover:bg-slate-800 active:bg-slate-900 text-white font-semibold rounded-xl text-xs transition active:scale-95 duration-150 cursor-pointer disabled:opacity-50 shadow-sm text-center"
          >
            {isSubmitting ? 'Uploading Slip...' : 'Confirm'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function BankTransferPage() {
  return (
    <main className="min-h-screen w-full bg-white flex flex-col items-center justify-between p-4 font-sans">
      <Suspense fallback={<div className="text-xs text-gray-500 my-auto">Loading...</div>}>
        <BankTransferContent />
      </Suspense>
      <footer className="py-2 text-center text-[10px] text-gray-400 shrink-0">
        © Getaway Cleaning Service
      </footer>
    </main>
  );
}