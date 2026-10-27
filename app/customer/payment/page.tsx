'use client';

import { useState, useEffect, Suspense } from 'react';
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

const INPUT_BASE_CLASSES =
  'w-full px-4 py-3 bg-white border border-[#E2E8F0] rounded-xl text-base sm:text-sm text-[#0F172A] focus:outline-none focus:border-[#006AFF] focus:ring-1 focus:ring-[#006AFF] transition-colors box-border touch-manipulation';

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

  const [savedCards, setSavedCards] = useState<any[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string>('new');
  const [saveCard, setSaveCard] = useState<boolean>(true);

  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: '',
  });

  const [paymentMethod, setPaymentMethod] = useState<'card' | 'bank'>('card');
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

    const fetchUserCards = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        let query = supabase.from('user_cards').select('*');
        if (user?.id) {
          query = query.eq('user_id', user.id);
        }

        const { data: cards, error } = await query;
        if (!error && cards && cards.length > 0) {
          setSavedCards(cards);
          setSelectedCardId(cards[0].id);
        }
      } catch (err) {
        console.warn('Fetch saved cards error:', err);
      }
    };

    fetchUserCards();
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
    if (paymentMethod === 'bank' && !slipFile) {
      alert('Please upload your payment slip before proceeding.');
      return;
    }

    if (paymentMethod === 'card') {
      if (selectedCardId === 'new') {
        if (!cardDetails.cardNumber || !cardDetails.expiryDate || !cardDetails.cvv) {
          alert('Please fill in all credit card details.');
          return;
        }
      } else {
        if (!cardDetails.cvv || !cardDetails.cardName) {
          alert('Please enter Name on Card and CVC / CVV to confirm payment.');
          return;
        }
      }
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

      // 1. Save to bookings table
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
          payment_status: paymentMethod === 'bank' ? 'Pending Verification' : 'Paid',
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

      // 2. Save to payments table
      const paymentPayload: any = {
        booking_id: createdBookingId || null,
        amount: numericPrice,
        payment_method: paymentMethod === 'card' ? 'card' : 'bank_transfer',
        status: paymentMethod === 'bank' ? 'pending' : 'completed',
        proof_of_payment_url: uploadedSlipUrl || null,
        transaction_id: `TXN-${generatedRef}`,
        paid_at: new Date().toISOString(),
      };

      await supabase.from('payments').insert([paymentPayload]);

      // 3. Save to user_cards table
      if (paymentMethod === 'card' && selectedCardId === 'new' && saveCard) {
        const cleanCardNum = cardDetails.cardNumber.replace(/\s+/g, '');
        const last4Digits = cleanCardNum.slice(-4) || '0000';
        const [expMonth, rawYear] = cardDetails.expiryDate.split('/');
        const expYear = rawYear ? rawYear.slice(-2) : '';

        let brand = 'Visa';
        if (cleanCardNum.startsWith('5')) brand = 'Mastercard';
        if (cleanCardNum.startsWith('3')) brand = 'American Express';

        const cardPayload: any = {
          id: `card_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          card_brand: brand,
          last4: last4Digits,
          expiry_month: expMonth || '',
          expiry_year: expYear || '',
          is_default: true,
          user_id: activeUserId || null
        };

        const { data: cardData, error: cardError } = await supabase
          .from('user_cards')
          .insert([cardPayload])
          .select();

        if (cardError) {
          console.error('Error saving card:', cardError);
          alert(`Failed to save card: ${cardError.message}`);
        } else {
          console.log('Saved card successfully:', cardData);
        }
      }

      // 4. Save to notifications table
      try {
        const notificationPayload: any = {
          user_id: activeUserId || null,
          title: 'New Booking & Payment Created',
          message: `Booking REF: ${generatedRef} (${program}) created by ${finalName}. Amount: €${numericPrice}`,
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
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header with border-b removed */}
      <div className="w-full text-center space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold text-[#1E2B37]">Payment</h1>
        <p className="text-xs sm:text-sm text-[#8E9B9E]">Complete your payment details to confirm booking</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 space-y-5">
          <div className="p-4 sm:p-5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#E2E8F0]">
              <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Booking Summary</span>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 bg-white border border-[#E2E8F0] text-[#334155] rounded-full">Overview</span>
            </div>
            {apartment && (
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-[#64748B]">Property</span>
                <p className="text-sm font-semibold text-[#1E2B37] leading-relaxed break-words">{apartment}</p>
              </div>
            )}
            <div className="space-y-0.5 pt-0.5">
              <span className="text-xs font-medium text-[#64748B]">Service Program</span>
              <p className="text-sm font-semibold text-[#1E2B37] leading-relaxed break-words">{program}</p>
            </div>
            <div className="flex justify-between items-center text-sm pt-2 border-t border-[#E2E8F0]">
              <span className="text-[#64748B] font-medium text-xs sm:text-sm">Selected Unit</span>
              <span className="px-2.5 py-0.5 bg-white border border-[#E2E8F0] rounded-lg text-xs font-bold text-[#1E2B37]">{room} Bedroom(s)</span>
            </div>
            <div className="pt-1">
              <div className="flex justify-between items-center p-3.5 bg-[#EAF3F9] border border-[#BAE6FD] rounded-xl text-[#1E2B37]">
                <span className="text-xs sm:text-sm font-semibold text-[#006AFF]">Total Price</span>
                <span className="text-xl sm:text-2xl font-black tracking-tight text-[#006AFF]">€{formattedPrice}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Select Payment Method</p>
            <div className="grid grid-cols-1 gap-2.5">
              <label
                onClick={() => setPaymentMethod('bank')}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-150 cursor-pointer ${
                  paymentMethod === 'bank' ? 'border-[#006AFF] bg-[#EAF3F9] font-bold text-[#006AFF]' : 'border-[#E2E8F0] bg-white text-[#1E2B37]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${paymentMethod === 'bank' ? 'bg-[#006AFF] text-white' : 'bg-[#F1F5F9] text-[#64748B]'}`}>
                    <BankIcon />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Bank Transfer</p>
                    <p className="text-xs text-[#64748B] font-normal">Direct wire or mobile banking</p>
                  </div>
                </div>
                <input type="radio" checked={paymentMethod === 'bank'} onChange={() => setPaymentMethod('bank')} className="w-4 h-4 text-[#006AFF]" />
              </label>

              <label
                onClick={() => setPaymentMethod('card')}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-150 cursor-pointer ${
                  paymentMethod === 'card' ? 'border-[#006AFF] bg-[#EAF3F9] font-bold text-[#006AFF]' : 'border-[#E2E8F0] bg-white text-[#1E2B37]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${paymentMethod === 'card' ? 'bg-[#006AFF] text-white' : 'bg-[#F1F5F9] text-[#64748B]'}`}>
                    <CreditCardIcon />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Credit / Debit Card</p>
                    <p className="text-xs text-[#64748B] font-normal">Visa, Mastercard</p>
                  </div>
                </div>
                <input type="radio" checked={paymentMethod === 'card'} onChange={() => setPaymentMethod('card')} className="w-4 h-4 text-[#006AFF]" />
              </label>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 h-full flex flex-col justify-between space-y-5">
          {paymentMethod === 'bank' && (
            <div className="p-4 sm:p-5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-4">
              <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Bank Transfer Information</p>
              
              <div className="p-3.5 bg-white rounded-xl border border-[#E2E8F0] space-y-2.5">
                <div>
                  <p className="text-xs text-[#64748B] font-medium">Bank Name</p>
                  <p className="text-sm font-bold text-[#1E2B37]">{bankDetails.bankName}</p>
                </div>

                <div className="pt-2 border-t border-[#F1F5F9]">
                  <p className="text-xs text-[#64748B] font-medium">Account Name</p>
                  <p className="text-sm font-semibold text-[#1E2B37]">{bankDetails.accountName}</p>
                </div>

                <div className="pt-2 border-t border-[#F1F5F9] flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[#64748B] font-medium">Account No.</p>
                    <p className="text-sm font-mono font-bold text-[#1E2B37]">{bankDetails.accountNo}</p>
                  </div>
                  <button type="button" onClick={() => handleCopy(bankDetails.accountNo, 'accountNo')} className="px-2.5 py-1.5 bg-[#F1F5F9] hover:bg-[#E2E8F0] rounded-lg text-xs font-semibold text-[#1E2B37] flex items-center gap-1 transition">
                    <CopyIcon /> {copiedField === 'accountNo' ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                <div className="pt-2 border-t border-[#F1F5F9] flex items-center justify-between">
                  <div className="pr-2">
                    <p className="text-xs text-[#64748B] font-medium">IBAN</p>
                    <p className="text-xs font-mono font-bold text-[#1E2B37] break-all">{bankDetails.iban}</p>
                  </div>
                  <button type="button" onClick={() => handleCopy(bankDetails.iban, 'iban')} className="px-2.5 py-1.5 bg-[#F1F5F9] hover:bg-[#E2E8F0] rounded-lg text-xs font-semibold text-[#1E2B37] flex items-center gap-1 transition shrink-0">
                    <CopyIcon /> {copiedField === 'iban' ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                <div className="pt-2 border-t border-[#F1F5F9]">
                  <p className="text-xs text-[#64748B] font-medium">BIC / SWIFT</p>
                  <p className="text-sm font-mono font-semibold text-[#1E2B37]">{bankDetails.bic}</p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1E2B37]">Upload Payment Slip <span className="text-red-500">*</span></label>
                <div className="relative border-2 border-dashed border-[#CBD5E1] hover:border-[#006AFF] rounded-xl p-4 text-center bg-white cursor-pointer">
                  <input type="file" accept="image/*,.pdf" onChange={handleSlipChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-base" />
                  <div className="flex flex-col items-center space-y-1">
                    <div className="p-2 bg-[#F1F5F9] rounded-full text-[#006AFF]">
                      <UploadIcon />
                    </div>
                    <p className="text-xs font-bold text-[#1E2B37]">{slipFile ? slipFile.name : 'Click to upload payment slip'}</p>
                    <p className="text-[10px] text-[#64748B]">PNG, JPG or PDF up to 5MB</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {paymentMethod === 'card' && (
            <div className="p-4 sm:p-5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-4">
              <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Card Details</p>

              {savedCards.length > 0 && (
                <div className="space-y-2 pb-3 border-b border-[#E2E8F0]">
                  <p className="text-xs font-semibold text-[#1E2B37]">Saved Cards</p>
                  <div className="space-y-2">
                    {savedCards.map((card) => (
                      <label key={card.id} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer ${selectedCardId === card.id ? 'border-[#006AFF] bg-white font-semibold' : 'border-[#E2E8F0] bg-[#F8FAFC]'}`}>
                        <div className="flex items-center space-x-3">
                          <input type="radio" name="saved_card" checked={selectedCardId === card.id} onChange={() => setSelectedCardId(card.id)} className="w-4 h-4 text-[#006AFF]" />
                          <div>
                            <p className="text-xs font-bold text-[#1E2B37]">{card.card_brand} ending in •••• {card.last4}</p>
                            <p className="text-[10px] text-[#64748B]">Expires {card.expiry_month}/{card.expiry_year}</p>
                          </div>
                        </div>
                      </label>
                    ))}
                    <label className={`flex items-center space-x-3 p-3 rounded-xl border cursor-pointer ${selectedCardId === 'new' ? 'border-[#006AFF] bg-white' : 'border-[#E2E8F0] bg-[#F8FAFC]'}`}>
                      <input type="radio" name="saved_card" checked={selectedCardId === 'new'} onChange={() => setSelectedCardId('new')} className="w-4 h-4 text-[#006AFF]" />
                      <span className="text-xs font-bold text-[#1E2B37]"> Use a new credit / debit card</span>
                    </label>
                  </div>
                </div>
              )}

              {selectedCardId === 'new' ? (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#1E2B37]">Card Number</label>
                    <input type="text" placeholder="xxxx xxxx xxxx xxxx" value={cardDetails.cardNumber} onChange={handleCardNumberChange} className={`${INPUT_BASE_CLASSES} font-mono tracking-wider`} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#1E2B37]">Name on Card</label>
                    <input type="text" placeholder="NAME ON CARD" value={cardDetails.cardName} onChange={(e) => setCardDetails(prev => ({ ...prev, cardName: e.target.value }))} className={`${INPUT_BASE_CLASSES} uppercase`} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[#1E2B37]">Expiry Date</label>
                      <input type="text" placeholder="MM/YY" value={cardDetails.expiryDate} onChange={handleExpiryChange} className={`${INPUT_BASE_CLASSES} font-mono text-center`} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[#1E2B37]">CVV / CVC</label>
                      <input type="password" maxLength={3} placeholder="xxx" value={cardDetails.cvv} onChange={handleCvvChange} className={`${INPUT_BASE_CLASSES} font-mono text-center`} />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center space-x-2.5 cursor-pointer">
                    <input
                      id="save-card-checkbox"
                      type="checkbox"
                      checked={saveCard}
                      onChange={(e) => setSaveCard(e.target.checked)}
                      className="w-4 h-4 text-[#006AFF] rounded border-[#CBD5E1] focus:ring-[#006AFF] cursor-pointer"
                    />
                    <label htmlFor="save-card-checkbox" className="text-xs font-semibold text-[#334155] cursor-pointer select-none">
                      Save card details for future bookings
                    </label>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#1E2B37]">Name on Card</label>
                    <input type="text" placeholder="NAME ON CARD" value={cardDetails.cardName} onChange={(e) => setCardDetails(prev => ({ ...prev, cardName: e.target.value }))} className={`${INPUT_BASE_CLASSES} uppercase`} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#1E2B37]">CVC / CVV Security Code</label>
                    <input type="password" maxLength={3} placeholder="xxx" value={cardDetails.cvv} onChange={handleCvvChange} className={`${INPUT_BASE_CLASSES} font-mono text-center w-1/2`} />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="w-full pt-2 flex items-center gap-3">
            <button type="button" disabled={isUploading} onClick={() => router.back()} className="w-1/3 py-3.5 bg-white border border-[#E2E8F0] font-bold rounded-xl text-sm">
              ← Back
            </button>
            <button type="button" disabled={isUploading} onClick={handleContinue} className="w-2/3 py-3.5 bg-[#006AFF] text-white font-bold rounded-xl text-sm disabled:opacity-50">
              {isUploading ? 'Uploading Slip & Confirming...' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <main className="min-h-screen w-full bg-white py-4 sm:py-8 px-4 sm:px-6">
      <Suspense fallback={<div className="text-sm text-[#64748B] p-8 text-center">Loading payment page...</div>}>
        <PaymentContent />
      </Suspense>
    </main>
  );
}