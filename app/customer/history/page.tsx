'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

interface Booking {
  id: string | number;
  booking_ref?: string;
  room_name?: string;
  location?: string;
  property_name?: string;
  room?: string;
  room_type?: string;
  address?: string;
  address_line?: string;
  package_name?: string;
  service_name?: string;
  program?: string;
  booking_date?: string;
  scheduled_date?: string;
  booking_time?: string;
  scheduled_time?: string;
  status: string;
  user_id?: string;
  customer_email?: string;
  email?: string;
}

interface Feedback {
  id?: string | number;
  booking_id: string | number;
  rating?: number;
  rating_score?: number;
  comment?: string;
  admin_reply?: string;
  replied_at?: string;
  created_at?: string;
}

function HistoryContent() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [submittedFeedbacks, setSubmittedFeedbacks] = useState<Record<string, Feedback>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [userId, setUserId] = useState<string | null>(null);

  // ดึงรายการ Feedbacks
  const fetchFeedbacksForBookings = useCallback(async (bookingIds: (string | number)[]) => {
    if (!bookingIds || bookingIds.length === 0) return;
    try {
      const stringIds = bookingIds.map((id) => String(id));
      
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('feedbacks')
        .select('*')
        .in('booking_id', stringIds);

      if (feedbackError) {
        console.error('Error fetching feedbacks:', feedbackError.message);
        return;
      }

      if (feedbackData) {
        const feedbackMap: Record<string, Feedback> = {};
        feedbackData.forEach((fb) => {
          if (fb && fb.booking_id !== undefined && fb.booking_id !== null) {
            feedbackMap[String(fb.booking_id)] = fb;
          }
        });
        setSubmittedFeedbacks(feedbackMap);
      }
    } catch (err) {
      console.error('Exception fetching feedbacks:', err);
    }
  }, []);

  // ฟังก์ชันดึงข้อมูลผู้ใช้และการจองทั้งหมด (แก้ไข Query ให้ปลอดภัยขึ้น)
  const fetchUserAndInitialData = useCallback(async (isMounted = true) => {
    try {
      if (isMounted) setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      
      let storedUser: any = null;
      try {
        const localData = localStorage.getItem('user') || localStorage.getItem('sb-user');
        if (localData) storedUser = JSON.parse(localData);
      } catch (e) {}

      const currentUserId = user?.id || storedUser?.id || null;
      const email = user?.email || storedUser?.email || localStorage.getItem('user_email');

      if (isMounted) setUserId(currentUserId);

      // 🟢 ปรับเปลี่ยนโครงสร้าง Query ป้องกัน Column Not Found Error
      let query = supabase.from('bookings').select('*');

      const conditions: string[] = [];
      if (currentUserId) {
        conditions.push(`user_id.eq.${currentUserId}`);
      }
      if (email && email.trim() !== '') {
        conditions.push(`customer_email.eq.${email}`);
      }

      let bookingData: Booking[] | null = null;
      let bookingError = null;

      if (conditions.length > 0) {
        const { data, error } = await query.or(conditions.join(','));
        bookingData = data as Booking[];
        bookingError = error;
      } else {
        const { data, error } = await query.order('created_at', { ascending: false }).limit(20);
        bookingData = data as Booking[];
        bookingError = error;
      }

      if (bookingError) {
        console.error('Error fetching bookings:', bookingError.message);
        // กรณี Query Error ให้พยายามดึงข้อมูลแบบ Fallback ทันทีเพื่อไม่ให้หน้าจอค้าง
        const { data: fallbackData } = await supabase
          .from('bookings')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);

        if (fallbackData && isMounted) {
          setBookings(fallbackData as Booking[]);
        }
      } else if (bookingData && isMounted) {
        const sortedBookings = [...bookingData].sort((a, b) => {
          const dateA = a.booking_date || a.scheduled_date || '';
          const dateB = b.booking_date || b.scheduled_date || '';
          return dateB.localeCompare(dateA);
        });

        setBookings(sortedBookings);
        const bookingIds = sortedBookings.map((b) => b.id);
        await fetchFeedbacksForBookings(bookingIds);
      }
    } catch (err: any) {
      console.error('Failed to load history data:', err?.message || err);
    } finally {
      if (isMounted) setLoading(false);
    }
  }, [fetchFeedbacksForBookings]);

  // Initial Load & Focus Re-fetch
  useEffect(() => {
    let isMounted = true;
    fetchUserAndInitialData(isMounted);

    const handleFocus = () => fetchUserAndInitialData(true);
    window.addEventListener('focus', handleFocus);

    return () => {
      isMounted = false;
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchUserAndInitialData]);

  // Realtime Listener
  useEffect(() => {
    const channelId = Math.random().toString(36).substring(2, 7);

    const bookingChannel = supabase
      .channel(`rt_bookings_${channelId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        (payload) => {
          if (payload.eventType === 'UPDATE' && payload.new) {
            const updatedBooking = payload.new as Booking;
            setBookings((prev) =>
              prev.map((item) =>
                String(item.id) === String(updatedBooking.id) ? { ...item, ...updatedBooking } : item
              )
            );
            
            const cleanStatus = (updatedBooking.status || '').trim().toLowerCase();
            if (['completed', 'done', 'finished', 'success'].includes(cleanStatus)) {
              fetchFeedbacksForBookings([updatedBooking.id]);
            }
          } else if (payload.eventType === 'INSERT' && payload.new) {
            setBookings((prev) => [payload.new as Booking, ...prev]);
          }
        }
      )
      .subscribe();

    const feedbackChannel = supabase
      .channel(`rt_feedbacks_${channelId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'feedbacks' },
        (payload) => {
          const updatedFb = payload.new as any;
          if (updatedFb && updatedFb.booking_id !== undefined && updatedFb.booking_id !== null) {
            const key = String(updatedFb.booking_id);
            setSubmittedFeedbacks((prev) => ({
              ...prev,
              [key]: {
                ...(prev[key] || {}),
                ...updatedFb,
              },
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(bookingChannel);
      supabase.removeChannel(feedbackChannel);
    };
  }, [fetchFeedbacksForBookings]);

  const groupedBookings = (bookings || []).reduce((acc, booking) => {
    const dateKey = booking?.booking_date || booking?.scheduled_date || 'Unscheduled';
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(booking);
    return acc;
  }, {} as Record<string, Booking[]>);

  return (
    <main className="min-h-screen w-full bg-white flex flex-col justify-between items-center py-4 sm:py-8 px-4 sm:px-6 text-[#1E2B37] font-sans antialiased overflow-y-auto">
      
      {/* Container หลัก */}
      <div className="w-full max-w-lg mx-auto flex-1 flex flex-col justify-between items-center space-y-6">
        
        {/* Header */}
        <div className="w-full text-center pb-2 shrink-0 space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-[#1E2B37] tracking-tight">
            My Bookings
          </h1>
          <p className="text-xs sm:text-sm text-[#8E9B9E]">View and manage your booking history</p>
        </div>

        {/* List Container */}
        <div className="w-full space-y-6 flex-1 flex flex-col items-center">
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-2 border-[#006AFF] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs sm:text-sm font-semibold text-[#8E9B9E]">Loading bookings...</p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center justify-center space-y-4 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] p-6 w-full">
              <p className="text-sm font-bold text-[#1E2B37]">No booking history found.</p>
              <button
                type="button"
                onClick={() => router.push('/customer/booking')}
                className="px-5 py-2.5 min-h-[44px] bg-[#006AFF] hover:bg-[#0057D9] text-white text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer touch-manipulation active:scale-[0.98]"
              >
                Book Service Now
              </button>
            </div>
          ) : (
            Object.entries(groupedBookings).map(([date, items]) => (
              <div key={date} className="space-y-3 w-full flex flex-col items-center">
                
                {/* Sticky Header วันที่ */}
                <div className="sticky top-0 bg-white/95 backdrop-blur-md py-2 z-10 flex items-center justify-between w-full px-1">
                  <span className="text-xs sm:text-sm font-bold text-[#1E2B37] tracking-wide flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#006AFF]"></span>
                    {date}
                  </span>
                  <span className="text-[11px] font-semibold text-[#8E9B9E] bg-[#F8FAFC] border border-[#E2E8F0] px-2.5 py-0.5 rounded-full">
                    {items.length} {items.length > 1 ? 'bookings' : 'booking'}
                  </span>
                </div>

                {/* List การ์ด */}
                <div className="flex flex-col items-center gap-3 w-full">
                  {items.map((booking) => {
                    if (!booking) return null;
                    
                    const cleanStatus = (booking.status || '').trim().toLowerCase();
                    const isCompleted = ['completed', 'done', 'finished', 'success'].includes(cleanStatus);

                    const rawRef = booking.booking_ref || `REF-${booking.id}`;
                    const cleanStr = rawRef.replace(/^REF-?/i, '');
                    const formattedRef = `REF-${cleanStr.slice(0, 8).toUpperCase()}`;

                    const locationText =
                      booking.address_line ||
                      booking.location ||
                      booking.room_name ||
                      booking.property_name ||
                      booking.room ||
                      booking.room_type ||
                      booking.address ||
                      '-';

                    const programName =
                      booking.program ||
                      booking.package_name ||
                      booking.service_name ||
                      'Standard Cleaning';

                    const bookingTime = booking.booking_time || booking.scheduled_time || '-';

                    const existingFeedback = submittedFeedbacks[String(booking.id)];
                    const displayRating = existingFeedback?.rating ?? existingFeedback?.rating_score;

                    return (
                      <div
                        key={booking.id}
                        className="p-4 sm:p-5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl transition-all flex flex-col justify-between items-center gap-3.5 w-full"
                      >
                        <div className="space-y-3 w-full">
                          {/* Reference & Status Header */}
                          <div className="flex items-center justify-between gap-2 border-b border-[#E2E8F0] pb-2.5">
                            <span className="text-xs font-bold text-[#006AFF] bg-[#EAF3F9] px-2.5 py-1 rounded-lg">
                              {formattedRef}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full capitalize ${
                                isCompleted
                                  ? 'bg-[#E6F9E6] text-[#008800]'
                                  : cleanStatus === 'confirmed' || cleanStatus === 'in progress'
                                  ? 'bg-[#EAF3F9] text-[#006AFF]'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isCompleted
                                    ? 'bg-[#008800]'
                                    : cleanStatus === 'confirmed' || cleanStatus === 'in progress'
                                    ? 'bg-[#006AFF]'
                                    : 'bg-gray-400'
                                }`}
                              />
                              {booking.status}
                            </span>
                          </div>

                          {/* Details */}
                          <div className="space-y-2 text-xs">
                            <div className="flex items-start justify-between gap-4">
                              <span className="font-medium text-[#8E9B9E] shrink-0">Location</span>
                              <p className="font-bold text-[#1E2B37] text-right leading-tight">
                                {locationText}
                              </p>
                            </div>

                            <div className="flex items-center justify-between gap-4">
                              <span className="font-medium text-[#8E9B9E] shrink-0">Program</span>
                              <span className="font-bold text-[#1E2B37] text-right">
                                {programName}
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-4">
                              <span className="font-medium text-[#8E9B9E] shrink-0">Time</span>
                              <span className="font-semibold text-[#8E9B9E] text-right">
                                {bookingTime}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action & Feedback Area */}
                        <div className="w-full pt-2.5 border-t border-[#E2E8F0] shrink-0 flex flex-col items-center justify-center">
                          {isCompleted ? (
                            existingFeedback ? (
                              <div className="space-y-2 w-full">
                                <div className="w-full py-2 bg-white border border-[#E2E8F0] rounded-lg text-center flex items-center justify-center gap-1.5">
                                  <span className="text-xs font-bold text-[#008800]">
                                    ✓ Feedback Submitted
                                  </span>
                                  {displayRating !== undefined && displayRating !== null && (
                                    <span className="text-xs font-bold text-[#1E2B37]">
                                      ({displayRating}/5)
                                    </span>
                                  )}
                                </div>

                                {(existingFeedback.comment || existingFeedback.admin_reply) && (
                                  <div className="p-3 bg-white border border-[#E2E8F0] rounded-lg text-left space-y-2">
                                    {existingFeedback.comment && (
                                      <div className="space-y-0.5">
                                        <span className="text-[10px] font-bold text-[#8E9B9E] uppercase tracking-wider block">
                                          My Feedback
                                        </span>
                                        <p className="text-xs text-[#1E2B37] font-semibold leading-relaxed">
                                          "{existingFeedback.comment}"
                                        </p>
                                      </div>
                                    )}

                                    {existingFeedback.admin_reply && (
                                      <div className="pt-2 border-t border-[#E2E8F0] space-y-0.5">
                                        <span className="text-[10px] font-bold text-[#475569] uppercase tracking-wider block">
                                          Our Reply
                                        </span>
                                        <p className="text-xs text-[#334155] font-medium leading-relaxed">
                                          {existingFeedback.admin_reply}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <Link
                                href={`/customer/feedback?booking_id=${booking.id}&ref=${rawRef}`}
                                className="w-full py-2.5 min-h-[44px] bg-[#EAF3F9] hover:bg-[#006AFF] text-[#006AFF] hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer text-center flex items-center justify-center active:scale-[0.98] touch-manipulation"
                              >
                                Leave Feedback
                              </Link>
                            )
                          ) : (
                            <div className="text-center py-0.5">
                              <span className="text-xs font-semibold text-[#8E9B9E] italic">
                                {cleanStatus === 'confirmed' ? 'In progress' : 'Scheduled'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="w-full shrink-0 pt-4 space-y-2 text-center flex flex-col items-center justify-center">
          <button
            type="button"
            onClick={() => router.push('/customer/booking')}
            className="py-2 px-4 min-h-[44px] text-xs sm:text-sm font-bold text-[#8E9B9E] hover:text-[#1E2B37] transition cursor-pointer rounded-xl hover:bg-[#F8FAFC] active:scale-[0.98] touch-manipulation"
          >
            ← Back to Booking
          </button>

          <p className="text-xs text-[#94A3B8] font-medium">
            © Getaway Cleaning Service
          </p>
        </div>

      </div>
    </main>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-white text-xs text-[#8E9B9E]">Loading...</div>}>
      <HistoryContent />
    </Suspense>
  );
}