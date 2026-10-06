'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface PastFeedback {
  id: string | number;
  booking_id: string | number;
  rating: number;
  comment: string;
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
  const bookingId = searchParams.get('booking_id');

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
  const [customerData, setCustomerData] = useState<{ user_id?: string }>({});

  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  const [pastFeedbacks, setPastFeedbacks] = useState<PastFeedback[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);

  const formatRef = (refStr: string) => {
    if (!refStr) return '';
    const cleanStr = refStr.replace(/^REF-?/i, '');
    return `REF-${cleanStr.slice(0, 8).toUpperCase()}`;
  };

  // ดึงรายละเอียดที่อยู่อย่างละเอียด
  const parseLocationDetails = (booking: any, detailsObj: any = {}) => {
    const addressLine = booking?.address_line || booking?.address || detailsObj?.address || detailsObj?.address_line || '';
    const cityArea = booking?.city_area || booking?.city || detailsObj?.city_area || detailsObj?.city || detailsObj?.area || '';
    const building = booking?.building_complex || booking?.building || detailsObj?.building_complex || detailsObj?.building || detailsObj?.buildingComplex || '';
    const houseApt = booking?.house_apt || booking?.apartment_house_no || detailsObj?.house_apt || detailsObj?.apartment_house_no || detailsObj?.apartmentHouseNo || '';
    const mapsLink = detailsObj?.google_maps_link || detailsObj?.googleMapsLink || detailsObj?.mapLink || booking?.map_link || booking?.google_maps_link || '';

    return { addressLine, cityArea, building, houseApt, mapsLink };
  };

  // ดึงประวัติ Feedback ทั้งหมด
  const fetchPastFeedbacks = useCallback(async (userId?: string) => {
    try {
      setLoadingHistory(true);
      let query = supabase.from('feedbacks').select('*, bookings(*)').order('created_at', { ascending: false });

      if (userId) {
        query = query.eq('customer_id', userId);
      }

      const { data, error } = await query;
      if (!error && data) {
        const mapped = data.map((fb: any) => {
          let detailsObj = {};
          if (fb.bookings?.details) {
            try {
              detailsObj = typeof fb.bookings.details === 'string' ? JSON.parse(fb.bookings.details) : fb.bookings.details;
            } catch (e) {}
          }

          return {
            ...fb,
            booking_ref: fb.booking_ref || fb.bookings?.booking_ref || `REF-${fb.booking_id}`,
            location_details: parseLocationDetails(fb.bookings, detailsObj)
          };
        });
        setPastFeedbacks(mapped);
      }
    } catch (err) {
      console.error('Error fetching past feedbacks:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    const fetchBookingDetails = async () => {
      const paramRef = searchParams.get('ref');
      if (paramRef) {
        setBookingRef(formatRef(paramRef));
      }

      if (!bookingId) return;

      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .maybeSingle();

      if (!error && data) {
        if (!paramRef) {
          setBookingRef(formatRef(data.booking_ref || data.id?.toString() || bookingId));
        }
        
        const uId = data.user_id || data.customer_id;
        setCustomerData({ user_id: uId });

        let detailsObj: any = {};
        if (data.details) {
          try {
            detailsObj = typeof data.details === 'string' ? JSON.parse(data.details) : data.details;
          } catch (e) {}
        }

        const locDetails = parseLocationDetails(data, detailsObj);
        const prog = data.program || data.package_name || data.service_name || detailsObj.program_name || 'Standard Cleaning';
        const tm = data.booking_time || data.scheduled_time || '-';
        const dt = data.booking_date || data.scheduled_date || '-';

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

        fetchPastFeedbacks(uId);
      } else {
        if (!paramRef) setBookingRef(formatRef(bookingId));
        fetchPastFeedbacks();
      }
    };

    fetchBookingDetails();
  }, [bookingId, searchParams, fetchPastFeedbacks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingId) {
      alert('Booking ID not found.');
      return;
    }

    if (rating === 0) {
      alert('Please select a star rating before submitting.');
      return;
    }

    try {
      setIsSubmitting(true);

      const payload: any = {
        booking_id: bookingId,
        rating: rating,
        comment: comment,
        customer_id: customerData.user_id || null,
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('feedbacks')
        .upsert([payload], { onConflict: 'booking_id' });

      if (error) {
        console.error('Error submitting feedback:', error.message);
        alert(`Failed to submit feedback: ${error.message}`);
      } else {
        setIsSubmitted(true);
        fetchPastFeedbacks(customerData.user_id);
      }
    } catch (err: any) {
      console.error('Submission error:', err);
      alert(`Submission error: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentDisplayRating = hoverRating || rating;

  return (
    // 📌 ปรับ bg-white ให้เข้ากับส่วน Header
    <main className="min-h-screen w-full bg-white flex flex-col justify-between items-center p-4 sm:p-6 lg:p-8 text-[#1E2B37] font-sans">
      <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col justify-center space-y-4 my-auto">
        
        {/* Header */}
        <div className="w-full text-center border-b border-[#E2E8F0] pb-3 shrink-0">
          <h1 className="text-lg sm:text-xl font-extrabold text-[#1E2B37] tracking-tight">
            Service Feedback & Reviews
          </h1>
        </div>

        {/* Layout 2 คอลัมน์ (ซ้าย 7 | ขวา 5) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full items-start">
          
          {/* ================= ฝั่งซ้าย: ฟอร์มส่ง ================= */}
          <div className="md:col-span-7 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-5 shadow-2xs space-y-4">
            
            <div className="border-b border-gray-200/80 pb-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-[#8E9B9E] uppercase tracking-wider block">
                  Booking Details
                </span>
                <span className="text-xs font-extrabold text-[#006AFF] bg-[#006AFF]/10 px-2.5 py-0.5 rounded-md">
                  {bookingRef || 'N/A'}
                </span>
              </div>

              {/* แสดงรายละเอียด Location ละเอียดทีละบรรทัด */}
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
                      <a href={bookingDetails.mapsLink} target="_blank" rel="noopener noreferrer" className="text-[#006AFF] underline font-bold text-[11px]">
                        Open Location Link (Google Maps) ↗
                      </a>
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-gray-100 space-y-1">
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
                <div className="w-10 h-10 bg-[#E6F9E6] text-[#008800] rounded-full flex items-center justify-center text-lg mx-auto">
                  ✓
                </div>
                <p className="text-xs font-bold text-[#1E2B37]">Feedback Submitted!</p>
                <p className="text-[11px] text-[#8E9B9E]">
                  Thank you for helping us improve our services.
                </p>
                <button
                  type="button"
                  onClick={() => router.push('/customer/history')}
                  className="w-full py-2 bg-[#1E2B37] text-white text-xs font-bold rounded-lg hover:bg-[#2c3d4e] transition cursor-pointer"
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
                          className="text-3xl transition-transform active:scale-90 focus:outline-none cursor-pointer"
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

                {/* Comment */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#1E2B37]">
                    Your Comments & Suggestions
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Tell us what you liked or how we can improve..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full p-3 bg-white border border-[#E2E8F0] rounded-xl text-base sm:text-xs font-medium text-[#1E2B37] placeholder-[#8E9B9E] focus:outline-none focus:ring-1 focus:ring-[#006AFF] transition resize-none touch-manipulation"
                  />
                </div>

                {/* Submit & Back Buttons */}
                <div className="space-y-2 pt-1">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-[#1E2B37] hover:bg-[#2c3d4e] text-white font-bold rounded-xl text-xs transition cursor-pointer disabled:opacity-50 active:scale-98 shadow-xs"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push('/customer/history')}
                    className="w-full py-1.5 text-[11px] font-semibold text-[#8E9B9E] hover:text-[#1E2B37] transition cursor-pointer text-center block"
                  >
                    ← Back to Bookings
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* ================= ฝั่งขวา: ประวัติ ================= */}
          <div className="md:col-span-5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-5 shadow-2xs space-y-3 min-h-[380px] flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-gray-200/80 pb-2">
                <span className="text-[10px] font-bold text-[#8E9B9E] uppercase tracking-wider">
                  Past Feedback History
                </span>
                <span className="text-[11px] font-bold text-[#006AFF] bg-[#006AFF]/10 px-2 py-0.5 rounded-md">
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
                            {'★'.repeat(item.rating || 0)}
                            {'☆'.repeat(5 - (item.rating || 0))}
                            <span className="text-[10px] font-bold text-[#1E2B37] ml-1">
                              ({item.rating}/5)
                            </span>
                          </div>
                        </div>

                        {/* Location แบบรายละเอียด */}
                        {fullLocStr && (
                          <div className="text-[10px] text-slate-600 bg-[#F8FAFC] p-2 rounded-lg border border-slate-100 space-y-0.5">
                            <p className="font-bold text-slate-800">Location:</p>
                            <p className="leading-snug">{fullLocStr}</p>
                          </div>
                        )}

                        {item.comment && (
                          <p className="text-[#1E2B37] font-medium leading-tight text-[11px] italic bg-[#F8FAFC] p-2 rounded-lg border border-gray-100">
                            "{item.comment}"
                          </p>
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
        <p className="text-[11px] text-[#8E9B9E] font-medium text-center pt-2 border-t border-[#E2E8F0]/60">
          © Getaway Cleaning Service
        </p>
      </div>
    </main>
  );
}

export default function FeedbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-white text-xs">Loading...</div>}>
      <FeedbackFormContent />
    </Suspense>
  );
}