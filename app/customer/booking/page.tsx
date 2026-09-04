'use client';

import { useState, useEffect, forwardRef, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { supabase } from '@/lib/supabaseClient';

const COUNTRY_CODES = [
  { code: '+357', label: 'CY +357' },
  { code: '+66', label: 'TH +66' },
  { code: '+44', label: 'UK +44' },
  { code: '+1', label: 'US/CA +1' },
  { code: '+49', label: 'DE +49' },
  { code: '+33', label: 'FR +33' },
  { code: '+39', label: 'IT +39' },
  { code: '+7', label: 'RU +7' },
  { code: '+971', label: 'AE +971' },
  { code: '+61', label: 'AU +61' },
  { code: '+93', label: 'AF +93' },
  { code: '+355', label: 'AL +355' },
  { code: '+213', label: 'DZ +213' },
  { code: '+376', label: 'AD +376' },
  { code: '+244', label: 'AO +244' },
  { code: '+54', label: 'AR +54' },
  { code: '+374', label: 'AM +374' },
  { code: '+43', label: 'AT +43' },
  { code: '+994', label: 'AZ +994' },
  { code: '+973', label: 'BH +973' },
  { code: '+880', label: 'BD +880' },
  { code: '+375', label: 'BY +375' },
  { code: '+32', label: 'BE +32' },
  { code: '+501', label: 'BZ +501' },
  { code: '+229', label: 'BJ +229' },
  { code: '+975', label: 'BT +975' },
  { code: '+591', label: 'BO +591' },
  { code: '+387', label: 'BA +387' },
  { code: '+267', label: 'BW +267' },
  { code: '+55', label: 'BR +55' },
  { code: '+673', label: 'BN +673' },
  { code: '+359', label: 'BG +359' },
  { code: '+226', label: 'BF +226' },
  { code: '+257', label: 'BI +257' },
  { code: '+855', label: 'KH +855' },
  { code: '+237', label: 'CM +237' },
  { code: '+238', label: 'CV +238' },
  { code: '+236', label: 'CF +236' },
  { code: '+235', label: 'TD +235' },
  { code: '+56', label: 'CL +56' },
  { code: '+86', label: 'CN +86' },
  { code: '+57', label: 'CO +57' },
  { code: '+269', label: 'KM +269' },
  { code: '+242', label: 'CG +242' },
  { code: '+506', label: 'CR +506' },
  { code: '+385', label: 'HR +385' },
  { code: '+53', label: 'CU +53' },
  { code: '+420', label: 'CZ +420' },
  { code: '+45', label: 'DK +45' },
  { code: '+253', label: 'DJ +253' },
  { code: '+593', label: 'EC +593' },
  { code: '+20', label: 'EG +20' },
  { code: '+503', label: 'SV +503' },
  { code: '+240', label: 'GQ +240' },
  { code: '+372', label: 'EE +372' },
  { code: '+251', label: 'ET +251' },
  { code: '+679', label: 'FJ +679' },
  { code: '+358', label: 'FI +358' },
  { code: '+241', label: 'GA +241' },
  { code: '+220', label: 'GM +220' },
  { code: '+995', label: 'GE +995' },
  { code: '+233', label: 'GH +233' },
  { code: '+30', label: 'GR +30' },
  { code: '+502', label: 'GT +502' },
  { code: '+224', label: 'GN +224' },
  { code: '+592', label: 'GY +592' },
  { code: '+509', label: 'HT +509' },
  { code: '+504', label: 'HN +504' },
  { code: '+852', label: 'HK +852' },
  { code: '+36', label: 'HU +36' },
  { code: '+354', label: 'IS +354' },
  { code: '+91', label: 'IN +91' },
  { code: '+62', label: 'ID +62' },
  { code: '+98', label: 'IR +98' },
  { code: '+964', label: 'IQ +964' },
  { code: '+353', label: 'IE +353' },
  { code: '+972', label: 'IL +972' },
  { code: '+81', label: 'JP +81' },
  { code: '+962', label: 'JO +962' },
  { code: '+7', label: 'KZ +7' },
  { code: '+254', label: 'KE +254' },
  { code: '+82', label: 'KR +82' },
  { code: '+965', label: 'KW +965' },
  { code: '+996', label: 'KG +996' },
  { code: '+856', label: 'LA +856' },
  { code: '+371', label: 'LV +371' },
  { code: '+961', label: 'LB +961' },
  { code: '+218', label: 'LY +218' },
  { code: '+370', label: 'LT +370' },
  { code: '+352', label: 'LU +352' },
  { code: '+853', label: 'MO +853' },
  { code: '+389', label: 'MK +389' },
  { code: '+261', label: 'MG +261' },
  { code: '+60', label: 'MY +60' },
  { code: '+960', label: 'MV +960' },
  { code: '+356', label: 'MT +356' },
  { code: '+222', label: 'MR +222' },
  { code: '+230', label: 'MU +230' },
  { code: '+52', label: 'MX +52' },
  { code: '+373', label: 'MD +373' },
  { code: '+377', label: 'MC +377' },
  { code: '+976', label: 'MN +976' },
  { code: '+382', label: 'ME +382' },
  { code: '+212', label: 'MA +212' },
  { code: '+258', label: 'MZ +258' },
  { code: '+95', label: 'MM +95' },
  { code: '+264', label: 'NA +264' },
  { code: '+977', label: 'NP +977' },
  { code: '+31', label: 'NL +31' },
  { code: '+64', label: 'NZ +64' },
  { code: '+505', label: 'NI +505' },
  { code: '+234', label: 'NG +234' },
  { code: '+47', label: 'NO +47' },
  { code: '+968', label: 'OM +968' },
  { code: '+92', label: 'PK +92' },
  { code: '+507', label: 'PA +507' },
  { code: '+595', label: 'PY +595' },
  { code: '+51', label: 'PE +51' },
  { code: '+63', label: 'PH +63' },
  { code: '+48', label: 'PL +48' },
  { code: '+351', label: 'PT +351' },
  { code: '+974', label: 'QA +974' },
  { code: '+40', label: 'RO +40' },
  { code: '+250', label: 'RW +250' },
  { code: '+966', label: 'SA +966' },
  { code: '+381', label: 'RS +381' },
  { code: '+65', label: 'SG +65' },
  { code: '+421', label: 'SK +421' },
  { code: '+386', label: 'SI +386' },
  { code: '+27', label: 'ZA +27' },
  { code: '+34', label: 'ES +34' },
  { code: '+94', label: 'LK +94' },
  { code: '+46', label: 'SE +46' },
  { code: '+41', label: 'CH +41' },
  { code: '+886', label: 'TW +886' },
  { code: '+255', label: 'TZ +255' },
  { code: '+216', label: 'TN +216' },
  { code: '+90', label: 'TR +90' },
  { code: '+380', label: 'UA +380' },
  { code: '+598', label: 'UY +598' },
  { code: '+998', label: 'UZ +998' },
  { code: '+58', label: 'VE +58' },
  { code: '+84', label: 'VN +84' },
  { code: '+967', label: 'YE +967' },
  { code: '+260', label: 'ZM +260' },
  { code: '+263', label: 'ZW +263' },
];

const ROOM_LIST = [
  'Beautiful Apartment in Harbour Paphos | Central',
  'Breathtaking Seaview Apartment | Lighthouse Beach',
  'Harbour Lights Seaview One Bedroom Apt | Paphos',
  'One Bedroom Apartment | Lighthouse Beach',
  'One Bedroom Apartment in Universal Paphos',
  'Stylish One Bedroom Apartment at Paphos Harbour',
  'Cozy Nerina Cottage | Harbour Paphos',
  'Modern Poolside villa | Paphos.',
  'Stylish Poolside Villa | Paphos',
  'Tropical Paradise | Harbour Paphos | Center',
  'Other',
];

const RAW_TIME_SLOTS = [
  '09:00 - 10:00',
  '10:00 - 11:00',
  '11:00 - 12:00',
  '13:00 - 14:00',
  '14:00 - 15:00',
  '15:00 - 16:00',
];

const formatDateToLocalString = (date: Date | null) => {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatPhoneNumber = (value: string, countryCode: string) => {
  const cleaned = value.replace(/\D/g, '');

  switch (countryCode) {
    case '+357':
      if (cleaned.length <= 2) return cleaned;
      if (cleaned.length <= 5) return `${cleaned.slice(0, 2)} ${cleaned.slice(2)}`;
      return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 9)}`;

    case '+66':
      if (cleaned.length <= 3) return cleaned;
      if (cleaned.length <= 6) return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 10)}`;

    case '+1':
    case '+44':
    default:
      if (cleaned.length <= 3) return cleaned;
      if (cleaned.length <= 6) return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 10)}`;
  }
};

const DatePickerCustomInput = forwardRef<HTMLButtonElement, { value?: string; onClick?: () => void }>(
  ({ value, onClick }, ref) => (
    <button
      type="button"
      onClick={onClick}
      ref={ref}
      className="w-full flex items-center justify-between px-4 py-3 bg-[#FFFFFF] border-2 border-[#B8D7ED] rounded-3xl text-[#1E2B37] focus:outline-none focus:ring-2 focus:ring-[#CDF4D3] transition-all text-left touch-manipulation select-none"
    >
      <span className={value ? 'text-[#1E2B37] font-medium text-base sm:text-sm' : 'text-[#1E2B37]/40 text-base sm:text-sm'}>
        {value || 'Select booking date'}
      </span>
      <svg className="w-5 h-5 text-[#1E2B37]/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </button>
  )
);
DatePickerCustomInput.displayName = 'DatePickerCustomInput';

function BookingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentUser, setCurrentUser] = useState({
    id: '',
    name: '',
    email: '',
    phone: '',
    countryCode: '+357',
  });

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editCountryCode, setEditCountryCode] = useState('+357');
  const [editPhone, setEditPhone] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const getTomorrowDateObj = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  };

  const [selectedRoom, setSelectedRoom] = useState('');
  const [customRoomName, setCustomRoomName] = useState('');
  const [selectedDateObj, setSelectedDateObj] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);

  const formattedDateString = formatDateToLocalString(selectedDateObj);

  const loadUserData = useCallback(async () => {
    try {
      const nameParam = searchParams.get('customerName') || searchParams.get('name') || '';
      const emailParam = searchParams.get('email') || '';
      const phoneParam = searchParams.get('phone') || '';
      const idParam = searchParams.get('userId') || '';

      const localName = localStorage.getItem('user_name') || '';
      const localEmail = localStorage.getItem('user_email') || '';
      const localPhone = localStorage.getItem('user_phone') || '';

      const finalName = nameParam || localName;
      const finalEmail = emailParam || localEmail;
      const rawPhone = phoneParam || localPhone;

      if (finalName || finalEmail || rawPhone) {
        let code = '+357';
        let number = rawPhone;

        const matched = COUNTRY_CODES.find((c) => rawPhone.startsWith(c.code));
        if (matched) {
          code = matched.code;
          number = rawPhone.replace(matched.code, '').trim();
        }

        const formattedNumber = formatPhoneNumber(number, code);

        const initialUser = {
          id: idParam,
          name: finalName,
          email: finalEmail,
          phone: formattedNumber,
          countryCode: code,
        };

        setCurrentUser(initialUser);
        setEditName(initialUser.name);
        setEditEmail(initialUser.email);
        setEditPhone(initialUser.phone);
        setEditCountryCode(initialUser.countryCode);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, name, email, phone, phone_number')
          .eq('id', user.id)
          .maybeSingle();

        const authEmail = profile?.email || user.email || '';
        const authName = profile?.full_name || profile?.name || user.user_metadata?.full_name || '';
        const authPhone = profile?.phone || profile?.phone_number || user.user_metadata?.phone || '';

        let code = '+357';
        let number = authPhone;
        const matched = COUNTRY_CODES.find((c) => authPhone.startsWith(c.code));
        if (matched) {
          code = matched.code;
          number = authPhone.replace(matched.code, '').trim();
        }

        const formattedNumber = formatPhoneNumber(number, code);

        const loadedUser = {
          id: user.id,
          name: authName,
          email: authEmail,
          phone: formattedNumber,
          countryCode: code,
        };

        setCurrentUser(loadedUser);
        setEditName(loadedUser.name);
        setEditEmail(loadedUser.email);
        setEditPhone(loadedUser.phone);
        setEditCountryCode(loadedUser.countryCode);
        return;
      }

      const fallbackUser = {
        id: '',
        name: '',
        email: '',
        phone: '',
        countryCode: '+357',
      };
      setCurrentUser(fallbackUser);
      setEditName('');
      setEditEmail('');
      setEditPhone('');
    } catch (err) {
      console.error('Failed to load user:', err);
    }
  }, [searchParams]);

  useEffect(() => {
    loadUserData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadUserData();
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [loadUserData]);

  useEffect(() => {
    const fetchBookedSlots = async () => {
      if (!formattedDateString) return;

      const { data, error } = await supabase
        .from('bookings')
        .select('booking_time')
        .eq('booking_date', formattedDateString);

      if (error) {
        console.error('Error fetching booked slots:', error.message);
      } else if (data) {
        const times = data.map((item) => item.booking_time);
        setBookedSlots(times);
      }
    };

    fetchBookedSlots();
  }, [formattedDateString]);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);

      await supabase.auth.signOut();

      localStorage.removeItem('user_name');
      localStorage.removeItem('user_email');
      localStorage.removeItem('user_phone');
      localStorage.clear();

      setCurrentUser({
        id: '',
        name: '',
        email: '',
        phone: '',
        countryCode: '+357',
      });
      setEditName('');
      setEditEmail('');
      setEditPhone('');
      setIsProfileModalOpen(false);

      window.location.href = '/auth/login';
    } catch (err) {
      console.error('Error logging out:', err);
      setIsLoggingOut(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);

    try {
      const cleanNumber = editPhone.replace(/\s+/g, '');
      const fullPhoneNumber = `${editCountryCode}${cleanNumber}`;

      const updatedUser = {
        ...currentUser,
        name: editName,
        email: editEmail,
        phone: editPhone,
        countryCode: editCountryCode,
      };

      // 1. อัปเดต State ปัจจุบันเพื่อสะท้อนผลลัพธ์บน UI ทันที
      setCurrentUser(updatedUser);

      // 2. บันทึกลง LocalStorage
      localStorage.setItem('user_name', editName);
      localStorage.setItem('user_email', editEmail);
      localStorage.setItem('user_phone', fullPhoneNumber);

      // 3. บันทึกลง Supabase
      if (currentUser.id) {
        await supabase.from('profiles').upsert({
          id: currentUser.id,
          full_name: editName,
          email: editEmail,
          phone: fullPhoneNumber,
          updated_at: new Date().toISOString(),
        });
      }

      setIsProfileModalOpen(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const timeSlots = RAW_TIME_SLOTS.map((time, index) => ({
    id: `slot-${index + 1}`,
    time: time,
    available: !bookedSlots.includes(time),
  }));

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    if (!currentUser.name || !currentUser.phone || !currentUser.email) {
      alert('Please complete your profile (Name, Email, and Phone) by clicking profile at top-left.');
      setIsProfileModalOpen(true);
      return;
    }

    if (!selectedRoom) {
      alert('Please select a room.');
      return;
    }

    if (!selectedDateObj) {
      alert('Please select a booking date.');
      return;
    }

    if (!selectedSlot) {
      alert('Please select a time slot.');
      return;
    }

    if (selectedRoom === 'Other' && !customRoomName.trim()) {
      alert('Please enter your property name.');
      return;
    }

    const finalRoomName = selectedRoom === 'Other' ? customRoomName.trim() : selectedRoom;

    const query = new URLSearchParams({
      userId: currentUser.id || '',
      room: finalRoomName,
      date: formattedDateString,
      time: selectedSlot,
      customerName: currentUser.name,
      email: currentUser.email,
      phone: `${currentUser.countryCode}${currentUser.phone.replace(/\s+/g, '')}`,
    }).toString();

    router.push(`/customer/program?${query}`);
  };

  return (
    <main className="min-h-[100dvh] w-full bg-[#FFFFFF] sm:bg-[#EAF3F9] flex flex-col items-center justify-center p-0 sm:p-6 text-[#1E2B37] font-sans antialiased">
      <div className="w-full sm:max-w-lg bg-[#FFFFFF] rounded-none sm:rounded-[32px] border-none sm:border sm:border-[#B8D7ED] shadow-none sm:shadow-xl p-6 sm:p-8 space-y-6 my-auto relative">
        
        {/* Profile Button Header */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center gap-2 bg-[#FFFFFF] border-2 border-[#B8D7ED] hover:border-[#8E9B9E] px-3 py-1.5 rounded-full transition-all text-left group cursor-pointer touch-manipulation select-none shadow-sm"
          >
            <div className="w-6 h-6 rounded-full bg-[#1E2B37] flex items-center justify-center text-white font-bold text-xs uppercase">
              {currentUser.name ? currentUser.name.charAt(0) : '?'}
            </div>
            <div className="flex flex-col pr-1">
              <span className="text-[11px] font-bold text-[#1E2B37] transition leading-tight truncate max-w-[110px] capitalize">
                {currentUser.name || 'Set Profile'}
              </span>
              <span className="text-[9px] text-[#1E2B37]/60 truncate max-w-[100px] sm:max-w-[130px] leading-tight">
                {currentUser.email || 'Set Detail'}
              </span>
            </div>
          </button>
        </div>

        {/* Logo Section */}
        <div className="flex flex-col items-center justify-center pt-1">
          <div className="relative w-52 h-18 sm:w-60 sm:h-20">
            <Image
              src="/logo.jpeg"
              alt="Getaway Cleaning"
              fill
              className="object-contain"
              sizes="(max-width: 640px) 208px, 240px"
              priority
            />
          </div>
        </div>

        {/* Form Container */}
        <form onSubmit={handleNext} className="space-y-6">
          
          {/* Select Room & Date */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-[#1E2B37]">Select Room & Date</h2>

            {/* Room Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#1E2B37]/80">Room</label>
              <div className="relative">
                <select
                  value={selectedRoom}
                  onChange={(e) => setSelectedRoom(e.target.value)}
                  className="w-full px-4 py-3 bg-[#FFFFFF] border-2 border-[#B8D7ED] rounded-3xl text-[#1E2B37] focus:outline-none focus:ring-2 focus:ring-[#CDF4D3] transition-all appearance-none cursor-pointer text-base sm:text-sm font-medium touch-manipulation shadow-sm"
                >
                  <option value="" disabled>Select a room...</option>
                  {ROOM_LIST.map((room, idx) => (
                    <option key={idx} value={room}>
                      {room}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#1E2B37]/60">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Custom Room Input if "Other" is selected */}
            {selectedRoom === 'Other' && (
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-semibold text-[#1E2B37]/80">Property Name</label>
                <input
                  type="text"
                  placeholder="Enter your property name"
                  value={customRoomName}
                  onChange={(e) => setCustomRoomName(e.target.value)}
                  className="w-full px-4 py-3 bg-[#FFFFFF] border-2 border-[#B8D7ED] rounded-3xl text-[#1E2B37] placeholder-[#1E2B37]/50 focus:outline-none focus:ring-2 focus:ring-[#CDF4D3] transition-all text-base sm:text-sm font-medium shadow-sm"
                />
              </div>
            )}

            {/* DatePicker */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#1E2B37]/80">Date (Advance booking only)</label>
              <DatePicker
                selected={selectedDateObj}
                onChange={(date: Date | null) => setSelectedDateObj(date)}
                minDate={getTomorrowDateObj()}
                dateFormat="yyyy-MM-dd"
                customInput={<DatePickerCustomInput />}
                wrapperClassName="w-full"
              />
            </div>
          </div>

          {/* Select Time Slot */}
          <div className="space-y-4 pt-1">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-[#1E2B37]">Select Time Slot</h2>
              
              <div className="flex items-center gap-3 text-xs font-medium text-[#1E2B37]/70">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#CDF4D3] border border-[#86D892]"></span> Available
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#8E9B9E]"></span> Unavailable
                </span>
              </div>
            </div>

            {/* Time Slots Grid */}
            <div className="grid grid-cols-3 gap-2.5">
              {timeSlots.map((slot) => {
                const isSelected = selectedSlot === slot.time;
                const isAvailable = slot.available;

                return (
                  <button
                    key={slot.id}
                    type="button"
                    disabled={!isAvailable}
                    onClick={() => setSelectedSlot(slot.time)}
                    className={`py-3 px-1 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer touch-manipulation select-none border-2 active:scale-95 ${
                      !isAvailable
                        ? 'bg-[#8E9B9E] border-[#8E9B9E] text-white opacity-70 cursor-not-allowed'
                        : isSelected
                        ? 'bg-[#CDF4D3] border-[#86D892] text-[#1E2B37] font-extrabold shadow-md scale-[1.03] ring-2 ring-[#86D892]'
                        : 'bg-[#CDF4D3] border-[#86D892] text-[#1E2B37] hover:bg-[#bdecc3] active:bg-[#bdecc3]'
                    }`}
                  >
                    <span className="text-xs sm:text-sm font-bold tracking-tight">{slot.time}</span>
                    <span className={`text-[10px] font-medium mt-0.5 ${!isAvailable ? 'text-white/90' : 'text-[#1E2B37]/70'}`}>
                      ({!isAvailable ? 'Booked' : 'Available'})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-8 py-3 bg-[#1E2B37] hover:bg-[#2c3d4e] active:bg-[#121b23] text-white font-bold rounded-3xl text-base transition-all duration-150 shadow-md cursor-pointer touch-manipulation select-none"
            >
              Next
            </button>
          </div>
        </form>

        {/* Footer */}
        <p className="text-[11px] text-[#1E2B37]/40 font-medium text-center tracking-wide pt-2">
          © Getaway Cleaning Service
        </p>

      </div>

      {/* Profile Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#FFFFFF] rounded-[32px] border-2 border-[#8E8E8E]/40 shadow-2xl p-6 sm:p-8 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-extrabold text-[#1E2B37] tracking-tight">Customer Profile</h2>

              {/* Log Out Button */}
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex items-center gap-1.5 bg-[#E87171] hover:bg-[#d86262] border border-[#D95353] text-white font-semibold text-xs px-4 py-2 rounded-2xl transition-all cursor-pointer shadow-xs touch-manipulation select-none disabled:opacity-50 cursor-not-allowed"
              >
                <span>{isLoggingOut ? 'Logging out...' : '→ Log Out'}</span>
              </button>
            </div>

            <p className="text-xs text-[#1E2B37]/70 font-medium -mt-2">
              Please check your information for admin confirmation.
            </p>

            {/* Profile Form */}
            <form onSubmit={handleSaveProfile} className="space-y-4 pt-1">
              
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1E2B37]">Full Name</label>
                <input
                  type="text"
                  placeholder="Enter Your Full Name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full px-5 py-3.5 bg-[#FFFFFF] border-2 border-[#B8D7ED] rounded-3xl text-[#1E2B37] placeholder-[#1E2B37]/50 focus:outline-none focus:ring-2 focus:ring-[#CDF4D3] transition-all text-base sm:text-sm font-medium shadow-sm"
                />
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1E2B37]">Email Address</label>
                <input
                  type="email"
                  placeholder="Enter Your Email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  required
                  className="w-full px-5 py-3.5 bg-[#FFFFFF] border-2 border-[#B8D7ED] rounded-3xl text-[#1E2B37] placeholder-[#1E2B37]/50 focus:outline-none focus:ring-2 focus:ring-[#CDF4D3] transition-all text-base sm:text-sm font-medium shadow-sm"
                />
              </div>

              {/* Phone Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1E2B37]">Phone Number</label>
                <div className="flex gap-2.5">
                  {/* Select Country Code */}
                  <div className="relative w-32 sm:w-36 shrink-0">
                    <select
                      value={editCountryCode}
                      onChange={(e) => setEditCountryCode(e.target.value)}
                      className="w-full pl-3 pr-7 py-3.5 bg-[#FFFFFF] border-2 border-[#B8D7ED] rounded-3xl text-[#1E2B37] focus:outline-none focus:ring-2 focus:ring-[#CDF4D3] transition-all text-sm font-medium cursor-pointer appearance-none truncate touch-manipulation shadow-sm"
                    >
                      {COUNTRY_CODES.map((c, i) => (
                        <option key={i} value={c.code}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-[#1E2B37]/60">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Input Phone Number */}
                  <input
                    type="text"
                    placeholder="XX XXX XXXX"
                    value={editPhone}
                    onChange={(e) => setEditPhone(formatPhoneNumber(e.target.value, editCountryCode))}
                    required
                    className="flex-1 px-4 sm:px-5 py-3.5 bg-[#FFFFFF] border-2 border-[#B8D7ED] rounded-3xl text-[#1E2B37] placeholder-[#1E2B37]/50 focus:outline-none focus:ring-2 focus:ring-[#CDF4D3] transition-all text-base sm:text-sm font-medium min-w-0 shadow-sm"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="px-6 py-2.5 bg-[#FFFFFF] hover:bg-[#d8ebfa] border-2 border-[#B8D7ED] text-[#1E2B37] font-semibold rounded-3xl text-sm transition-all cursor-pointer touch-manipulation select-none shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-7 py-2.5 bg-[#1E2B37] hover:bg-[#2c3d4e] text-white font-bold rounded-3xl text-sm transition-all cursor-pointer shadow-md touch-manipulation select-none"
                >
                  {isSavingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </main>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center">Loading...</div>}>
      <BookingForm />
    </Suspense>
  );
}