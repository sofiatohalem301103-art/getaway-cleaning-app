'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface PastFeedback {
  id: string | number;
  booking_id: string | number;
  rating: number;
  comment: string;
  admin_reply?: string;
  created_at: string;
  booking_ref?: string;
  location_details?: {
    addressLine?: string;
    cityArea?: string;
    building?: string;
    houseApt?: string;
    mapsLink?: string;
  };
}

interface EligibleBooking {
  id: string | number;
  booking_ref?: string;
  program_name?: string;
  scheduled_date?: string;
  booking_date?: string;
  scheduled_time?: string;
  status?: string;
  completed_at?: string;
  updated_at?: string;
  user_id?: string;
  customer_id?: string;
  customer_name?: string;
  customer_email?: string;
  details?: any;
  address_line?: string;
  address?: string;
  city_area?: string;
  city?: string;
  building_complex?: string;
  building?: string;
  house_apt?: string;
  apartment_house_no?: string;
  map_link?: string;
  google_maps_link?: string;
  isEligible: boolean;
  unlockDateStr: string;
  reasonText: string;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const COMPLETED_STATUSES = new Set([
  'completed',
  'complete',
  'done',
  'finished',
]);

function parseCompletionDate(booking: any): Date | null {
  const rawDate =
    booking?.completed_at ||
    booking?.updated_at ||
    booking?.scheduled_date ||
    booking?.booking_date;

  if (!rawDate) return null;

  const str = String(rawDate).trim();
  // กรณีเป็นรูปแบบ YYYY-MM-DD ล้วน ให้ตีความเป็นเวลาท้องถิ่น 00:00:00 เพื่อเทียบรายวันตรงๆ
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }

  const parsed = new Date(str);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function evaluateReviewEligibility(booking: any): {
  isEligible: boolean;
  unlockDateStr: string;
  reasonText: string;
} {
  const statusNormalized = String(booking?.status || '')
    .trim()
    .toLowerCase();
  const isCompleted = COMPLETED_STATUSES.has(statusNormalized);

  if (!isCompleted) {
    return {
      isEligible: false,
      unlockDateStr: '',
      reasonText: `Cleaning is currently "${booking?.status || 'pending'}". Review unlocks 1 day after cleaning is completed.`,
    };
  }

  const completionDate = parseCompletionDate(booking);
  if (!completionDate) {
    return {
      isEligible: false,
      unlockDateStr: '',
      reasonText: 'Completion date not found. Review unlocks 1 day after completion.',
    };
  }

  // เปิดให้กดรีวิวได้หลังจากทำความสะอาดเสร็จแล้ว 1 วัน (เช่น เสร็จ 23 -> เริ่มได้ 24)
  const unlockAt = new Date(completionDate.getTime() + ONE_DAY_MS);
  const unlockDateStr = unlockAt.toISOString().split('T')[0];
  const now = new Date();

  if (now.getTime() < unlockAt.getTime()) {
    return {
      isEligible: false,
      unlockDateStr,
      reasonText: `Reviews open 1 day after completion (available from ${unlockDateStr}).`,
    };
  }

  return {
    isEligible: true,
    unlockDateStr,
    reasonText: '',
  };
}

function FeedbackFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlBookingId = searchParams.get('booking_id');

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  const [eligibleBookings, setEligibleBookings] = useState<EligibleBooking[]>([]);
  const [currentBookingId, setCurrentBookingId] = useState<string | null>(urlBookingId);
  const [bookingRef, setBookingRef] = useState<string>('');
  const [isCurrentBookingEligible, setIsCurrentBookingEligible] = useState<boolean>(false);
  const [eligibilityMessage, setEligibilityMessage] = useState<string>('');
  const [alreadyReviewedCurrent, setAlreadyReviewedCurrent] = useState<boolean>(false);

  const [bookingDetails, setBookingDetails] = useState<{
    addressLine?: string;
    cityArea?: string;
    building?: string;
    houseApt?: string;
    mapsLink?: string;
    program?: string;
    time?: string;
    date?: string;
    specs?: string;
  }>({});
  const [customerData, setCustomerData] = useState<{ user_id?: string; customer_name?: string }>({});

  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  const [pastFeedbacks, setPastFeedbacks] = useState<PastFeedback[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);

