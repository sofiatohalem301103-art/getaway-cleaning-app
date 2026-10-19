'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

// ----------------------------------------------------------------------
// 1. Constants & Lists
// ----------------------------------------------------------------------
const STAFF_LIST = [
  { id: 'GW-S1', name: 'GW - S1' },
  { id: 'GW-S2', name: 'GW - S2' },
  { id: 'GW-S3', name: 'GW - S3' },
  { id: 'GW-S4', name: 'GW - S4' },
  { id: 'GW-S5', name: 'GW - S5' },
];

const ADMIN_LIST = ['Sam', 'Sylvia', 'Zaza'];

const HOLIDAY_PROPERTIES = [
  'Beautiful Apartment in Harbour Paphos | Central',
  'Breathtaking Seaview Apartment | Lighthouse Beach',
  'Harbour Lights Seaview One Bedroom Apt | Paphos',
  'One Bedroom Apartment | Lighthouse Beach',
  'One Bedroom Apartment in Universal Paphos',
  'Stylish One Bedroom Apartment at Paphos Harbour',
  'Cozy Nerina Cottage | Harbour Paphos',
  'Modern Poolside villa | Paphos',
  'Stylish Poolside Villa | Paphos',
  'Tropical Paradise | Harbour Paphos | Center',
];

const HOLIDAY_TIME_SLOTS = [
  '09:00:00',
  '10:00:00',
  '11:00:00',
  '12:00:00',
  '13:00:00',
  '14:00:00',
  '15:00:00',
  '16:00:00',
];

// ----------------------------------------------------------------------
// 2. Helper Functions
// ----------------------------------------------------------------------
function formatSlipUrl(rawUrl: string): string {
  if (!rawUrl) return '';

  if (
    rawUrl.startsWith('http://') || 
    rawUrl.startsWith('https://') || 
    rawUrl.startsWith('data:')
  ) {
    return rawUrl;
  }

  try {
    let cleanPath = rawUrl.replace(/^\/+/, '').split('?')[0];

    const hasExtension = /\.(jpg|jpeg|png|webp|gif|pdf)$/i.test(cleanPath);
    if (!hasExtension) {
      cleanPath = `${cleanPath}.png`;
    }

    const { data } = supabase.storage.from('slips').getPublicUrl(cleanPath);
    return data?.publicUrl || rawUrl;
  } catch (err) {
    console.error('Error formatting slip URL:', err);
    return rawUrl;
  }
}

function getValidSlipUrl(task: any): string | null {
  if (!task) return null;

  let detailsObj: any = {};
  if (task.details) {
    if (typeof task.details === 'string') {
      try {
        detailsObj = JSON.parse(task.details);
      } catch (e) {
        detailsObj = {};
      }
    } else if (typeof task.details === 'object' && task.details !== null) {
      detailsObj = task.details;
    }
  }

  const targetKeys = [
    'payment_slip', 'slip_url', 'slipurl', 'slip_image', 'slipimage',
    'receipt_url', 'slip', 'payment_proof', 'proof_of_payment',
    'file_url', 'image_url', 'attachment', 'image', 'url', 'proof',
    'slip_path', 'slippath', 'file_path', 'filepath', 'path', 'receipt'
  ];

  const extractUrl = (val: any): string | null => {
    if (!val) return null;
    if (typeof val === 'string' && val.trim()) {
      return formatSlipUrl(val.trim());
    }
    return null;
  };

  for (const key of Object.keys(task)) {
    if (targetKeys.includes(key.toLowerCase()) && task[key]) {
      const res = extractUrl(task[key]);
      if (res) return res;
    }
  }

  for (const key of Object.keys(detailsObj)) {
    if (targetKeys.includes(key.toLowerCase()) && detailsObj[key]) {
      const res = extractUrl(detailsObj[key]);
      if (res) return res;
    }
  }

  const findRecursive = (obj: any): string | null => {
    if (!obj || typeof obj !== 'object') return null;
    for (const k of Object.keys(obj)) {
      if (targetKeys.includes(k.toLowerCase()) && obj[k]) {
        const res = extractUrl(obj[k]);
        if (res) return res;
      }
      if (typeof obj[k] === 'object' && obj[k] !== null) {
        const res = findRecursive(obj[k]);
        if (res) return res;
      }
    }
    return null;
  };

  return findRecursive(task);
}

const isCardPayment = (task: any): boolean => {
  if (!task) return false;
  if (getValidSlipUrl(task)) return false;

  const method = String(
    task.payment_method ||
    task.payment_type ||
    task.gateway ||
    task.channel ||
    ''
  ).toLowerCase();

  return (
    method.includes('card') ||
    method.includes('credit') ||
    method.includes('stripe')
  );
};

const formatRefCode = (task: any): string => {
  if (task.booking_code) return task.booking_code;
  if (task.booking_ref) return task.booking_ref;
  if (task.ref) return task.ref;
  if (!task.id) return 'REF-N/A';
  return `REF-${String(task.id).slice(0, 8).toUpperCase()}`;
};

const formatPhoneNumberDisplay = (phoneStr: string): string => {
  if (!phoneStr) return '';
  const cleaned = String(phoneStr).trim().replace(/\s+/g, '');

  if (cleaned.startsWith('+357') && cleaned.length === 12) {
    const num = cleaned.slice(4);
    return `+357 ${num.slice(0, 2)} ${num.slice(2, 5)} ${num.slice(5)}`;
  }

  if (cleaned.startsWith('+66') && cleaned.length >= 12) {
    const num = cleaned.slice(3);
    return `+66 ${num.slice(0, 2)} ${num.slice(2, 5)} ${num.slice(5)}`;
  }

  return cleaned.replace(/(\d{3})(?=\d)/g, '$1 ');
};

const extractProgramName = (task: any): string => {
  if (!task) return 'General cleaning';

  const price = Number(task.total_amount || task.price || task.amount || 0);

  if (price === 120) return 'Turn over Cleaning';
  if (price === 70) return 'General cleaning';

  const fullText = JSON.stringify(task).toLowerCase();
  if (fullText.includes('turn over') || fullText.includes('turnover')) {
    return 'Turn over Cleaning';
  }
  if (fullText.includes('general')) {
    return 'General cleaning';
  }

  return price > 100 ? 'Turn over Cleaning' : 'General cleaning';
};

const getCleanDate = (dateVal: any): string => {
  if (!dateVal) return '';
  return String(dateVal).split('T')[0];
};

const extractPhoneNumber = (task: any): string => {
  if (!task) return '';
  return String(
    task.customer_phone ||
    task.phone ||
    task.phone_number ||
    task.mobile ||
    task.users?.phone ||
    task.users?.phone_number ||
    task.bookings?.customer_phone ||
    task.bookings?.phone ||
    ''
  );
};

