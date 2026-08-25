'use client';

import { useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';

function BankTransferContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ดึงค่า Query Parameters ที่ส่งมาจากหน้า Payment
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
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reference สำหรับ Input Files
  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // ข้อมูลบัญชี ALPHA BANK
  const bankDetails = {
    bankName: 'ALPHA BANK 1 (Rental - Sublets)',
    accountName: 'REALSOL CYPRUS LTD',
    accountNo: '651-101-012445-8',
    iban: 'CY61009006510006511010124458',
    bic: 'ABKLCY2N',
  };

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
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
      // 1. สร้างชื่อไฟล์ที่ไม่ซ้ำกัน
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      // 2. อัปโหลดไฟล์ไปยัง Supabase Storage (Bucket: slips)
      const { error: uploadError } = await supabase.storage
        .from('slips')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Upload slip failed: ${uploadError.message}`);
      }

      // 3. ดึง Public URL ของไฟล์ที่อัปโหลดสำเร็จ
      const { data: publicUrlData } = supabase.storage
        .from('slips')
        .getPublicUrl(filePath);

      const slipUrl = publicUrlData.publicUrl;

      // 4. สุ่มรหัส Booking Reference
      const bookingRef = `REF-${Math.floor(100000 + Math.random() * 900000)}`;

      // 5. บันทึกข้อมูลการจองลงตาราง bookings (พร้อม URL สลิป)
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

      if (insertError) {
        throw new Error(`Insert booking failed: ${insertError.message}`);
      }

      // 📧 5.5 ยิง API ส่งอีเมลแจ้งเตือนลูกค้า และ Admin (info@getaway-homes.com)
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
          }),
        });
      } catch (notifyErr) {
        console.error('Failed to send email notification:', notifyErr);
      }

      // 6. เปลี่ยนหน้าไปยัง Confirmation
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
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 w-full max-w-md relative flex flex-col items-center">
      {/* Profile Menu Top Right */}
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
              className="w-full text-left text-xs font-medium text-red-600 hover:bg-red-50 p-1.5 rounded-md transition cursor-pointer"
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
          className="object-contain"
          style={{ width: 'auto', height: 'auto' }}
          priority
        />
      </div>

      {/* Title */}
      <h2 className="text-lg font-bold text-gray-800 mb-6 text-center">
        Payment
      </h2>

      <form onSubmit={handleConfirm} className="w-full space-y-6">
        {/* Bank Account Info Card */}
        <div>
          <h3 className="text-xs font-bold text-gray-700 mb-2">
            Bank Account Info
          </h3>
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-xs space-y-3">
            {/* Bank Name */}
            <div className="font-bold text-emerald-700 border-b border-slate-200 pb-2 text-xs">
              {bankDetails.bankName}
            </div>

            {/* Account Name */}
            <div>
              <span className="text-gray-400 text-[10px] block uppercase font-medium">Account Name</span>
              <span className="font-bold text-slate-800">{bankDetails.accountName}</span>
            </div>

            {/* Account No */}
            <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200">
              <div>
                <span className="text-gray-400 text-[10px] block uppercase font-medium">Account No.</span>
                <span className="font-mono font-semibold text-slate-800">{bankDetails.accountNo}</span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(bankDetails.accountNo, 'acc')}
                className="text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-bold transition active:scale-95 cursor-pointer"
              >
                {copiedField === 'acc' ? 'Copied!' : '[Copy]'}
              </button>
            </div>

            {/* IBAN */}
            <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200">
              <div className="pr-2 min-w-0">
                <span className="text-gray-400 text-[10px] block uppercase font-medium">IBAN</span>
                <span className="font-mono font-semibold text-slate-800 break-all text-[11px]">{bankDetails.iban}</span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(bankDetails.iban, 'iban')}
                className="text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-bold transition active:scale-95 shrink-0 cursor-pointer"
              >
                {copiedField === 'iban' ? 'Copied!' : '[Copy]'}
              </button>
            </div>

            {/* BIC */}
            <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200">
              <div>
                <span className="text-gray-400 text-[10px] block uppercase font-medium">BIC</span>
                <span className="font-mono font-semibold text-slate-800">{bankDetails.bic}</span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(bankDetails.bic, 'bic')}
                className="text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-bold transition active:scale-95 cursor-pointer"
              >
                {copiedField === 'bic' ? 'Copied!' : '[Copy]'}
              </button>
            </div>

            {/* Amount to pay */}
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

          <div className="w-full p-2.5 border border-gray-300 rounded-lg text-center text-xs text-gray-600 bg-white mb-3 min-h-[40px] flex items-center justify-center">
            {selectedFile ? (
              <span className="text-emerald-700 font-semibold truncate px-2">
                ✓ {selectedFile.name}
              </span>
            ) : (
              'No file selected'
            )}
          </div>

          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="py-2.5 px-2 border border-gray-300 hover:border-emerald-600 hover:bg-emerald-50/50 rounded-lg text-xs font-semibold text-gray-700 hover:text-emerald-700 transition active:scale-95 text-center bg-white cursor-pointer"
            >
              Photos
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="py-2.5 px-2 border border-gray-300 hover:border-emerald-600 hover:bg-emerald-50/50 rounded-lg text-xs font-semibold text-gray-700 hover:text-emerald-700 transition active:scale-95 text-center bg-white cursor-pointer"
            >
              File
            </button>

            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="py-2.5 px-2 border border-gray-300 hover:border-emerald-600 hover:bg-emerald-50/50 rounded-lg text-xs font-semibold text-gray-700 hover:text-emerald-700 transition active:scale-95 text-center bg-white cursor-pointer"
            >
              Camera
            </button>
          </div>
        </div>

        {/* Confirm Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-slate-700 hover:bg-slate-800 active:bg-slate-900 text-white font-semibold rounded-lg text-xs transition active:scale-95 duration-150 cursor-pointer disabled:opacity-50"
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
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 relative">
      <Suspense fallback={<div className="text-xs text-gray-500">Loading...</div>}>
        <BankTransferContent />
      </Suspense>
    </main>
  );
}