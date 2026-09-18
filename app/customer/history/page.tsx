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
      } finally {
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
    <main className="fixed inset-0 min-h-[100dvh] w-screen bg-[#EAF3F9] flex flex-col justify-center items-center p-0 sm:p-4 text-[#1E2B37] font-sans">
      <div className="w-full h-full sm:h-auto sm:max-w-lg bg-white sm:rounded-[32px] border-0 sm:border border-[#B8D7ED] shadow-none sm:shadow-xl p-5 sm:p-8 flex flex-col justify-between overflow-hidden">
        
        {/* Header */}
        <div className="text-center border-b border-[#E2E8F0] pb-3 shrink-0">
          <h1 className="text-xl font-extrabold text-[#1E2B37]">My Bookings</h1>
        </div>

        {/* List Container */}
        <div className="flex-1 overflow-y-auto my-3 pr-1 space-y-5">
          {loading ? (
            <div className="py-8 text-center text-sm font-medium text-[#8E9B9E]">
              Loading bookings...
            </div>
          ) : bookings.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <p className="text-sm font-medium text-[#8E9B9E]">No booking history found.</p>
              <button
                type="button"
                onClick={() => router.push('/customer/booking')}
                className="px-5 py-2.5 bg-[#1E2B37] text-white text-xs font-bold rounded-2xl hover:bg-[#2c3d4e] transition cursor-pointer"
              >
                Book Service Now
              </button>
            </div>
          ) : (
            Object.entries(groupedBookings).map(([date, items]) => (
              <div key={date} className="space-y-2.5">
                <div className="sticky top-0 bg-white/95 backdrop-blur-xs py-1 z-10 border-b border-[#B8D7ED]/50 flex items-center justify-between">
                  <span className="text-xs font-black text-[#1E2B37] tracking-wide">
                    {date}
                  </span>
                  <span className="text-[10px] font-bold text-[#8E9B9E] bg-[#EAF3F9] px-2 py-0.5 rounded-full">
                    {items.length} {items.length > 1 ? 'bookings' : 'booking'}
                  </span>
                </div>

                <div className="space-y-3">
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
                        className="p-3.5 bg-white border-2 border-[#B8D7ED] rounded-2xl shadow-xs flex flex-col justify-between items-start gap-2.5"
                      >
                        <div className="space-y-2 w-full">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-[#006AFF]">{formattedRef}</span>
                            <span
                              className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                                isCompleted
                                  ? 'bg-[#CDF4D3] text-[#008800]'
                                  : currentStatus === 'confirmed'
                                  ? 'bg-[#D0E8FF] text-[#006AFF]'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              ● {booking.status}
                            </span>
                          </div>

                          <div className="flex items-start justify-between gap-2 pt-0.5 border-t border-gray-100/80">
                            <span className="text-xs font-bold text-[#006AFF] shrink-0">
                              Location
                            </span>
                            <p className="text-xs font-bold text-[#1E2B37] text-right line-clamp-2 leading-tight">
                              {locationText}
                            </p>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-[#8E9B9E] shrink-0">
                              Program
                            </span>
                            <span className="text-xs font-bold text-[#1E2B37] text-right line-clamp-1">
                              {programName}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-[#8E9B9E] shrink-0">
                              Time
                            </span>
                            <p className="text-xs text-[#8E9B9E] font-semibold text-right">
                              {bookingTime}
                            </p>
                          </div>
                        </div>

                        {/* Action & Feedback Area */}
                        <div className="w-full pt-2 border-t border-gray-100 shrink-0 space-y-2">
                          {isCompleted ? (
                            existingFeedback ? (
                              <div className="space-y-2">
                                <div className="w-full py-2 bg-[#F4F8FA] border border-[#B8D7ED]/60 rounded-xl text-center flex items-center justify-center gap-1.5">
                                  <span className="text-xs font-bold text-[#008800]">
                                    ✓ Feedback Submitted
                                  </span>
                                  {displayRating !== undefined && displayRating !== null && (
                                    <span className="text-xs font-bold text-[#1E2B37]">
                                      ({displayRating}/5)
                                    </span>
                                  )}
                                </div>

                                {/* 🟢 ปรับดีไซน์คลีน สบายตา: ตัวหนังสือตัวตรง (ไม่เอียง) และถอดจุดออก */}
                                {(existingFeedback.comment || existingFeedback.admin_reply) && (
                                  <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-left space-y-2.5">
                                    {/* ความคิดเห็นของลูกค้า */}
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

                                    {/* ข้อความตอบกลับจากแอดมิน */}
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
                                className="w-full text-center bg-[#006AFF] hover:bg-[#2563EB] text-white text-xs font-bold py-2.5 rounded-xl transition shadow-md flex items-center justify-center cursor-pointer"
                              >
                                Leave Feedback
                              </Link>
                            )
                          ) : (
                            <div className="text-center py-0.5">
                              <span className="text-[11px] font-semibold text-[#8E9B9E] italic">
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
        <div className="shrink-0 pt-2 border-t border-[#E2E8F0] space-y-2">
          <button
            type="button"
            onClick={() => router.push('/customer/booking')}
            className="w-full py-2 text-xs font-bold text-[#8E9B9E] hover:text-[#1E2B37] transition cursor-pointer text-center"
          >
            ← Back to Booking
          </button>

          <p className="text-[11px] text-[#8E9B9E] font-medium text-center">
            © Getaway Cleaning Service
          </p>
        </div>
      </div>
    </main>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <HistoryContent />
    </Suspense>
  );
}