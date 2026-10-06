'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

// ==========================================
// 1. SVG ICONS SECTION
// ==========================================
function CreditCardIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5M2.25 9v9a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9m-19.5 0V6a2.25 2.25 0 012.25-2.25h15A2.25 2.25 0 0121.75 6v3" />
    </svg>
  );
}

function BankIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.5M4.5 21V10.5M3 21h18" />
    </svg>
  );
}

function CopyIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v2.25A2.25 2.25 0 0113.5 21.75h-7.5A2.25 2.25 0 013.75 19.5V9.75A2.25 2.25 0 016 7.5h2.25m4.5 0H18a2.25 2.25 0 012.25 2.25v9.75A2.25 2.25 0 0118 21.75h-2.25m-4.5 0v-9.75A2.25 2.25 0 0113.5 9.75h4.5" />
    </svg>
  );
}

function UploadIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  );
}

// Helper Function สำหรับแปลงข้อความช่วงเวลาให้เป็นรูปแบบ HH:mm:ss ที่ตรงกับ Type TIME ของ Postgres
const formatTimeToDatabase = (timeSlot: string | null | undefined): string | null => {
  if (!timeSlot) return null;
  const lower = timeSlot.toLowerCase().trim();
  
  if (lower === 'morning') return '09:00:00';
  if (lower === 'afternoon') return '13:00:00';
  if (lower === 'evening') return '17:00:00';

  if (lower.includes(':')) {
    return lower.length === 5 ? `${lower}:00` : lower;
  }

  return '09:00:00';
};

