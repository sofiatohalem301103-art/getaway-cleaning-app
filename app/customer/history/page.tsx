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
        console.error('Error fetching feedbacks:', feedbackError);
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

  // ดึงข้อมูลผู้ใช้ และรายการการจองทั้งหมด
  useEffect(() => {
    let isMounted = true;

    const fetchUserAndInitialData = async () => {
      try {
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        
        let storedUser: any = null;
        try {
          const localData = localStorage.getItem('user') || localStorage.getItem('sb-user');
          if (localData) storedUser = JSON.parse(localData);
        } catch (e) {}

        const currentUserId = user?.id || storedUser?.id || null;
        const email = user?.email || storedUser?.email || localStorage.getItem('user_email');

        if (isMounted) setUserId(currentUserId);

        let queryFilters: string[] = [];
        if (currentUserId) {
          queryFilters.push(`user_id.eq.${currentUserId}`);
          queryFilters.push(`customer_id.eq.${currentUserId}`);
        }
        if (email) {
          queryFilters.push(`email.eq.${email}`);
          queryFilters.push(`customer_email.eq.${email}`);
        }

        let bookingData: Booking[] | null = null;
        let bookingError = null;

        if (queryFilters.length > 0) {
          const { data, error } = await supabase
            .from('bookings')
            .select('*')
            .or(queryFilters.join(','));

          bookingData = data as Booking[];
          bookingError = error;
        } else {
          const { data, error } = await supabase
            .from('bookings')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);

          bookingData = data as Booking[];
          bookingError = error;
        }

        if (bookingError) {
          console.error('Error fetching bookings:', bookingError.message);
        } else if (bookingData && isMounted) {
          const sortedBookings = bookingData.sort((a, b) => {
            const dateA = a.booking_date || a.scheduled_date || '';
            const dateB = b.booking_date || b.scheduled_date || '';
            return dateB.localeCompare(dateA);
          });

          setBookings(sortedBookings);
          const bookingIds = sortedBookings.map((b) => b.id);
          await fetchFeedbacksForBookings(bookingIds);
        }
      } catch (err) {
        console.error('Failed to load history data:', err);
      }  finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchUserAndInitialData();

    return () => {
      isMounted = false;
    };
  }, [fetchFeedbacksForBookings]);

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
            setBookings((prev) =>
              prev.map((item) =>
                String(item.id) === String(payload.new.id) ? { ...item, ...payload.new } : item
              )
            );
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
  }, []);

  const groupedBookings = (bookings || []).reduce((acc, booking) => {
    const dateKey = booking?.booking_date || booking?.scheduled_date || 'Unscheduled';
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(booking);
    return acc;
  }, {} as Record<string, Booking[]>);

  return (
    <main className="min-h-screen w-full bg-[#F8FAFC] flex flex-col justify-between items-center p-4 sm:p-8 lg:p-12 text-[#1E2B37] font-sans overflow-y-auto">
      
      {/* Container หลัก (ขนาดพอดีสายตา) */}
      <div className="w-full max-w-2xl mx-auto flex-1 flex flex-col justify-between items-center space-y-6">
        
        {/* Header */}
        <div className="w-full text-center border-b border-[#E2E8F0] pb-4 shrink-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1E2B37] tracking-tight">
            My Bookings
          </h1>
        </div>

        {/* List Container */}
        <div className="w-full my-2 space-y-8 flex-1 flex flex-col items-center">
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-[#006AFF] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-semibold text-[#8E9B9E]">Loading bookings...</p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center justify-center space-y-4 bg-white rounded-3xl border border-[#E2E8F0] shadow-xs p-8 w-full max-w-md">
              <p className="text-base font-bold text-[#1E2B37]">No booking history found.</p>
              <button
                type="button"
                onClick={() => router.push('/customer/booking')}
                className="px-6 py-3 bg-[#1E2B37] hover:bg-[#2c3d4e] text-white text-xs font-bold rounded-2xl transition cursor-pointer shadow-sm active:scale-95"
              >
                Book Service Now
              </button>
            </div>
          ) : (
            Object.entries(groupedBookings).map(([date, items]) => (
              <div key={date} className="space-y-4 w-full flex flex-col items-center">
                
                {/* Header วันที่ */}
                <div className="sticky top-0 bg-[#F8FAFC]/95 backdrop-blur-md py-2 z-10 border-b border-[#E2E8F0] flex items-center justify-between w-full max-w-lg px-1">
                  <span className="text-sm font-extrabold text-[#1E2B37] tracking-wide flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#006AFF]"></span>
                    {date}
                  </span>
                  <span className="text-xs font-bold text-[#8E9B9E] bg-white border border-[#E2E8F0] px-3 py-1 rounded-full shadow-2xs">
                    {items.length} {items.length > 1 ? 'bookings' : 'booking'}
                  </span>
                </div>

                {/* List การ์ดจัดกึ่งกลางแน่นอน */}
                <div className="flex flex-col items-center gap-4 w-full">
                  {items.map((booking) => {
                    if (!booking) return null;
                    const currentStatus = (booking.status || '').toLowerCase();
                    const isCompleted = currentStatus === 'completed';

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
                        className="p-6 bg-white border border-[#E2E8F0] rounded-2xl shadow-xs hover:shadow-md transition-all flex flex-col justify-between items-center gap-4 hover:border-[#006AFF]/40 w-full max-w-lg"
                      >
                        <div className="space-y-3.5 w-full">
                          {/* Reference & Status Header */}
                          <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-3">
                            <span className="text-xs font-extrabold text-[#006AFF] bg-[#006AFF]/10 px-3 py-1 rounded-lg">
                              {formattedRef}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full capitalize ${
                                isCompleted
                                  ? 'bg-[#E6F9E6] text-[#008800]'
                                  : currentStatus === 'confirmed'
                                  ? 'bg-[#EBF5FF] text-[#006AFF]'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isCompleted
                                    ? 'bg-[#008800]'
                                    : currentStatus === 'confirmed'
                                    ? 'bg-[#006AFF]'
                                    : 'bg-gray-400'
                                }`}
                              />
                              {booking.status}
                            </span>
                          </div>

                          {/* Details */}
                          <div className="space-y-2.5 text-xs">
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
                        <div className="w-full pt-3 border-t border-gray-100 shrink-0 flex flex-col items-center justify-center">
                          {isCompleted ? (
                            existingFeedback ? (
                              <div className="space-y-2 w-full">
                                <div className="w-full py-2 bg-[#F4F8FA] border border-[#E2E8F0] rounded-xl text-center flex items-center justify-center gap-1.5">
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
                                  <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-left space-y-2.5">
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
                                className="w-full py-2.5 bg-[#006AFF]/10 hover:bg-[#006AFF] text-[#006AFF] hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer text-center active:scale-98"
                              >
                                Leave Feedback
                              </Link>
                            )
                          ) : (
                            <div className="text-center py-1">
                              <span className="text-xs font-semibold text-[#8E9B9E] italic">
                                {currentStatus === 'confirmed' ? 'In progress' : 'Scheduled'}
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
        <div className="w-full shrink-0 pt-6 border-t border-[#E2E8F0] space-y-2 text-center flex flex-col items-center justify-center">
          <button
            type="button"
            onClick={() => router.push('/customer/booking')}
            className="py-1.5 px-4 text-xs font-bold text-[#8E9B9E] hover:text-[#1E2B37] transition cursor-pointer rounded-lg hover:bg-slate-200/50"
          >
            ← Back to Booking
          </button>

          <p className="text-xs text-[#8E9B9E] font-medium">
            © Getaway Cleaning Service
          </p>
        </div>

      </div>
    </main>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">Loading...</div>}>
      <HistoryContent />
    </Suspense>
  );
}