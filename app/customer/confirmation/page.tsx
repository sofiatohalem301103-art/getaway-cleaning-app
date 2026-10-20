'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

// 📌 Table สำหรับแปลง Key สั้นให้เป็นชื่อโปรแกรมแบบเต็ม
const PROGRAM_FULL_NAMES: Record<string, string> = {
  general: 'General Cleaning',
  deep: 'Deep Cleaning',
  office: 'Office Cleaning',
  garden: 'Garden Cleaning (Upon Request)',
  turnover: 'Turnover Cleaning (Cleaning & change all sheets and towels)',
};

const formatPhoneNumberDisplay = (phoneStr: string) => {
  if (!phoneStr) return '';
  const cleaned = phoneStr.trim().replace(/\s+/g, '');

  if (cleaned.startsWith('+357')) {
    const num = cleaned.slice(4);
    if (num.length === 8) {
      return `+357 ${num.slice(0, 2)} ${num.slice(2, 5)} ${num.slice(5)}`;
    }
  }

  if (cleaned.startsWith('+66')) {
    const num = cleaned.slice(3);
    if (num.length >= 9) {
      return `+66 ${num.slice(0, 2)} ${num.slice(2, 5)} ${num.slice(5)}`;
    }
  }

  if (cleaned.startsWith('+')) {
    const countryCodeMatch = cleaned.match(/^(\+\d{1,3})(\d+)$/);
    if (countryCodeMatch) {
      const code = countryCodeMatch[1];
      const rest = countryCodeMatch[2];
      const formattedRest = rest.replace(/(\d{2,3})(?=(\d{3})+(?!\d))/g, '$1 ');
      return `${code} ${formattedRest}`;
    }
  }

  return cleaned.replace(/(\d{2,3})(?=(\d{3})+(?!\d))/g, '$1 ');
};

function ConfirmationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isMounted, setIsMounted] = useState(false);
  const [sessionData, setSessionData] = useState<any>(null);
  const [randomRef, setRandomRef] = useState<string>('');

  const getParam = (key: string) => {
    const val = searchParams.get(key);
    if (!val) return '';
    try {
      return decodeURIComponent(val);
    } catch {
      return val;
    }
  };

  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    setIsMounted(true);

    // ตรวจจับ Prefix ให้ตรงกับพารามิเตอร์ที่ส่งมา (HOL หรือ PRV)
    const paramRef = searchParams.get('ref') || searchParams.get('bookingRef');
    const isHolidayParam = paramRef?.startsWith('HOL') || searchParams.has('price');
    const generated = `${isHolidayParam ? 'HOL' : 'PRV'}-${Math.floor(100000 + Math.random() * 900000)}`;
    setRandomRef(generated);

    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('bookingData') || sessionStorage.getItem('privateBookingData');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setSessionData(parsed);

          if (!parsed.bookingRef) {
            parsed.bookingRef = generated;
            sessionStorage.setItem('bookingData', JSON.stringify(parsed));
          } else {
            setRandomRef(parsed.bookingRef);
          }
        } catch (e) {
          console.error('Error parsing bookingData from sessionStorage:', e);
        }
      }
    }

    const loadCustomerProfile = async () => {
      let paramName = getParam('customerName') || getParam('name');
      let paramEmail = getParam('email');
      let paramPhone = getParam('phone');

      if (paramName === 'Guest' || paramName === 'Customer') {
        paramName = '';
      }

      let fetchedName = paramName;
      let fetchedEmail = paramEmail;
      let fetchedPhone = paramPhone;

      if (!fetchedName || !fetchedEmail || !fetchedPhone) {
        try {
          if (supabase) {
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
              if (!fetchedName) {
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
                if (!fetchedName) {
                  fetchedName = profile.full_name || profile.name || profile.display_name || profile.username || '';
                }
                if (!fetchedEmail) {
                  fetchedEmail = profile.email || '';
                }
                if (!fetchedPhone) {
                  fetchedPhone = profile.phone || profile.mobile || profile.phone_number || profile.tel || '';
                }
              }
            }
          }
        } catch (err) {
          console.error('Error fetching profile from Supabase:', err);
        }
      }

      if (!fetchedName || !fetchedEmail || !fetchedPhone) {
        try {
          const localName = localStorage.getItem('user_name');
          const localEmail = localStorage.getItem('user_email');
          const localPhone = localStorage.getItem('user_phone');

          if (!fetchedName && localName && localName !== 'Guest' && localName !== 'Customer') {
            fetchedName = localName;
          }
          if (!fetchedEmail) fetchedEmail = localEmail || '';
          if (!fetchedPhone) fetchedPhone = localPhone || '';
        } catch (err) {
          console.error('Error reading LocalStorage:', err);
        }
      }

      setCustomerInfo({
        name: fetchedName && fetchedName !== 'Guest' ? fetchedName : 'Customer',
        email: fetchedEmail || '',
        phone: fetchedPhone || '',
      });
    };

    loadCustomerProfile();
  }, [searchParams]);

  // 1. ดึงข้อมูลที่อยู่ + Google Maps Link
  const address = getParam('address') || sessionData?.address || sessionData?.property || '';
  const building = getParam('building') || sessionData?.buildingComplex || sessionData?.building || '';
  const aptNo = getParam('aptNo') || sessionData?.apartmentHouseNo || sessionData?.aptNo || '';
  const mapsLink = 
    getParam('mapsLink') || 
    getParam('mapLink') || 
    sessionData?.googleMapsLink || 
    sessionData?.mapsLink || 
    sessionData?.mapLink || 
    '';

  const fullAddress = [address, building, aptNo ? `Apt/House: ${aptNo}` : ''].filter(Boolean).join(', ') || 'Address not specified';

  // 2. ดึงข้อมูลโปรแกรม และ แปลงเป็นชื่อเต็ม
  const rawProgram = getParam('program') || sessionData?.program || sessionData?.selectedPrivateProgram || 'turnover';
  const fullProgramName = PROGRAM_FULL_NAMES[rawProgram.toLowerCase()] || rawProgram;

  const rawDate = getParam('date') || sessionData?.date || '';
  const time = getParam('time') || getParam('timeSlot') || sessionData?.timeSlot || sessionData?.time || '-';
  
  // Ref
  const bookingRef = getParam('ref') || getParam('bookingRef') || sessionData?.bookingRef || randomRef;
  const isHoliday = bookingRef.startsWith('HOL');

  // ราคา
  const priceParam = getParam('price') || sessionData?.price || sessionData?.totalAmount;
  const numericPrice = priceParam ? Number(priceParam) : 0;

  // 3. ดึงสเปกเฉพาะ
  const propertyType = getParam('propertyType') || sessionData?.propertyType || '';
  const bedrooms = getParam('room') || getParam('bedrooms') || sessionData?.bedrooms || sessionData?.room || '';
  const bathrooms = getParam('bathrooms') || sessionData?.bathrooms || '';
  const balconies = getParam('balconies') || sessionData?.balconies || sessionData?.officeBalconies || '';

  // Office Specs
  const sqm = getParam('sqm') || sessionData?.officeSquareMeters || sessionData?.gardenSquareMeters || sessionData?.sqm || '';
  const toilets = getParam('toilets') || sessionData?.officeToilets || sessionData?.toilets || '';
  const cleanWindows = getParam('cleanWindows') || sessionData?.officeCleanWindows || '';
  const windowsCount = sessionData?.officeWindowsCount ? `${sessionData.officeWindowsCount} windows` : '';

  // Garden Specs
  const gardenType = getParam('gardenType') || sessionData?.gardenType || '';
  const gardenOtherDetails = sessionData?.gardenOtherDetails || '';
  const notes = getParam('notes') || sessionData?.notes || '';

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const cleanDate = dateStr.split('T')[0];
      if (cleanDate.includes('-')) {
        const [year, month, day] = cleanDate.split('-').map(Number);
        if (year && month && day) {
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const formattedDay = String(day).padStart(2, '0');
          const formattedMonth = months[month - 1];
          return `${formattedDay} ${formattedMonth} ${year}`;
        }
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  if (!isMounted) {
    return (
      <div className="w-full flex justify-center py-12 text-slate-400 text-sm font-medium">
        Loading confirmation...
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-10">
      <div className="bg-white p-6 sm:p-10 md:p-12 rounded-2xl sm:rounded-[32px] shadow-xs border border-slate-200/80 w-full flex flex-col items-center">
        
        {/* Tickmark Icon */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mb-4 sm:mb-6 shrink-0">
          <svg className="w-8 h-8 sm:w-10 sm:h-10 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Title */}
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#1E2B37] mb-2 text-center tracking-tight">
          {isHoliday ? 'Booking Confirmed!' : 'Request Submitted!'}
        </h2>
        <p className="text-xs sm:text-sm md:text-base text-slate-500 mb-6 sm:mb-8 text-center font-medium max-w-md">
          {isHoliday 
            ? 'Thank you for your payment. Your booking has been successfully confirmed.' 
            : 'Thank you. Your private service request has been sent directly to our admin team.'}
        </p>

        {/* Status Alert Box */}
        <div className="w-full bg-slate-50 border border-slate-200/80 rounded-xl sm:rounded-2xl px-5 py-4 mb-8 text-center">
          <span className="text-xs sm:text-sm md:text-base font-semibold text-slate-700 leading-relaxed block">
            {isHoliday
              ? 'Our team will handle your cleaning according to the scheduled date and time.'
              : 'Our admin team will review your property details and contact you shortly with a confirmation.'}
          </span>
        </div>

        {/* Details Container */}
        <div className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-10 mb-8 space-y-4 sm:space-y-5 text-[#1E2B37]">
          
          {/* Booking Ref */}
          <div className="flex justify-between items-center border-b border-[#CBD5E1] pb-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider">
                {isHoliday ? 'Booking Ref' : 'Request Ref'}
              </span>
              <span className={`text-[10px] sm:text-xs text-white px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider ${isHoliday ? 'bg-blue-600' : 'bg-slate-800'}`}>
                {isHoliday ? 'Holiday Home' : 'Private / Office'}
              </span>
            </div>
            <span className="text-sm sm:text-base md:text-lg font-bold font-mono text-[#0F172A]">{bookingRef}</span>
          </div>

          {/* Customer Information */}
          <div className="space-y-3 sm:space-y-4 pt-1">
            <div className="flex justify-between items-center gap-4">
              <span className="text-xs sm:text-sm md:text-base font-semibold text-slate-600 shrink-0">Customer Name</span>
              <span className="text-xs sm:text-sm md:text-base font-bold capitalize text-right text-[#0F172A]">{customerInfo.name || 'Customer'}</span>
            </div>
            
            {customerInfo.email && (
              <div className="flex justify-between items-center gap-4">
                <span className="text-xs sm:text-sm md:text-base font-semibold text-slate-600 shrink-0">Email</span>
                <span className="text-xs sm:text-sm md:text-base font-bold truncate text-right text-[#0F172A]">{customerInfo.email}</span>
              </div>
            )}
            
            {customerInfo.phone && (
              <div className="flex justify-between items-center gap-4">
                <span className="text-xs sm:text-sm md:text-base font-semibold text-slate-600 shrink-0">Phone</span>
                <span className="text-xs sm:text-sm md:text-base font-bold tracking-wide text-right text-[#0F172A]">
                  {formatPhoneNumberDisplay(customerInfo.phone)}
                </span>
              </div>
            )}

            <div className="border-t border-[#E2E8F0] my-3 sm:my-4" />

            {/* Address & Google Maps */}
            <div className="flex justify-between items-start gap-4">
              <span className="text-xs sm:text-sm md:text-base font-semibold text-slate-600 shrink-0">Address / Property</span>
              <span className="text-xs sm:text-sm md:text-base font-bold text-right text-[#0F172A] leading-relaxed max-w-[65%]">{fullAddress}</span>
            </div>

            {mapsLink && (
              <div className="flex justify-between items-center gap-4">
                <span className="text-xs sm:text-sm md:text-base font-semibold text-slate-600 shrink-0">Google Maps</span>
                <a 
                  href={mapsLink} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-xs sm:text-sm md:text-base font-bold text-slate-800 underline hover:text-blue-600 truncate max-w-[65%]"
                >
                  Open Location Link ↗
                </a>
              </div>
            )}

            <div className="border-t border-[#E2E8F0] my-3 sm:my-4" />

            {/* Selected Program Specifications */}
            <div className="flex justify-between items-start gap-4">
              <span className="text-xs sm:text-sm md:text-base font-semibold text-slate-600 shrink-0">Selected Program</span>
              <span className="text-xs sm:text-sm md:text-base font-extrabold text-right text-[#0F172A] leading-relaxed max-w-[65%]">{fullProgramName}</span>
            </div>

            {propertyType && (
              <div className="flex justify-between items-center gap-4">
                <span className="text-xs sm:text-sm md:text-base font-semibold text-slate-600 shrink-0">Property Type</span>
                <span className="text-xs sm:text-sm md:text-base font-bold capitalize text-right text-[#0F172A]">{propertyType}</span>
              </div>
            )}
            {bedrooms && (
              <div className="flex justify-between items-center gap-4">
                <span className="text-xs sm:text-sm md:text-base font-semibold text-slate-600 shrink-0">Bedrooms / Unit</span>
                <span className="text-xs sm:text-sm md:text-base font-bold text-right text-[#0F172A]">{bedrooms} Bedroom(s)</span>
              </div>
            )}
            {bathrooms && (
              <div className="flex justify-between items-center gap-4">
                <span className="text-xs sm:text-sm md:text-base font-semibold text-slate-600 shrink-0">Bathrooms</span>
                <span className="text-xs sm:text-sm md:text-base font-bold text-right text-[#0F172A]">{bathrooms}</span>
              </div>
            )}
            {sqm && (
              <div className="flex justify-between items-center gap-4">
                <span className="text-xs sm:text-sm md:text-base font-semibold text-slate-600 shrink-0">Area Size</span>
                <span className="text-xs sm:text-sm md:text-base font-bold text-right text-[#0F172A]">{sqm}</span>
              </div>
            )}
            {toilets && (
              <div className="flex justify-between items-center gap-4">
                <span className="text-xs sm:text-sm md:text-base font-semibold text-slate-600 shrink-0">Toilets</span>
                <span className="text-xs sm:text-sm md:text-base font-bold text-right text-[#0F172A]">{toilets}</span>
              </div>
            )}
            {balconies && (
              <div className="flex justify-between items-center gap-4">
                <span className="text-xs sm:text-sm md:text-base font-semibold text-slate-600 shrink-0">Balconies / Verandahs</span>
                <span className="text-xs sm:text-sm md:text-base font-bold text-right text-[#0F172A]">{balconies}</span>
              </div>
            )}
            {cleanWindows && (
              <div className="flex justify-between items-center gap-4">
                <span className="text-xs sm:text-sm md:text-base font-semibold text-slate-600 shrink-0">Window Cleaning</span>
                <span className="text-xs sm:text-sm md:text-base font-bold capitalize text-right text-[#0F172A]">
                  {cleanWindows} {windowsCount ? `(${windowsCount})` : ''}
                </span>
              </div>
            )}
            {gardenType && (
              <div className="flex justify-between items-center gap-4">
                <span className="text-xs sm:text-sm md:text-base font-semibold text-slate-600 shrink-0">Garden Type</span>
                <span className="text-xs sm:text-sm md:text-base font-bold capitalize text-right text-[#0F172A]">
                  {gardenType} {gardenOtherDetails ? `(${gardenOtherDetails})` : ''}
                </span>
              </div>
            )}

            <div className="border-t border-[#E2E8F0] my-3 sm:my-4" />

            {/* Service Date & Time Slot */}
            <div className="flex justify-between items-center gap-4">
              <span className="text-xs sm:text-sm md:text-base font-semibold text-slate-600 shrink-0">Scheduled Date</span>
              <span className="text-xs sm:text-sm md:text-base font-bold text-right text-[#0F172A]">{formatDate(rawDate)}</span>
            </div>
            
            <div className="flex justify-between items-center gap-4">
              <span className="text-xs sm:text-sm md:text-base font-semibold text-slate-600 shrink-0">Scheduled Time</span>
              <span className="text-xs sm:text-sm md:text-base font-bold capitalize text-right text-[#0F172A]">{time}</span>
            </div>

            {numericPrice > 0 && (
              <div className="flex justify-between items-center gap-4 pt-2 border-t border-[#E2E8F0]">
                <span className="text-xs sm:text-sm md:text-base font-bold text-[#006AFF] shrink-0">Total Paid Amount</span>
                <span className="text-base sm:text-lg md:text-xl font-black text-[#006AFF]">€{numericPrice.toFixed(2)}</span>
              </div>
            )}

            {notes && (
              <div className="flex justify-between items-start gap-4 pt-1">
                <span className="text-xs sm:text-sm md:text-base font-semibold text-slate-600 shrink-0">Notes</span>
                <span className="text-xs sm:text-sm md:text-base text-right text-[#0F172A] leading-relaxed italic max-w-[65%]">{notes}</span>
              </div>
            )}
          </div>

        </div>

        {/* Back To Home Button */}
        <button
          type="button"
          onClick={() => router.push('/customer/booking')}
          className="w-full max-w-md py-4 bg-[#0F172A] hover:bg-[#1E293B] active:scale-[0.99] text-white font-bold rounded-xl sm:rounded-2xl text-sm md:text-base transition shadow-xs cursor-pointer touch-manipulation text-center"
        >
          Back To Home
        </button>
      </div>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center text-[#1E2B37] font-sans">
      <Suspense fallback={
        <div className="flex items-center justify-center text-slate-400 text-sm py-12">
          Loading confirmation...
        </div>
      }>
        <ConfirmationContent />
      </Suspense>
    </div>
  );
}