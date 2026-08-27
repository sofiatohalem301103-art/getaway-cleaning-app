'use client';

import { useState, useEffect, forwardRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { supabase } from '@/lib/supabaseClient';

function BookingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);

  // คำนวณวันพรุ่งนี้
  const getTomorrowDateObj = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  };

  const [selectedRoom, setSelectedRoom] = useState(
    'Beautiful Apartment in Harbour Paphos | Central'
  );
  const [customRoomName, setCustomRoomName] = useState('');

  // เก็บค่าเป็น Date Object สำหรับ react-datepicker
  const [selectedDateObj, setSelectedDateObj] = useState<Date | null>(getTomorrowDateObj());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);

  // แปลง Date เป็น ISO String (YYYY-MM-DD)
  const formattedDateString = selectedDateObj
    ? selectedDateObj.toISOString().split('T')[0]
    : '';

  const loadUserData = async () => {
    try {
      const nameParam = searchParams.get('customerName') || searchParams.get('name');
      const emailParam = searchParams.get('email');
      const idParam = searchParams.get('userId');

      if (emailParam) {
        setCurrentUser({
          id: idParam || '',
          name: nameParam || emailParam.split('@')[0],
          email: emailParam,
        });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      if (user && user.email) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, name, email')
          .eq('id', user.id)
          .maybeSingle();

        const finalEmail = profile?.email || user.email;
        const finalName =
          profile?.full_name ||
          profile?.name ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          finalEmail.split('@')[0];

        setCurrentUser({
          id: user.id,
          name: finalName,
          email: finalEmail,
        });
        return;
      }

      const savedEmail = localStorage.getItem('user_email') || sessionStorage.getItem('user_email');
      const localUser = localStorage.getItem('user') || localStorage.getItem('sb-user');

      if (savedEmail) {
        setCurrentUser({
          id: '',
          name: savedEmail.split('@')[0],
          email: savedEmail,
        });
      } else if (localUser) {
        const parsed = JSON.parse(localUser);
        const email = parsed.email || '';
        setCurrentUser({
          id: parsed.id || '',
          name: parsed.name || (email ? email.split('@')[0] : 'User'),
          email: email,
        });
      } else {
        setCurrentUser(null);
      }
    } catch (err) {
      console.error('Failed to load user:', err);
      setCurrentUser(null);
    }
  };

  useEffect(() => {
    loadUserData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadUserData();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [searchParams]);

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

  const roomList = [
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

  const rawTimeSlots = [
    '09:00 - 10:00',
    '10:00 - 11:00',
    '11:00 - 12:00',
    '13:00 - 14:00',
    '14:00 - 15:00',
    '15:00 - 16:00',
  ];

  const timeSlots = rawTimeSlots.map((time, index) => ({
    id: `slot-${index + 1}`,
    time: time,
    available: !bookedSlots.includes(time),
  }));

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
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

    const query = new URLSearchParams({
      userId: currentUser?.id || '',
      customerName: currentUser?.name || '',
      email: currentUser?.email || '',
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
      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-base bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition duration-150 text-slate-800 cursor-pointer select-none flex items-center justify-between"
    >
      <span>{value || 'Select booking date'}</span>
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
      
      {/* User Profile Badge (มุมซ้ายบน) */}
      <div className="absolute top-4 left-4 flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-full py-1 px-3 shadow-2xs z-10">
        <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
          {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
        </div>
        <div className="flex flex-col text-left pr-1">
          <span className="text-[11px] font-semibold text-slate-700 leading-tight truncate max-w-[90px] sm:max-w-[100px]">
            {currentUser?.name || 'User'}
          </span>
          {currentUser?.email && (
            <span className="text-[9px] text-slate-400 leading-tight truncate max-w-[90px] sm:max-w-[100px]">
              {currentUser.email}
            </span>
          )}
        </div>
      </div>

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
            <h2 className="text-base font-bold text-slate-800">
              Select Room & Date
            </h2>

            {/* Room Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Room
              </label>
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-base bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition duration-150 text-slate-800 truncate cursor-pointer"
              >
                {roomList.map((room, idx) => (
                  <option key={idx} value={room}>
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
            <h2 className="text-base font-bold text-slate-800">
              Select Time Slot
            </h2>

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
        <p className="text-[11px] text-slate-400">
          © Getaway Cleaning Service
        </p>
      </div>

    </div>
  );
}

export default function BookingPage() {
  return (
    <main className="fixed inset-0 sm:relative sm:min-h-[100dvh] bg-white sm:bg-slate-50 flex flex-col items-center justify-center p-0 sm:p-4 text-slate-800 font-sans overflow-hidden">
      
      {/* CSS Override สำหรับดีไซน์ Datepicker */}
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
        
        .react-datepicker__day-name, .react-datepicker__day {
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