// ==========================================
// 2. MAIN PAYMENT CONTENT
// ==========================================
function PaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ------------------------------------------
  // 2.1 GET URL PARAMS & DATA FORMATTING
  // ------------------------------------------
  const apartment = searchParams.get('apartment') || '';
  const program = searchParams.get('program') || searchParams.get('service') || 'Turnover Cleaning';
  const room = searchParams.get('room') || '1';
  const rawPrice = searchParams.get('price') || '150';

  // URL Query Fallbacks
  const urlName = searchParams.get('name') || searchParams.get('customer_name') || searchParams.get('fullname') || '';
  const urlEmail = searchParams.get('email') || searchParams.get('customer_email') || '';
  const urlPhone = searchParams.get('phone') || searchParams.get('mobile') || searchParams.get('tel') || searchParams.get('phone_number') || '';

  const sanitizedPrice = rawPrice.replace(/[^0-9.]/g, '');
  const numericPrice = Number(sanitizedPrice) || 0;
  
  const formattedPrice = numericPrice.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // ------------------------------------------
  // 2.2 COMPONENT STATES
  // ------------------------------------------
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'bank'>('card');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [slipFile, setSlipFile] = useState<File | null>(null);

  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: '',
  });

  const bankDetails = {
    bankName: 'ALPHA BANK 1 (Rental - Sublets)',
    accountName: 'REALSOL CYPRUS LTD',
    accountNo: '651-101-012445-8',
    iban: 'CY61009006510006511010124458',
    bic: 'ABKLCY2N',
  };

  // ------------------------------------------
  // 2.3 HANDLER FUNCTIONS
  // ------------------------------------------
  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSlipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSlipFile(e.target.files[0]);
    }
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 16) value = value.slice(0, 16);
    const formatted = value.match(/.{1,4}/g)?.join(' ') || value;
    setCardDetails((prev) => ({ ...prev, cardNumber: formatted }));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 4) value = value.slice(0, 4);
    if (value.length >= 3) {
      value = `${value.slice(0, 2)}/${value.slice(2)}`;
    }
    setCardDetails((prev) => ({ ...prev, expiryDate: value }));
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 3);
    setCardDetails((prev) => ({ ...prev, cvv: value }));
  };

  const handleContinue = async () => {
    if (paymentMethod === 'card') {
      if (!cardDetails.cardNumber || !cardDetails.cardName || !cardDetails.expiryDate || !cardDetails.cvv) {
        alert('Please fill in all credit card details.');
        return;
      }
    } else {
      if (!slipFile) {
        alert('Please upload your payment slip before proceeding.');
        return;
      }
    }

    // ดึงข้อมูล bookingData ที่บันทึกไว้จาก sessionStorage
    let storedBookingData: Record<string, any> = {};
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('bookingData');
      if (saved) {
        try {
          storedBookingData = JSON.parse(saved);
        } catch (e) {
          console.error('Error parsing bookingData from sessionStorage:', e);
        }
      }
    }

    // 📌 ดึงค่า Customer Name รองรับทุก Key
    const customerName = 
      storedBookingData.name || 
      storedBookingData.customerName || 
      storedBookingData.customer_name || 
      storedBookingData.fullName || 
      urlName || 
      null;

    // 📌 ดึงค่า Email รองรับทุก Key
    const customerEmail = 
      storedBookingData.email || 
      storedBookingData.customerEmail || 
      storedBookingData.customer_email || 
      urlEmail || 
      null;

    // 📌 ดึงค่า Phone รองรับทุก Key (ครอบคลุม phone, mobile, tel, phoneNumber, customerPhone)
    const customerPhone = 
      storedBookingData.phone || 
      storedBookingData.phoneNumber || 
      storedBookingData.phone_number || 
      storedBookingData.mobile || 
      storedBookingData.tel || 
      storedBookingData.customerPhone || 
      storedBookingData.customer_phone || 
      urlPhone || 
      null;

    const generatedRef = `HOL-${Math.floor(100000 + Math.random() * 900000)}`;
    const validScheduledTime = formatTimeToDatabase(storedBookingData.timeSlot || storedBookingData.time);

    try {
      // 📌 บันทึกข้อมูลลงตาราง bookings ใน Supabase
      const { error } = await supabase.from('bookings').insert([
        {
          booking_ref: generatedRef,
          customer_name: customerName,
          email: customerEmail,
          phone: customerPhone,
          address_line: apartment || storedBookingData.property || storedBookingData.address || '',
          scheduled_date: storedBookingData.date || storedBookingData.scheduled_date || null,
          scheduled_time: validScheduledTime,
          price: numericPrice,
          payment_method: paymentMethod,
          payment_status: paymentMethod === 'card' ? 'paid' : 'pending_verification',
          status: 'confirmed',
        },
      ]);

      if (error) {
        console.error('Error saving booking to Supabase:', error);
        alert(`Failed to save booking: ${error.message}`);
        return;
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('An unexpected error occurred. Please try again.');
      return;
    }

    router.push(`/customer/confirmation?program=${encodeURIComponent(program)}&room=${room}&price=${numericPrice}&method=${paymentMethod}&ref=${generatedRef}`);
  };

  // ------------------------------------------
  // 2.4 JSX RENDER
  // ------------------------------------------
  return (
    <div className="w-full max-w-5xl bg-white p-6 sm:p-10 lg:p-12 rounded-3xl shadow-sm border border-[#E2E8F0] space-y-8">
      
      {/* PAGE HEADER */}
      <div className="w-full text-center space-y-1 pb-4 border-b border-[#F1F5F9]">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight">Payment</h1>
        <p className="text-xs sm:text-sm text-[#64748B]">Complete your payment details to confirm booking</p>
      </div>

      {/* RESPONSIVE GRID LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: SUMMARY & METHOD SELECTOR */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* BOOKING SUMMARY BOX */}
          <div className="p-5 sm:p-6 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Booking Summary</span>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 bg-white border border-[#E2E8F0] text-[#334155] rounded-full">Overview</span>
            </div>
            
            {/* Property */}
            {apartment && (
              <div className="space-y-1">
                <span className="text-xs font-medium text-[#64748B]">Property</span>
                <p className="text-sm font-semibold text-[#0F172A] leading-relaxed break-words">
                  {apartment}
                </p>
              </div>
            )}

            {/* Service Program */}
            <div className="space-y-1 pt-1">
              <span className="text-xs font-medium text-[#64748B]">Service Program</span>
              <p className="text-sm font-semibold text-[#0F172A] leading-relaxed break-words">
                {program}
              </p>
            </div>

            {/* Bedrooms Count */}
            <div className="flex justify-between items-center text-sm pt-2 border-t border-[#E2E8F0]">
              <span className="text-[#64748B] font-medium">Selected Unit</span>
              <span className="px-2.5 py-1 bg-white border border-[#E2E8F0] rounded-lg text-xs font-bold text-[#0F172A]">
                {room} Bedroom(s)
              </span>
            </div>

            {/* TOTAL PRICE BOX */}
            <div className="pt-2">
              <div className="flex justify-between items-center p-4 bg-[#F0F7FF] border border-[#BAE6FD] rounded-xl text-[#0F172A]">
                <span className="text-sm font-semibold text-[#0284C7]">Total Price</span>
                <span className="text-2xl font-black tracking-tight text-[#0369A1]">€{formattedPrice}</span>
              </div>
            </div>
          </div>

          {/* PAYMENT METHOD SELECTOR */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Select Payment Method</p>
            
            <div className="grid grid-cols-1 gap-3">
              {/* Option 1: Credit Card */}
              <label
                onClick={() => setPaymentMethod('card')}
                className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-150 cursor-pointer touch-manipulation ${
                  paymentMethod === 'card'
                    ? 'border-[#0F172A] bg-[#F8FAFC] ring-1 ring-[#0F172A]'
                    : 'border-[#E2E8F0] hover:border-[#94A3B8] bg-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2.5 rounded-xl transition-colors ${paymentMethod === 'card' ? 'bg-[#0F172A] text-white' : 'bg-[#F1F5F9] text-[#64748B]'}`}>
                    <CreditCardIcon />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A]">Credit / Debit Card</p>
                    <p className="text-xs text-[#64748B]">Visa, Mastercard</p>
                  </div>
                </div>
                <input
                  type="radio"
                  name="paymentOption"
                  checked={paymentMethod === 'card'}
                  onChange={() => setPaymentMethod('card')}
                  className="w-4 h-4 text-[#0F172A] accent-[#0F172A]"
                />
              </label>

              {/* Option 2: Bank Transfer */}
              <label
                onClick={() => setPaymentMethod('bank')}
                className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-150 cursor-pointer touch-manipulation ${
                  paymentMethod === 'bank'
                    ? 'border-[#0F172A] bg-[#F8FAFC] ring-1 ring-[#0F172A]'
                    : 'border-[#E2E8F0] hover:border-[#94A3B8] bg-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2.5 rounded-xl transition-colors ${paymentMethod === 'bank' ? 'bg-[#0F172A] text-white' : 'bg-[#F1F5F9] text-[#64748B]'}`}>
                    <BankIcon />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A]">Bank Transfer</p>
                    <p className="text-xs text-[#64748B]">Direct wire or mobile banking</p>
                  </div>
                </div>
                <input
                  type="radio"
                  name="paymentOption"
                  checked={paymentMethod === 'bank'}
                  onChange={() => setPaymentMethod('bank')}
                  className="w-4 h-4 text-[#0F172A] accent-[#0F172A]"
                />
              </label>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: PAYMENT FORMS & ACTIONS */}
        <div className="lg:col-span-7 h-full flex flex-col justify-between space-y-6">
          
          {/* FORM A: CREDIT CARD FORM */}
          {paymentMethod === 'card' && (
            <div className="p-6 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] space-y-4">
              <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Card Details</p>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#0F172A]">Card Number</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="xxxx xxxx xxxx xxxx"
                  value={cardDetails.cardNumber}
                  onChange={handleCardNumberChange}
                  className="w-full px-4 py-3 bg-white border border-[#E2E8F0] rounded-xl text-base sm:text-sm text-[#0F172A] tracking-wider font-mono focus:outline-none focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#0F172A]">Name on Card</label>
                <input
                  type="text"
                  placeholder="NAME ON CARD"
                  value={cardDetails.cardName}
                  onChange={(e) => setCardDetails((prev) => ({ ...prev, cardName: e.target.value }))}
                  className="w-full px-4 py-3 bg-white border border-[#E2E8F0] rounded-xl text-base sm:text-sm text-[#0F172A] focus:outline-none focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] transition uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#0F172A]">Expiry Date</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="MM/YY"
                    value={cardDetails.expiryDate}
                    onChange={handleExpiryChange}
                    className="w-full px-4 py-3 bg-white border border-[#E2E8F0] rounded-xl text-base sm:text-sm text-[#0F172A] font-mono focus:outline-none focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] transition text-center"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#0F172A]">CVV / CVC</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={3}
                    placeholder="xxx"
                    value={cardDetails.cvv}
                    onChange={handleCvvChange}
                    className="w-full px-4 py-3 bg-white border border-[#E2E8F0] rounded-xl text-base sm:text-sm text-[#0F172A] font-mono focus:outline-none focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] transition text-center"
                  />
                </div>
              </div>
            </div>
          )}

          {/* FORM B: BANK TRANSFER INFO & SLIP UPLOAD */}
          {paymentMethod === 'bank' && (
            <div className="p-6 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] space-y-5">
              <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Bank Transfer Information</p>

              <div className="p-4 bg-white rounded-xl border border-[#E2E8F0] space-y-3">
                <div>
                  <p className="text-xs text-[#64748B] font-medium">Bank Name</p>
                  <p className="text-sm font-bold text-[#0F172A]">{bankDetails.bankName}</p>
                </div>

                <div className="pt-2 border-t border-[#F1F5F9]">
                  <p className="text-xs text-[#64748B] font-medium">Account Name</p>
                  <p className="text-sm font-semibold text-[#0F172A]">{bankDetails.accountName}</p>
                </div>

                <div className="pt-2 border-t border-[#F1F5F9] flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[#64748B] font-medium">Account No.</p>
                    <p className="text-sm font-mono font-bold text-[#0F172A]">{bankDetails.accountNo}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(bankDetails.accountNo, 'accountNo')}
                    className="px-3 py-1.5 bg-[#F1F5F9] hover:bg-[#E2E8F0] rounded-lg text-xs font-semibold text-[#0F172A] flex items-center gap-1.5 transition"
                  >
                    <CopyIcon />
                    {copiedField === 'accountNo' ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                <div className="pt-2 border-t border-[#F1F5F9] flex items-center justify-between">
                  <div className="pr-2">
                    <p className="text-xs text-[#64748B] font-medium">IBAN</p>
                    <p className="text-xs font-mono font-bold text-[#0F172A] break-all">{bankDetails.iban}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(bankDetails.iban, 'iban')}
                    className="px-3 py-1.5 bg-[#F1F5F9] hover:bg-[#E2E8F0] rounded-lg text-xs font-semibold text-[#0F172A] flex items-center gap-1.5 transition shrink-0"
                  >
                    <CopyIcon />
                    {copiedField === 'iban' ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                <div className="pt-2 border-t border-[#F1F5F9]">
                  <p className="text-xs text-[#64748B] font-medium">BIC / SWIFT</p>
                  <p className="text-sm font-mono font-semibold text-[#0F172A]">{bankDetails.bic}</p>
                </div>
              </div>

              {/* Slip Upload Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#0F172A]">Upload Payment Slip</label>
                <div className="relative border-2 border-dashed border-[#CBD5E1] hover:border-[#0F172A] rounded-xl p-5 text-center bg-white transition cursor-pointer">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleSlipChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center space-y-1.5">
                    <div className="p-2.5 bg-[#F1F5F9] rounded-full text-[#0F172A]">
                      <UploadIcon />
                    </div>
                    <p className="text-xs font-bold text-[#0F172A]">
                      {slipFile ? slipFile.name : 'Click to upload payment slip'}
                    </p>
                    <p className="text-[10px] text-[#64748B]">PNG, JPG or PDF up to 5MB</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ACTION BUTTONS */}
          <div className="w-full pt-4 flex items-center gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="w-1/3 py-3.5 min-h-[48px] bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#334155] font-semibold rounded-xl text-sm transition touch-manipulation"
            >
              ← Back
            </button>
            
            <button
              type="button"
              onClick={handleContinue}
              className="w-2/3 py-3.5 min-h-[48px] bg-[#0F172A] hover:bg-[#1E293B] active:scale-[0.99] text-white font-semibold rounded-xl text-sm transition shadow-sm touch-manipulation"
            >
              Continue
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}

// ==========================================
// 3. MAIN PAGE WRAPPER & EXPORT
// ==========================================
export default function PaymentPage() {
  return (
    <main className="min-h-screen w-full bg-[#F8FAFC] flex flex-col items-center justify-center p-4 sm:p-8 lg:p-12 text-[#0F172A] font-sans antialiased overflow-y-auto">
      <div className="w-full max-w-7xl mx-auto flex-1 flex flex-col items-center justify-center py-6">
        <Suspense fallback={<div className="text-sm text-[#64748B] p-8">Loading payment page...</div>}>
          <PaymentContent />
        </Suspense>
      </div>
      <footer className="w-full text-center py-4 max-w-7xl mx-auto shrink-0">
        <p className="text-xs text-[#94A3B8] font-medium">© Getaway Cleaning Service</p>
      </footer>
    </main>
  );
}