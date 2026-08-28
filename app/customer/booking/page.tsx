'use client';

import { useState, useEffect, forwardRef, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { supabase } from '@/lib/supabaseClient';

const COUNTRY_CODES = [
  { code: '+357', label: 'CY (+357)' },
  { code: '+66', label: 'TH (+66)' },
  { code: '+44', label: 'UK (+44)' },
  { code: '+1', label: 'US/CA (+1)' },
  { code: '+49', label: 'DE (+49)' },
  { code: '+33', label: 'FR (+33)' },
  { code: '+39', label: 'IT (+39)' },
  { code: '+7', label: 'RU (+7)' },
  { code: '+971', label: 'AE (+971)' },
  { code: '+61', label: 'AU (+61)' },
  { code: '+93', label: 'AF (+93)' },
  { code: '+355', label: 'AL (+355)' },
  { code: '+213', label: 'DZ (+213)' },
  { code: '+376', label: 'AD (+376)' },
  { code: '+244', label: 'AO (+244)' },
  { code: '+54', label: 'AR (+54)' },
  { code: '+374', label: 'AM (+374)' },
  { code: '+43', label: 'AT (+43)' },
  { code: '+994', label: 'AZ (+994)' },
  { code: '+973', label: 'BH (+973)' },
  { code: '+880', label: 'BD (+880)' },
  { code: '+375', label: 'BY (+375)' },
  { code: '+32', label: 'BE (+32)' },
  { code: '+501', label: 'BZ (+501)' },
  { code: '+229', label: 'BJ (+229)' },
  { code: '+975', label: 'BT (+975)' },
  { code: '+591', label: 'BO (+591)' },
  { code: '+387', label: 'BA (+387)' },
  { code: '+267', label: 'BW (+267)' },
  { code: '+55', label: 'BR (+55)' },
  { code: '+673', label: 'BN (+673)' },
  { code: '+359', label: 'BG (+359)' },
  { code: '+226', label: 'BF (+226)' },
  { code: '+257', label: 'BI (+257)' },
  { code: '+855', label: 'KH (+855)' },
  { code: '+237', label: 'CM (+237)' },
  { code: '+238', label: 'CV (+238)' },
  { code: '+236', label: 'CF (+236)' },
  { code: '+235', label: 'TD (+235)' },
  { code: '+56', label: 'CL (+56)' },
  { code: '+86', label: 'CN (+86)' },
  { code: '+57', label: 'CO (+57)' },
  { code: '+269', label: 'KM (+269)' },
  { code: '+242', label: 'CG (+242)' },
  { code: '+506', label: 'CR (+506)' },
  { code: '+385', label: 'HR (+385)' },
  { code: '+53', label: 'CU (+53)' },
  { code: '+420', label: 'CZ (+420)' },
  { code: '+45', label: 'DK (+45)' },
  { code: '+253', label: 'DJ (+253)' },
  { code: '+593', label: 'EC (+593)' },
  { code: '+20', label: 'EG (+20)' },
  { code: '+503', label: 'SV (+503)' },
  { code: '+240', label: 'GQ (+240)' },
  { code: '+372', label: 'EE (+372)' },
  { code: '+251', label: 'ET (+251)' },
  { code: '+679', label: 'FJ (+679)' },
  { code: '+358', label: 'FI (+358)' },
  { code: '+241', label: 'GA (+241)' },
  { code: '+220', label: 'GM (+220)' },
  { code: '+995', label: 'GE (+995)' },
  { code: '+233', label: 'GH (+233)' },
  { code: '+30', label: 'GR (+30)' },
  { code: '+502', label: 'GT (+502)' },
  { code: '+224', label: 'GN (+224)' },
  { code: '+592', label: 'GY (+592)' },
  { code: '+509', label: 'HT (+509)' },
  { code: '+504', label: 'HN (+504)' },
  { code: '+852', label: 'HK (+852)' },
  { code: '+36', label: 'HU (+36)' },
  { code: '+354', label: 'IS (+354)' },
  { code: '+91', label: 'IN (+91)' },
  { code: '+62', label: 'ID (+62)' },
  { code: '+98', label: 'IR (+98)' },
  { code: '+964', label: 'IQ (+964)' },
  { code: '+353', label: 'IE (+353)' },
  { code: '+972', label: 'IL (+972)' },
  { code: '+81', label: 'JP (+81)' },
  { code: '+962', label: 'JO (+962)' },
  { code: '+7', label: 'KZ (+7)' },
  { code: '+254', label: 'KE (+254)' },
  { code: '+82', label: 'KR (+82)' },
  { code: '+965', label: 'KW (+965)' },
  { code: '+996', label: 'KG (+996)' },
  { code: '+856', label: 'LA (+856)' },
  { code: '+371', label: 'LV (+371)' },
  { code: '+961', label: 'LB (+961)' },
  { code: '+218', label: 'LY (+218)' },
  { code: '+370', label: 'LT (+370)' },
  { code: '+352', label: 'LU (+352)' },
  { code: '+853', label: 'MO (+853)' },
  { code: '+389', label: 'MK (+389)' },
  { code: '+261', label: 'MG (+261)' },
  { code: '+60', label: 'MY (+60)' },
  { code: '+960', label: 'MV (+960)' },
  { code: '+356', label: 'MT (+356)' },
  { code: '+222', label: 'MR (+222)' },
  { code: '+230', label: 'MU (+230)' },
  { code: '+52', label: 'MX (+52)' },
  { code: '+373', label: 'MD (+373)' },
  { code: '+377', label: 'MC (+377)' },
  { code: '+976', label: 'MN (+976)' },
  { code: '+382', label: 'ME (+382)' },
  { code: '+212', label: 'MA (+212)' },
  { code: '+258', label: 'MZ (+258)' },
  { code: '+95', label: 'MM (+95)' },
  { code: '+264', label: 'NA (+264)' },
  { code: '+977', label: 'NP (+977)' },
  { code: '+31', label: 'NL (+31)' },
  { code: '+64', label: 'NZ (+64)' },
  { code: '+505', label: 'NI (+505)' },
  { code: '+234', label: 'NG (+234)' },
  { code: '+47', label: 'NO (+47)' },
  { code: '+968', label: 'OM (+968)' },
  { code: '+92', label: 'PK (+92)' },
  { code: '+507', label: 'PA (+507)' },
  { code: '+595', label: 'PY (+595)' },
  { code: '+51', label: 'PE (+51)' },
  { code: '+63', label: 'PH (+63)' },
  { code: '+48', label: 'PL (+48)' },
  { code: '+351', label: 'PT (+351)' },
  { code: '+974', label: 'QA (+974)' },
  { code: '+40', label: 'RO (+40)' },
  { code: '+250', label: 'RW (+250)' },
  { code: '+966', label: 'SA (+966)' },
  { code: '+381', label: 'RS (+381)' },
  { code: '+65', label: 'SG (+65)' },
  { code: '+421', label: 'SK (+421)' },
  { code: '+386', label: 'SI (+386)' },
  { code: '+27', label: 'ZA (+27)' },
  { code: '+34', label: 'ES (+34)' },
  { code: '+94', label: 'LK (+94)' },
  { code: '+46', label: 'SE (+46)' },
  { code: '+41', label: 'CH (+41)' },
  { code: '+886', label: 'TW (+886)' },
  { code: '+255', label: 'TZ (+255)' },
  { code: '+216', label: 'TN (+216)' },
  { code: '+90', label: 'TR (+90)' },
  { code: '+380', label: 'UA (+380)' },
  { code: '+598', label: 'UY (+598)' },
  { code: '+998', label: 'UZ (+998)' },
  { code: '+58', label: 'VE (+58)' },
  { code: '+84', label: 'VN (+84)' },
  { code: '+967', label: 'YE (+967)' },
  { code: '+260', label: 'ZM (+260)' },
  { code: '+263', label: 'ZW (+263)' },
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
      setEditCountryCode('+357');
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
      subscription.unsubscribe();
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

  // Logout Functionality
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('user_name');
      localStorage.removeItem('user_email');
      localStorage.removeItem('user_phone');

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
      router.push('/login');
    } catch (err) {
      console.error('Error logging out:', err);
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

      setCurrentUser(updatedUser);

      localStorage.setItem('user_name', editName);
      localStorage.setItem('user_email', editEmail);
      localStorage.setItem('user_phone', fullPhoneNumber);

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

    const finalRoom = selectedRoom === 'Other' ? customRoomName : selectedRoom;
    const cleanNumber = currentUser.phone.replace(/\s+/g, '');
    const fullPhone = `${currentUser.countryCode}${cleanNumber}`;

    const query = new URLSearchParams({
      userId: currentUser.id || '',
      customerName: currentUser.name || '',
      email: currentUser.email || '',
      phone: fullPhone,
      room: finalRoom,
      date: formattedDateString,
      time: selectedSlot,
    }).toString();

    router.push(`/customer/program?${query}`);
  };

  const CustomDateInput = forwardRef<HTMLButtonElement, any>(({ value, onClick }, ref) => (
    <button
      type="button"
      onClick={onClick}
      ref={ref}
      aria-label="Select booking date"
      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-base bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition duration-150 text-slate-800 cursor-pointer select-none flex items-center justify-between"
    >
      <span className={!value ? 'text-slate-400' : 'text-slate-800'}>
        {value || 'Select booking date'}
      </span>
      <svg
        className="w-5 h-5 text-slate-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        ></path>
      </svg>
    </button>
  ));
  CustomDateInput.displayName = 'CustomDateInput';

  return (
    <div className="w-full h-full sm:max-w-md bg-white p-5 sm:p-8 sm:rounded-3xl shadow-none sm:shadow-sm border-0 sm:border border-slate-100 flex flex-col justify-between items-center relative overflow-y-auto">
      {/* Profile Button / Badge */}
      <button
        type="button"
        onClick={() => setIsProfileModalOpen(true)}
        className="absolute top-4 left-4 flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-full py-1 px-3 z-10 transition duration-150 text-left group cursor-pointer"
      >
        <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-emerald-700">
          {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : '?'}
        </div>
        <div className="flex flex-col pr-1">
          <span className="text-[11px] font-semibold text-slate-700 leading-tight truncate max-w-[85px] sm:max-w-[100px]">
            {currentUser?.name || 'Set Profile'}
          </span>
          <span className="text-[9px] text-slate-400 leading-tight truncate max-w-[85px] sm:max-w-[100px]">
            {currentUser?.phone
              ? `${currentUser.countryCode} ${currentUser.phone}`
              : currentUser?.email || 'Add details'}
          </span>
        </div>
      </button>

      {/* Logo Section */}
      <div className="w-full flex flex-col items-center pt-8 sm:pt-4 pb-2 shrink-0">
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

      {/* Form Body */}
      <div className="w-full py-2 space-y-5 my-auto shrink-0">
        <form onSubmit={handleNext} className="space-y-5">
          {/* Section 1: Select Room & Date */}
          <div className="space-y-3">
            <h2 className="text-base font-bold text-slate-800">Select Room & Date</h2>

            {/* Room Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Room</label>
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                required
                className={`w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-base bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition duration-150 truncate cursor-pointer ${
                  !selectedRoom ? 'text-slate-400' : 'text-slate-800'
                }`}
              >
                <option value="" disabled hidden>
                  Select a room...
                </option>
                {ROOM_LIST.map((room, idx) => (
                  <option key={idx} value={room} className="text-slate-800">
                    {room}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Room Input */}
            {selectedRoom === 'Other' && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Property Name / Details
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter your property name or address"
                  value={customRoomName}
                  onChange={(e) => setCustomRoomName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-base bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition duration-150 text-slate-800 placeholder:text-slate-400"
                />
              </div>
            )}

            {/* Custom DatePicker Component */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Date (Advance booking only)
              </label>
              <DatePicker
                selected={selectedDateObj}
                onChange={(date: Date | null) => {
                  setSelectedDateObj(date);
                  setSelectedSlot(null);
                }}
                minDate={getTomorrowDateObj()}
                dateFormat="yyyy-MM-dd"
                customInput={<CustomDateInput />}
              />
            </div>
          </div>

          {/* Section 2: Select Time Slot */}
          <div className="space-y-3">
            <h2 className="text-base font-bold text-slate-800">Select Time Slot</h2>

            {/* Status Legend */}
            <div className="flex gap-4 text-xs font-medium text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 bg-emerald-500 rounded-md"></span>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 bg-slate-400 rounded-md"></span>
                <span>Unavailable</span>
              </div>
            </div>

            {/* Time Slots Grid */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {timeSlots.map((slot) => {
                const isSelected = selectedSlot === slot.time;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    disabled={!slot.available}
                    onClick={() => setSelectedSlot(slot.time)}
                    className={`p-2.5 rounded-2xl text-xs font-semibold transition-all flex flex-col items-center justify-center border touch-manipulation cursor-pointer ${
                      !slot.available
                        ? 'bg-slate-400 text-white border-slate-400 cursor-not-allowed opacity-60'
                        : isSelected
                        ? 'bg-emerald-700 text-white border-emerald-800 ring-2 ring-emerald-400 shadow-md'
                        : 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white border-emerald-600'
                    }`}
                  >
                    <span className="tracking-tight">{slot.time}</span>
                    <span className="text-[10px] font-normal opacity-90 mt-0.5">
                      ({slot.available ? 'Available' : 'Unavailable'})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Next Button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="w-full sm:w-auto px-8 py-3.5 sm:py-3 min-h-[48px] bg-slate-700 hover:bg-slate-800 active:bg-slate-900 active:scale-[0.98] text-white font-semibold rounded-2xl text-sm transition duration-150 shadow-sm touch-manipulation cursor-pointer flex items-center justify-center"
            >
              Next
            </button>
          </div>
        </form>
      </div>

      {/* Footer */}
      <div className="w-full pt-4 pb-2 text-center shrink-0">
        <p className="text-[11px] text-slate-400">© Getaway Cleaning Service</p>
      </div>

      {/* Profile Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl space-y-4 border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-800">Customer Profile</h3>
              <button
                type="button"
                onClick={handleLogout}
                className="text-xs font-medium text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl transition flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Log Out
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Please check your information for admin confirmation.
            </p>

            <form onSubmit={handleSaveProfile} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter your full name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="Enter your email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Phone Number
                </label>
                <div className="flex gap-2">
                  <select
                    value={editCountryCode}
                    onChange={(e) => {
                      const newCode = e.target.value;
                      setEditCountryCode(newCode);
                      setEditPhone(formatPhoneNumber(editPhone, newCode));
                    }}
                    className="w-32 px-2 py-2.5 border border-slate-200 rounded-2xl text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800 font-medium cursor-pointer shrink-0"
                  >
                    {COUNTRY_CODES.map((item, idx) => (
                      <option key={`${item.code}-${idx}`} value={item.code}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    required
                    placeholder={editCountryCode === '+357' ? 'xx xxx xxxx' : 'xxx xxx xxxx'}
                    value={editPhone}
                    onChange={(e) => {
                      setEditPhone(formatPhoneNumber(e.target.value, editCountryCode));
                    }}
                    className="flex-1 px-3.5 py-2.5 border border-slate-200 rounded-2xl text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800 min-w-0"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  disabled={isSavingProfile}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {isSavingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BookingPage() {
  return (
    <main className="fixed inset-0 sm:relative sm:min-h-[100dvh] bg-white sm:bg-slate-50 flex flex-col items-center justify-center p-0 sm:p-4 text-slate-800 font-sans overflow-hidden">
      <style jsx global>{`
        .react-datepicker-wrapper {
          width: 100%;
        }
        .react-datepicker {
          font-family: inherit;
          font-size: 0.85rem !important;
          border-radius: 1.25rem !important;
          border: 1px solid #e2e8f0 !important;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1) !important;
          overflow: hidden;
          background-color: #ffffff !important;
        }
        .react-datepicker__header {
          background-color: #f8fafc !important;
          border-bottom: 1px solid #f1f5f9 !important;
          padding-top: 12px !important;
          padding-bottom: 6px !important;
        }
        .react-datepicker__current-month {
          font-size: 0.9rem !important;
          font-weight: 700 !important;
          color: #0f172a !important;
          margin-bottom: 4px !important;
        }

        .react-datepicker__day-name,
        .react-datepicker__day {
          width: 2.1rem !important;
          line-height: 2.1rem !important;
          margin: 0.12rem !important;
          font-size: 0.8rem !important;
          font-weight: 500;
          border-radius: 0.6rem !important;
        }
        .react-datepicker__day:hover {
          background-color: #e2e8f0 !important;
        }
        .react-datepicker__day--selected,
        .react-datepicker__day--keyboard-selected {
          background-color: #059669 !important;
          color: white !important;
          font-weight: 700 !important;
        }
        .react-datepicker__day--disabled {
          color: #cbd5e1 !important;
          cursor: not-allowed !important;
        }

        .react-datepicker__navigation {
          top: 10px !important;
        }
        .react-datepicker__navigation-icon::before {
          border-color: #475569 !important;
          border-width: 2px 2px 0 0 !important;
        }
      `}</style>

      <Suspense fallback={<div className="text-slate-500 text-sm p-4">Loading...</div>}>
        <BookingForm />
      </Suspense>
    </main>
  );
}