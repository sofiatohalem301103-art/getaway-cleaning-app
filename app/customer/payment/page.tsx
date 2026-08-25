'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

function BankTransferContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ดึงค่า Booking Details จาก Query String
  const room = searchParams.get('room') || '';
  const date = searchParams.get('date') || '';
  const time = searchParams.get('time') || '';
  const program = searchParams.get('program') || '';
  const price = searchParams.get('price') || '90€';

  const [file, setFile] = useState<File | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ข้อมูลบัญชีธนาคาร ALPHA BANK
  const bankDetails = {
    bankName: 'ALPHA BANK 1 (Rental - Sublets)',
    accountName: 'REALSOL CYPRUS LTD',
    accountNo: '651-101-012445-8',
    iban: 'CY61009006510006511010124458',
    bic: 'ABKLCY2N',
  };

  // ฟังก์ชันคัดลอกข้อความ
  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  // ยืนยันการชำระเงินและแจ้งเตือนเข้าระบบ
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert('Please upload your payment slip.');
      return;
    }

    setLoading(true);

    try {
      // ยิง API แจ้งเตือนการจอง/ส่งสลิป
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'sofiatohalem301103@gmail.com',
          customerName: 'Sofia Ross',
          room,
          date,
          time,
          amount: price,
          paymentMethod: 'Bank Transfer (ALPHA BANK)',
        }),
      });

      if (res.ok) {
        alert('Payment slip uploaded successfully!');
        router.push('/customer/booking');
      } else {
        alert('Failed to process payment notification.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred during submission.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 w-full max-w-md relative flex flex-col items-center">
      {/* Logo */}
      <div className="flex justify-center mb-4 pt-2">
        <Image src="/logo.jpeg" alt="Logo" width={100} height={100} className="object-contain" priority />
      </div>

      <h2 className="text-lg font-bold text-gray-800 mb-1 text-center">Bank Transfer</h2>
      <p className="text-xs text-gray-500 mb-6 text-center">Please transfer to the account below and upload your slip.</p>

      {/* ALPHA BANK Info Card */}
      <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 mb-6 text-xs text-slate-700">
        <div className="font-bold text-emerald-700 border-b border-slate-200 pb-2 flex justify-between items-center">
          <span>{bankDetails.bankName}</span>
          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">Active</span>
        </div>

        <div>
          <span className="text-gray-400 text-[10px] block uppercase font-medium">Account Name</span>
          <span className="font-bold text-slate-800">{bankDetails.accountName}</span>
        </div>

        <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200">
          <div>
            <span className="text-gray-400 text-[10px] block uppercase font-medium">Account No.</span>
            <span className="font-mono font-semibold text-slate-800">{bankDetails.accountNo}</span>
          </div>
          <button
            type="button"
            onClick={() => handleCopy(bankDetails.accountNo, 'acc')}
            className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-1 rounded transition"
          >
            {copiedField === 'acc' ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200">
          <div>
            <span className="text-gray-400 text-[10px] block uppercase font-medium">IBAN</span>
            <span className="font-mono font-semibold text-slate-800 break-all">{bankDetails.iban}</span>
          </div>
          <button
            type="button"
            onClick={() => handleCopy(bankDetails.iban, 'iban')}
            className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-1 rounded transition ml-2"
          >
            {copiedField === 'iban' ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <div className="flex justify-between items-center">
          <div>
            <span className="text-gray-400 text-[10px] block uppercase font-medium">BIC</span>
            <span className="font-mono font-semibold text-slate-800">{bankDetails.bic}</span>
          </div>
          <button
            type="button"
            onClick={() => handleCopy(bankDetails.bic, 'bic')}
            className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-1 rounded transition"
          >
            {copiedField === 'bic' ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Transfer Amount Summary */}
      <div className="w-full bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3 mb-6 text-center">
        <span className="text-xs text-emerald-800 font-medium">Total Transfer Amount: </span>
        <span className="text-base font-bold text-emerald-700">{price}</span>
      </div>

      {/* Form Upload Slip */}
      <form onSubmit={handleSubmit} className="w-full space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Upload Payment Slip *</label>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileChange}
            required
            className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer border border-gray-300 rounded-xl p-1"
          />
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold rounded-lg text-xs transition"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white font-semibold rounded-lg text-xs transition shadow-sm"
          >
            {loading ? 'Submitting...' : 'Confirm Payment'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function BankTransferPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <Suspense fallback={<div className="text-xs text-gray-500">Loading bank details...</div>}>
        <BankTransferContent />
      </Suspense>
    </main>
  );
}