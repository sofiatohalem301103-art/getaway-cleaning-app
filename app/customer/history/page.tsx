'use client';

import { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

interface Booking {
  id: string | number;
  booking_ref?: string;
  address_line?: string;
  address?: string;
  location?: string;
  program_name?: string;
  program?: string;
  package_name?: string;
  service_name?: string;
  scheduled_date?: string;
  booking_date?: string;
  scheduled_time?: string;
  booking_time?: string;
  status: string;
  customer_id?: string;
  user_id?: string;
  customer_email?: string;
  customer_name?: string;
  customer_phone?: string;
  details?: any;
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

// Helper แสดงผลวันที่แบบ Pure String ไม่โดน Timezone Shift
const formatDateDisplay = (dateString: string) => {
  if (!dateString || dateString === 'Unscheduled') return dateString || '-';
  const cleanDate = String(dateString).split('T')[0];
  const [year, month, day] = cleanDate.split('-');
  
  if (!year || !month || !day) return dateString;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = months[parseInt(month, 10) - 1] || month;
  
  return `${parseInt(day, 10)} ${monthName} ${year}`;
};

// Helper เช็กความเป็นเจ้าของรายการจองอย่างเข้มงวด
const isBookingOwnedByUser = (
  booking: Booking,
  targetEmail: string | null,
  targetUserId: string | null
): boolean => {
  if (!booking) return false;
  if (!targetEmail && !targetUserId) return false;

  const cleanTargetEmail = targetEmail ? targetEmail.trim().toLowerCase() : '';

  // 1. เช็กจาก User ID / Customer ID หลัก
  if (targetUserId) {
    if (String(booking.user_id || '') === String(targetUserId)) return true;
    if (String(booking.customer_id || '') === String(targetUserId)) return true;
  }

  // 2. เช็กจากคอลัมน์ customer_email
  if (cleanTargetEmail) {
    if (String(booking.customer_email || '').trim().toLowerCase() === cleanTargetEmail) {
      return true;
    }

    // 3. เช็กจากอีเมลที่อาจถูกเก็บไว้ใน JSON details
    let detailsObj: Record<string, any> = {};
    if (booking.details) {
      if (typeof booking.details === 'string') {
        try { detailsObj = JSON.parse(booking.details); } catch (e) {}
      } else if (typeof booking.details === 'object') {
        detailsObj = booking.details;
      }
    }
    const detailEmail = String(detailsObj.customer_email || detailsObj.email || '').trim().toLowerCase();
    if (detailEmail && detailEmail === cleanTargetEmail) {
      return true;
    }
  }

  return false;
};

function HistoryContent() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [submittedFeedbacks, setSubmittedFeedbacks] = useState<Record<string, Feedback>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const userEmailRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    userEmailRef.current = userEmail;
    userIdRef.current = userId;
  }, [userEmail, userId]);

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

  const fetchUserAndInitialData = useCallback(async (isMounted = true) => {
    try {
      if (isMounted) setLoading(true);

      // ดึง Session จาก Supabase Auth เป็นหลัก (ป้องกันค่าค้างใน localStorage ข้ามบัญชี)
      const { data: { user } } = await supabase.auth.getUser();

      let currentEmail = '';
      let currentUserId: string | null = null;

      if (user) {
        currentEmail = (user.email || '').trim().toLowerCase();
        currentUserId = user.id;
        // อัปเดต localStorage ให้ตรงกับผู้ใช้ปัจจุบันเสมอ
        if (typeof window !== 'undefined' && currentEmail) {
          localStorage.setItem('user_email', currentEmail);
          localStorage.setItem('user_id', currentUserId);
        }
      } else {
        // กรณีไม่ได้ล็อกอินผ่าน Supabase Auth ให้ลองเช็กอีเมลที่กรอกไว้ใน Session ปัจจุบัน
        currentEmail = (localStorage.getItem('user_email') || '').trim().toLowerCase();
      }

      if (isMounted) {
        setUserEmail(currentEmail || null);
        setUserId(currentUserId);
      }

      // หากไม่มีข้อมูลระบุตัวตนเลย ให้ล้างรายการทิ้งทันที
      if (!currentEmail && !currentUserId) {
        if (isMounted) {
          setBookings([]);
          setSubmittedFeedbacks({});
          setLoading(false);
        }
        return;
      }

      // สร้างเงื่อนไขค้นหาจาก Supabase (ใช้ ilike สำหรับอีเมลเพื่อไม่ให้ติดเรื่องตัวพิมพ์เล็ก-ใหญ่)
      const filterConditions: string[] = [];
      if (currentEmail) {
        filterConditions.push(`customer_email.ilike.${currentEmail}`);
      }
      if (currentUserId) {
        filterConditions.push(`customer_id.eq.${currentUserId}`);
        filterConditions.push(`user_id.eq.${currentUserId}`);
      }

      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .or(filterConditions.join(','))
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching bookings:', error.message);
        if (isMounted) setBookings([]);
      } else if (data && isMounted) {
        // กรองซ้ำฝั่ง Client อีกชั้นเพื่อให้มั่นใจว่าไม่มีข้อมูลของบัญชีอื่นหลุดปนมาเด็ดขาด
        const strictlyOwnedBookings = (data as Booking[]).filter((b) =>
          isBookingOwnedByUser(b, currentEmail, currentUserId)
        );

        const sortedBookings = [...strictlyOwnedBookings].sort((a, b) => {
          const dateA = a.scheduled_date || a.booking_date || '';
          const dateB = b.scheduled_date || b.booking_date || '';
          return dateB.localeCompare(dateA);
        });

        setBookings(sortedBookings);
        const bookingIds = sortedBookings.map((b) => b.id);
        await fetchFeedbacksForBookings(bookingIds);
      }
    } catch (err: any) {
      console.error('Failed to load history data:', err?.message || err);
      if (isMounted) setBookings([]);
    } finally {
      if (isMounted) setLoading(false);
    }
  }, [fetchFeedbacksForBookings]);

  // Initial Load, Focus Re-fetch และดักฟังการเปลี่ยนบัญชี (Auth State Change)
  useEffect(() => {
    let isMounted = true;
    fetchUserAndInitialData(isMounted);

    const handleFocus = () => fetchUserAndInitialData(true);
    window.addEventListener('focus', handleFocus);

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('user_email');
          localStorage.removeItem('user_id');
          localStorage.removeItem('user_name');
          localStorage.removeItem('user_phone');
        }
        setUserEmail(null);
        setUserId(null);
        setBookings([]);
        setSubmittedFeedbacks({});
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        fetchUserAndInitialData(true);
      }
    });

    return () => {
      isMounted = false;
      window.removeEventListener('focus', handleFocus);
      authListener?.subscription?.unsubscribe();
    };
  }, [fetchUserAndInitialData]);

  // Realtime Listener พร้อมตัวตรวจจับสิทธิ์ความเป็นเจ้าของ
  useEffect(() => {
    const channelId = Math.random().toString(36).substring(2, 7);

    const bookingChannel = supabase
      .channel(`rt_bookings_${channelId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        (payload) => {
          const item = (payload.new || {}) as Booking;
          const myEmail = userEmailRef.current;
          const myId = userIdRef.current;

          if (!isBookingOwnedByUser(item, myEmail, myId)) return;

          if (payload.eventType === 'UPDATE' && payload.new) {
            setBookings((prev) =>
              prev.map((existing) =>
                String(existing.id) === String(item.id) ? { ...existing, ...item } : existing
              )
            );
            
            const cleanStatus = (item.status || '').trim().toLowerCase();
            if (['completed', 'done', 'finished', 'success'].includes(cleanStatus)) {
              fetchFeedbacksForBookings([item.id]);
            }
          } else if (payload.eventType === 'INSERT' && payload.new) {
            setBookings((prev) => {
              if (prev.some((b) => String(b.id) === String(item.id))) return prev;
              return [item, ...prev];
            });
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
    const rawDateVal = booking?.scheduled_date || booking?.booking_date || 'Unscheduled';
    const dateKey = String(rawDateVal).split('T')[0];
    
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(booking);
    return acc;
  }, {} as Record<string, Booking[]>);

  return (
    <main className="min-h-screen w-full bg-white flex flex-col justify-between items-center py-3.5 sm:py-8 px-3.5 sm:px-6 text-[#1E2B37] font-sans antialiased overflow-x-hidden overflow-y-auto">
      
      {/* Container หลัก */}
      <div className="w-full max-w-2xl mx-auto flex-1 flex flex-col justify-between items-center space-y-4 sm:space-y-6">
        
        {/* Header */}
        <div className="w-full text-center pb-1 sm:pb-2 shrink-0 space-y-0.5 sm:space-y-1">
          <h1 className="text-lg sm:text-2xl font-bold text-[#1E2B37] tracking-tight">
            My Bookings
          </h1>
          <p className="text-xs sm:text-sm text-[#8E9B9E] font-normal">
            {userEmail ? `Signed in as ${userEmail}` : 'View and manage your booking history'}
          </p>
        </div>

        {/* List Container */}
        <div className="w-full space-y-4 sm:space-y-6 flex-1 flex flex-col items-center">
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-2 border-[#006AFF] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs sm:text-sm font-medium text-[#8E9B9E]">Loading your bookings...</p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="py-10 sm:py-12 text-center flex flex-col items-center justify-center space-y-4 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] p-6 w-full">
              <p className="text-xs sm:text-sm font-bold text-[#1E2B37]">No booking history found.</p>
              <p className="text-xs text-slate-400">You don't have any bookings under this account yet.</p>
              <button
                type="button"
                onClick={() => router.push('/customer/booking')}
                className="px-5 py-2.5 min-h-[44px] bg-[#006AFF] hover:bg-[#0057D9] text-white text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer touch-manipulation active:scale-[0.98] shadow-xs"
              >
                Book Service Now
              </button>
            </div>
          ) : (
            Object.entries(groupedBookings).map(([date, items]) => (
              <div key={date} className="space-y-2.5 sm:space-y-3 w-full flex flex-col items-center">
                
                {/* Sticky Header วันที่ */}
                <div className="sticky top-0 bg-white/95 backdrop-blur-md py-1.5 sm:py-2 z-10 flex items-center justify-between w-full px-1">
                  <span className="text-xs sm:text-sm font-bold text-[#1E2B37] tracking-wide flex items-center gap-1.5 sm:gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#006AFF]"></span>
                    {formatDateDisplay(date)}
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 bg-[#F8FAFC] border border-[#E2E8F0] px-2 sm:px-2.5 py-0.5 rounded-full">
                    {items.length} {items.length > 1 ? 'bookings' : 'booking'}
                  </span>
                </div>

                {/* List การ์ด */}
                <div className="flex flex-col items-center gap-2.5 sm:gap-3 w-full">
                  {items.map((booking) => {
                    if (!booking) return null;
                    
                    const cleanStatus = (booking.status || '').trim().toLowerCase();
                    const isCompleted = ['completed', 'done', 'finished', 'success'].includes(cleanStatus);

                    const rawRef = booking.booking_ref || `REF-${booking.id}`;
                    const cleanStr = rawRef.replace(/^REF-?/i, '');
                    const formattedRef = `REF-${cleanStr.slice(0, 8).toUpperCase()}`;

                    let detailsObj: Record<string, any> = {};
                    if (booking.details) {
                      if (typeof booking.details === 'string') {
                        try { detailsObj = JSON.parse(booking.details); } catch (e) {}
                      } else if (typeof booking.details === 'object') {
                        detailsObj = booking.details;
                      }
                    }

                    const locationText =
                      booking.address_line ||
                      detailsObj.address ||
                      detailsObj.address_line ||
                      booking.address ||
                      booking.location ||
                      '-';

                    const programName =
                      booking.program_name ||
                      detailsObj.program_name ||
                      booking.program ||
                      booking.package_name ||
                      booking.service_name ||
                      'Standard Cleaning';

                    const bookingTime = booking.scheduled_time || booking.booking_time || '-';

                    const existingFeedback = submittedFeedbacks[String(booking.id)];
                    const displayRating = existingFeedback?.rating ?? existingFeedback?.rating_score;

                    return (
                      <div
                        key={booking.id}
                        className="p-3.5 sm:p-5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl sm:rounded-2xl transition-all flex flex-col justify-between items-center gap-3 w-full"
                      >
                        <div className="space-y-2.5 sm:space-y-3 w-full">
                          {/* Reference & Status Header */}
                          <div className="flex items-center justify-between gap-2 border-b border-[#E2E8F0] pb-2 sm:pb-2.5">
                            <span className="text-[11px] sm:text-xs font-bold text-[#006AFF] bg-[#EAF3F9] px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg">
                              {formattedRef}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-bold px-2 sm:px-2.5 py-0.5 rounded-full capitalize shrink-0 ${
                                isCompleted
                                  ? 'bg-[#E6F9E6] text-[#008800]'
                                  : cleanStatus === 'confirmed' || cleanStatus === 'in_progress' || cleanStatus === 'assigned'
                                  ? 'bg-[#EAF3F9] text-[#006AFF]'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isCompleted
                                    ? 'bg-[#008800]'
                                    : cleanStatus === 'confirmed' || cleanStatus === 'in_progress' || cleanStatus === 'assigned'
                                    ? 'bg-[#006AFF]'
                                    : 'bg-gray-400'
                                }`}
                              />
                              {booking.status}
                            </span>
                          </div>

                          {/* Details */}
                          <div className="space-y-1.5 sm:space-y-2 text-xs">
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-medium text-slate-500 shrink-0">Location</span>
                              <p className="font-bold text-[#1E2B37] text-right leading-tight break-words max-w-[65%]">
                                {locationText}
                              </p>
                            </div>

                            <div className="flex items-start justify-between gap-2">
                              <span className="font-medium text-slate-500 shrink-0">Program</span>
                              <span className="font-bold text-[#1E2B37] text-right break-words max-w-[65%]">
                                {programName}
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-slate-500 shrink-0">Time</span>
                              <span className="font-bold text-[#1E2B37] text-right">
                                {bookingTime}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action & Feedback Area */}
                        <div className="w-full pt-2 sm:pt-2.5 border-t border-[#E2E8F0] shrink-0 flex flex-col items-center justify-center">
                          {isCompleted ? (
                            existingFeedback ? (
                              <div className="space-y-2 w-full">
                                <div className="w-full py-1.5 sm:py-2 bg-white border border-[#E2E8F0] rounded-lg text-center flex items-center justify-center gap-1.5">
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
                                  <div className="p-2.5 sm:p-3 bg-white border border-[#E2E8F0] rounded-lg text-left space-y-1.5 sm:space-y-2">
                                    {existingFeedback.comment && (
                                      <div className="space-y-0.5">
                                        <span className="text-[9px] sm:text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                                          My Feedback
                                        </span>
                                        <p className="text-xs text-slate-800 font-normal leading-relaxed italic break-words">
                                          "{existingFeedback.comment}"
                                        </p>
                                      </div>
                                    )}

                                    {existingFeedback.admin_reply && (
                                      <div className="pt-1.5 sm:pt-2 border-t border-[#E2E8F0] space-y-0.5">
                                        <span className="text-[9px] sm:text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                                          Our Reply
                                        </span>
                                        <p className="text-xs text-slate-700 font-normal leading-relaxed break-words">
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
                              <span className="text-xs font-medium text-slate-500 italic">
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
        <div className="w-full shrink-0 pt-3 sm:pt-4 space-y-1.5 sm:space-y-2 text-center flex flex-col items-center justify-center">
          <button
            type="button"
            onClick={() => router.push('/customer/booking')}
            className="py-2 px-4 min-h-[44px] text-xs sm:text-sm font-semibold text-[#8E9B9E] hover:text-[#1E2B37] transition cursor-pointer rounded-xl hover:bg-[#F8FAFC] active:scale-[0.98] touch-manipulation"
          >
            ← Back to Booking
          </button>

          <p className="text-[10px] sm:text-xs text-[#94A3B8] font-normal">
            © {new Date().getFullYear()} Getaway Cleaning Service
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