  useEffect(() => {
    let meta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'viewport';
      document.head.appendChild(meta);
    }
    const originalContent = meta.content;
    meta.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';

    return () => {
      if (meta && originalContent) {
        meta.content = originalContent;
      }
    };
  }, []);

  const formatRef = (refStr: string) => {
    if (!refStr) return '';
    const cleanStr = refStr.replace(/^REF-?/i, '');
    return `REF-${cleanStr.slice(0, 8).toUpperCase()}`;
  };

  const parseLocationDetails = (booking: any, detailsObj: any = {}) => {
    const addressLine = booking?.address_line || booking?.address || detailsObj?.address || detailsObj?.address_line || '';
    const cityArea = booking?.city_area || booking?.city || detailsObj?.city_area || detailsObj?.city || detailsObj?.area || '';
    const building = booking?.building_complex || booking?.building || detailsObj?.building_complex || detailsObj?.building || detailsObj?.buildingComplex || '';
    const houseApt = booking?.house_apt || booking?.apartment_house_no || detailsObj?.house_apt || detailsObj?.apartment_house_no || detailsObj?.apartmentHouseNo || '';
    const mapsLink = detailsObj?.google_maps_link || detailsObj?.googleMapsLink || detailsObj?.mapLink || booking?.map_link || booking?.google_maps_link || '';

    return { addressLine, cityArea, building, houseApt, mapsLink };
  };

  const applyBookingToForm = useCallback((targetBooking: any, reviewedBookingIds: Set<string>) => {
    setCurrentBookingId(String(targetBooking.id));
    setBookingRef(formatRef(targetBooking.booking_ref || String(targetBooking.id)));

    const uId = targetBooking.user_id || targetBooking.customer_id;
    const cName = targetBooking.customer_name || targetBooking.name || targetBooking.full_name || 'Guest Customer';
    setCustomerData({ user_id: uId, customer_name: cName });

    let detailsObj: any = {};
    if (targetBooking.details) {
      try {
        detailsObj = typeof targetBooking.details === 'string' ? JSON.parse(targetBooking.details) : targetBooking.details;
      } catch (e) {}
    }

    const locDetails = parseLocationDetails(targetBooking, detailsObj);
    const prog = targetBooking.program_name || detailsObj.program_name || targetBooking.program || targetBooking.package_name || targetBooking.service_name || 'Standard Cleaning';
    const tm = targetBooking.scheduled_time || targetBooking.booking_time || '-';
    const dt = targetBooking.scheduled_date || targetBooking.booking_date || '-';

    const specsArr = [];
    if (detailsObj.property_type) specsArr.push(`Type: ${detailsObj.property_type}`);
    if (detailsObj.bedrooms) specsArr.push(`Beds: ${detailsObj.bedrooms}`);
    if (detailsObj.bathrooms) specsArr.push(`Baths: ${detailsObj.bathrooms}`);
    if (detailsObj.office_sqm || detailsObj.garden_sqm) specsArr.push(`Area: ${detailsObj.office_sqm || detailsObj.garden_sqm} m²`);

    setBookingDetails({
      ...locDetails,
      program: prog,
      time: tm,
      date: dt,
      specs: specsArr.length > 0 ? specsArr.join(' | ') : ''
    });

    const evalResult = evaluateReviewEligibility(targetBooking);
    const hasReviewed = reviewedBookingIds.has(String(targetBooking.id));
    setAlreadyReviewedCurrent(hasReviewed);
    setIsCurrentBookingEligible(evalResult.isEligible && !hasReviewed);
    setEligibilityMessage(
      hasReviewed
        ? 'You have already submitted feedback for this booking.'
        : evalResult.reasonText
    );
  }, []);

  // ดึงประวัติฟีดแบ็คย้อนหลัง (Past Feedback History) ของผู้ใช้ที่ล็อกอินอยู่
  const fetchPastFeedbacks = useCallback(async (authUserId: string | null, authEmail: string | null) => {
    try {
      setLoadingHistory(true);

      let query = supabase
        .from('feedbacks')
        .select('*')
        .order('created_at', { ascending: false });

      if (authUserId) {
        query = query.eq('customer_id', authUserId);
      }

      const { data: rawFeedbacks, error: fbErr } = await query;

      if (fbErr || !rawFeedbacks) {
        setPastFeedbacks([]);
        return new Set<string>();
      }

      const { data: rawBookings } = await supabase.from('bookings').select('*');
      const bookingMap: Record<string, any> = {};

      if (rawBookings) {
        rawBookings.forEach((b) => {
          if (b.id) bookingMap[String(b.id)] = b;
          if (b.booking_ref) bookingMap[String(b.booking_ref)] = b;
        });
      }

      const filteredFeedbacks = authEmail
        ? rawFeedbacks.filter((fb: any) => {
            const matchedBooking = bookingMap[String(fb.booking_id)] || bookingMap[String(fb.booking_ref)] || {};
            const fbEmail = (fb.customer_email || matchedBooking.customer_email || '').trim().toLowerCase();
            return fb.customer_id === authUserId || (authEmail && fbEmail === authEmail.toLowerCase());
          })
        : rawFeedbacks;

      const reviewedIds = new Set<string>();
      const mapped = filteredFeedbacks.map((fb: any) => {
        if (fb.booking_id) reviewedIds.add(String(fb.booking_id));
        const matchedBooking = bookingMap[String(fb.booking_id)] || bookingMap[String(fb.booking_ref)] || {};
        let detailsObj = {};

        if (matchedBooking.details) {
          try {
            detailsObj = typeof matchedBooking.details === 'string' ? JSON.parse(matchedBooking.details) : matchedBooking.details;
          } catch (e) {}
        }

        return {
          ...fb,
          booking_ref: fb.booking_ref || matchedBooking.booking_ref || (fb.booking_id ? `REF-${String(fb.booking_id).slice(0, 8)}` : 'N/A'),
          location_details: parseLocationDetails(matchedBooking, detailsObj)
        };
      });

      setPastFeedbacks(mapped);
      return reviewedIds;
    } catch (err) {
      console.error('Error fetching past feedbacks:', err);
      setPastFeedbacks([]);
      return new Set<string>();
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  // โหลดข้อมูลการจองและกรองรายการที่เปิดให้กดรีวิวได้ (เสร็จแล้ว + ผ่านไป >= 1 วัน)
  useEffect(() => {
    const loadBookingData = async () => {
      let authUserId: string | null = null;
      let authEmail: string | null = null;

      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          authUserId = user.id;
          authEmail = user.email || null;
        }
      }

      if (!authEmail && typeof window !== 'undefined') {
        authEmail = localStorage.getItem('user_email') || null;
      }

      setCurrentUserId(authUserId);
      setCurrentUserEmail(authEmail);

      const reviewedIds = await fetchPastFeedbacks(authUserId, authEmail);

      let bookingsQuery = supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (authUserId) {
        bookingsQuery = bookingsQuery.or(`user_id.eq.${authUserId},customer_id.eq.${authUserId}`);
      } else if (authEmail) {
        bookingsQuery = bookingsQuery.eq('customer_email', authEmail.toLowerCase());
      }

      const { data: userBookings } = await bookingsQuery;
      const list = Array.isArray(userBookings) ? userBookings : [];

      const evaluatedList: EligibleBooking[] = list.map((b: any) => {
        const evalResult = evaluateReviewEligibility(b);
        return {
          ...b,
          ...evalResult,
        };
      });

      const unlockedOnly = evaluatedList.filter((item) => item.isEligible && !reviewedIds.has(String(item.id)));
      setEligibleBookings(unlockedOnly);

      let targetBooking: any = null;
      if (urlBookingId) {
        targetBooking = evaluatedList.find(
          (b) => String(b.id) === String(urlBookingId) || String(b.booking_ref) === String(urlBookingId)
        ) || null;
      }

      if (!targetBooking && unlockedOnly.length > 0) {
        targetBooking = unlockedOnly[0];
      } else if (!targetBooking && evaluatedList.length > 0) {
        targetBooking = evaluatedList[0];
      }

      if (targetBooking) {
        applyBookingToForm(targetBooking, reviewedIds);
      } else {
        setCurrentBookingId(null);
        setBookingRef('');
        setIsCurrentBookingEligible(false);
        setEligibilityMessage('No completed bookings eligible for review yet (available 1 day after completion).');
      }
    };

    loadBookingData();
  }, [urlBookingId, fetchPastFeedbacks, applyBookingToForm]);

  const handleSelectEligibleBooking = (bookingId: string) => {
    const found = eligibleBookings.find((b) => String(b.id) === bookingId);
    if (!found) return;
    const reviewedIds = new Set<string>(pastFeedbacks.map((f) => String(f.booking_id)));
    setRating(0);
    setComment('');
    setIsSubmitted(false);
    applyBookingToForm(found, reviewedIds);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBookingId) {
      alert('Please select a valid booking to submit feedback.');
      return;
    }

    if (!isCurrentBookingEligible || alreadyReviewedCurrent) {
      alert(eligibilityMessage || 'Feedback is only available 1 day after cleaning is completed.');
      return;
    }

    if (rating === 0) {
      alert('Please select a star rating before submitting.');
      return;
    }

    try {
      setIsSubmitting(true);

      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || currentUserId || customerData.user_id || null;

      const payload: any = {
        booking_id: currentBookingId,
        rating: rating,
        comment: comment,
        customer_id: userId,
        customer_name: customerData.customer_name || 'Customer',
        customer_email: user?.email || currentUserEmail || null,
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('feedbacks').insert([payload]);
      if (error) {
        throw error;
      }

      setIsSubmitted(true);
      setIsCurrentBookingEligible(false);
      setAlreadyReviewedCurrent(true);
      setEligibleBookings((prev) => prev.filter((item) => String(item.id) !== String(currentBookingId)));
      await fetchPastFeedbacks(userId, user?.email || currentUserEmail);

    } catch (err: any) {
      console.error('Submission error:', err);
      alert(`Submission error: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentDisplayRating = hoverRating || rating;

  return (
    <main className="min-h-screen w-full bg-white flex flex-col justify-between items-center py-3.5 sm:py-8 px-3.5 sm:px-6 text-[#1E2B37] font-sans antialiased overflow-x-hidden overflow-y-auto">
      <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col justify-center space-y-4 sm:space-y-6 my-auto">
        
        {/* Header */}
        <div className="w-full text-center pb-1 sm:pb-2 shrink-0 space-y-0.5 sm:space-y-1">
          <h1 className="text-lg sm:text-2xl font-bold text-[#1E2B37] tracking-tight">
            Service Feedback & Reviews
          </h1>
          <p className="text-xs sm:text-sm text-[#8E9B9E] font-normal">Share your experience to help us improve</p>
        </div>

        {/* Layout 2 คอลัมน์ */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 w-full items-start">
          
          {/* ================= ฝั่งซ้าย: ฟอร์มส่ง (เปิดกดรีวิวได้หลังเสร็จ 1 วัน) ================= */}
          <div className="md:col-span-7 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl sm:rounded-2xl p-3.5 sm:p-5 space-y-3 sm:space-y-4">
            
            <div className="border-b border-[#E2E8F0] pb-2.5 sm:pb-3 space-y-2">
              <div className="flex justify-between items-center gap-2">
                <span className="text-[10px] font-semibold text-[#8E9B9E] uppercase tracking-wider block">
                  Booking Details
                </span>
                <span className="text-[11px] sm:text-xs font-bold text-[#006AFF] bg-[#EAF3F9] px-2 sm:px-2.5 py-0.5 rounded-lg">
                  {bookingRef || 'N/A'}
                </span>
              </div>

              {eligibleBookings.length > 0 && (
                <div className="space-y-1">
                  <label htmlFor="eligible-booking-select" className="text-[11px] font-semibold text-slate-600 block">
                    Select Completed Booking Ready for Review (1+ day after completion)
                  </label>
                  <select
                    id="eligible-booking-select"
                    value={currentBookingId || ''}
                    onChange={(e) => handleSelectEligibleBooking(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs font-semibold text-[#1E2B37] focus:outline-none focus:border-[#006AFF]"
                  >
                    {eligibleBookings.map((b) => (
                      <option key={b.id} value={String(b.id)}>
                        {formatRef(b.booking_ref || String(b.id))} — {b.program_name || 'Cleaning'} ({b.scheduled_date || b.booking_date || ''})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Location Details */}
              <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-[#E2E8F0] space-y-2 text-xs">
                <div className="space-y-1">
                  <span className="font-bold text-[#1E2B37] block">Location Details:</span>
                  
                  {bookingDetails.addressLine && (
                    <p className="text-slate-600 font-normal break-words">
                      <span className="text-slate-500 font-medium">Address:</span> <strong className="text-slate-900 font-bold">{bookingDetails.addressLine}</strong>
                    </p>
                  )}
                  {bookingDetails.cityArea && (
                    <p className="text-slate-600 font-normal break-words">
                      <span className="text-slate-500 font-medium">Area/City:</span> <strong className="text-slate-900 font-bold">{bookingDetails.cityArea}</strong>
                    </p>
                  )}
                  {bookingDetails.building && (
                    <p className="text-slate-600 font-normal break-words">
                      <span className="text-slate-500 font-medium">Building:</span> <strong className="text-slate-900 font-bold">{bookingDetails.building}</strong>
                    </p>
                  )}
                  {bookingDetails.houseApt && (
                    <p className="text-slate-600 font-normal break-words">
                      <span className="text-slate-500 font-medium">Apt/House No:</span> <strong className="text-slate-900 font-bold">{bookingDetails.houseApt}</strong>
                    </p>
                  )}
                  
                  {bookingDetails.mapsLink && (
                    <p className="pt-1">
                      <a href={bookingDetails.mapsLink} target="_blank" rel="noopener noreferrer" className="text-[#006AFF] underline font-semibold text-[11px] touch-manipulation hover:text-blue-700 break-all inline-block">
                        Open Location Link (Google Maps) ↗
                      </a>
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-[#F1F5F9] space-y-1">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-500 font-medium shrink-0">Program:</span>
                    <span className="font-bold text-[#1E2B37] text-right break-words">{bookingDetails.program || '-'}</span>
                  </div>
                  {bookingDetails.time && (
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-slate-500 font-medium shrink-0">Time:</span>
                      <span className="font-bold text-slate-800 text-right">{bookingDetails.time}</span>
                    </div>
                  )}
                  {bookingDetails.specs && (
                    <div className="text-[11px] text-[#006AFF] font-medium pt-0.5 break-words">
                      {bookingDetails.specs}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {isSubmitted ? (
              <div className="py-5 sm:py-6 text-center space-y-2.5 sm:space-y-3">
                <div className="w-10 h-10 bg-[#E6F9E6] text-[#008800] rounded-full flex items-center justify-center text-lg mx-auto font-bold">
                  ✓
                </div>
                <p className="text-xs sm:text-sm font-bold text-[#1E2B37]">Feedback Submitted!</p>
                <p className="text-[11px] sm:text-xs text-[#8E9B9E] font-normal">
                  Thank you for helping us improve our services.
                </p>
                <button
                  type="button"
                  onClick={() => router.push('/customer/history')}
                  className="w-full py-2.5 min-h-[44px] bg-[#1E2B37] text-white text-xs font-bold rounded-xl hover:bg-[#2c3d4e] transition cursor-pointer touch-manipulation active:scale-[0.98] shadow-xs"
                >
                  Back to My Bookings
                </button>
              </div>
            ) : !isCurrentBookingEligible ? (
              <div className="py-5 sm:py-6 px-3 bg-white border border-[#E2E8F0] rounded-xl text-center space-y-2.5">
                <p className="text-xs sm:text-sm font-bold text-[#1E2B37]">
                  {alreadyReviewedCurrent ? 'Already Reviewed' : 'Review Locked'}
                </p>
                <p className="text-[11px] sm:text-xs text-slate-600 font-normal leading-relaxed">
                  {eligibilityMessage || 'Reviews can be submitted starting 1 day after cleaning is completed.'}
                </p>
                <button
                  type="button"
                  onClick={() => router.push('/customer/history')}
                  className="w-full py-2.5 min-h-[44px] bg-[#1E2B37] text-white text-xs font-bold rounded-xl hover:bg-[#2c3d4e] transition cursor-pointer touch-manipulation active:scale-[0.98] shadow-xs"
                >
                  Back to My Bookings
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                {/* Star Rating */}
                <div className="flex flex-col items-center gap-1 bg-white py-2.5 sm:py-3 rounded-xl border border-[#E2E8F0]">
                  <span className="text-xs font-bold text-[#1E2B37]">Rate Your Experience</span>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isFilled = star <= currentDisplayRating;
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="text-2xl sm:text-3xl transition-transform active:scale-90 focus:outline-none cursor-pointer touch-manipulation p-1"
                        >
                          <span className={isFilled ? 'text-[#FFB800]' : 'text-gray-200'}>
                            ★
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-medium text-[#8E9B9E] h-4">
                    {currentDisplayRating === 5
                      ? 'Excellent ✨'
                      : currentDisplayRating === 4
                      ? 'Good 👍'
                      : currentDisplayRating === 3
                      ? 'Average 👌'
                      : currentDisplayRating === 2
                      ? 'Poor 👎'
                      : currentDisplayRating === 1
                      ? 'Very Poor 😞'
                      : 'Select Rating'}
                  </span>
                </div>

                {/* Comment Field: ปรับ text-base บนมือถือเพื่อกัน Auto-Zoom */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#1E2B37]">
                    Your Comments & Suggestions
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Tell us what you liked or how we can improve..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full p-3 bg-white border border-[#E2E8F0] rounded-xl text-base sm:text-xs font-normal text-[#1E2B37] placeholder:text-sm sm:placeholder:text-xs placeholder-[#8E9B9E] focus:outline-none focus:border-[#006AFF] focus:ring-1 focus:ring-[#006AFF] transition resize-none touch-manipulation"
                  />
                </div>

                {/* Submit & Back Buttons */}
                <div className="space-y-2 pt-0.5 sm:pt-1">
                  <button
                    type="submit"
                    disabled={isSubmitting || !currentBookingId || !isCurrentBookingEligible}
                    className="w-full py-2.5 min-h-[44px] bg-[#006AFF] hover:bg-[#0057D9] text-white font-bold rounded-xl text-xs sm:text-sm transition cursor-pointer disabled:opacity-50 active:scale-[0.98] touch-manipulation shadow-xs"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push('/customer/history')}
                    className="w-full py-2 min-h-[44px] text-xs font-medium text-[#8E9B9E] hover:text-[#1E2B37] transition cursor-pointer text-center block rounded-xl hover:bg-white active:scale-[0.98] touch-manipulation"
                  >
                    New Booking
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* ================= ฝั่งขวา: ประวัติฟีดแบ็คย้อนหลัง ================= */}
          <div className="md:col-span-5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl sm:rounded-2xl p-3.5 sm:p-5 space-y-3 min-h-[350px] sm:min-h-[380px] flex flex-col justify-between">
            <div className="space-y-2.5 sm:space-y-3">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                <span className="text-[10px] font-semibold text-[#8E9B9E] uppercase tracking-wider">
                  Past Feedback History
                </span>
                <span className="text-[10px] sm:text-[11px] font-bold text-[#006AFF] bg-[#EAF3F9] px-2 py-0.5 rounded-lg">
                  {pastFeedbacks.length} submitted
                </span>
              </div>

              {loadingHistory ? (
                <div className="py-12 text-center text-xs text-[#8E9B9E] font-normal">
                  Loading feedback history...
                </div>
              ) : pastFeedbacks.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#8E9B9E] space-y-1">
                  <p className="font-bold text-[#1E2B37]">No past feedback found.</p>
                  <p className="text-[11px] font-normal">Your submitted reviews will appear here.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                  {pastFeedbacks.map((item) => {
                    const loc = item.location_details;
                    const fullLocStr = [loc?.addressLine, loc?.cityArea, loc?.building, loc?.houseApt].filter(Boolean).join(', ');
                    const starsFilled = Number(item.rating || 0);
                    const starsEmpty = Math.max(0, 5 - starsFilled);

                    return (
                      <div
                        key={item.id || item.booking_id}
                        className="p-3 bg-white border border-[#E2E8F0] rounded-xl space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#006AFF] text-[11px]">
                            {formatRef(String(item.booking_ref || item.booking_id))}
                          </span>
                          <div className="flex items-center gap-0.5 text-[#FFB800] text-xs">
                            {'★'.repeat(starsFilled)}
                            <span className="text-gray-300">{'★'.repeat(starsEmpty)}</span>
                            <span className="text-[10px] font-bold text-[#1E2B37] ml-1">
                              ({item.rating}/5)
                            </span>
                          </div>
                        </div>

                        {fullLocStr && (
                          <div className="text-[10px] text-slate-600 bg-[#F8FAFC] p-2 rounded-lg border border-[#E2E8F0] space-y-0.5">
                            <p className="font-semibold text-slate-800">Location:</p>
                            <p className="leading-snug font-normal break-words">{fullLocStr}</p>
                          </div>
                        )}

                        {item.comment && (
                          <p className="text-slate-800 font-normal leading-relaxed text-[11px] italic bg-[#F8FAFC] p-2 rounded-lg border border-[#E2E8F0] break-words">
                            "{item.comment}"
                          </p>
                        )}

                        {item.admin_reply && (
                          <div className="text-[11px] text-blue-900 bg-blue-50 p-2 rounded-lg border border-blue-100 font-normal leading-relaxed break-words">
                            <strong className="font-bold text-blue-700">Admin Reply:</strong> {item.admin_reply}
                          </div>
                        )}

                        <p className="text-[10px] text-[#8E9B9E] font-normal text-right">
                          {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <p className="text-[10px] sm:text-[11px] text-[#94A3B8] font-normal text-center pt-2">
          © {new Date().getFullYear()} Getaway Cleaning Service
        </p>
      </div>
    </main>
  );
}

export default function FeedbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-white text-xs text-[#8E9B9E]">Loading...</div>}>
      <FeedbackFormContent />
    </Suspense>
  );
}