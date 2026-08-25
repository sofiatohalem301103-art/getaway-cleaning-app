'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';

export default function BookingPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);

  const [isLoadingUser, setIsLoadingUser] = useState(true);

  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(
    'Beautiful Apartment in Harbour Paphos | Central'
  );
  const [customRoomName, setCustomRoomName] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);

  // 🛠️ ค้นหาข้อมูล User จาก Supabase / LocalStorage / Parameters / Fallback
  const loadUserData = async () => {
    try {
      setIsLoadingUser(true);

      // 1. อ่านจาก Query Parameter หากมีส่งมาจากหน้าอื่น
      const searchParams = new URLSearchParams(window.location.search);
      const nameParam = searchParams.get('customerName') || searchParams.get('name');
      const emailParam = searchParams.get('email');
      const idParam = searchParams.get('userId');

      if (nameParam) {
        setCurrentUser({
          id: idParam || 'usr_sofia',
          name: nameParam,
          email: emailParam || 'sofia.ross@example.com',
        });
        return;
      }

      // 2. เช็คจาก Supabase Auth Session
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
          'Sofia Ross';

        const email = profile?.email || user.email || 'sofia.ross@example.com';

        setCurrentUser({ id: user.id, name, email });
        return;
      }

      // 3. เช็คจาก LocalStorage
      const localUser = localStorage.getItem('user') || localStorage.getItem('sb-user');
      if (localUser) {
        const parsed = JSON.parse(localUser);
        setCurrentUser({
          id: parsed.id || 'usr_sofia',
          name: parsed.name || parsed.full_name || 'Sofia Ross',
          email: parsed.email || 'sofia.ross@example.com',
        });
        return;
      }

      // 4. หากไม่พบข้อมูลใดๆ ให้แสดง Sofia Ross เป็นค่า Default เพื่อให้ตรงกับหน้าถัดไป
      setCurrentUser({
        id: 'usr_sofia',
        name: 'Sofia Ross',
        email: 'sofia.ross@example.com',
      });

    } catch (err) {
      console.error('Failed to load user:', err);
      setCurrentUser({
        id: 'usr_sofia',
        name: 'Sofia Ross',
        email: 'sofia.ross@example.com',
      });
    } finally {
      setIsLoadingUser(false);
    }
  };

  useEffect(() => {
    loadUserData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadUserData();
    });

    setSelectedDate(getTomorrowDate());

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const fetchBookedSlots = async () => {
      if (!selectedDate) return;

      const { data, error } = await supabase
        .from('bookings')
        .select('booking_time')
        .eq('booking_date', selectedDate);

      if (error) {
        console.error('Error fetching booked slots:', error.message);
      } else if (data) {
        const times = data.map((item) => item.booking_time);
        setBookedSlots(times);
      }
    };

    fetchBookedSlots();
  }, [selectedDate]);

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
    setCurrentUser(null);
    setShowProfileMenu(false);
  };

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();

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
      customerName: currentUser?.name || 'Sofia Ross',
      email: currentUser?.email || 'sofia.ross@example.com',
      room: finalRoom,
      date: selectedDate,
      time: selectedSlot,
    }).toString();

    router.push(`/customer/program?${query}`);
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 relative">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 w-full max-w-md relative">
        {/* Profile Menu Top Right */}
        <div className="absolute top-4 right-4 z-10">
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition active:scale-95 cursor-pointer"
          >
            <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
              {isLoadingUser
                ? '...'
                : currentUser?.name
                ? currentUser.name.charAt(0).toUpperCase()
                : 'S'}
            </div>
            <span>Profile</span>
          </button>

          {/* User Profile Popup Box */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-left z-20">
              <div className="border-b border-gray-100 pb-2 mb-2">
                <p className="text-xs font-bold text-gray-800">
                  {isLoadingUser
                    ? 'Loading...'
                    : currentUser?.name || 'Sofia Ross'}
                </p>
                <p className="text-[11px] text-gray-500 truncate">
                  {isLoadingUser
                    ? 'Checking...'
                    : currentUser?.email || 'sofia.ross@example.com'}
                </p>
              </div>

              {currentUser ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full text-left text-xs font-medium text-red-600 hover:bg-red-50 p-1.5 rounded-md transition cursor-pointer"
                >
                  Log out
                </button>
              ) : (
                <p className="text-[10px] text-gray-400 text-center py-1">
                  Not logged in
                </p>
              )}
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

        <form onSubmit={handleNext} className="space-y-5">
          {/* Select Room & Date */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-800">
              Select Room & Date
            </h3>

            {/* Room Dropdown */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                Room
              </label>
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-700 truncate cursor-pointer"
              >
                {roomList.map((room, idx) => (
                  <option key={idx} value={room}>
                    {room}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Room Name Input */}
            {selectedRoom === 'Other' && (
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                  Property Name / Details
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter your property name or address"
                  value={customRoomName}
                  onChange={(e) => setCustomRoomName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-700"
                />
              </div>
            )}

            {/* Date Picker */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                Date (Advance booking only)
              </label>
              <input
                type="date"
                required
                min={getTomorrowDate()}
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedSlot(null);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-700 cursor-pointer"
              />
            </div>
          </div>

          {/* Select Time Slot */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-800">
              Select Time Slot
            </h3>

            {/* Legend */}
            <div className="flex gap-4 text-[11px] font-medium text-gray-600">
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 bg-emerald-500 rounded"></span>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 bg-gray-500 rounded"></span>
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
                    className={`p-2 rounded-lg text-[11px] font-medium transition flex flex-col items-center justify-center border ${
                      !slot.available
                        ? 'bg-gray-500 text-white border-gray-600 cursor-not-allowed opacity-80'
                        : isSelected
                        ? 'bg-emerald-700 text-white border-emerald-800 ring-2 ring-emerald-400'
                        : 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white border-emerald-600 cursor-pointer'
                    }`}
                  >
                    <span>{slot.time}</span>
                    <span className="text-[9px] opacity-90">
                      ({slot.available ? 'Available' : 'Unavailable'})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-2 bg-gray-600 hover:bg-gray-700 active:bg-gray-800 text-white font-semibold rounded-lg text-xs transition active:scale-95 duration-150 cursor-pointer"
            >
              Next
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}