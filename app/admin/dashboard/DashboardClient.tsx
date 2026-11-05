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
const getLocalToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatDateDisplay = (dateString: string) => {
  if (!dateString) return '-';
  const cleanDate = String(dateString).split('T')[0];
  const [year, month, day] = cleanDate.split('-');
  
  if (!year || !month || !day) return dateString;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = months[parseInt(month, 10) - 1] || month;
  
  return `${parseInt(day, 10)} ${monthName} ${year}`;
};

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

  let detailsObj: any = {};
  if (typeof task.details === 'string') {
    try { detailsObj = JSON.parse(task.details); } catch (e) {}
  } else if (typeof task.details === 'object') {
    detailsObj = task.details || {};
  }

  const method = String(
    task.payment_method ||
    detailsObj.payment_method ||
    task.payment_type ||
    ''
  ).toLowerCase();

  return (
    method.includes('card') ||
    method.includes('credit') ||
    method.includes('stripe')
  );
};

const isCashPayment = (task: any): boolean => {
  if (!task) return false;

  let detailsObj: any = {};
  if (typeof task.details === 'string') {
    try { detailsObj = JSON.parse(task.details); } catch (e) {}
  } else if (typeof task.details === 'object' && task.details !== null) {
    detailsObj = task.details;
  }

  const method = String(
    task.payment_method ||
    detailsObj.payment_method ||
    task.payment_type ||
    detailsObj.payment_status ||
    ''
  ).toLowerCase();

  return method.includes('cash');
};

const formatRefCode = (task: any): string => {
  if (task.booking_ref) return task.booking_ref;
  if (task.booking_code) return task.booking_code;
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
  let detailsObj: any = {};
  if (task.details) {
    if (typeof task.details === 'string') {
      try { detailsObj = JSON.parse(task.details); } catch (e) {}
    } else if (typeof task.details === 'object' && task.details !== null) {
      detailsObj = task.details;
    }
  }

  const phone = 
    task.customer_phone ||
    task.phone ||
    task.phone_number ||
    detailsObj.customer_phone ||
    detailsObj.customerPhone ||
    detailsObj.phone ||
    detailsObj.phone_number ||
    detailsObj.phoneNumber ||
    detailsObj.user_phone ||
    task.users?.phone ||
    task.profiles?.phone;

  return phone ? String(phone).trim() : '';
};

const extractCustomerName = (task: any): string => {
  if (!task) return 'Guest Customer';

  let detailsObj: any = {};
  if (task.details) {
    if (typeof task.details === 'string') {
      try { detailsObj = JSON.parse(task.details); } catch (e) {}
    } else if (typeof task.details === 'object' && task.details !== null) {
      detailsObj = task.details;
    }
  }

  const name = 
    task.customer_name ||
    task.guest_name ||
    task.full_name ||
    task.name ||
    detailsObj.customer_name ||
    detailsObj.customerName ||
    detailsObj.guest_name ||
    detailsObj.guestName ||
    detailsObj.full_name ||
    detailsObj.fullName ||
    detailsObj.name ||
    detailsObj.user_name ||
    task.users?.full_name ||
    task.users?.name ||
    task.profiles?.full_name ||
    task.profiles?.name;

  return name ? String(name).trim() : 'Guest Customer';
};

