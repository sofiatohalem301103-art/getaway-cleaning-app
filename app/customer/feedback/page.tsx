'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

function FeedbackFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('booking_id');

  const [bookingRef, setBookingRef] = useState<string>('');
  const [customerData, setCustomerData] = useState<{
    user_id?: string;
  }>({});

  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  // ฟังก์ชันย่อรหัสอ้างอิงให้สั้นและเป็นตัวพิมพ์ใหญ่
  const formatRef = (refStr: string) => {
    if (!refStr) return '';
    const cleanStr = refStr.replace(/^REF-?/i, '');
    return `REF-${cleanStr.slice(0, 8).toUpperCase()}`;
  };

  useEffect(() => {
    const fetchBookingDetails = async () => {
      const paramRef = searchParams.get('ref');
      if (paramRef) {
        setBookingRef(formatRef(paramRef));
      }

      if (!bookingId) return;

      const { data, error } = await supabase
        .from('bookings')
        .select('booking_ref, id, user_id, customer_id')
        .eq('id', bookingId)
        .maybeSingle();

      if (!error && data) {
        if (!paramRef) {
          setBookingRef(formatRef(data.booking_ref || data.id?.toString() || bookingId));
        }
        
        setCustomerData({
          user_id: data.user_id || data.customer_id,
        });
      } else {
        if (!paramRef) setBookingRef(formatRef(bookingId));
      }
    };

    fetchBookingDetails();
  }, [bookingId, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingId) {
      alert('Booking ID not found.');
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

      // 🟢 ใช้ .upsert() พร้อมระบุ onConflict เพื่ออัปเดตข้อมูลเดิมหาก booking_id เคยส่งแล้ว
      const { error } = await supabase
        .from('feedbacks')
        .upsert([payload], { onConflict: 'booking_id' });

      if (error) {
        console.error('Error submitting feedback:', error.message);
        alert(`Failed to submit feedback: ${error.message}`);
      } else {
        setIsSubmitted(true);
      }
    } catch (err) {
      console.error('Submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen w-full bg-[#EAF3F9] flex flex-col justify-center items-center p-0 sm:p-4 text-[#1E2B37] font-sans">
      <div className="w-full min-h-screen sm:min-h-0 sm:max-w-lg bg-white sm:rounded-[32px] border-0 sm:border border-[#B8D7ED] shadow-none sm:shadow-xl p-6 sm:p-8 space-y-6 flex flex-col justify-between sm:justify-start">
        
        <div className="space-y-6">
          <div className="text-center border-b border-[#E2E8F0] pb-4">
            <h1 className="text-xl font-extrabold text-[#1E2B37]">Service Feedback</h1>
          </div>

          {isSubmitted ? (
            <div className="py-10 text-center space-y-4">
              <div className="w-16 h-16 bg-[#CDF4D3] text-[#008800] rounded-full flex items-center justify-center text-3xl mx-auto">
                ✓
              </div>
              <h2 className="text-xl font-bold text-[#1E2B37]">Thank You!</h2>
              <p className="text-xs text-[#1E2B37]/70">
                Your feedback for <span className="font-bold text-[#006AFF]">{bookingRef}</span> has been submitted successfully.
              </p>
              <button
                type="button"
                onClick={() => router.push('/customer/history')}
                className="mt-4 w-full px-6 py-3.5 bg-[#1E2B37] text-white text-xs sm:text-sm font-bold rounded-2xl hover:bg-[#2c3d4e] transition cursor-pointer"
              >
                Back to My Bookings
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="text-center space-y-1">
                <p className="text-xs font-semibold text-[#8E9B9E]">
                  Booking Ref: <span className="font-bold text-[#006AFF]">{bookingRef || 'N/A'}</span>
                </p>
                <h2 className="text-lg font-bold text-[#1E2B37]">How was your cleaning service?</h2>
              </div>

              {/* Star Rating */}
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="text-3xl transition-transform transform active:scale-95 focus:outline-none cursor-pointer"
                    >
                      <span
                        className={
                          star <= (hoverRating || rating)
                            ? 'text-[#FFB800]'
                            : 'text-gray-300'
                        }
                      >
                        ★
                      </span>
                    </button>
                  ))}
                </div>
                <span className="text-xs font-bold text-[#1E2B37]/80">
                  {rating === 5
                    ? 'Excellent ✨'
                    : rating === 4
                    ? 'Good 👍'
                    : rating === 3
                    ? 'Average 👌'
                    : rating === 2
                    ? 'Poor 👎'
                    : 'Very Poor 😞'}
                </span>
              </div>

              {/* Comment Area */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1E2B37]">
                  Your Comments or Suggestions
                </label>
                <textarea
                  rows={4}
                  placeholder="Tell us what you liked or how we can improve..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full p-4 bg-white border-2 border-[#B8D7ED] rounded-2xl text-base font-medium text-[#1E2B37] placeholder-[#8E9B9E] focus:outline-none focus:ring-2 focus:ring-[#CDF4D3] transition"
                />
              </div>

              {/* Buttons Group */}
              <div className="space-y-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-[#1E2B37] hover:bg-[#2c3d4e] text-white font-bold rounded-2xl text-xs sm:text-sm transition shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                </button>

                <button
                  type="button"
                  onClick={() => router.push('/customer/history')}
                  className="w-full py-3 text-xs font-bold text-[#8E9B9E] hover:text-[#1E2B37] transition cursor-pointer text-center"
                >
                  ← Cancel & Back to Bookings
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="text-[11px] text-[#8E9B9E] font-medium text-center pt-4 border-t border-[#E2E8F0]">
          © Getaway Cleaning Service
        </p>
      </div>
    </main>
  );
}

export default function FeedbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <FeedbackFormContent />
    </Suspense>
  );
}