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

function FeedbackFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlBookingId = searchParams.get('booking_id');

  const [currentBookingId, setCurrentBookingId] = useState<string | null>(urlBookingId);
  const [bookingRef, setBookingRef] = useState<string>('');
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

  // 🟢 ฟังก์ชันดึง Past Feedbacks ทั้งหมดที่เสถียรที่สุด 100%
  const fetchPastFeedbacks = useCallback(async () => {
    try {
      setLoadingHistory(true);

      // 1. ดึง Feedbacks ทั้งหมดก่อน
      const { data: rawFeedbacks, error: fbErr } = await supabase
        .from('feedbacks')
        .select('*')
        .order('created_at', { ascending: false });

      if (fbErr || !rawFeedbacks) {
        setPastFeedbacks([]);
        return;
      }

      // 2. ดึงข้อมูล Bookings ทั้งหมดมาทำ Map จับคู่
      const { data: rawBookings } = await supabase.from('bookings').select('*');
      const bookingMap: Record<string, any> = {};

      if (rawBookings) {
        rawBookings.forEach((b) => {
          if (b.id) bookingMap[String(b.id)] = b;
          if (b.booking_ref) bookingMap[String(b.booking_ref)] = b;
        });
      }

      // 3. ประกอบข้อมูล
      const mapped = rawFeedbacks.map((fb: any) => {
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
    } catch (err) {
      console.error('Error fetching past feedbacks:', err);
      setPastFeedbacks([]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  // 🟢 โหลดข้อมูลการจองปัจจุบัน
  useEffect(() => {
    const loadBookingData = async () => {
      let targetBooking: any = null;

      if (urlBookingId) {
        const { data } = await supabase
          .from('bookings')
          .select('*')
          .or(`id.eq.${urlBookingId},booking_ref.eq.${urlBookingId}`)
          .maybeSingle();

        if (data) targetBooking = data;
      }

      if (!targetBooking) {
        const { data: latestList } = await supabase
          .from('bookings')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1);

        if (latestList && latestList.length > 0) {
          targetBooking = latestList[0];
        }
      }

      if (targetBooking) {
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
      }

      fetchPastFeedbacks();
    };

    loadBookingData();
  }, [urlBookingId, fetchPastFeedbacks]);

  // 🟢 บันทึกข้อมูลแบบรองรับ Primary Key ป้องกันการพัง
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBookingId) {
      alert('Please select a valid booking to submit feedback.');
      return;
    }

    if (rating === 0) {
      alert('Please select a star rating before submitting.');
      return;
    }

    try {
      setIsSubmitting(true);

      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || customerData.user_id || null;

      const payload: any = {
        booking_id: currentBookingId,
        rating: rating,
        comment: comment,
        customer_id: userId,
        customer_name: customerData.customer_name || 'Customer',
        created_at: new Date().toISOString(),
      };

      // บันทึกลงตาราง feedbacks
      const { error } = await supabase.from('feedbacks').insert([payload]);

      if (error) {
        // หากติด Unique Constraint ล่าสุด ให้สั่ง Update แทน
        const { error: updateErr } = await supabase
          .from('feedbacks')
          .update({ rating, comment, created_at: new Date().toISOString() })
          .eq('booking_id', currentBookingId);

        if (updateErr) throw updateErr;
      }

      setIsSubmitted(true);
      await fetchPastFeedbacks(); // รีโหลดแสดงฝั่งขวาทันที

    } catch (err: any) {
      console.error('Submission error:', err);
      alert(`Submission error: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentDisplayRating = hoverRating || rating;

  return (
    <main className="min-h-screen w-full bg-white flex flex-col justify-between items-center py-4 sm:py-8 px-4 sm:px-6 text-[#1E2B37] font-sans antialiased overflow-y-auto">
      <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col justify-center space-y-6 my-auto">
        
        {/* Header */}
        <div className="w-full text-center pb-2 shrink-0 space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-[#1E2B37] tracking-tight">
            Service Feedback & Reviews
          </h1>
          <p className="text-xs sm:text-sm text-[#8E9B9E]">Share your experience to help us improve</p>
        </div>

        {/* Layout 2 คอลัมน์ */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full items-start">
          
          {/* ================= ฝั่งซ้าย: ฟอร์มส่ง ================= */}
          <div className="md:col-span-7 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 sm:p-5 space-y-4">
            
            <div className="border-b border-[#E2E8F0] pb-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-[#8E9B9E] uppercase tracking-wider block">
                  Booking Details
                </span>
                <span className="text-xs font-bold text-[#006AFF] bg-[#EAF3F9] px-2.5 py-0.5 rounded-lg">
                  {bookingRef || 'N/A'}
                </span>
              </div>

              {/* Location Details */}
              <div className="bg-white p-3.5 rounded-xl border border-[#E2E8F0] space-y-2 text-xs">
                <div className="space-y-1">
                  <span className="font-bold text-[#1E2B37] block">Location Details:</span>
                  
                  {bookingDetails.addressLine && (
                    <p className="text-slate-700"><span className="text-slate-400">Address:</span> <strong className="text-slate-900">{bookingDetails.addressLine}</strong></p>
                  )}
                  {bookingDetails.cityArea && (
                    <p className="text-slate-700"><span className="text-slate-400">Area/City:</span> <strong className="text-slate-900">{bookingDetails.cityArea}</strong></p>
                  )}
                  {bookingDetails.building && (
                    <p className="text-slate-700"><span className="text-slate-400">Building:</span> <strong className="text-slate-900">{bookingDetails.building}</strong></p>
                  )}
                  {bookingDetails.houseApt && (
                    <p className="text-slate-700"><span className="text-slate-400">Apt/House No:</span> <strong className="text-slate-900">{bookingDetails.houseApt}</strong></p>
                  )}
                  
                  {bookingDetails.mapsLink && (
                    <p className="pt-1">
                      <a href={bookingDetails.mapsLink} target="_blank" rel="noopener noreferrer" className="text-[#006AFF] underline font-bold text-[11px] touch-manipulation">
                        Open Location Link (Google Maps) ↗
                      </a>
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-[#F1F5F9] space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Program:</span>
                    <span className="font-bold text-[#1E2B37]">{bookingDetails.program || '-'}</span>
                  </div>
                  {bookingDetails.time && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-medium">Time:</span>
                      <span className="font-semibold text-slate-700">{bookingDetails.time}</span>
                    </div>
                  )}
                  {bookingDetails.specs && (
                    <div className="text-[11px] text-[#006AFF] font-medium pt-0.5">
                      {bookingDetails.specs}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {isSubmitted ? (
              <div className="py-6 text-center space-y-3">
                <div className="w-10 h-10 bg-[#E6F9E6] text-[#008800] rounded-full flex items-center justify-center text-lg mx-auto font-bold">
                  ✓
                </div>
                <p className="text-xs font-bold text-[#1E2B37]">Feedback Submitted!</p>
                <p className="text-[11px] text-[#8E9B9E]">
                  Thank you for helping us improve our services.
                </p>
                <button
                  type="button"
                  onClick={() => router.push('/customer/history')}
                  className="w-full py-2.5 min-h-[44px] bg-[#1E2B37] text-white text-xs font-bold rounded-xl hover:bg-[#2c3d4e] transition cursor-pointer touch-manipulation active:scale-[0.98]"
                >
                  Back to My Bookings
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Star Rating */}
                <div className="flex flex-col items-center gap-1.5 bg-white py-3 rounded-xl border border-[#E2E8F0]">
                  <span className="text-xs font-bold text-[#1E2B37]">Rate Your Experience</span>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isFilled = star <= currentDisplayRating;
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="text-3xl transition-transform active:scale-90 focus:outline-none cursor-pointer touch-manipulation p-1"
                        >
                          <span className={isFilled ? 'text-[#FFB800]' : 'text-gray-200'}>
                            ★
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-[11px] font-semibold text-[#8E9B9E] h-4">
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

                {/* Comment Field */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#1E2B37]">
                    Your Comments & Suggestions
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Tell us what you liked or how we can improve..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full p-3 bg-white border border-[#E2E8F0] rounded-xl text-[12px] sm:text-xs font-medium text-[#1E2B37] placeholder:text-[12px] sm:placeholder:text-xs placeholder-[#8E9B9E] focus:outline-none focus:border-[#006AFF] focus:ring-1 focus:ring-[#006AFF] transition resize-none touch-manipulation"
                  />
                </div>

                {/* Submit & Back Buttons */}
                <div className="space-y-2 pt-1">
                  <button
                    type="submit"
                    disabled={isSubmitting || !currentBookingId}
                    className="w-full py-2.5 min-h-[44px] bg-[#006AFF] hover:bg-[#0057D9] text-white font-bold rounded-xl text-xs sm:text-sm transition cursor-pointer disabled:opacity-50 active:scale-[0.98] touch-manipulation"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push('/customer/history')}
                    className="w-full py-2 min-h-[44px] text-xs font-semibold text-[#8E9B9E] hover:text-[#1E2B37] transition cursor-pointer text-center block rounded-xl hover:bg-white active:scale-[0.98] touch-manipulation"
                  >
                    ← Back to Bookings
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* ================= ฝั่งขวา: ประวัติ ================= */}
          <div className="md:col-span-5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 sm:p-5 space-y-3 min-h-[380px] flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                <span className="text-[10px] font-bold text-[#8E9B9E] uppercase tracking-wider">
                  Past Feedback History
                </span>
                <span className="text-[11px] font-bold text-[#006AFF] bg-[#EAF3F9] px-2 py-0.5 rounded-lg">
                  {pastFeedbacks.length} submitted
                </span>
              </div>

              {loadingHistory ? (
                <div className="py-12 text-center text-xs text-[#8E9B9E]">
                  Loading feedback history...
                </div>
              ) : pastFeedbacks.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#8E9B9E] space-y-1">
                  <p className="font-semibold text-[#1E2B37]">No past feedback found.</p>
                  <p className="text-[11px]">Your submitted reviews will appear here.</p>
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
                            <p className="font-bold text-slate-800">Location:</p>
                            <p className="leading-snug">{fullLocStr}</p>
                          </div>
                        )}

                        {item.comment && (
                          <p className="text-[#1E2B37] font-medium leading-tight text-[11px] italic bg-[#F8FAFC] p-2 rounded-lg border border-[#E2E8F0]">
                            "{item.comment}"
                          </p>
                        )}

                        {item.admin_reply && (
                          <div className="text-[11px] text-blue-700 bg-blue-50 p-2 rounded-lg border border-blue-100 font-medium">
                            <strong>Our Reply:</strong> {item.admin_reply}
                          </div>
                        )}

                        <p className="text-[10px] text-[#8E9B9E] text-right">
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
        <p className="text-[11px] text-[#94A3B8] font-medium text-center pt-2">
          © Getaway Cleaning Service
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