const extractCustomerName = (task: any): string => {
  if (!task) return 'Guest Customer';
  const rawName =
    task.customer_name ||
    task.name ||
    task.full_name ||
    task.users?.full_name ||
    task.bookings?.customer_name ||
    '';

  return rawName;
};

const extractCustomerEmail = (task: any): string => {
  if (!task) return '';
  return (
    task.customer_email ||
    task.email ||
    task.users?.email ||
    task.bookings?.customer_email ||
    ''
  );
};

const formatTimeAMPM = (timeStr: string) => {
  if (!timeStr) return '';
  const [hourStr, minuteStr] = timeStr.split(':');
  let hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  hour = hour ? hour : 12;
  const formattedHour = hour < 10 ? `0${hour}` : hour;
  return `${formattedHour}:${minuteStr} ${ampm}`;
};

// ----------------------------------------------------------------------
// 2.5 Admin Review Rating Analytics Block Component
// ----------------------------------------------------------------------
function AdminReviewAnalytics({ feedbacks }: { feedbacks: any[] }) {
  const validScores = feedbacks.map((f) => {
    const raw = f.rating !== undefined && f.rating !== null ? f.rating : f.rating_score;
    return Number(raw) || 0;
  }).filter((score) => score > 0);

  const total = validScores.length;

  const avgRating = total > 0
    ? (validScores.reduce((sum, score) => sum + score, 0) / total).toFixed(1)
    : '0.0';

  const numAvg = Number(avgRating);

  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  validScores.forEach((score) => {
    const rounded = Math.min(5, Math.max(1, Math.round(score)));
    distribution[rounded as 1|2|3|4|5] += 1;
  });

  const positiveCount = distribution[5] + distribution[4];
  const positiveRate = total > 0 ? Math.round((positiveCount / total) * 100) : 0;

  let statusColor = 'text-amber-600 bg-amber-50 border-amber-200';
  let statusText = 'Stable Performance';
  let statusIcon = '➔';

  if (numAvg >= 4.5) {
    statusColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
    statusText = 'Excellent (High Satisfaction)';
    statusIcon = '▲';
  } else if (numAvg < 3.8 && total > 0) {
    statusColor = 'text-rose-700 bg-rose-50 border-rose-200';
    statusText = 'Needs Attention (Review Dropping)';
    statusIcon = '▼';
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold uppercase tracking-wider text-[#8E9B9E]">
            RATING PERFORMANCE ANALYTICS
          </span>
          <span className={`text-[11px] font-extrabold px-3 py-1 rounded-full border flex items-center gap-1 ${statusColor}`}>
            <span>{statusIcon}</span> {statusText}
          </span>
        </div>

        <div className="flex items-baseline gap-3 pt-1">
          <div className="text-3xl sm:text-4xl font-black text-[#1E2B37] tracking-tight">
            ★ {avgRating}
          </div>
          <div className="text-xs text-[#8E9B9E] font-medium">
            out of <strong className="text-[#1E2B37]">5.0</strong> ({total} total reviews)
          </div>
        </div>

        <div className="space-y-1.5 pt-2 border-t border-[#F1F5F9]">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-[#475569]">Satisfaction Rate (4-5 ★)</span>
            <span className="text-[#006AFF]">{positiveRate}%</span>
          </div>
          <div className="w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#006AFF] rounded-full transition-all duration-500"
              style={{ width: `${positiveRate}%` }}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-5 shadow-2xs space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-[#8E9B9E] block">
          STAR DISTRIBUTION
        </span>

        <div className="space-y-1.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = distribution[star as 1|2|3|4|5];
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;

            return (
              <div key={star} className="flex items-center gap-2 text-xs">
                <span className="w-8 font-bold text-[#1E2B37] text-right shrink-0">
                  {star} ★
                </span>

                <div className="flex-1 h-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      star >= 4 ? 'bg-[#008800]' : star === 3 ? 'bg-amber-400' : 'bg-rose-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <span className="w-12 text-[#8E9B9E] font-semibold text-right shrink-0">
                  {count} ({pct}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 3. FeedbackCard Component
// ----------------------------------------------------------------------
function FeedbackCard({
  feedback,
  isLoading,
  onReply,
}: {
  feedback: any;
  isLoading?: boolean;
  onReply: (feedback: any, replyText: string) => Promise<void>;
}) {
  const [replyText, setReplyText] = useState(feedback.admin_reply || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localReplied, setLocalReplied] = useState(
    Boolean(feedback.admin_reply || feedback.replied_at)
  );

  useEffect(() => {
    setReplyText(feedback.admin_reply || '');
    setLocalReplied(Boolean(feedback.admin_reply || feedback.replied_at));
  }, [feedback.admin_reply, feedback.replied_at]);

  const hasReplied = localReplied || Boolean(feedback.admin_reply || feedback.replied_at);
  const displayCustomerName = extractCustomerName(feedback) || 'Guest Customer';

  const handleSendReply = async () => {
    if (!replyText.trim()) return alert('Please enter a reply message.');
    if (isSubmitting || isLoading) return;

    setIsSubmitting(true);
    try {
      await onReply(feedback, replyText);
      setLocalReplied(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="p-3 sm:p-4 rounded-xl border shadow-xs space-y-3 text-xs"
      style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', color: '#1E1E1E' }}
    >
      <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: '#F1F5F9' }}>
        <span className="font-bold text-sm" style={{ color: '#1E1E1E' }}>
          Customer Name : {displayCustomerName}
        </span>

        <div className="flex items-center gap-1 font-bold" style={{ color: '#FFB800' }}>
          {'★'.repeat(feedback.rating || feedback.rating_score || 5)}
          <span className="text-[10px]" style={{ color: '#8E9B9E' }}>
            ({feedback.rating || feedback.rating_score || 5}/5)
          </span>
        </div>
      </div>

      <div className="p-3 rounded-lg border space-y-2" style={{ backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }}>
        <p className="text-xs sm:text-sm italic" style={{ color: '#1E2B37' }}>
          "{feedback.comment || 'No comment provided.'}"
        </p>

        {hasReplied && (
          <div className="pt-2 border-t text-xs" style={{ borderColor: '#E2E8F0', color: '#006AFF' }}>
            <span className="font-bold">Admin Reply: </span>
            <span>{feedback.admin_reply || replyText}</span>
          </div>
        )}
      </div>

      <div className="pt-2 border-t space-y-2" style={{ borderColor: '#F1F5F9' }}>
        <label className="font-bold block" style={{ color: '#1E1E1E' }}>
          {hasReplied ? 'Edit Admin Reply:' : 'Admin Reply:'}
        </label>
        <textarea
          rows={2}
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          disabled={isLoading || isSubmitting}
          placeholder="Type your reply to customer..."
          className="w-full p-2 sm:p-2.5 border rounded-lg text-xs focus:outline-none focus:ring-2"
          style={{ backgroundColor: '#FFFFFF', borderColor: '#D9D9D9', color: '#1E1E1E' }}
        ></textarea>

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          {hasReplied ? (
            <span className="text-[10px] sm:text-xs font-semibold" style={{ color: '#008800' }}>
              ✓ Replied {feedback.replied_by ? `by ${feedback.replied_by}` : ''}
            </span>
          ) : (
            <span className="text-[10px] sm:text-xs" style={{ color: '#8E9B9E' }}>Not replied yet</span>
          )}

          <button
            type="button"
            onClick={handleSendReply}
            disabled={isLoading || isSubmitting}
            className="w-full sm:w-auto px-4 py-1.5 rounded-lg font-bold text-xs transition active:scale-95 cursor-pointer text-white"
            style={{
              backgroundColor: hasReplied ? '#008800' : '#006AFF'
            }}
          >
            {isSubmitting ? 'Saving...' : hasReplied ? 'Update Reply' : 'Send Reply'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 4. TaskCard Component
// ----------------------------------------------------------------------
function TaskCard({
  task,
  selectedStaff,
  isLoading,
  handleSelectStaffLocal,
  handleConfirmPayment,
  handleDispatchTask,
  handleDeleteTask,
}: {
  task: any;
  selectedStaff: string;
  isLoading: boolean;
  handleSelectStaffLocal: (id: any, staff: string) => void;
  handleConfirmPayment: (task: any) => void;
  handleDispatchTask: (task: any, staff: string) => void;
  handleDeleteTask: (id: any) => void;
}) {
  const currentAssigned = task.assigned_staff || task.staff_id || '';
  const activeStaffChoice = selectedStaff !== undefined && selectedStaff !== '' ? selectedStaff : currentAssigned;
  const isPaid = task.payment_status === 'Paid / Verified' || task.status === 'Paid';

  const hasSelectedStaff = Boolean(activeStaffChoice);
  const isChangedStaff = activeStaffChoice !== currentAssigned;

  const displayCustomerName = task.display_customer_name || extractCustomerName(task);
  const displayEmail = task.display_email || extractCustomerEmail(task);
  const displayPhone = task.display_phone || extractPhoneNumber(task);

  const isAdminTask = task.is_admin_created || 
    task.customer_name === 'Admin Assigned Task' || 
    Boolean(task.assigned_by) || 
    task.details?.is_admin_booking ||
    task.details?.assigned_by_admin ||
    task.payment_method === 'Manual Booking (By Admin)';

  const slipUrl = getValidSlipUrl(task);

  let details: Record<string, any> = {};
  if (task.details) {
    if (typeof task.details === 'string') {
      try { details = JSON.parse(task.details); } catch (e) { details = {}; }
    } else if (typeof task.details === 'object') {
      details = task.details;
    }
  }

  const propertyType = details.property_type || details.propertyType || task.property_type;
  const bedrooms = details.bedrooms ?? task.bedrooms;
  const bathrooms = details.bathrooms ?? task.bathrooms;
  const balconies = details.balconies ?? details.office_balconies ?? details.verandahs ?? task.balconies;
  
  const officeSqm = details.office_sqm || task.office_sqm;
  const officeToilets = details.office_toilets || task.office_toilets;
  const officeCleanWindows = details.office_clean_windows || task.office_clean_windows;
  const officeWindowsCount = details.office_windows_count || task.office_windows_count;

  const gardenSqm = details.garden_sqm || task.garden_sqm;
  const gardenType = details.garden_type || task.garden_type;
  const gardenOtherDetails = details.garden_other_details || task.garden_other_details;

  const hasPrivateSpecs = Boolean(
    propertyType || (bedrooms !== undefined && bedrooms !== null && bedrooms !== '') ||
    (bathrooms !== undefined && bathrooms !== null && bathrooms !== '') ||
    (balconies !== undefined && balconies !== null && balconies !== '') ||
    officeSqm || officeToilets || officeCleanWindows ||
    gardenSqm || gardenType || gardenOtherDetails
  );

  const isPrivateService =
    task.service_type === 'private' ||
    String(task.booking_code || task.booking_ref || task.id || '').startsWith('PRV') ||
    hasPrivateSpecs;

  const possibleProgramNames = [
    details.program_name,
    details.program_title,
    details.program,
    details.selectedProgram,
    details.service_name,
    details.title,
    task.program_name,
    task.program,
    task.selected_program,
    task.service_name,
    task.title,
    task.package_name,
    task.room_type,
    typeof extractProgramName === 'function' ? extractProgramName(task) : null,
    task.fetched_service_name
  ];

  let foundProgram = possibleProgramNames.find(
    (val) => Boolean(val) && String(val).trim() !== '' && String(val).trim() !== 'Cleaning Service'
  );

  if (!foundProgram) {
    foundProgram = task.service_type || 'Cleaning Service';
  }

  if (foundProgram === 'garden' || foundProgram === 'Garden') {
    foundProgram = 'Garden Cleaning (Upon Request)';
  }

  const displayProgram = foundProgram;

  const isCard =
    task.payment_method === 'card' ||
    task.payment_method === 'credit_card' ||
    task.paymentMethod === 'card' ||
    (typeof isCardPayment === 'function' && isCardPayment(task));

  const addressLine = task.address_line || task.address || details.address || details.address_line || '';
  const cityArea = task.city_area || task.city || details.city_area || details.city || details.area || '';
  const building = task.building_complex || task.building || details.building_complex || details.building || details.buildingComplex || '';
  const houseApt = task.house_apt || task.apartment_house_no || details.house_apt || details.apartment_house_no || details.apartmentHouseNo || '';

  const addressParts = [];
  if (addressLine) addressParts.push(addressLine);
  if (cityArea) addressParts.push(cityArea);
  if (building) addressParts.push(building);
  if (houseApt) addressParts.push(`Apt/House: ${houseApt}`);

  const displayAddress = addressParts.length > 0 ? addressParts.join(', ') : (task.address || '-');
  const mapsLink = details.google_maps_link || details.googleMapsLink || details.mapLink || task.map_link || task.google_maps_link;

  return (
    <div
      className="p-3 sm:p-4 rounded-xl border shadow-xs space-y-3 text-xs"
      style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', color: '#1E1E1E' }}
    >
      <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: '#F1F5F9' }}>
        <div className="flex items-center gap-2">
          <span className="font-bold text-xs sm:text-sm" style={{ color: '#006AFF' }}>
            {formatRefCode(task)}
          </span>
          {isPrivateService && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded border" style={{ backgroundColor: '#EBF5FF', color: '#1D4ED8', borderColor: '#93C5FD' }}>
              Private Home / Office
            </span>
          )}
          {isAdminTask && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded border" style={{ backgroundColor: '#FFE8AE', color: '#1E1E1E', borderColor: '#FFC943' }}>
              Admin Direct Task
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="text-[10px] sm:text-xs" style={{ color: '#8E9B9E' }}>
            {getCleanDate(task.scheduled_date || task.booking_date)} | {task.scheduled_time || task.booking_time || '-'}
          </span>
          <button
            onClick={() => handleDeleteTask(task.id)}
            className="px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] transition cursor-pointer font-bold"
            style={{ color: '#D95353' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FFE8AE')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 space-y-1">
          <p className="font-bold text-xs sm:text-sm" style={{ color: '#2563EB' }}>
            {displayProgram}
          </p>

          <p style={{ color: '#1E2B37' }}>
            Customer: <span className="font-semibold" style={{ color: '#1E1E1E' }}>{displayCustomerName}</span>
          </p>

          {displayEmail && 
           displayEmail !== 'N/A' && 
           displayEmail !== '-' && 
           displayEmail !== 'null' && 
           displayEmail.trim() !== '' && (
            <p className="text-[11px]" style={{ color: '#8E9B9E' }}>
              Email: <span className="font-medium" style={{ color: '#1E1E1E' }}>{displayEmail}</span>
            </p>
          )}

          {displayPhone && 
           !displayPhone.includes('N/A') && 
           !displayPhone.includes('-') && 
           !displayPhone.includes('No phone') && 
           displayPhone.trim() !== '' && (
            <p className="text-[11px]" style={{ color: '#8E9B9E' }}>
              Phone:{' '}
              <a
                href={`tel:${String(displayPhone).replace(/\s+/g, '')}`}
                className="font-bold hover:underline"
                style={{ color: '#006AFF' }}
              >
                {formatPhoneNumberDisplay(displayPhone)}
              </a>
            </p>
          )}

          <div className="pt-1 space-y-0.5">
            <p style={{ color: '#1E2B37' }}>
              Address: <span className="font-semibold" style={{ color: '#1E1E1E' }}>{displayAddress}</span>
            </p>

            {mapsLink && (
              <p className="pt-0.5">
                <a
                  href={mapsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-bold underline text-[11px]"
                  style={{ color: '#006AFF' }}
                >
                  📍 Open Location Link ↗
                </a>
              </p>
            )}
          </div>

          {isPrivateService && hasPrivateSpecs && (
            <div className="pt-1 space-y-0.5 text-[11px]" style={{ color: '#334155' }}>
              {propertyType && <p>Property Type: <strong style={{ color: '#1E1E1E' }}>{propertyType}</strong></p>}
              {bedrooms !== undefined && bedrooms !== null && bedrooms !== '' && <p>Bedrooms: <strong style={{ color: '#1E1E1E' }}>{bedrooms}</strong></p>}
              {bathrooms !== undefined && bathrooms !== null && bathrooms !== '' && <p>Bathrooms: <strong style={{ color: '#1E1E1E' }}>{bathrooms}</strong></p>}
              {officeSqm && <p>Area Size: <strong style={{ color: '#1E1E1E' }}>{officeSqm} m²</strong></p>}
              {officeToilets && <p>Toilets: <strong style={{ color: '#1E1E1E' }}>{officeToilets}</strong></p>}
              {balconies !== undefined && balconies !== null && balconies !== '' && <p>Balconies / Verandahs: <strong style={{ color: '#1E1E1E' }}>{balconies}</strong></p>}
              {officeCleanWindows && <p>Window Cleaning: <strong style={{ color: '#1E1E1E' }}>{officeCleanWindows === 'yes' ? `Yes (${officeWindowsCount || 0} Windows)` : 'No'}</strong></p>}
              {gardenSqm && <p>Area Size: <strong style={{ color: '#1E1E1E' }}>{gardenSqm} m²</strong></p>}
              {gardenType && <p>Garden Type: <strong style={{ color: '#1E1E1E' }}>{gardenType}</strong></p>}
              {gardenOtherDetails && <p>Garden Note: <strong style={{ color: '#1E1E1E' }}>{gardenOtherDetails}</strong></p>}
            </div>
          )}

          <p className="font-bold pt-1 text-xs sm:text-sm" style={{ color: Number(task.price || task.amount) > 0 ? '#00CC00' : '#FFB800' }}>
            Amount: {Number(task.price || task.amount) > 0 ? `€${task.price || task.amount}` : 'Pending Price Quote (Direct Request)'}
          </p>
        </div>

        <div className="border-t md:border-t-0 md:border-l pt-3 md:pt-0 md:pl-3 flex flex-col justify-between" style={{ borderColor: '#E2E8F0' }}>
          <div>
            <span className="font-extrabold text-[10px] uppercase tracking-wider block mb-1.5" style={{ color: '#1E2B37' }}>
              PAYMENT PROOF:
            </span>

            {slipUrl ? (
              <div className="space-y-1.5">
                <a
                  href={slipUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block relative w-24 h-32 rounded-lg border-2 overflow-hidden hover:opacity-90 transition group shadow-2xs"
                  style={{ borderColor: '#93C5FD', backgroundColor: '#F8FAFC' }}
                  title="Click to view full size slip"
                >
                  <img
                    src={slipUrl}
                    alt="Payment Slip"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] text-white font-bold">
                    View ↗
                  </div>
                </a>
                <a
                  href={slipUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold hover:underline block"
                  style={{ color: '#006AFF' }}
                >
                  Open Slip ↗
                </a>
              </div>
            ) : isAdminTask ? (
              <span 
                className="font-bold px-2.5 py-1 rounded-md text-[10px] border inline-block"
                style={{ backgroundColor: '#FFE8AE', color: '#1E1E1E', borderColor: '#FFC943' }}
              >
                Manual Booking (By Admin)
              </span>
            ) : isCard ? (
              <span 
                className="font-bold px-2 py-1 rounded text-[10px] border inline-block"
                style={{ backgroundColor: '#EBF5FF', color: '#1D4ED8', borderColor: '#93C5FD' }}
              >
                Paid via Credit Card
              </span>
            ) : isPrivateService ? (
              <span 
                className="font-bold px-2 py-1 rounded text-[10px] border inline-block"
                style={{ backgroundColor: '#FFE8AE', color: '#1E1E1E', borderColor: '#FFC943' }}
              >
                Unpaid / Direct Request
              </span>
            ) : (
              <div 
                className="p-2 rounded text-[10px] font-medium border"
                style={{ backgroundColor: '#FFE8AE', color: '#1E1E1E', borderColor: '#FFC943' }}
              >
                No slip uploaded yet
              </div>
            )}
          </div>

          <div className="pt-2 flex flex-col items-start md:items-end gap-1">
            {isAdminTask ? null : isPaid ? (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded border"
                style={{ backgroundColor: '#CDF4D3', color: '#008800', borderColor: '#86D892' }}
              >
                ✓ Paid Verified
              </span>
            ) : (
              <button
                onClick={() => handleConfirmPayment(task)}
                disabled={isLoading}
                className="text-[10px] sm:text-[11px] font-bold px-3 py-1 rounded transition active:scale-95 cursor-pointer shadow-xs border disabled:opacity-50"
                style={{ backgroundColor: '#86D892', color: '#1E1E1E', borderColor: '#00CC00' }}
              >
                {isLoading ? 'Processing...' : 'Confirm Payment'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="pt-2 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-2" style={{ borderColor: '#F1F5F9' }}>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="font-medium whitespace-nowrap" style={{ color: '#8E9B9E' }}>Assigned:</span>

          <select
            value={activeStaffChoice}
            onChange={(e) => handleSelectStaffLocal(task.id, e.target.value)}
            disabled={isLoading}
            className="flex-1 sm:flex-none border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 cursor-pointer disabled:bg-slate-100 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#FFFFFF', borderColor: '#D9D9D9', color: '#1E1E1E' }}
          >
            <option value="">Select Staff...</option>
            {STAFF_LIST.map((staff) => (
              <option key={staff.id} value={staff.name}>
                {staff.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => handleDispatchTask(task, activeStaffChoice)}
            disabled={!hasSelectedStaff || isLoading || (!isChangedStaff && Boolean(currentAssigned))}
            className="px-3 py-1 rounded text-xs font-bold transition whitespace-nowrap border cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            style={
              !hasSelectedStaff || (!isChangedStaff && Boolean(currentAssigned))
                ? { backgroundColor: '#E2E8F0', color: '#8E9B9E', borderColor: '#D9D9D9' }
                : { backgroundColor: '#006AFF', color: '#FFFFFF', borderColor: '#1D4ED8' }
            }
          >
            {isLoading ? 'Processing...' : !isChangedStaff && currentAssigned ? 'Assigned' : 'Assign'}
          </button>
        </div>

        {currentAssigned && (
          <span
            className="font-bold text-[11px] text-right flex items-center gap-1 px-2.5 py-1 rounded-md border"
            style={{
              backgroundColor: '#F8FAFC',
              color: '#334155',
              borderColor: '#E2E8F0',
            }}
          >
            ✓ Assigned to {currentAssigned}
          </span>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 5. Modal Component
// ----------------------------------------------------------------------
function AssignHolidayTaskModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  adminName = 'Sam'
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSuccess?: () => void; 
  adminName?: string;
}) {
  const [loading, setLoading] = useState(false);

  const [selectedProperty, setSelectedProperty] = useState(HOLIDAY_PROPERTIES[0]);
  const [programName, setProgramName] = useState('General cleaning');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
  const [scheduledTime, setScheduledTime] = useState('09:00:00');
  const [assignedStaff, setAssignedStaff] = useState(STAFF_LIST[0].name);

  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const generatedRef = `HOL-${Math.floor(100000 + Math.random() * 900000)}`;

    const holidayDetails = {
      program_name: programName,
      property: selectedProperty,
      service_type: 'holiday',
      assigned_by_admin: true,
      admin_name: adminName,
      is_admin_booking: true,
    };

    const finalCustomerName = guestName.trim() ? guestName.trim() : 'Direct Booking (Admin)';

    try {
      const { error } = await supabase.from('bookings').insert([
        {
          booking_ref: generatedRef,
          customer_name: finalCustomerName,
          customer_phone: guestPhone.trim() || null,
          customer_email: guestEmail.trim() || null,
          address_line: selectedProperty,
          scheduled_date: scheduledDate,
          scheduled_time: scheduledTime,
          service_type: 'holiday',
          service_id: null,
          details: JSON.stringify(holidayDetails),
          assigned_staff: assignedStaff,
          assigned_by: adminName,
          status: 'Assigned',
          payment_status: 'Paid / Verified',
          payment_method: 'Manual Booking (By Admin)',
          price: 0,
        },
      ]);

      if (error) {
        alert(`Error: ${error.message}`);
      } else {
        alert(`Task assigned by ${adminName} successfully! Reference: ${generatedRef}`);
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while assigning the task.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto font-sans">
      <div className="bg-white rounded-[24px] max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90dvh] overflow-y-auto my-auto box-border">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#1E2B37]">Assign Holiday Task</h2>
            <p className="text-xs text-slate-500">
              Assigning as <span className="font-bold text-[#1E2B37]">{adminName}</span>
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition text-base font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
          <div className="p-3 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-2">
            <span className="text-[11px] font-bold text-blue-900 block">Customer Information (Optional)</span>
            <input
              type="text"
              placeholder="Guest/Customer Name (e.g. John Doe)"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Phone (e.g. +357 99 123456)"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
              />
              <input
                type="email"
                placeholder="Email Address"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="space-y-1 text-left w-full min-w-0">
            <label className="text-xs font-bold text-[#1E2B37]">Property Unit</label>
            <select
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              className="w-full max-w-full box-border px-3.5 py-2.5 bg-slate-50/80 border border-slate-200 rounded-2xl text-[16px] sm:text-xs font-semibold text-[#1E2B37] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition"
            >
              {HOLIDAY_PROPERTIES.map((prop) => (
                <option key={prop} value={prop}>{prop}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1 text-left w-full min-w-0">
            <label className="text-xs font-bold text-[#1E2B37]">Program</label>
            <select
              value={programName}
              onChange={(e) => setProgramName(e.target.value)}
              className="w-full max-w-full box-border px-3.5 py-2.5 bg-slate-50/80 border border-slate-200 rounded-2xl text-[16px] sm:text-xs font-semibold text-[#1E2B37] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition"
            >
              <option value="General cleaning">General cleaning</option>
              <option value="Turnover cleaning">Turnover cleaning</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full min-w-0">
            <div className="space-y-1 text-left w-full min-w-0">
              <label className="text-xs font-bold text-[#1E2B37]">Scheduled Date</label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                required
                className="w-full max-w-full min-w-0 box-border px-3.5 py-2.5 bg-slate-50/80 border border-slate-200 rounded-2xl text-[16px] sm:text-xs text-[#1E2B37] font-medium focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition appearance-none"
              />
            </div>

            <div className="space-y-1 text-left w-full min-w-0">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#1E2B37]">Working Time</label>
                <span className="text-[10px] font-semibold text-[#2563EB]">09:00 AM - 04:00 PM</span>
              </div>
              <select
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full max-w-full min-w-0 box-border px-3.5 py-2.5 bg-slate-50/80 border border-slate-200 rounded-2xl text-[16px] sm:text-xs font-bold text-[#1E2B37] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition"
              >
                {HOLIDAY_TIME_SLOTS.map((time) => (
                  <option key={time} value={time}>
                    {formatTimeAMPM(time)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1 text-left w-full min-w-0">
            <label className="text-xs font-bold text-[#1E2B37] block">Assign Staff</label>
            <select
              value={assignedStaff}
              onChange={(e) => setAssignedStaff(e.target.value)}
              className="w-full max-w-full box-border px-3.5 py-2.5 bg-slate-50/80 border border-slate-200 rounded-2xl text-[16px] sm:text-xs font-semibold text-[#1E2B37] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition"
            >
              {STAFF_LIST.map((staff) => (
                <option key={staff.id} value={staff.name}>
                  {staff.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col sm:flex-row-reverse items-center gap-2 pt-3 border-t border-slate-100">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-2/3 py-3 sm:py-2.5 bg-[#0F172A] hover:bg-slate-800 active:scale-[0.98] text-white font-bold rounded-2xl text-xs transition shadow-md cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Confirm Task Assignment'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="w-full sm:w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 6. Main Dashboard Content Component
// ----------------------------------------------------------------------
function AdminDashboardContent() {
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const router = useRouter();
  const [tasks, setTasks] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'history' | 'feedback'>('today');

  const [adminUser, setAdminUser] = useState<string>('Sam');
  const [selectedStaffMap, setSelectedStaffMap] = useState<{ [key: string]: string }>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedAdmin = localStorage.getItem('admin_user');
      if (savedAdmin && ADMIN_LIST.includes(savedAdmin)) {
        setAdminUser(savedAdmin);
      }
    }
  }, []);

  const handleAdminChange = (newAdmin: string) => {
    setAdminUser(newAdmin);
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_user', newAdmin);
    }
  };

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to log out?')) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('admin_user');
      }
      await supabase.auth.signOut();
      router.push('/admin/login');
    }
  };

  const loadFeedbacks = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('feedbacks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading feedbacks:', error.message);
        return;
      }

      if (data) {
        setFeedbacks(data);
      }
    } catch (err) {
      console.error('Error loading feedbacks:', err);
    }
  }, []);

  const loadBookings = useCallback(async () => {
    try {
      const { data: bookingData, error } = await supabase
        .from('bookings')
        .select('*')
        .order('scheduled_date', { ascending: true });

      if (error) {
        console.error('Error fetching bookings:', error.message);
        return;
      }

      if (bookingData) {
        const userIds = Array.from(
          new Set(
            bookingData
              .map((b) => b.user_id || b.customer_id || b.created_by)
              .filter(Boolean)
          )
        );

        let usersMap: Record<string, any> = {};

        if (userIds.length > 0) {
          const { data: usersData } = await supabase
            .from('users')
            .select('id, full_name, email, phone, phone_number')
            .in('id', userIds);

          if (usersData) {
            usersMap = usersData.reduce((acc, u) => {
              acc[u.id] = u;
              return acc;
            }, {} as Record<string, any>);
          }
        }

        const serviceIds = Array.from(
          new Set(bookingData.map((b) => b.service_id).filter(Boolean))
        );

        let servicesMap: Record<string, string> = {};

        if (serviceIds.length > 0) {
          const { data: servicesData } = await supabase
            .from('services')
            .select('id, name, title, service_name')
            .in('id', serviceIds);

          if (servicesData) {
            servicesMap = servicesData.reduce((acc, s) => {
              acc[s.id] = s.name || s.title || s.service_name || '';
              return acc;
            }, {} as Record<string, string>);
          }
        }

        const enrichedTasks = bookingData.map((task) => {
          const uId = task.user_id || task.customer_id || task.created_by;
          const userRel = uId ? usersMap[uId] : null;

          const isAdminCreated = 
            task.customer_name === 'Admin Assigned Task' || 
            Boolean(task.assigned_by) || 
            task.payment_method === 'Manual Booking (By Admin)';

          let customerName = task.customer_name || task.guest_name;
          if (!customerName || customerName === 'Admin Assigned Task') {
            customerName = userRel?.full_name || (isAdminCreated ? 'Direct Booking (Admin)' : 'Guest Customer');
          }

          const customerEmail = task.customer_email || task.email || userRel?.email || '-';
          const customerPhone = task.customer_phone || task.phone || userRel?.phone || userRel?.phone_number || '-';

          return {
            ...task,
            fetched_service_name: task.service_id ? servicesMap[task.service_id] : '',
            display_customer_name: customerName,
            display_email: customerEmail,
            display_phone: customerPhone,
            is_admin_created: isAdminCreated
          };
        });

        setTasks(enrichedTasks);
      }
    } catch (err) {
      console.error('Error loading bookings:', err);
    }
  }, []);

  useEffect(() => {
    loadBookings();
    loadFeedbacks();

    const channel = supabase
      .channel('admin-realtime-bookings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => {
          loadBookings();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'feedbacks' },
        () => {
          loadFeedbacks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadBookings, loadFeedbacks]);

  const handleSelectStaffLocal = (id: any, staffName: string) => {
    setSelectedStaffMap((prev) => ({ ...prev, [id]: staffName }));
  };

  const handleConfirmPayment = async (task: any) => {
    if (loadingId === task.id) return; 
    setLoadingId(task.id);

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ payment_status: 'Paid / Verified' })
        .eq('id', task.id);

      if (error) throw error;

      setTasks((prevTasks) =>
        prevTasks.map((t) =>
          t.id === task.id ? { ...t, payment_status: 'Paid / Verified' } : t
        )
      );
    } catch (err: any) {
      alert('Failed: ' + err.message);
    } finally {
      setLoadingId(null);
    }
  };

  const handleDispatchTask = async (task: any, staffName: string) => {
    if (!staffName) return alert('Please select a staff member first.');
    if (loadingId === task.id) return;
    setLoadingId(task.id);

    const finalAdmin = adminUser || (typeof window !== 'undefined' ? localStorage.getItem('admin_user') : null) || 'Sam';

    const isAdminTask = 
      task.is_admin_created ||
      task.customer_name === 'Admin Assigned Task' || 
      Boolean(task.assigned_by) || 
      task.details?.is_admin_booking ||
      task.details?.assigned_by_admin ||
      task.payment_method === 'Manual Booking (By Admin)';

    const updatePayload: any = {
      assigned_staff: staffName,
      assigned_by: finalAdmin,
      status: 'Assigned',
    };

    if (isAdminTask) {
      updatePayload.payment_status = 'Paid / Verified';
      updatePayload.payment_method = 'Manual Booking (By Admin)';
    }

    try {
      const { error } = await supabase
        .from('bookings')
        .update(updatePayload)
        .eq('id', task.id);

      if (error) throw error;

      setTasks((prevTasks) =>
        prevTasks.map((t) =>
          t.id === task.id
            ? { ...t, ...updatePayload }
            : t
        )
      );

      alert(`Successfully assigned task to ${staffName} (Admin: ${finalAdmin})`);

    } catch (err: any) {
      alert('Failed to assign task: ' + err.message);
    } finally {
      setLoadingId(null);
    }
  };

  const handleDeleteTask = async (taskId: any) => {
    if (!taskId) return;

    const confirmDelete = window.confirm('Are you sure you want to delete this booking?');
    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      setTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId));
    } catch (err: any) {
      alert('Failed to delete task: ' + err.message);
    }
  };

  const handleReplyFeedback = async (feedback: any, replyText: string) => {
    try {
      const { error } = await supabase
        .from('feedbacks')
        .update({
          admin_reply: replyText,
          replied_at: new Date().toISOString(),
          replied_by: adminUser,
        })
        .eq('id', feedback.id);

      if (error) {
        alert(`Failed to save reply: ${error.message}`);
      } else {
        loadFeedbacks();
      }
    } catch (err) {
      console.error('Error replying feedback:', err);
    }
  };

  const staffStatusMap = useMemo(() => {
    const map: { [key: string]: { count: number; isBusy: boolean } } = {};

    STAFF_LIST.forEach((s) => {
      map[s.name] = { count: 0, isBusy: false };
    });

    tasks.forEach((t) => {
      const staffName = t.assigned_staff || t.staff_id;
      const status = String(t.status || '').toLowerCase().trim();

      if (staffName && map[staffName]) {
        if (status === 'completed' || status === 'done' || status === 'finished') {
          map[staffName].count += 1;
        } else if (
          status === 'in progress' || 
          status === 'in_progress' || 
          status === 'assigned' || 
          status === 'started'
        ) {
          map[staffName].isBusy = true;
        }
      }
    });

    return map;
  }, [tasks]);

  const todayTasks = useMemo(() => {
    return tasks.filter((t) => {
      const taskDate = getCleanDate(t.scheduled_date || t.booking_date || t.date);
      return taskDate === todayStr;
    });
  }, [tasks, todayStr]);

  const upcomingTasks = useMemo(() => {
    return tasks.filter((t) => {
      const taskDate = getCleanDate(t.scheduled_date || t.booking_date || t.date);
      return taskDate > todayStr;
    });
  }, [tasks, todayStr]);

  const historyTasks = useMemo(() => {
    return tasks.filter((t) => {
      const taskDate = getCleanDate(t.scheduled_date || t.booking_date || t.date);
      const st = String(t.status || '').toLowerCase();
      return taskDate < todayStr || st === 'completed' || st === 'done' || st === 'finished';
    });
  }, [tasks, todayStr]);

  return (
    <div className="min-h-screen p-2 sm:p-4 md:p-6 font-sans" style={{ backgroundColor: '#F8FAFC', color: '#1E1E1E' }}>
      <div className="max-w-7xl mx-auto space-y-4">
        
        <div className="text-xs font-semibold pl-1" style={{ color: '#8E9B9E' }}>
          Admin Dashboard
        </div>

        {/* Header Box */}
        <div 
          className="rounded-2xl border shadow-sm p-4 sm:p-5 space-y-3"
          style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 
                className="text-lg sm:text-xl font-bold tracking-tight"
                style={{ color: '#1E1E1E' }}
              >
                Getaway Admin Dashboard
              </h1>
              <p 
                className="text-xs font-medium"
                style={{ color: '#8E9B9E' }}
              >
                Task Management & Dispatch System (Realtime)
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsAssignModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 active:scale-95 text-white font-bold rounded-xl text-xs sm:text-sm transition shadow-xs self-start sm:self-auto cursor-pointer"
              style={{ backgroundColor: '#006AFF' }}
            >
              <span className="text-base font-black leading-none">+</span>
              Assign Holiday Task
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1 border-t" style={{ borderColor: '#F1F5F9' }}>
            <div 
              className="flex items-center border rounded-xl px-2.5 py-1.5 text-xs font-medium"
              style={{ backgroundColor: '#F1F5F9', borderColor: '#D9D9D9', color: '#1E2B37' }}
            >
              <span>Admin:</span>
              <select
                value={adminUser}
                onChange={(e) => handleAdminChange(e.target.value)}
                className="bg-transparent focus:outline-none ml-1 text-xs cursor-pointer font-bold"
                style={{ color: '#1E1E1E' }}
              >
                {ADMIN_LIST.map((adm) => (
                  <option key={adm} value={adm}>
                    {adm}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="font-bold text-xs px-3.5 py-1.5 rounded-xl transition active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-xs border text-white"
              style={{
                backgroundColor: '#D95353',
                borderColor: '#E87171'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#C94A4E')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#D95353')}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>

        {/* Task Management & Dispatch System */}
        <div className="rounded-xl border shadow-xs p-3 space-y-2" style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}>
          <h2 className="text-[11px] sm:text-xs font-bold" style={{ color: '#1E2B37' }}>
            Task Management & Dispatch System (Realtime)
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 sm:gap-2">
            {STAFF_LIST.map((staff) => {
              const staffData = staffStatusMap[staff.name] || { count: 0, isBusy: false };
              const isBusy = staffData.isBusy;

              return (
                <div
                  key={staff.id}
                  className="border rounded-lg p-1.5 sm:p-2 space-y-1 transition-all"
                  style={{ backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[11px] sm:text-xs truncate" style={{ color: '#1E1E1E' }}>
                      {staff.name}
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full inline-block flex-shrink-0 ${
                        isBusy ? 'animate-pulse' : ''
                      }`}
                      style={{
                        backgroundColor: isBusy ? '#FFB800' : '#008800'
                      }}
                    ></span>
                  </div>
                  
                  <p className="text-[9px] sm:text-[10px] leading-none font-semibold" style={{ color: isBusy ? '#FFB800' : '#8E9B9E' }}>
                    {isBusy ? 'In Progress' : 'Available'}
                  </p>
                  
                  <div className="border-t pt-1 flex justify-between items-center text-[9px] sm:text-[10px]" style={{ borderColor: '#E2E8F0', color: '#8E9B9E' }}>
                    <span>Done :</span>
                    <span className="font-semibold" style={{ color: '#1E1E1E' }}>{staffData.count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="rounded-2xl border shadow-sm p-2.5 sm:p-3" style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}>
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
            <button
              onClick={() => setActiveTab('history')}
              className="py-1.5 px-1 sm:px-2 rounded-xl border text-[11px] sm:text-xs text-center font-medium transition cursor-pointer"
              style={
                activeTab === 'history'
                  ? { backgroundColor: '#EBF5FF', borderColor: '#93C5FD', color: '#006AFF', fontWeight: 'bold' }
                  : { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', color: '#1E2B37' }
              }
            >
              History ({historyTasks.length})
            </button>

            <button
              onClick={() => setActiveTab('today')}
              className="py-1.5 px-1 sm:px-2 rounded-xl border text-[11px] sm:text-xs text-center font-medium transition cursor-pointer"
              style={
                activeTab === 'today'
                  ? { backgroundColor: '#EBF5FF', borderColor: '#93C5FD', color: '#006AFF', fontWeight: 'bold' }
                  : { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', color: '#1E2B37' }
              }
            >
              Today ({todayTasks.length})
            </button>

            <button
              onClick={() => setActiveTab('upcoming')}
              className="py-1.5 px-1 sm:px-2 rounded-xl border text-[11px] sm:text-xs text-center font-medium transition cursor-pointer"
              style={
                activeTab === 'upcoming'
                  ? { backgroundColor: '#EBF5FF', borderColor: '#93C5FD', color: '#006AFF', fontWeight: 'bold' }
                  : { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', color: '#1E2B37' }
              }
            >
              Upcoming ({upcomingTasks.length})
            </button>

            <button
              onClick={() => setActiveTab('feedback')}
              className="py-1.5 px-1 sm:px-2 rounded-xl border text-[11px] sm:text-xs text-center font-medium transition cursor-pointer"
              style={
                activeTab === 'feedback'
                  ? { backgroundColor: '#FFE8AE', borderColor: '#FFC943', color: '#1E1E1E', fontWeight: 'bold' }
                  : { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', color: '#1E1E1E' }
              }
            >
              Feedback ({feedbacks.length})
            </button>
          </div>
        </div>

        {/* Content Section */}
        <div className="space-y-4">
          {/* Today Tab */}
          {activeTab === 'today' && (
            todayTasks.length > 0 ? (
              <div className="space-y-3">
                {todayTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    selectedStaff={selectedStaffMap[task.id] || ''}
                    isLoading={loadingId === task.id}
                    handleSelectStaffLocal={handleSelectStaffLocal}
                    handleConfirmPayment={handleConfirmPayment}
                    handleDispatchTask={handleDispatchTask}
                    handleDeleteTask={handleDeleteTask}
                  />
                ))}
              </div>
            ) : (
              <div className="border rounded-2xl p-12 sm:p-16 text-center text-xs sm:text-sm font-medium shadow-sm" style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', color: '#8E9B9E' }}>
                No tasks scheduled for today.
              </div>
            )
          )}

          {/* Upcoming Tab */}
          {activeTab === 'upcoming' && (
            upcomingTasks.length > 0 ? (
              <div className="space-y-5">
                {Object.entries(
                  upcomingTasks.reduce<Record<string, any[]>>((acc, task) => {
                    const dateKey = getCleanDate(task.scheduled_date || task.booking_date) || 'Unscheduled';
                    if (!acc[dateKey]) acc[dateKey] = [];
                    acc[dateKey].push(task);
                    return acc;
                  }, {})
                ).map(([date, tasksGroup]) => (
                  <div key={date} className="space-y-2.5">
                    <div className="flex justify-center border-b pb-1.5 my-1.5" style={{ borderColor: '#E2E8F0' }}>
                      <span className="text-[10px] font-semibold border px-2 py-0.5 rounded" style={{ backgroundColor: '#F1F5F9', borderColor: '#D9D9D9', color: '#1E2B37' }}>
                        {date}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {tasksGroup.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          selectedStaff={selectedStaffMap[task.id] || ''}
                          isLoading={loadingId === task.id}
                          handleSelectStaffLocal={handleSelectStaffLocal}
                          handleConfirmPayment={handleConfirmPayment}
                          handleDispatchTask={handleDispatchTask}
                          handleDeleteTask={handleDeleteTask}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border rounded-2xl p-12 sm:p-16 text-center text-xs sm:text-sm font-medium shadow-sm" style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', color: '#8E9B9E' }}>
                No upcoming tasks found.
              </div>
            )
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            historyTasks.length > 0 ? (
              <div className="space-y-5">
                {Object.entries(
                  historyTasks.reduce<Record<string, any[]>>((acc, task) => {
                    const dateKey = getCleanDate(task.scheduled_date || task.booking_date) || 'Unscheduled';
                    if (!acc[dateKey]) acc[dateKey] = [];
                    acc[dateKey].push(task);
                    return acc;
                  }, {})
                ).map(([date, tasksGroup]) => (
                  <div key={date} className="space-y-2.5">
                    <div className="flex justify-center border-b pb-1.5 my-1.5" style={{ borderColor: '#E2E8F0' }}>
                      <span className="text-[10px] font-semibold border px-2 py-0.5 rounded" style={{ backgroundColor: '#F1F5F9', borderColor: '#D9D9D9', color: '#1E2B37' }}>
                        {date}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {tasksGroup.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          selectedStaff={selectedStaffMap[task.id] || ''}
                          isLoading={loadingId === task.id}
                          handleSelectStaffLocal={handleSelectStaffLocal}
                          handleConfirmPayment={handleConfirmPayment}
                          handleDispatchTask={handleDispatchTask}
                          handleDeleteTask={handleDeleteTask}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border rounded-2xl p-12 sm:p-16 text-center text-xs sm:text-sm font-medium shadow-sm" style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', color: '#8E9B9E' }}>
                No history tasks found.
              </div>
            )
          )}

          {/* Feedback Tab */}
          {activeTab === 'feedback' && (
            <div className="space-y-4">
              <AdminReviewAnalytics feedbacks={feedbacks} />

              {feedbacks.length > 0 ? (
                <div className="space-y-3">
                  {feedbacks.map((fb) => (
                    <FeedbackCard
                      key={fb.id}
                      feedback={fb}
                      isLoading={loadingId === fb.id}
                      onReply={handleReplyFeedback}
                    />
                  ))}
                </div>
              ) : (
                <div className="border rounded-2xl p-12 sm:p-16 text-center text-xs sm:text-sm font-medium shadow-sm" style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', color: '#8E9B9E' }}>
                  No customer feedbacks available yet.
                </div>
              )}
            </div>
          )}
          
        </div>

      </div>

      {/* Assign Holiday Task Modal */}
      <AssignHolidayTaskModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        onSuccess={loadBookings}
        adminName={adminUser}
      />
    </div>
  );
}

// ----------------------------------------------------------------------
// Export Component
// ----------------------------------------------------------------------
export default function DashboardClient() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen font-medium text-sm" style={{ color: '#8E9B9E' }}>
        Loading Admin Dashboard...
      </div>
    }>
      <AdminDashboardContent />
    </Suspense>
  );
}