const extractCustomerEmail = (task: any): string => {
  if (!task) return '';
  let detailsObj: any = {};
  if (task.details) {
    if (typeof task.details === 'string') {
      try { detailsObj = JSON.parse(task.details); } catch (e) {}
    } else if (typeof task.details === 'object' && task.details !== null) {
      detailsObj = task.details;
    }
  }

  const email = 
    task.customer_email ||
    task.email ||
    detailsObj.customer_email ||
    detailsObj.customerEmail ||
    detailsObj.email ||
    detailsObj.user_email ||
    task.users?.email ||
    task.profiles?.email;

  return email ? String(email).trim() : '';
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

const groupBookingsByDate = (taskList: any[]) => {
  return taskList.reduce((acc: { [key: string]: any[] }, task) => {
    const dateKey = getCleanDate(task.scheduled_date) || 'Unscheduled';
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(task);
    return acc;
  }, {});
};

// ----------------------------------------------------------------------
// 3. Components (Analytics, FeedbackCard, TaskCard, Modal)
// ----------------------------------------------------------------------
function AdminReviewAnalytics({ feedbacks }: { feedbacks: any[] }) {
  const [showStats, setShowStats] = useState(true);

  const validScores = feedbacks.map((f) => {
    const raw = f.rating !== undefined && f.rating !== null ? f.rating : f.rating_score;
    return Number(raw) || 0;
  }).filter((score) => score > 0);

  const total = validScores.length;
  const avgRating = total > 0 ? (validScores.reduce((sum, score) => sum + score, 0) / total).toFixed(1) : '0.0';
  const numAvg = Number(avgRating);

  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  validScores.forEach((score) => {
    const rounded = Math.min(5, Math.max(1, Math.round(score)));
    distribution[rounded as 1|2|3|4|5] += 1;
  });

  const positiveCount = distribution[5] + distribution[4];
  const positiveRate = total > 0 ? Math.round((positiveCount / total) * 100) : 0;

  let statusColor = 'text-amber-600 bg-amber-50 border-amber-200';
  let statusText = 'Stable';
  let statusIcon = '➔';

  if (numAvg >= 4.5) {
    statusColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
    statusText = 'Excellent';
    statusIcon = '▲';
  } else if (numAvg < 3.8 && total > 0) {
    statusColor = 'text-rose-700 bg-rose-50 border-rose-200';
    statusText = 'Attention';
    statusIcon = '▼';
  }

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-xs space-y-2 mb-3">
      {/* Header ย่อพร้อมปุ่มซ่อน/แสดง */}
      <div className="flex justify-between items-center pb-1 border-b border-slate-100">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
            REVIEW ANALYTICS
          </span>
          <span className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-0.5 ${statusColor}`}>
            <span>{statusIcon}</span> {statusText}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowStats(!showStats)}
          className="text-[10px] text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
        >
          {showStats ? 'Hide ▲' : 'Show ▼'}
        </button>
      </div>

      {showStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4 pt-1">
          {/* ซีกซ้าย: ตัวเลขสรุปคะแนน */}
          <div className="flex sm:flex-col justify-between sm:justify-center items-center sm:items-start p-2.5 sm:p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  ★ {avgRating}
                </span>
                <span className="text-[10px] text-slate-400 font-normal">/ 5.0</span>
              </div>
              <p className="text-[10px] text-slate-500">
                {total} total reviews
              </p>
            </div>
            
            <div className="text-right sm:text-left sm:w-full sm:pt-2 sm:border-t sm:border-slate-200/60 mt-1">
              <span className="text-[10px] text-slate-500 block">Satisfaction: <strong className="text-[#006AFF] font-bold">{positiveRate}%</strong></span>
            </div>
          </div>

          {/* ซีกขวา: กราฟแท่ง 5 ดาวแบบแถวบาง */}
          <div className="space-y-1 p-2.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-100 justify-center flex flex-col">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = distribution[star as 1|2|3|4|5];
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;

              return (
                <div key={star} className="flex items-center gap-1.5 text-[10px] leading-none">
                  <span className="w-5 font-semibold text-slate-700 text-right shrink-0">
                    {star}★
                  </span>

                  <div className="flex-1 h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        star >= 4 ? 'bg-emerald-600' : star === 3 ? 'bg-amber-400' : 'bg-rose-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <span className="w-8 text-[9px] text-slate-400 font-normal text-right shrink-0">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

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
        <span className="text-sm font-normal text-slate-600">
          Customer: <strong className="font-bold text-slate-900">{displayCustomerName}</strong>
        </span>

        <div className="flex items-center gap-1 font-bold" style={{ color: '#FFB800' }}>
          {'★'.repeat(feedback.rating || feedback.rating_score || 5)}
          <span className="text-[10px] font-normal" style={{ color: '#8E9B9E' }}>
            ({feedback.rating || feedback.rating_score || 5}/5)
          </span>
        </div>
      </div>

      <div className="p-3 rounded-lg border space-y-2" style={{ backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }}>
        <p className="text-xs sm:text-sm italic font-normal" style={{ color: '#1E2B37' }}>
          "{feedback.comment || 'No comment provided.'}"
        </p>

        {hasReplied && (
          <div className="pt-2 border-t text-xs" style={{ borderColor: '#E2E8F0', color: '#006AFF' }}>
            <span className="font-bold">Admin Reply: </span>
            <span className="font-normal">{feedback.admin_reply || replyText}</span>
          </div>
        )}
      </div>

      <div className="pt-2 border-t space-y-2" style={{ borderColor: '#F1F5F9' }}>
        <label className="font-semibold block text-slate-800">
          {hasReplied ? 'Edit Admin Reply:' : 'Admin Reply:'}
        </label>
        <textarea
          rows={2}
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          disabled={isLoading || isSubmitting}
          placeholder="Type your reply to customer..."
          className="w-full p-2 sm:p-2.5 border rounded-lg text-xs font-normal focus:outline-none focus:ring-2"
          style={{ backgroundColor: '#FFFFFF', borderColor: '#D9D9D9', color: '#1E1E1E' }}
        ></textarea>

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          {hasReplied ? (
            <span className="text-[10px] sm:text-xs font-medium" style={{ color: '#008800' }}>
              ✓ Replied {feedback.replied_by ? `by ${feedback.replied_by}` : ''}
            </span>
          ) : (
            <span className="text-[10px] sm:text-xs font-normal" style={{ color: '#8E9B9E' }}>Not replied yet</span>
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

function TaskCard({
  task,
  selectedStaff,
  isLoading,
  handleSelectStaffLocal,
  handleAcknowledgeQuote,
  handleSetPriceAndQuote,
  handleConfirmOrder,
  handleConfirmPayment,
  handleDispatchTask,
  handleDeleteTask,
}: {
  task: any;
  selectedStaff: string;
  isLoading: boolean;
  handleSelectStaffLocal: (id: any, staff: string) => void;
  handleAcknowledgeQuote: (task: any) => void;
  handleSetPriceAndQuote: (task: any) => void;
  handleConfirmOrder: (task: any) => void;
  handleConfirmPayment: (task: any) => void;
  handleDispatchTask: (task: any, staff: string) => void;
  handleDeleteTask: (id: any) => void;
}) {
  const currentAssigned = task.assigned_staff || '';
  const activeStaffChoice = selectedStaff !== undefined && selectedStaff !== '' ? selectedStaff : currentAssigned;

  let details: Record<string, any> = {};
  if (task.details) {
    if (typeof task.details === 'string') {
      try { details = JSON.parse(task.details); } catch (e) { details = {}; }
    } else if (typeof task.details === 'object' && task.details !== null) {
      details = task.details;
    }
  }

  const isPaid = details.payment_status === 'Paid / Verified' || task.status === 'Paid';
  const isCash = isCashPayment(task);
  
  const isOrderConfirmed = Boolean(
    details.order_confirmed || 
    details.payment_status === 'Order Confirmed (Pending Cash)' ||
    task.status === 'confirmed'
  );

  const hasSelectedStaff = Boolean(activeStaffChoice);
  const isChangedStaff = activeStaffChoice !== currentAssigned;

  const displayCustomerName = extractCustomerName(task);
  const displayEmail = extractCustomerEmail(task);
  const displayPhone = extractPhoneNumber(task);

  const isAdminTask = Boolean(details.is_admin_booking || details.assigned_by_admin);
  const slipUrl = getValidSlipUrl(task);

  const isHolidayHome = task.service_type === 'holiday' || String(task.booking_ref || '').startsWith('BK') || String(task.booking_ref || '').startsWith('HOL') || Boolean(details.property);
  const isPrivateService = !isHolidayHome && (task.service_type === 'private' || String(task.booking_ref || '').startsWith('PRV') || Boolean(details.property_type || details.bedrooms));

  const propertyType = details.property_type || details.propertyType || details.property_category || details.service_type || task.property_type;
  const rawBedrooms = details.room ?? details.bedrooms ?? details.bedrooms_unit ?? details.unit ?? details.bedroom ?? details.bedrooms_count ?? task.room_count ?? task.bedrooms;
  const rawBathrooms = details.bathrooms ?? details.bathroom ?? task.bathrooms;
  const rawBalconies = details.balconies ?? details.balcony ?? details.office_balconies ?? details.verandahs ?? task.balconies;

  const officeSqm = details.office_sqm || details.sqm || task.office_sqm;
  const officeToilets = details.office_toilets || task.office_toilets;
  const officeCleanWindows = details.office_clean_windows || task.office_clean_windows;

  const gardenSqm = details.garden_sqm || details.area_size || details.garden_size || task.garden_sqm || task.area_size;
  const gardenType = details.garden_type || task.garden_type;
  const gardenOtherDetails = details.garden_other_details || details.garden_notes || details.notes || details.special_request || details.comment || task.notes || task.special_request || task.garden_other_details;

  const houseApt = details.house_apt || details.apartment_house_no || details.apartmentHouseNo || details.unit || task.house_apt;
  const building = details.building_complex || details.building || details.buildingComplex || task.building_complex;
  const cityArea = details.city_area || details.city || details.area || task.city_area;

  const hasServiceSpecs = Boolean(
    propertyType || 
    (rawBedrooms !== undefined && rawBedrooms !== null && String(rawBedrooms) !== '') ||
    (rawBathrooms !== undefined && rawBathrooms !== null && String(rawBathrooms) !== '') ||
    (rawBalconies !== undefined && rawBalconies !== null && String(rawBalconies) !== '') ||
    officeSqm || officeToilets || officeCleanWindows ||
    gardenSqm || gardenType || gardenOtherDetails
  );

  const displayProgram = task.program_name || details.program_name || details.selected_program || extractProgramName(task);
  const isCard = details.payment_method === 'card' || isCardPayment(task);
  const displayAddress = task.address || task.address_line || details.address || details.address_line || details.full_address || details.property || '-';
  const mapsLink = details.google_maps_link || details.mapLink || details.google_maps;
  const amountVal = Number(task.total_amount || 0);

  const cardKeyId = task.id || task.booking_id || task.booking_ref;

  return (
    <div className="p-3.5 sm:p-5 rounded-xl border shadow-xs space-y-3.5 sm:space-y-4 text-xs bg-white border-slate-200 text-slate-800">
      
      {/* Header */}
      <div className="flex justify-between items-start sm:items-center border-b border-slate-100 pb-2.5 sm:pb-3 gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <span className="font-bold text-xs sm:text-sm text-slate-900">
            {formatRefCode(task)}
          </span>

          {isPrivateService && (
            <span className="text-[9px] sm:text-[10px] font-semibold px-2 py-0.5 rounded border bg-blue-50 text-blue-700 border-blue-200">
              QUOTATION REQUIRED
            </span>
          )}

          {isAdminTask && (
            <span className="text-[9px] sm:text-[10px] font-medium px-2 py-0.5 rounded border bg-amber-50 text-amber-800 border-amber-200">
              Admin Direct
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <span className="text-[10px] sm:text-xs font-normal text-slate-500">
            {formatDateDisplay(task.scheduled_date)} | {task.scheduled_time || '-'}
          </span>
          <button
            onClick={() => handleDeleteTask(cardKeyId)}
            className="px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] transition cursor-pointer font-semibold text-slate-400 hover:text-red-600"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Main Details */}
        <div className="md:col-span-2 space-y-2.5 sm:space-y-3">
          <div>
            {/* ชื่องาน: เด่นที่สุด */}
            <p className="font-bold text-sm sm:text-base text-slate-900 leading-snug">
              {displayProgram}
            </p>
            <p className="text-slate-600 mt-1 leading-relaxed font-normal text-xs">
              Customer: <strong className="font-bold text-slate-900">{displayCustomerName}</strong>
            </p>
          </div>

          <div className="space-y-1 sm:space-y-1.5 text-slate-600 leading-relaxed font-normal">
            {displayEmail && displayEmail !== '-' && (
              <p className="text-xs">
                Email: <span className="font-medium text-slate-900">{displayEmail}</span>
              </p>
            )}

            {displayPhone && displayPhone !== '-' && (
              <p className="text-xs">
                Phone:{' '}
                <a
                  href={`tel:${String(displayPhone).replace(/\s+/g, '')}`}
                  className="font-bold text-[#006AFF] hover:underline"
                >
                  {formatPhoneNumberDisplay(displayPhone)}
                </a>
              </p>
            )}

            <p className="text-xs">
              Address: <strong className="font-bold text-slate-900">{displayAddress}</strong>
            </p>

            {!isHolidayHome && (building || houseApt || cityArea) && !displayAddress.includes(building || '___') && (
              <p className="text-[11px] text-slate-500 leading-normal font-normal">
                {building && <span>Building: <strong className="text-slate-800 font-semibold">{building}</strong> </span>}
                {houseApt && <span>| Apt/House No: <strong className="text-slate-800 font-semibold">{houseApt}</strong> </span>}
                {cityArea && <span>| Area: <strong className="text-slate-800 font-semibold">{cityArea}</strong></span>}
              </p>
            )}

            {mapsLink && (
              <p className="pt-0.5">
                <a
                  href={mapsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold underline text-xs text-[#006AFF] hover:text-blue-800"
                >
                  📍 Open Location Link ↗
                </a>
              </p>
            )}
          </div>

          {isPrivateService && hasServiceSpecs && (
            <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-200 space-y-1.5 mt-2">
              <span className="font-bold text-[9px] sm:text-[10px] text-slate-600 uppercase tracking-wider block">
                📋 SERVICE SPECS (FOR QUOTATION):
              </span>
              <div className="flex flex-wrap gap-1.5 text-[10px] sm:text-[11px]">
                {propertyType && (
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600 font-normal">
                    Property: <strong className="text-slate-900 font-bold capitalize">{propertyType}</strong>
                  </span>
                )}
                {rawBedrooms !== undefined && rawBedrooms !== null && String(rawBedrooms) !== '' && (
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600 font-normal">
                    Bedrooms: <strong className="text-slate-900 font-bold">{rawBedrooms}</strong>
                  </span>
                )}
                {rawBathrooms !== undefined && rawBathrooms !== null && String(rawBathrooms) !== '' && (
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600 font-normal">
                    Bathrooms: <strong className="text-slate-900 font-bold">{rawBathrooms}</strong>
                  </span>
                )}
                {rawBalconies !== undefined && rawBalconies !== null && String(rawBalconies) !== '' && (
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600 font-normal">
                    Balconies: <strong className="text-slate-900 font-bold">{rawBalconies}</strong>
                  </span>
                )}
                {officeSqm && (
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600 font-normal">
                    Area: <strong className="text-slate-900 font-bold">{officeSqm} m²</strong>
                  </span>
                )}
                {officeToilets && (
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600 font-normal">
                    Toilets: <strong className="text-slate-900 font-bold">{officeToilets}</strong>
                  </span>
                )}
                {gardenSqm && (
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600 font-normal">
                    Garden: <strong className="text-slate-900 font-bold">{gardenSqm} m²</strong>
                  </span>
                )}
              </div>

              {gardenOtherDetails && (
                <p className="text-[10px] sm:text-[11px] text-amber-900 bg-amber-50 p-2 rounded border border-amber-200 leading-relaxed font-normal">
                  <strong className="font-bold">Note:</strong> {gardenOtherDetails}
                </p>
              )}
            </div>
          )}

          {/* Amount & Method Badge */}
          <div className="pt-1.5 flex items-center gap-2">
            <p className="text-xs sm:text-sm text-slate-600 font-normal">
              Amount: <strong className="font-bold text-slate-900">{amountVal > 0 ? `€${amountVal}` : 'Pending Price Quote'}</strong>
            </p>
            {isCash && (
              <span className="text-[9px] sm:text-[10px] font-semibold px-2 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200">
                💵 Cash on Service
              </span>
            )}
          </div>
        </div>

        {/* Payment Proof Column */}
        <div className="border-t md:border-t-0 md:border-l pt-3 md:pt-0 md:pl-4 flex flex-col justify-between border-slate-200">
          <div>
            <span className="font-bold text-[9px] sm:text-[10px] uppercase tracking-wider block mb-1.5 text-slate-500">
              PAYMENT STATUS & PROOF:
            </span>

            {slipUrl ? (
              <div className="space-y-1.5">
                <a
                  href={slipUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block relative w-20 sm:w-24 h-28 sm:h-32 rounded-lg border-2 border-blue-300 overflow-hidden hover:opacity-90 transition shadow-2xs bg-slate-50"
                >
                  <img
                    src={slipUrl}
                    alt="Payment Slip"
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </a>
              </div>
            ) : isPrivateService && amountVal <= 0 ? (
              <div className="p-2 sm:p-2.5 rounded-lg text-[10px] sm:text-[11px] font-semibold border bg-sky-50 text-sky-800 border-sky-200 shadow-2xs">
                <span>📋 Awaiting Price Quote</span>
              </div>
            ) : isPrivateService && details.quote_sent && !isPaid ? (
              <div className="p-2 sm:p-2.5 rounded-lg text-[10px] sm:text-[11px] font-semibold border bg-emerald-50 text-emerald-800 border-emerald-200 shadow-2xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <span>📨</span>
                  <span>Quotation Sent (€{amountVal})</span>
                </div>
                <p className="text-[9px] sm:text-[10px] text-emerald-600 font-normal">Awaiting customer payment</p>
              </div>
            ) : isCard ? (
              <span className="font-semibold px-2 py-0.5 rounded text-[10px] border inline-block bg-blue-50 text-blue-700 border-blue-200">
                Paid via Credit Card
              </span>
            ) : isCash ? (
              <div className="p-2 rounded-lg text-[10px] sm:text-[11px] font-semibold border bg-emerald-50 text-emerald-800 border-emerald-200 flex items-center gap-1.5 shadow-2xs">
                <span>💵</span>
                <span>Cash on Arrival</span>
              </div>
            ) : (
              <div className="p-1.5 sm:p-2 rounded text-[10px] font-normal border bg-amber-50 text-amber-900 border-amber-200">
                No slip uploaded
              </div>
            )}
          </div>

          <div className="pt-2 sm:pt-3 flex flex-col items-start md:items-end gap-1.5">
            {isPaid ? (
              <span className="text-[10px] font-bold px-2.5 py-1 rounded border bg-emerald-50 text-emerald-700 border-emerald-200">
                ✓ Paid Verified
              </span>
            ) : isPrivateService && amountVal <= 0 ? (
              !details.quote_acknowledged ? (
                <button
                  onClick={() => handleAcknowledgeQuote(task)}
                  disabled={isLoading}
                  className="w-full sm:w-auto text-[10px] sm:text-[11px] font-bold px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-700 text-white transition active:scale-95 cursor-pointer shadow-xs border border-sky-700 disabled:opacity-50"
                >
                  {isLoading ? 'Processing...' : 'Acknowledge Request'}
                </button>
              ) : (
                <button
                  onClick={() => handleSetPriceAndQuote(task)}
                  disabled={isLoading}
                  className="w-full sm:w-auto text-[10px] sm:text-[11px] font-bold px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-700 text-white transition active:scale-95 cursor-pointer shadow-xs border border-amber-700 disabled:opacity-50"
                >
                  {isLoading ? 'Processing...' : 'Set Price & Send Quote'}
                </button>
              )
            ) : isPrivateService && details.quote_sent && !isPaid ? (
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <button
                  onClick={() => handleSetPriceAndQuote(task)}
                  disabled={isLoading}
                  className="text-[10px] font-medium px-2 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition cursor-pointer"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleConfirmPayment(task)}
                  disabled={isLoading}
                  className="flex-1 sm:flex-none text-[10px] sm:text-[11px] font-bold px-3 py-1.5 rounded transition active:scale-95 cursor-pointer shadow-xs border disabled:opacity-50 bg-[#002B49] text-white border-slate-800 hover:bg-slate-800"
                >
                  {isLoading ? 'Processing...' : `Confirm Paid (€${amountVal})`}
                </button>
              </div>
            ) : isCash ? (
              !isOrderConfirmed ? (
                <button
                  onClick={() => handleConfirmOrder(task)}
                  disabled={isLoading}
                  className="w-full sm:w-auto text-[10px] sm:text-[11px] font-bold px-3 py-1.5 rounded transition active:scale-95 cursor-pointer shadow-xs border disabled:opacity-50 bg-[#006AFF] hover:bg-blue-700 text-white border-blue-700"
                >
                  {isLoading ? 'Processing...' : 'Confirm Order'}
                </button>
              ) : (
                <button
                  onClick={() => handleConfirmPayment(task)}
                  disabled={isLoading}
                  className="w-full sm:w-auto text-[10px] sm:text-[11px] font-bold px-3 py-1.5 rounded transition active:scale-95 cursor-pointer shadow-xs border disabled:opacity-50 bg-emerald-700 hover:bg-emerald-800 text-white border-emerald-800"
                >
                  {isLoading ? 'Processing...' : 'Confirm Cash Received'}
                </button>
              )
            ) : (
              <button
                onClick={() => handleConfirmPayment(task)}
                disabled={isLoading}
                className="w-full sm:w-auto text-[10px] sm:text-[11px] font-bold px-3 py-1.5 rounded transition active:scale-95 cursor-pointer shadow-xs border disabled:opacity-50 bg-[#002B49] text-white border-slate-800 hover:bg-slate-800"
              >
                {isLoading ? 'Processing...' : 'Confirm Payment'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Staff Assignment */}
      <div className="pt-2.5 sm:pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="font-normal whitespace-nowrap text-slate-500 text-[11px] sm:text-xs">Assigned:</span>

          <select
            value={activeStaffChoice}
            onChange={(e) => handleSelectStaffLocal(cardKeyId, e.target.value)}
            disabled={isLoading}
            className="flex-1 sm:flex-none border border-slate-200 rounded-lg px-2 py-1 text-xs font-normal focus:outline-none cursor-pointer bg-white text-slate-800"
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
            className={`px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap border cursor-pointer disabled:opacity-60 ${
              !hasSelectedStaff || (!isChangedStaff && Boolean(currentAssigned))
                ? 'bg-slate-200 text-slate-400 border-slate-300'
                : 'bg-[#006AFF] text-white border-blue-700 hover:bg-blue-700'
            }`}
          >
            {isLoading ? '...' : !isChangedStaff && currentAssigned ? 'Assigned' : 'Assign'}
          </button>
        </div>

        {currentAssigned && (
          <span className="font-medium text-[10px] sm:text-[11px] self-start sm:self-auto flex items-center gap-1 px-2.5 py-0.5 rounded-md border bg-slate-50 text-slate-700 border-slate-200">
            ✓ Assigned to <strong className="font-bold text-slate-900">{currentAssigned}</strong>
          </span>
        )}
      </div>
    </div>
  );
}

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
  const [scheduledDate, setScheduledDate] = useState(getLocalToday());
  const [scheduledTime, setScheduledTime] = useState('09:00:00');
  const [assignedStaff, setAssignedStaff] = useState(STAFF_LIST[0].name);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const generatedRef = `HOL-${Math.floor(100000 + Math.random() * 900000)}`;

    const holidayDetails = {
      property: selectedProperty,
      service_type: 'holiday',
      assigned_by_admin: true,
      admin_name: adminName,
      customer_name: 'Direct Booking (Admin)',
      assigned_staff: assignedStaff,
      is_admin_booking: true,
      payment_status: 'Paid / Verified',
      payment_method: 'Manual Booking (By Admin)',
    };

    try {
      const { error } = await supabase.from('bookings').insert([
        {
          booking_ref: generatedRef,
          address: selectedProperty,
          address_line: selectedProperty,
          service_type: 'holiday',
          program_name: programName,
          scheduled_date: scheduledDate,
          booking_date: scheduledDate ? new Date(scheduledDate).toISOString() : null,
          scheduled_time: scheduledTime,
          total_amount: 0,
          assigned_staff: assignedStaff,
          status: 'confirmed',
          details: JSON.stringify(holidayDetails),
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
      <div className="bg-white rounded-[24px] max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90dvh] overflow-y-auto my-auto box-border">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#1E2B37]">Assign Holiday Task</h2>
            <p className="text-xs text-slate-500 font-normal">Assigning as <strong className="font-bold text-[#1E2B37]">{adminName}</strong></p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition text-base font-bold cursor-pointer">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div className="space-y-1 text-left w-full">
            <label className="text-xs font-semibold text-[#1E2B37]">Property Unit</label>
            <select value={selectedProperty} onChange={(e) => setSelectedProperty(e.target.value)} className="w-full px-3 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl text-xs font-normal text-[#1E2B37]">
              {HOLIDAY_PROPERTIES.map((prop) => (<option key={prop} value={prop}>{prop}</option>))}
            </select>
          </div>

          <div className="space-y-1 text-left w-full">
            <label className="text-xs font-semibold text-[#1E2B37]">Program</label>
            <select value={programName} onChange={(e) => setProgramName(e.target.value)} className="w-full px-3 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl text-xs font-normal text-[#1E2B37]">
              <option value="General cleaning">General cleaning</option>
              <option value="Turnover cleaning">Turnover cleaning</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 w-full">
            <div className="space-y-1 text-left">
              <label className="text-xs font-semibold text-[#1E2B37]">Scheduled Date</label>
              <input 
                type="date" 
                value={scheduledDate} 
                onChange={(e) => setScheduledDate(e.target.value)} 
                required 
                className="w-full px-3 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl text-xs font-normal text-[#1E2B37]" 
              />
            </div>
            <div className="space-y-1 text-left">
              <label className="text-xs font-semibold text-[#1E2B37]">Working Time</label>
              <select value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="w-full px-3 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl text-xs font-bold text-[#1E2B37]">
                {HOLIDAY_TIME_SLOTS.map((time) => (<option key={time} value={time}>{formatTimeAMPM(time)}</option>))}
              </select>
            </div>
          </div>

          <div className="space-y-1 text-left w-full">
            <label className="text-xs font-semibold text-[#1E2B37]">Assign Staff</label>
            <select value={assignedStaff} onChange={(e) => setAssignedStaff(e.target.value)} className="w-full px-3 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl text-xs font-normal text-[#1E2B37]">
              {STAFF_LIST.map((staff) => (<option key={staff.id} value={staff.name}>{staff.name}</option>))}
            </select>
          </div>

          <div className="flex flex-col sm:flex-row-reverse items-center gap-2 pt-2 sm:pt-3 border-t border-slate-100">
            <button type="submit" disabled={loading} className="w-full sm:w-2/3 py-2.5 bg-[#0F172A] text-white font-bold rounded-xl sm:rounded-2xl text-xs transition cursor-pointer">{loading ? 'Saving...' : 'Confirm Task Assignment'}</button>
            <button type="button" onClick={onClose} disabled={loading} className="w-full sm:w-1/3 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-xl sm:rounded-2xl text-xs transition cursor-pointer">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 4. Main Dashboard Content
// ----------------------------------------------------------------------
function AdminDashboardContent() {
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const router = useRouter();
  const [tasks, setTasks] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'history' | 'today' | 'upcoming' | 'feedback'>('today');
  const [adminUser, setAdminUser] = useState<string>('Sam');
  const [selectedStaffMap, setSelectedStaffMap] = useState<{ [key: string]: string }>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [showOverview, setShowOverview] = useState(true);

  const todayStr = getLocalToday();

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
      const { data } = await supabase.from('feedbacks').select('*').order('created_at', { ascending: false });
      if (data) setFeedbacks(data);
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

      if (bookingData && bookingData.length > 0) {
        const userIds = Array.from(
          new Set(
            bookingData
              .map((b) => b.customer_id || b.user_id)
              .filter(Boolean)
          )
        );

        let usersMap: Record<string, any> = {};
        let profilesMap: Record<string, any> = {};

        if (userIds.length > 0) {
          const { data: usersData } = await supabase
            .from('users')
            .select('*')
            .in('ids', userIds);

          if (usersData) {
            usersData.forEach((u) => { usersMap[u.id] = u; });
          }

          const { data: profilesData } = await supabase
            .from('profiles')
            .select('*')
            .in('id', userIds);

          if (profilesData) {
            profilesData.forEach((p) => { profilesMap[p.id] = p; });
          }
        }

        const enrichedBookings = bookingData.map((b) => {
          const targetId = b.customer_id || b.user_id;
          const userObj = targetId ? usersMap[targetId] : null;
          const profileObj = targetId ? profilesMap[targetId] : null;

          return {
            ...b,
            users: userObj || profileObj,
            profiles: profileObj || userObj,
          };
        });

        setTasks(enrichedBookings);
      } else {
        setTasks([]);
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => loadBookings())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feedbacks' }, () => loadFeedbacks())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadBookings, loadFeedbacks]);

  const handleSelectStaffLocal = (id: any, staffName: string) => {
    setSelectedStaffMap((prev) => ({ ...prev, [id]: staffName }));
  };

  const handleAcknowledgeQuote = async (task: any) => {
    const targetId = task.id || task.booking_id;
    if (!targetId) return alert('Booking ID not found.');

    if (loadingId === targetId) return;
    setLoadingId(targetId);

    try {
      let currentDetails: Record<string, any> = {};
      if (typeof task.details === 'string') {
        try { currentDetails = JSON.parse(task.details); } catch (e) {}
      } else if (typeof task.details === 'object' && task.details !== null) {
        currentDetails = task.details;
      }

      const updatedDetails = {
        ...currentDetails,
        quote_acknowledged: true,
        payment_status: 'Quotation in Progress'
      };

      if (task.id) {
        await supabase.from('bookings').update({ details: JSON.stringify(updatedDetails) }).eq('id', task.id);
      } else if (task.booking_ref) {
        await supabase.from('bookings').update({ details: JSON.stringify(updatedDetails) }).eq('booking_ref', task.booking_ref);
      }

      const customerEmail = extractCustomerEmail(task);
      if (customerEmail) {
        try {
          await fetch('/api/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'acknowledge_quote',
              userId: task.customer_id || task.user_id,
              email: customerEmail,
              customerName: extractCustomerName(task),
              phone: extractPhoneNumber(task),
              bookingRef: formatRefCode(task),
              room: task.address || task.address_line || currentDetails.property || currentDetails.address || '-',
              program: task.program_name || currentDetails.program_name || extractProgramName(task),
              date: task.scheduled_date || currentDetails.scheduled_date,
              time: task.scheduled_time || currentDetails.scheduled_time,
            }),
          });
        } catch (mailErr) {
          console.error('Failed to notify acknowledge quote:', mailErr);
        }
      }

      setTasks((prevTasks) =>
        prevTasks.map((t) =>
          (t.id === targetId || t.booking_id === targetId || t.booking_ref === task.booking_ref)
            ? { ...t, details: updatedDetails } 
            : t
        )
      );
      alert('Acknowledged! Customer notified via email that request is under review.');
    } catch (err: any) {
      alert('Failed: ' + err.message);
    } finally {
      setLoadingId(null);
    }
  };

  const handleSetPriceAndQuote = async (task: any) => {
    const inputPrice = prompt('Enter evaluated price for this job (€):', '80');
    if (!inputPrice || isNaN(Number(inputPrice))) return;

    const numericPrice = parseFloat(inputPrice);
    const targetId = task.id || task.booking_id;
    if (!targetId) return;

    if (loadingId === targetId) return;
    setLoadingId(targetId);

    try {
      let currentDetails: Record<string, any> = {};
      if (typeof task.details === 'string') {
        try { currentDetails = JSON.parse(task.details); } catch (e) {}
      } else if (typeof task.details === 'object' && task.details !== null) {
        currentDetails = task.details;
      }

      const updatedDetails = {
        ...currentDetails,
        quote_sent: true,
        payment_status: 'Quotation Sent (Pending Payment)'
      };

      if (task.id) {
        await supabase.from('bookings').update({
          total_amount: numericPrice,
          details: JSON.stringify(updatedDetails)
        }).eq('id', task.id);
      } else if (task.booking_ref) {
        await supabase.from('bookings').update({
          total_amount: numericPrice,
          details: JSON.stringify(updatedDetails)
        }).eq('booking_ref', task.booking_ref);
      }

      const customerEmail = extractCustomerEmail(task);
      if (customerEmail) {
        try {
          await fetch('/api/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'send_quote',
              userId: task.customer_id || task.user_id,
              email: customerEmail,
              customerName: extractCustomerName(task),
              phone: extractPhoneNumber(task),
              bookingRef: formatRefCode(task),
              room: task.address || task.address_line || currentDetails.property || currentDetails.address || '-',
              program: task.program_name || currentDetails.program_name || extractProgramName(task),
              date: task.scheduled_date || currentDetails.scheduled_date,
              time: task.scheduled_time || currentDetails.scheduled_time,
              amount: numericPrice,
            }),
          });
        } catch (mailErr) {
          console.error('Failed to send quote:', mailErr);
        }
      }

      setTasks((prevTasks) =>
        prevTasks.map((t) =>
          (t.id === targetId || t.booking_id === targetId || t.booking_ref === task.booking_ref)
            ? { ...t, total_amount: numericPrice, details: updatedDetails } 
            : t
        )
      );
      alert(`Quotation of €${numericPrice} saved and emailed to customer!`);
    } catch (err: any) {
      alert('Failed: ' + err.message);
    } finally {
      setLoadingId(null);
    }
  };

  const handleConfirmOrder = async (task: any) => {
    const targetId = task.id || task.booking_id;
    if (!targetId) return alert('Error: Booking ID not found.');

    if (loadingId === targetId) return;
    setLoadingId(targetId);

    try {
      let currentDetails: Record<string, any> = {};
      if (typeof task.details === 'string') {
        try { currentDetails = JSON.parse(task.details); } catch (e) {}
      } else if (typeof task.details === 'object' && task.details !== null) {
        currentDetails = task.details;
      }

      const updatedDetails = {
        ...currentDetails,
        order_confirmed: true,
        payment_status: 'Order Confirmed (Pending Cash)'
      };

      let isSuccess = false;

      if (task.id) {
        const { error } = await supabase
          .from('bookings')
          .update({ details: JSON.stringify(updatedDetails) })
          .eq('id', task.id);
        if (!error) isSuccess = true;
      }

      if (!isSuccess && task.booking_ref) {
        const { error } = await supabase
          .from('bookings')
          .update({ details: JSON.stringify(updatedDetails) })
          .eq('booking_ref', task.booking_ref);
        if (!error) isSuccess = true;
      }

      if (!isSuccess) throw new Error('Could not update order status in Supabase.');

      const customerEmail = extractCustomerEmail(task);
      if (customerEmail) {
        try {
          const notifyRes = await fetch('/api/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'confirm_order',
              userId: task.customer_id || task.user_id,
              email: customerEmail,
              customerName: extractCustomerName(task),
              phone: extractPhoneNumber(task),
              bookingRef: formatRefCode(task),
              room: task.address || task.address_line || currentDetails.property || currentDetails.address || '-',
              program: task.program_name || currentDetails.program_name || extractProgramName(task),
              date: task.scheduled_date || currentDetails.scheduled_date,
              time: task.scheduled_time || currentDetails.scheduled_time,
              amount: task.total_amount || task.price || 0,
              paymentMethod: 'Cash on Service',
            }),
          });

          const notifyResult = await notifyRes.json();
          if (!notifyRes.ok || !notifyResult.success) {
            console.error('Email send failed:', notifyResult);
            alert(`Order confirmed, but email notice failed: ${notifyResult.error || 'Unknown error'}`);
          } else {
            alert('Booking order confirmed! Confirmation email sent to customer.');
          }
        } catch (mailErr) {
          console.error('Failed to call /api/notify:', mailErr);
        }
      }

      setTasks((prevTasks) =>
        prevTasks.map((t) =>
          (t.id === targetId || t.booking_id === targetId || t.booking_ref === task.booking_ref)
            ? { ...t, details: updatedDetails } 
            : t
        )
      );
    } catch (err: any) {
      alert('Failed: ' + err.message);
    } finally {
      setLoadingId(null);
    }
  };

  const handleConfirmPayment = async (task: any) => {
    const targetId = task.id || task.booking_id;
    if (!targetId) return alert('Error: Booking ID not found.');

    if (loadingId === targetId) return; 
    setLoadingId(targetId);

    try {
      let currentDetails: Record<string, any> = {};
      if (typeof task.details === 'string') {
        try { currentDetails = JSON.parse(task.details); } catch (e) {}
      } else if (typeof task.details === 'object' && task.details !== null) {
        currentDetails = task.details;
      }

      const updatedDetails = {
        ...currentDetails,
        payment_status: 'Paid / Verified'
      };

      let isSuccess = false;

      if (task.id) {
        const { error } = await supabase
          .from('bookings')
          .update({ status: 'confirmed', details: JSON.stringify(updatedDetails) })
          .eq('id', task.id);
        if (!error) isSuccess = true;
      }

      if (!isSuccess && task.booking_ref) {
        const { error } = await supabase
          .from('bookings')
          .update({ status: 'confirmed', details: JSON.stringify(updatedDetails) })
          .eq('booking_ref', task.booking_ref);
        if (!error) isSuccess = true;
      }

      if (!isSuccess) throw new Error('Could not update payment status in Supabase.');

      const customerEmail = extractCustomerEmail(task);

      if (customerEmail) {
        try {
          const notifyRes = await fetch('/api/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'confirm_payment',
              userId: task.customer_id || task.user_id,
              email: customerEmail,
              customerName: extractCustomerName(task),
              phone: extractPhoneNumber(task),
              bookingRef: formatRefCode(task),
              room: task.address || task.address_line || currentDetails.property || currentDetails.address || '-',
              program: task.program_name || currentDetails.program_name || extractProgramName(task),
              date: task.scheduled_date || currentDetails.scheduled_date,
              time: task.scheduled_time || currentDetails.scheduled_time,
              amount: task.total_amount || task.price || 0,
              paymentMethod: currentDetails.payment_method || (isCashPayment(task) ? 'Cash' : isCardPayment(task) ? 'Credit Card' : 'Bank Transfer'),
            }),
          });

          const notifyResult = await notifyRes.json();
          if (!notifyRes.ok || !notifyResult.success) {
            console.error('Email send failed:', notifyResult);
            alert(`Payment confirmed in database, but email failed: ${notifyResult.error || 'Unknown error'}`);
          } else {
            alert('Payment verified and official PDF receipt sent to customer!');
          }
        } catch (mailErr) {
          console.error('Failed to call /api/notify:', mailErr);
          alert('Payment confirmed, but could not connect to mail service.');
        }
      } else {
        alert('Payment confirmed, but no customer email found for this booking.');
      }

      setTasks((prevTasks) =>
        prevTasks.map((t) =>
          (t.id === targetId || t.booking_id === targetId || t.booking_ref === task.booking_ref)
            ? { ...t, status: 'confirmed', details: updatedDetails } 
            : t
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

    const targetId = task.id || task.booking_id;
    const targetRef = task.booking_ref || task.booking_code;

    if (!targetId && !targetRef) {
      return alert('Error: Booking ID not found.');
    }

    const processKey = targetId || targetRef;
    if (loadingId === processKey) return;
    setLoadingId(processKey);

    const finalAdmin = adminUser || 'Sam';

    let currentDetails: Record<string, any> = {};
    if (typeof task.details === 'string') {
      try { currentDetails = JSON.parse(task.details); } catch (e) {}
    } else if (typeof task.details === 'object' && task.details !== null) {
      currentDetails = task.details;
    }

    const updatedDetails = {
      ...currentDetails,
      assigned_staff: staffName,
      staff_name: staffName,
      assigned_by: finalAdmin,
      payment_status: currentDetails.payment_status || (isCashPayment(task) ? 'Pending Cash Payment' : 'Paid / Verified')
    };

    const updatePayload: any = {
      assigned_staff: staffName,
      status: 'confirmed',
      details: JSON.stringify(updatedDetails),

      address: task.address || currentDetails.address || currentDetails.address_line || task.address_line || null,
      address_line: task.address_line || task.address || currentDetails.address || currentDetails.address_line || null,
      service_type: task.service_type || currentDetails.service_type || 'holiday',
      notes: currentDetails.notes || currentDetails.garden_other_details || currentDetails.special_request || task.notes || null,
      program_name: task.program_name || currentDetails.program_name || 'General cleaning',
    };

    const rawDate = task.scheduled_date || currentDetails.scheduled_date || currentDetails.booking_date;
    if (rawDate) {
      updatePayload.scheduled_date = rawDate;
      updatePayload.booking_date = new Date(rawDate).toISOString();
    }

    try {
      let isUpdated = false;

      if (task.id) {
        const { error, data } = await supabase
          .from('bookings')
          .update(updatePayload)
          .eq('id', task.id)
          .select();

        if (!error && data && data.length > 0) {
          isUpdated = true;
        }
      }

      if (!isUpdated && targetRef) {
        const { error, data } = await supabase
          .from('bookings')
          .update(updatePayload)
          .eq('booking_ref', targetRef)
          .select();

        if (!error && data && data.length > 0) {
          isUpdated = true;
        }
      }

      if (!isUpdated) {
        const primaryCol = task.id ? 'id' : 'booking_ref';
        const primaryVal = task.id ? task.id : targetRef;
        const { error: finalErr } = await supabase
          .from('bookings')
          .update(updatePayload)
          .eq(primaryCol, primaryVal);

        if (finalErr) throw finalErr;
      }

      setTasks((prevTasks) =>
        prevTasks.map((t) =>
          (t.id === targetId || t.booking_id === targetId || t.booking_ref === targetRef)
            ? { ...t, ...updatePayload, details: updatedDetails }
            : t
        )
      );

      alert(`Successfully assigned task to ${staffName}`);
    } catch (err: any) {
      console.error('Failed to assign:', err);
      alert('Failed to assign task: ' + err.message);
    } finally {
      setLoadingId(null);
    }
  };

  const handleDeleteTask = async (taskId: any) => {
    if (!taskId) return;
    if (!window.confirm('Are you sure you want to delete this booking?')) return;

    try {
      let isDeleted = false;

      const { error: err1 } = await supabase.from('bookings').delete().eq('id', taskId);
      if (!err1) isDeleted = true;

      if (!isDeleted) {
        const { error: err2 } = await supabase.from('bookings').delete().eq('booking_ref', taskId);
        if (!err2) isDeleted = true;
      }

      setTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId && task.booking_ref !== taskId));
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
    STAFF_LIST.forEach((s) => { map[s.name] = { count: 0, isBusy: false }; });

    tasks.forEach((t) => {
      const staffName = t.assigned_staff;
      const status = String(t.status || '').toLowerCase().trim();

      if (staffName && map[staffName]) {
        if (status === 'completed' || status === 'done') {
          map[staffName].count += 1;
        } else if (status === 'in_progress' || status === 'assigned') {
          map[staffName].isBusy = true;
        }
      }
    });

    return map;
  }, [tasks]);

  const todayTasks = useMemo(() => {
    return tasks.filter((t) => getCleanDate(t.scheduled_date) === todayStr);
  }, [tasks, todayStr]);

  const upcomingTasks = useMemo(() => {
    return tasks.filter((t) => getCleanDate(t.scheduled_date) > todayStr);
  }, [tasks, todayStr]);

  const historyTasks = useMemo(() => {
    return tasks.filter((t) => {
      const taskDate = getCleanDate(t.scheduled_date);
      const st = String(t.status || '').toLowerCase();
      return (taskDate < todayStr && taskDate !== '') || st === 'completed' || st === 'done';
    });
  }, [tasks, todayStr]);

  const renderGroupedTasks = (taskList: any[]) => {
    const grouped = groupBookingsByDate(taskList);
    const sortedDates = Object.keys(grouped).sort();

    if (sortedDates.length === 0) {
      return (
        <div className="border border-slate-200 rounded-2xl p-8 sm:p-12 text-center text-xs text-slate-400 bg-white font-normal shadow-xs">
          No tasks found.
        </div>
      );
    }

    return (
      <div className="space-y-4 sm:space-y-6">
        {sortedDates.map((dateKey) => (
          <div key={dateKey} className="space-y-2.5 sm:space-y-3">
            <div className="flex items-center gap-2 sm:gap-3 my-2">
              <div className="h-[1px] flex-1 bg-slate-200"></div>
              <div className="bg-slate-100 border border-slate-300 text-slate-700 font-bold px-3 py-0.5 sm:py-1 rounded-xl text-[11px] sm:text-xs shadow-2xs">
                 📅 {formatDateDisplay(dateKey)}
              </div>
              <div className="h-[1px] flex-1 bg-slate-200"></div>
            </div>

            {grouped[dateKey].map((task) => {
              const taskKey = task.id || task.booking_id || task.booking_ref;
              return (
                <TaskCard
                  key={taskKey}
                  task={task}
                  selectedStaff={selectedStaffMap[taskKey] || ''}
                  isLoading={loadingId === taskKey}
                  handleSelectStaffLocal={handleSelectStaffLocal}
                  handleAcknowledgeQuote={handleAcknowledgeQuote}
                  handleSetPriceAndQuote={handleSetPriceAndQuote}
                  handleConfirmOrder={handleConfirmOrder}
                  handleConfirmPayment={handleConfirmPayment}
                  handleDispatchTask={handleDispatchTask}
                  handleDeleteTask={handleDeleteTask}
                />
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen p-2.5 sm:p-4 md:p-6 font-sans bg-slate-50 text-slate-900">
      <div className="max-w-7xl mx-auto space-y-2.5 sm:space-y-4">
        
        {/* Section Header Tag (ซ่อนบนมือถือเพื่อประหยัดพื้นที่) */}
        <div className="hidden sm:block text-xs font-semibold pl-1 text-slate-400 uppercase tracking-wider">
          Admin Dashboard
        </div>

        {/* 1. Header Box (บนมือถือจัดเป็นคอมแพ็กต์ 1-2 แถว / บนคอมคงเดิม) */}
        <div className="rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs p-3 sm:p-5 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-xl font-bold tracking-tight text-slate-900">
                  Admin Dashboard
                </h1>
                <div className="sm:hidden flex items-center border border-slate-200 rounded-lg px-2 py-0.5 text-[10px] bg-slate-50 text-slate-600">
                  <select
                    value={adminUser}
                    onChange={(e) => handleAdminChange(e.target.value)}
                    className="bg-transparent focus:outline-none text-[10px] cursor-pointer font-bold text-slate-900"
                  >
                    {ADMIN_LIST.map((adm) => (<option key={adm} value={adm}>{adm}</option>))}
                  </select>
                </div>
              </div>
              <p className="hidden sm:block text-xs font-normal text-slate-500 mt-0.5">
                Task Management & Dispatch System (Realtime)
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(true)}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 px-3 py-1.5 sm:px-4 sm:py-2 bg-[#006AFF] hover:bg-blue-700 text-white font-bold rounded-lg sm:rounded-xl text-xs sm:text-sm cursor-pointer transition shadow-xs"
              >
                <span className="text-sm sm:text-base font-black leading-none">+</span>
                Assign Holiday Task
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="font-bold text-[11px] sm:text-xs px-2.5 sm:px-3.5 py-1.5 rounded-lg sm:rounded-xl text-white bg-rose-600 hover:bg-rose-700 cursor-pointer transition shadow-xs shrink-0"
              >
                Logout
              </button>
            </div>
          </div>

          <div className="hidden sm:flex flex-wrap items-center gap-2 sm:gap-3 pt-2 border-t border-slate-100 mt-3">
            <div className="flex items-center border border-slate-200 rounded-xl px-2.5 py-1 text-xs bg-slate-50 text-slate-600">
              <span className="font-normal">Admin:</span>
              <select
                value={adminUser}
                onChange={(e) => handleAdminChange(e.target.value)}
                className="bg-transparent focus:outline-none ml-1 text-xs cursor-pointer font-bold text-slate-900"
              >
                {ADMIN_LIST.map((adm) => (<option key={adm} value={adm}>{adm}</option>))}
              </select>
            </div>
          </div>
        </div>

        {/* 2. SYSTEM OVERVIEW (ย่อส่วนล่างบนมือถือพร้อมปุ่ม Toggle พับเก็บ) */}
        <div className="rounded-xl border border-slate-200 shadow-xs p-2 sm:p-3 bg-white">
          <div className="flex justify-between items-center pb-1">
            <h2 className="text-[10px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <span>STAFF OVERVIEW</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </h2>
            <button
              type="button"
              onClick={() => setShowOverview(!showOverview)}
              className="text-[10px] text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
            >
              {showOverview ? 'Hide ▲' : 'Show ▼'}
            </button>
          </div>

          {showOverview && (
            <>
              {/* แถบสรุปบนมือถือ 5 ช่องเรียงกะทัดรัด (Mobile Compact Grid) */}
              <div className="grid grid-cols-5 gap-1 sm:hidden pt-1 text-center">
                {STAFF_LIST.map((staff) => {
                  const staffData = staffStatusMap[staff.name] || { count: 0, isBusy: false };
                  return (
                    <div 
                      key={staff.id} 
                      className="border border-slate-200 rounded-lg py-1 px-0.5 bg-slate-50 space-y-0.5"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-bold text-[10px] text-slate-900 truncate">{staff.id}</span>
                        <span className={`w-1.5 h-1.5 rounded-full inline-block ${staffData.isBusy ? 'bg-amber-400 animate-pulse' : 'bg-emerald-600'}`} />
                      </div>
                      <div className="text-[9px] text-slate-500 leading-none">
                        Done: <strong className="text-slate-900 font-bold">{staffData.count}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* การ์ดเต็มรูปแบบบน Desktop */}
              <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-5 gap-1.5 sm:gap-2 pt-1.5">
                {STAFF_LIST.map((staff) => {
                  const staffData = staffStatusMap[staff.name] || { count: 0, isBusy: false };
                  return (
                    <div 
                      key={staff.id} 
                      className="border border-slate-200 rounded-lg p-2 space-y-1 bg-slate-50"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {staff.name}
                        </span>
                        <span className={`w-2 h-2 rounded-full inline-block ${staffData.isBusy ? 'bg-amber-400 animate-pulse' : 'bg-emerald-600'}`} />
                      </div>

                      <div className="border-t border-slate-200 pt-1 flex justify-between items-center text-[10px]">
                        <span className={`font-semibold ${staffData.isBusy ? 'text-amber-600' : 'text-emerald-700'}`}>
                          {staffData.isBusy ? 'In Progress' : 'Available'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-slate-500">
                        <span className="font-normal">Done :</span>
                        <span className="font-bold text-slate-900">{staffData.count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* 3. Navigation Tabs (ขยับขึ้นมาเด่นด้านบนทันที) */}
        <div className="rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs p-1.5 sm:p-3 bg-white">
          <div className="grid grid-cols-4 gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab('history')}
              className={`py-1.5 px-0.5 sm:px-2 rounded-lg sm:rounded-xl border text-[11px] sm:text-xs text-center transition cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-blue-50 border-blue-300 text-[#006AFF] font-bold'
                  : 'bg-white border-slate-200 text-slate-700 font-medium hover:bg-slate-50'
              }`}
            >
              History ({historyTasks.length})
            </button>

            <button
              onClick={() => setActiveTab('today')}
              className={`py-1.5 px-0.5 sm:px-2 rounded-lg sm:rounded-xl border text-[11px] sm:text-xs text-center transition cursor-pointer ${
                activeTab === 'today'
                  ? 'bg-blue-50 border-blue-300 text-[#006AFF] font-bold'
                  : 'bg-white border-slate-200 text-slate-700 font-medium hover:bg-slate-50'
              }`}
            >
              Today ({todayTasks.length})
            </button>

            <button
              onClick={() => setActiveTab('upcoming')}
              className={`py-1.5 px-0.5 sm:px-2 rounded-lg sm:rounded-xl border text-[11px] sm:text-xs text-center transition cursor-pointer ${
                activeTab === 'upcoming'
                  ? 'bg-blue-50 border-blue-300 text-[#006AFF] font-bold'
                  : 'bg-white border-slate-200 text-slate-700 font-medium hover:bg-slate-50'
              }`}
            >
              Upcoming ({upcomingTasks.length})
            </button>

            <button
              onClick={() => setActiveTab('feedback')}
              className={`py-1.5 px-0.5 sm:px-2 rounded-lg sm:rounded-xl border text-[11px] sm:text-xs text-center transition cursor-pointer ${
                activeTab === 'feedback'
                  ? 'bg-blue-50 border-blue-300 text-[#006AFF] font-bold'
                  : 'bg-white border-slate-200 text-slate-700 font-medium hover:bg-slate-50'
              }`}
            >
              Feedback ({feedbacks.length})
            </button>
          </div>
        </div>

        {/* 4. Tab Content Area */}
        <div className="space-y-3 sm:space-y-4">
          {activeTab === 'history' && renderGroupedTasks(historyTasks)}
          {activeTab === 'today' && renderGroupedTasks(todayTasks)}
          {activeTab === 'upcoming' && renderGroupedTasks(upcomingTasks)}
          {activeTab === 'feedback' && (
            <div className="space-y-3 sm:space-y-4">
              <AdminReviewAnalytics feedbacks={feedbacks} />
              {feedbacks.map((fb) => (
                <FeedbackCard key={fb.id} feedback={fb} isLoading={loadingId === fb.id} onReply={handleReplyFeedback} />
              ))}
            </div>
          )}
        </div>

      </div>

      <AssignHolidayTaskModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        onSuccess={loadBookings}
        adminName={adminUser}
      />
    </div>
  );
}

export default function DashboardClient() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-slate-400">Loading Admin Dashboard...</div>}>
      <AdminDashboardContent />
    </Suspense>
  );
}