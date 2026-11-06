'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

// ==========================================
// 1. SVG ICONS SECTION
// ==========================================
function BankIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.5M4.5 21V10.5M3 21h18" />
    </svg>
  );
}

function CashIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6H2.25m0 0v10.5m0-10.5h19.5m0 0v10.5m0-10.5h.75a.75.75 0 01.75.75v.75m0 0a60.07 60.07 0 00-15.797 2.101c-.727.198-1.453-.342-1.453-1.096V6m19.5 0v.75a.75.75 0 01-.75.75H21m-9 7.5a3 3 0 100-6 3 3 0 000 6z" />
    </svg>
  );
}

function CopyIcon({ className = "w-3.5 h-3.5 sm:w-4 sm:h-4" }: { className?: string }) {
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

const formatTimeToDatabase = (timeSlot: string | null | undefined): string | null => {
  if (!timeSlot) return '09:00:00';
  const lower = timeSlot.toLowerCase().trim();
  
  if (lower === 'morning') return '09:00:00';
  if (lower === 'afternoon') return '13:00:00';
  if (lower === 'evening') return '17:00:00';

  if (lower.includes(':')) {
    return lower.length === 5 ? `${lower}:00` : lower;
  }

  return '09:00:00';
};

const getLocalToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ==========================================
// 2. MAIN PAYMENT CONTENT
// ==========================================
function PaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const apartment = searchParams.get('apartment') || searchParams.get('address') || '';
  const program = searchParams.get('program') || searchParams.get('service') || 'Turnover Cleaning';
  const room = searchParams.get('room') || '1';
  const rawPrice = searchParams.get('price') || '150';
  
  const paramServiceId = searchParams.get('service_id') || '';
  const rawDate = searchParams.get('date') || searchParams.get('scheduled_date') || getLocalToday();
  const rawTime = searchParams.get('time') || searchParams.get('scheduled_time') || 'morning';

  const [customerData, setCustomerData] = useState({
    name: searchParams.get('name') || '',
    email: searchParams.get('email') || '',
    phone: searchParams.get('phone') || '',
    serviceId: paramServiceId,
  });

  const [paymentMethod, setPaymentMethod] = useState<'bank' | 'cash'>('bank');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    let name = customerData.name;
    let email = customerData.email;
    let phone = customerData.phone;
    let sId = customerData.serviceId;

    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('bookingData');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (!name) name = parsed.name || parsed.customer_name || '';
          if (!email) email = parsed.email || parsed.customer_email || '';
          if (!phone) phone = parsed.phone || parsed.customer_phone || '';
          if (!sId) sId = parsed.service_id || '';
        } catch (e) {}
      }

      if (!name) name = localStorage.getItem('user_name') || '';
      if (!email) email = localStorage.getItem('user_email') || '';
      if (!phone) phone = localStorage.getItem('user_phone') || '';
    }

    setCustomerData({
      name: name && name !== 'Guest' ? name : '',
      email: email || '',
      phone: phone || '',
      serviceId: sId || '',
    });
  }, [searchParams]);

  const sanitizedPrice = rawPrice.replace(/[^0-9.]/g, '');
  const numericPrice = Number(sanitizedPrice) || 0;
  
  const formattedPrice = numericPrice.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

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

  const handleSlipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSlipFile(e.target.files[0]);
    }
  };

  const handleContinue = async () => {
    if (paymentMethod === 'bank' && !slipFile) {
      alert('Please upload your payment slip before proceeding.');
      return;
    }

    setIsUploading(true);

    try {
      let activeUserId: string | null = null;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        activeUserId = user?.id || null;

        if (activeUserId) {
          const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('id', activeUserId)
            .maybeSingle();

          if (!existingUser) {
            await supabase.from('users').insert({
              id: activeUserId,
              email: user?.email || customerData.email || 'customer@example.com',
              full_name: user?.user_metadata?.full_name || customerData.name || 'Customer User',
              role: 'customer',
            });
          }
        }
      } catch (userErr) {
        console.warn('User session check warning:', userErr);
      }

      const generatedRef = `BK-${Math.floor(100000 + Math.random() * 900000)}`;
      const formattedTime = formatTimeToDatabase(rawTime);

      let uploadedSlipUrl = '';
      if (paymentMethod === 'bank' && slipFile) {
        try {
          const fileExt = slipFile.name.split('.').pop();
          const fileName = `${generatedRef}_${Date.now()}.${fileExt}`;
          const filePath = `${fileName}`;

          const { error: uploadErr } = await supabase
            .storage
            .from('slips')
            .upload(filePath, slipFile);

          if (!uploadErr) {
            const { data: urlData } = supabase
              .storage
              .from('slips')
              .getPublicUrl(filePath);

            uploadedSlipUrl = urlData?.publicUrl || filePath;
          }
        } catch (storageErr) {
          console.error('Storage upload error:', storageErr);
        }
      }

      const finalName = customerData.name || 'Customer';
      const finalEmail = customerData.email || '';
      const finalPhone = customerData.phone || '';

      let finalServiceId: string | null = customerData.serviceId || null;
      if (!finalServiceId && supabase) {
        const pName = program.includes('Turnover') ? 'Turnover Cleaning' : 'General Cleaning';
        const searchName = `${room} Bedroom - ${pName}`;
        
        const { data: sRecord } = await supabase
          .from('services')
          .select('id')
          .eq('name', searchName)
          .maybeSingle();
          
        if (sRecord?.id) {
          finalServiceId = sRecord.id;
        }
      }

      let createdBookingId: string | null = null;
      const bookingPayload: any = {
        booking_ref: generatedRef,
        service_id: finalServiceId,
        program_name: program,
        address: apartment || 'Main Address',
        address_line: apartment || 'Main Address',
        scheduled_date: rawDate,
        booking_date: rawDate ? new Date(rawDate).toISOString() : null,
        scheduled_time: formattedTime,
        service_type: 'holiday',
        status: 'Scheduled',
        total_amount: numericPrice,
        slip_url: uploadedSlipUrl,
        customer_name: finalName || null,
        customer_email: finalEmail || null,
        customer_phone: finalPhone || null,
        details: JSON.stringify({
          room: room,
          payment_method: paymentMethod,
          payment_slip: uploadedSlipUrl,
          property: apartment,
          service_type: 'holiday',
          payment_status: paymentMethod === 'bank' ? 'Pending Verification' : 'Pay with Cash on Arrival',
          customer_name: finalName,
          customer_email: finalEmail,
          customer_phone: finalPhone,
        }),
      };

      if (activeUserId) {
        bookingPayload.customer_id = activeUserId;
        bookingPayload.user_id = activeUserId;
      }

      const { data: bookingResult, error: bookingError } = await supabase
        .from('bookings')
        .insert([bookingPayload])
        .select()
        .maybeSingle();

      if (bookingError) {
        console.error('Booking insert error:', bookingError);
      } else if (bookingResult) {
        createdBookingId = bookingResult.id;
      }

      const paymentPayload: any = {
        booking_id: createdBookingId || null,
        amount: numericPrice,
        payment_method: paymentMethod === 'bank' ? 'bank_transfer' : 'cash',
        status: 'pending',
        proof_of_payment_url: uploadedSlipUrl || null,
        transaction_id: `TXN-${generatedRef}`,
        paid_at: new Date().toISOString(),
      };

      await supabase.from('payments').insert([paymentPayload]);

      try {
        const notificationPayload: any = {
          user_id: activeUserId || null,
          title: 'New Booking Created',
          message: `Booking REF: ${generatedRef} (${program}) created by ${finalName}. Method: ${paymentMethod === 'bank' ? 'Bank Transfer' : 'Cash'}. Amount: €${numericPrice}`,
          booking_id: createdBookingId || null,
          is_read: false
        };

        await supabase.from('notifications').insert([notificationPayload]);
      } catch (notifErr) {}

      setIsUploading(false);

      const confirmQuery = new URLSearchParams({
        program,
        room,
        price: numericPrice.toString(),
        method: paymentMethod,
        ref: generatedRef,
        customerName: finalName,
        email: finalEmail,
        phone: finalPhone,
        address: apartment,
        date: rawDate,
        time: rawTime,
      }).toString();

      router.push(`/customer/confirmation?${confirmQuery}`);

    } catch (err: any) {
      console.error('Unexpected error:', err);
      alert(`Unexpected Error: ${err.message || 'Please try again'}`);
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 sm:space-y-6">
      <div className="w-full text-center space-y-0.5 sm:space-y-1">
        <h1 className="text-lg sm:text-2xl font-bold text-[#1E2B37]">Payment</h1>
        <p className="text-xs sm:text-sm text-[#8E9B9E] font-normal">Complete your payment details to confirm booking</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* Left Column: Booking Summary & Payment Methods */}
        <div className="lg:col-span-5 space-y-4 sm:space-y-5">
          <div className="p-3.5 sm:p-5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl sm:rounded-2xl space-y-2.5 sm:space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">Booking Summary</span>
              <span className="text-[10px] sm:text-[11px] font-medium px-2 py-0.5 bg-white border border-[#E2E8F0] text-slate-600 rounded-full">Overview</span>
            </div>
            {apartment && (
              <div className="space-y-0.5">
                <span className="text-[11px] sm:text-xs font-medium text-slate-500">Property</span>
                <p className="text-xs sm:text-sm font-bold text-[#1E2B37] leading-relaxed break-words">{apartment}</p>
              </div>
            )}
            <div className="space-y-0.5 pt-0.5">
              <span className="text-[11px] sm:text-xs font-medium text-slate-500">Service Program</span>
              <p className="text-xs sm:text-sm font-bold text-[#1E2B37] leading-relaxed break-words">{program}</p>
            </div>
            <div className="flex justify-between items-center text-xs sm:text-sm pt-2 border-t border-[#E2E8F0]">
              <span className="text-slate-500 font-medium text-xs sm:text-sm">Selected Unit</span>
              <span className="px-2 py-0.5 bg-white border border-[#E2E8F0] rounded-lg text-xs font-bold text-[#1E2B37]">{room} Bedroom(s)</span>
            </div>
            <div className="pt-1">
              <div className="flex justify-between items-center p-3 sm:p-3.5 bg-[#EAF3F9] border border-[#BAE6FD] rounded-xl text-[#1E2B37]">
                <span className="text-xs sm:text-sm font-semibold text-[#006AFF]">Total Price</span>
                <span className="text-lg sm:text-2xl font-black tracking-tight text-[#006AFF]">€{formattedPrice}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">Select Payment Method</p>
            <div className="grid grid-cols-1 gap-2 sm:gap-2.5">
              {/* Option 1: Bank Transfer */}
              <label
                onClick={() => setPaymentMethod('bank')}
                className={`flex items-center justify-between p-3 sm:p-3.5 rounded-xl border transition-all duration-150 cursor-pointer ${
                  paymentMethod === 'bank' ? 'border-[#006AFF] bg-[#EAF3F9] text-[#006AFF]' : 'border-[#E2E8F0] bg-white text-[#1E2B37]'
                }`}
              >
                <div className="flex items-center space-x-2.5 sm:space-x-3">
                  <div className={`p-2 rounded-lg ${paymentMethod === 'bank' ? 'bg-[#006AFF] text-white' : 'bg-[#F1F5F9] text-[#64748B]'}`}>
                    <BankIcon />
                  </div>
                  <div>
                    <p className={`text-xs sm:text-sm ${paymentMethod === 'bank' ? 'font-bold' : 'font-semibold'}`}>Bank Transfer</p>
                    <p className="text-[10px] sm:text-xs text-[#64748B] font-normal">Direct wire or mobile banking</p>
                  </div>
                </div>
                <input type="radio" checked={paymentMethod === 'bank'} onChange={() => setPaymentMethod('bank')} className="w-4 h-4 text-[#006AFF]" />
              </label>

              {/* Option 2: Cash Payment */}
              <label
                onClick={() => setPaymentMethod('cash')}
                className={`flex items-center justify-between p-3 sm:p-3.5 rounded-xl border transition-all duration-150 cursor-pointer ${
                  paymentMethod === 'cash' ? 'border-[#006AFF] bg-[#EAF3F9] text-[#006AFF]' : 'border-[#E2E8F0] bg-white text-[#1E2B37]'
                }`}
              >
                <div className="flex items-center space-x-2.5 sm:space-x-3">
                  <div className={`p-2 rounded-lg ${paymentMethod === 'cash' ? 'bg-[#006AFF] text-white' : 'bg-[#F1F5F9] text-[#64748B]'}`}>
                    <CashIcon />
                  </div>
                  <div>
                    <p className={`text-xs sm:text-sm ${paymentMethod === 'cash' ? 'font-bold' : 'font-semibold'}`}>Cash on Service</p>
                    <p className="text-[10px] sm:text-xs text-[#64748B] font-normal">Pay directly to staff on arrival</p>
                  </div>
                </div>
                <input type="radio" checked={paymentMethod === 'cash'} onChange={() => setPaymentMethod('cash')} className="w-4 h-4 text-[#006AFF]" />
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Bank Details OR Cash Info */}
        <div className="lg:col-span-7 h-full flex flex-col justify-between space-y-4 sm:space-y-5">
          {paymentMethod === 'bank' ? (
            <div className="p-3.5 sm:p-5 bg-[#F8FAFC] rounded-xl sm:rounded-2xl border border-[#E2E8F0] space-y-3 sm:space-y-4">
              <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">Bank Transfer Information</p>
              
              <div className="p-3 sm:p-4 bg-white rounded-xl border border-[#E2E8F0] space-y-2.5 sm:space-y-3 shadow-2xs">
                <div>
                  <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 uppercase tracking-wider">Bank Name</p>
                  <p className="text-xs sm:text-sm font-bold text-[#1E2B37] mt-0.5">{bankDetails.bankName}</p>
                </div>

                <div className="pt-2 sm:pt-2.5 border-t border-[#F1F5F9]">
                  <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 uppercase tracking-wider">Account Name</p>
                  <p className="text-xs sm:text-sm font-bold text-[#1E2B37] mt-0.5">{bankDetails.accountName}</p>
                </div>

                {/* Account Number */}
                <div className="pt-2 sm:pt-2.5 border-t border-[#F1F5F9] flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 uppercase tracking-wider">Account No.</p>
                    <p className="text-sm sm:text-base font-mono font-bold text-[#0F172A] tracking-wider tabular-nums mt-0.5 select-all truncate">
                      {bankDetails.accountNo}
                    </p>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => handleCopy(bankDetails.accountNo, 'accountNo')} 
                    className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-[#F1F5F9] hover:bg-[#E2E8F0] active:scale-95 rounded-lg text-[11px] sm:text-xs font-semibold text-[#1E2B37] flex items-center gap-1 sm:gap-1.5 transition cursor-pointer shrink-0"
                  >
                    <CopyIcon /> {copiedField === 'accountNo' ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                {/* IBAN */}
                <div className="pt-2 sm:pt-2.5 border-t border-[#F1F5F9] flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 uppercase tracking-wider">IBAN</p>
                    <p className="text-xs sm:text-sm font-mono font-bold text-[#0F172A] tracking-wider tabular-nums break-all mt-0.5 select-all">
                      {bankDetails.iban.replace(/(.{4})/g, '$1 ').trim()}
                    </p>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => handleCopy(bankDetails.iban, 'iban')} 
                    className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-[#F1F5F9] hover:bg-[#E2E8F0] active:scale-95 rounded-lg text-[11px] sm:text-xs font-semibold text-[#1E2B37] flex items-center gap-1 sm:gap-1.5 transition cursor-pointer shrink-0"
                  >
                    <CopyIcon /> {copiedField === 'iban' ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                {/* BIC / SWIFT */}
                <div className="pt-2 sm:pt-2.5 border-t border-[#F1F5F9] flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 uppercase tracking-wider">BIC / SWIFT</p>
                    <p className="text-xs sm:text-sm font-mono font-bold text-[#1E2B37] tracking-widest mt-0.5 select-all">
                      {bankDetails.bic}
                    </p>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => handleCopy(bankDetails.bic, 'bic')} 
                    className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-[#F1F5F9] hover:bg-[#E2E8F0] active:scale-95 rounded-lg text-[11px] sm:text-xs font-semibold text-[#1E2B37] flex items-center gap-1 sm:gap-1.5 transition cursor-pointer shrink-0"
                  >
                    <CopyIcon /> {copiedField === 'bic' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Upload Payment Slip */}
              <div className="space-y-1">
                <label className="text-[11px] sm:text-xs font-semibold text-[#1E2B37]">Upload Payment Slip <span className="text-red-500">*</span></label>
                <div className="relative border-2 border-dashed border-[#CBD5E1] hover:border-[#006AFF] rounded-xl p-3 sm:p-4 text-center bg-white cursor-pointer transition-colors">
                  <input type="file" accept="image/*,.pdf" onChange={handleSlipChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-base" />
                  <div className="flex flex-col items-center space-y-1">
                    <div className="p-1.5 sm:p-2 bg-[#F1F5F9] rounded-full text-[#006AFF]">
                      <UploadIcon />
                    </div>
                    <p className="text-xs font-bold text-[#1E2B37] break-all px-2">{slipFile ? slipFile.name : 'Click to upload payment slip'}</p>
                    <p className="text-[10px] text-slate-400 font-normal">PNG, JPG or PDF up to 5MB</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Cash Payment Information Box */
            <div className="p-3.5 sm:p-5 bg-[#F8FAFC] rounded-xl sm:rounded-2xl border border-[#E2E8F0] space-y-3 sm:space-y-4">
              <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">Cash Payment Instructions</p>
              
              <div className="p-4 sm:p-5 bg-white rounded-xl border border-[#E2E8F0] space-y-3 sm:space-y-4 shadow-2xs">
                <div className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800">
                  <span className="text-lg sm:text-xl shrink-0">💵</span>
                  <div>
                    <p className="text-xs font-bold">Pay upon arrival</p>
                    <p className="text-[10px] sm:text-[11px] text-emerald-700 font-normal leading-relaxed">Please prepare exact cash to give directly to our cleaning crew.</p>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs leading-relaxed">
                  <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                    <span className="font-medium text-slate-500 text-[11px] sm:text-xs">Total Amount Due:</span>
                    <span className="font-bold text-[#1E2B37] text-xs sm:text-sm">€{formattedPrice}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                    <span className="font-medium text-slate-500 text-[11px] sm:text-xs">Payment Timing:</span>
                    <span className="font-bold text-[#1E2B37] text-[11px] sm:text-xs">Before or right after service starts</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="font-medium text-slate-500 text-[11px] sm:text-xs">Receipt:</span>
                    <span className="font-bold text-[#1E2B37] text-[11px] sm:text-xs">Issued via email automatically</span>
                  </div>
                </div>

                <div className="p-2.5 sm:p-3 bg-slate-50 rounded-lg text-[10px] sm:text-[11px] text-slate-500 font-normal">
                  ℹ️ Click <strong className="font-semibold text-slate-700">Continue</strong> to confirm your booking date & time. Our team will bring your service confirmation.
                </div>
              </div>
            </div>
          )}

          <div className="w-full pt-1 sm:pt-2 flex items-center gap-2.5 sm:gap-3">
            <button type="button" disabled={isUploading} onClick={() => router.back()} className="w-1/3 py-3 sm:py-3.5 bg-white hover:bg-slate-50 border border-[#E2E8F0] font-bold rounded-xl text-xs sm:text-sm transition cursor-pointer active:scale-98">
              ← Back
            </button>
            <button type="button" disabled={isUploading} onClick={handleContinue} className="w-2/3 py-3 sm:py-3.5 bg-[#006AFF] hover:bg-[#0057D3] text-white font-bold rounded-xl text-xs sm:text-sm disabled:opacity-50 transition cursor-pointer shadow-sm active:scale-98">
              {isUploading ? 'Confirming Booking...' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <main className="min-h-screen w-full bg-white py-3 sm:py-8 px-3.5 sm:px-6 overflow-x-hidden">
      <Suspense fallback={<div className="text-sm text-[#64748B] p-8 text-center font-normal">Loading payment page...</div>}>
        <PaymentContent />
      </Suspense>
    </main>
  );
}