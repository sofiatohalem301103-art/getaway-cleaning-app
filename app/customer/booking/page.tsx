'use client';

import { useState, useEffect, forwardRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { supabase } from '@/lib/supabaseClient';

export default function BookingPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);

  const [isLoadingUser, setIsLoadingUser] = useState(true);

  // คำนวณวันพรุ่งนี้
  const getTomorrowDateObj = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  };

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(
    'Beautiful Apartment in Harbour Paphos | Central'
  );
  const [customRoomName, setCustomRoomName] = useState('');
  
  // เก็บค่าเป็น Date Object สำหรับ react-datepicker
  const [selectedDateObj, setSelectedDateObj] = useState<Date | null>(getTomorrowDateObj());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);

  // แปลง Date เป็น ISO String (YYYY-MM-DD) สำหรับดึงข้อมูลจาก Database
  const formattedDateString = selectedDateObj
    ? selectedDateObj.toISOString().split('T')[0]
    : '';

  const loadUserData = async () => {
    try {
      setIsLoadingUser(true);

      const searchParams = new URLSearchParams(window.location.search);
      const nameParam = searchParams.get('customerName') || searchParams.get('name');
      const emailParam = searchParams.get('email');
      const idParam = searchParams.get('userId');

      // 1. ดึงจาก URL Query Parameters
      if (nameParam || emailParam) {
        setCurrentUser({
          id: idParam || '',
          name: nameParam || emailParam?.split('@')[0] || 'User',
          email: emailParam || '',
        });
        return;
      }

      // 2. ดึงจาก Supabase Auth Session
      const { data: { session } } = await supabase.auth.getSession();
      let user: any = session?.user;

      if (!user) {
        const { data: userData } = await supabase.auth.getUser();
        user = userData?.user;
      }

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, name, email')
          .eq('id', user.id)
          .maybeSingle();

        const name =
          profile?.full_name ||
          profile?.name ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.user_metadata?.user_name ||
          user.email?.split('@')[0] ||
          '';

        const email = profile?.email || user.email || '';

        setCurrentUser({ id: user.id, name, email });
        return;
      }

      // 3. ดึงจาก localStorage
      const localUser = localStorage.getItem('user') || localStorage.getItem('sb-user');
      if (localUser) {
        const parsed = JSON.parse(localUser);
        setCurrentUser({
          id: parsed.id || '',
          name: parsed.name || parsed.full_name || (parsed.email ? parsed.email.split('@')[0] : ''),
          email: parsed.email || localStorage.getItem('user_email') || '',
        });
        return;
      }

      // 4. กรณีไม่พบข้อมูลผู้ใช้ในทุกช่องทาง
      setCurrentUser(null);

    } catch (err) {
      console.error('Failed to load user:', err);
      setCurrentUser(null);
    } finally {
      setIsLoadingUser(false);
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
  }, []);

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('user');
    localStorage.removeItem('sb-user');
    localStorage.removeItem('user_email');
    localStorage.removeItem('temp_email');
    setCurrentUser(null);
    setShowProfileMenu(false);
    router.push('/login');
  };

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

  // Custom Input เพื่อแสดงปุ่มไอคอนปฏิทิน และล็อกไม่ให้พิมพ์คีย์บอร์ด
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
    <main className="min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center p-0 sm:p-4 text-slate-800 font-sans">
      
      {/* CSS Override สำหรับดีไซน์ปุ่มเลือกวัน และกล่องปฏิทิน */}
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

      {/* Main Container */}
      <div className="w-full min-h-[100dvh] sm:min-h-0 sm:max-w-md bg-white p-6 sm:p-8 sm:rounded-3xl shadow-none sm:shadow-sm border-none sm:border border-slate-100 flex flex-col justify-between items-center relative">
        
        {/* Profile Menu (Top Left) */}
        <div className="absolute top-5 left-5 z-20">
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition active:scale-95 cursor-pointer touch-manipulation"
          >
            <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
              {isLoadingUser
                ? '...'
                : currentUser?.name
                ? currentUser.name.charAt(0).toUpperCase()
                : 'U'}
            </div>
            <span>Profile</span>
          </button>

          {/* Profile Popup */}
          {showProfileMenu && (
            <div className="absolute left-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 text-left z-30">
              <div className="border-b border-slate-100 pb-2 mb-2">
                <p className="text-xs font-bold text-slate-800">
                  {isLoadingUser ? 'Loading...' : currentUser?.name || 'Guest User'}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  {isLoadingUser ? 'Checking...' : currentUser?.email || 'No email associated'}
                </p>
              </div>

              {currentUser ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full text-left text-xs font-medium text-red-600 hover:bg-red-50 p-2 rounded-xl transition cursor-pointer"
                >
                  Log out
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push('/login')}
                  className="w-full text-left text-xs font-medium text-emerald-600 hover:bg-emerald-50 p-2 rounded-xl transition cursor-pointer"
                >
                  Log in
                </button>
              )}
            </div>
          )}
        </div>

        {/* Logo Section */}
        <div className="w-full flex flex-col items-center pt-4 sm:pt-0">
          <Image
            src="/logo.jpeg"
            alt="Company Logo"
            width={130}
            height={130}
            className="object-contain"
            style={{ width: 'auto', height: 'auto' }}
            priority
          />
        </div>

        {/* Form Body */}
        <div className="w-full my-auto py-4 space-y-5">
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
                className="w-full sm:w-auto px-8 py-3 min-h-[48px] bg-slate-700 hover:bg-slate-800 active:bg-slate-900 active:scale-[0.98] text-white font-semibold rounded-2xl text-sm transition duration-150 shadow-sm touch-manipulation cursor-pointer flex items-center justify-center"
              >
                Next
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="w-full pb-4 sm:pb-0 text-center">
          <p className="text-[11px] text-slate-400">
            © Getaway Cleaning Service
          </p>
        </div>

      </div>
    </main>
  );
}