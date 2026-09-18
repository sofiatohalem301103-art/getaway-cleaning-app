'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

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

// ----------------------------------------------------------------------
// 2. Helper Functions
// ----------------------------------------------------------------------
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

function getValidSlipUrl(task: any): string | null {
  if (!task) return null;
  const rawUrl =
    task.payment_slip ||
    task.slip_url ||
    task.slipUrl ||
    task.payment_slip_url ||
    task.slip_image ||
    task.receipt_url ||
    task.slip;

  if (!rawUrl || typeof rawUrl !== 'string') return null;
  return rawUrl.trim();
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
    method.includes('stripe') ||
    (method.includes('promptpay') === false && task.is_card === true)
  );
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

const getLocalDateString = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getCleanDate = (dateVal: any): string => {
  if (!dateVal) return '';
  return String(dateVal).split('T')[0];
};

const extractPhoneNumber = (task: any): string => {
  if (!task) return '';
  const phone =
    task.customer_phone ||
    task.phone ||
    task.phone_number ||
    task.mobile ||
    task.bookings?.customer_phone ||
    task.bookings?.phone ||
    task.users?.phone ||
    task.users?.phone_number ||
    task.profiles?.phone ||
    task.profiles?.mobile;

  return phone ? String(phone) : '';
};

const extractCustomerName = (task: any): string => {
  if (!task) return 'Guest Customer';
  const rawName =
    task.customer_name ||
    task.name ||
    task.full_name ||
    task.bookings?.customer_name ||
    task.bookings?.name ||
    task.bookings?.full_name ||
    task.bookings?.guest_name ||
    task.profiles?.full_name ||
    task.profiles?.name ||
    '';

  return rawName && rawName !== 'Guest' ? rawName : 'Sofia';
};

const extractCustomerEmail = (task: any): string => {
  if (!task) return '';
  return (
    task.customer_email ||
    task.email ||
    task.bookings?.customer_email ||
    task.bookings?.email ||
    task.user_email ||
    task.profiles?.email ||
    ''
  );
};

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
  const displayCustomerName = extractCustomerName(feedback);

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
    <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs space-y-3 text-xs text-slate-800">
      <div className="flex justify-between items-center border-b pb-2 border-slate-100">
        <span className="font-bold text-slate-900 text-sm">
          Customer Name : {displayCustomerName}
        </span>

        <div className="flex items-center gap-1 text-amber-500 font-bold">
          {'★'.repeat(feedback.rating || feedback.rating_score || 5)}
          <span className="text-slate-400 text-[10px]">
            ({feedback.rating || feedback.rating_score || 5}/5)
          </span>
        </div>
      </div>

      {/* 🟢 กรอบข้อความลูกค้า + ข้อความตอบกลับจากแอดมิน */}
      <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-100 space-y-2">
        {/* ข้อความลูกค้า */}
        <p className="text-slate-700 text-xs sm:text-sm italic">
          "{feedback.comment || 'No comment provided.'}"
        </p>

        {/* ข้อความที่แอดมินตอบกลับ (ถ้ามี) */}
        {hasReplied && (
          <div className="pt-2 border-t border-slate-200 text-xs text-sky-800">
            <span className="font-bold text-sky-900">Admin Reply: </span>
            <span>{feedback.admin_reply || replyText}</span>
          </div>
        )}
      </div>

      {/* ช่องสำหรับกรอก/แก้ไขคำตอบ */}
      <div className="pt-2 border-t border-slate-100 space-y-2">
        <label className="font-bold text-slate-800 block">
          {hasReplied ? 'Edit Admin Reply:' : 'Admin Reply:'}
        </label>
        <textarea
          rows={2}
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          disabled={isLoading || isSubmitting}
          placeholder="Type your reply to customer..."
          className="w-full p-2 sm:p-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
        ></textarea>

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          {hasReplied ? (
            <span className="text-[10px] sm:text-xs text-emerald-600 font-semibold">
              ✓ Replied {feedback.replied_by ? `by ${feedback.replied_by}` : ''}
            </span>
          ) : (
            <span className="text-[10px] sm:text-xs text-slate-400">Not replied yet</span>
          )}

          <button
            type="button"
            onClick={handleSendReply}
            disabled={isLoading || isSubmitting}
            className={`w-full sm:w-auto px-4 py-1.5 rounded-lg font-bold text-xs transition active:scale-95 cursor-pointer ${
              hasReplied
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                : 'bg-sky-600 hover:bg-sky-700 text-white'
            }`}
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
  const activeStaffChoice = selectedStaff !== undefined ? selectedStaff : currentAssigned;
  const isPaid = task.payment_status === 'Paid / Verified' || task.status === 'Paid';

  const hasSelectedStaff = Boolean(activeStaffChoice);
  const isChangedStaff = activeStaffChoice !== currentAssigned;

  const displayCustomerName = extractCustomerName(task);
  const displayEmail = extractCustomerEmail(task);
  const displayPhone = extractPhoneNumber(task);
  const displayProgram = extractProgramName(task);

  const isCard =
    task.payment_method === 'card' ||
    task.payment_method === 'credit_card' ||
    task.paymentMethod === 'card' ||
    (typeof isCardPayment === 'function' && isCardPayment(task));

  return (
    <div
      className="p-3 sm:p-4 rounded-xl border shadow-xs space-y-3 text-xs"
      style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', color: '#1E1E1E' }}
    >
      <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: '#F1F5F9' }}>
        <span className="font-bold text-xs sm:text-sm" style={{ color: '#006AFF' }}>
          {formatRefCode(task)}
        </span>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="text-[10px] sm:text-xs" style={{ color: '#8E9B9E' }}>
            {getCleanDate(task.scheduled_date || task.booking_date)} | {task.scheduled_time || task.booking_time || '-'}
          </span>
          <button
            onClick={() => handleDeleteTask(task.id)}
            className="px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] transition cursor-pointer"
            style={{ color: '#D95353' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FFE8AE')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            Delete
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4">
        <div className="space-y-1 w-full sm:flex-1">
          <p className="font-bold text-xs sm:text-sm" style={{ color: '#2563EB' }}>
            {displayProgram}
          </p>

          <p style={{ color: '#1E2B37' }}>
            Customer: <span className="font-semibold">{displayCustomerName}</span>
          </p>

          <p className="text-[11px]" style={{ color: '#8E9B9E' }}>
            Email: <span className="font-medium" style={{ color: '#1E1E1E' }}>{displayEmail || 'N/A'}</span>
          </p>

          <p className="text-[11px]" style={{ color: '#8E9B9E' }}>
            Phone:{' '}
            {displayPhone ? (
              <a
                href={`tel:${displayPhone.replace(/\s+/g, '')}`}
                className="font-bold hover:underline"
                style={{ color: '#006AFF' }}
              >
                {formatPhoneNumberDisplay(displayPhone)}
              </a>
            ) : (
              <span className="font-medium" style={{ color: '#D95353' }}>N/A (No phone)</span>
            )}
          </p>

          <p style={{ color: '#1E2B37' }}>
            Address / Room: {task.address_line || task.address || task.location || '-'}
          </p>

          {(task.price || task.amount) && (
            <p className="font-bold pt-1 text-xs sm:text-sm" style={{ color: '#00CC00' }}>
              Amount: €{task.price || task.amount}
            </p>
          )}
        </div>

        <div className="flex sm:flex-col justify-between items-center sm:items-end w-full sm:w-auto gap-2 border-t sm:border-t-0 pt-2 sm:pt-0" style={{ borderColor: '#F1F5F9' }}>
          <div className="flex flex-col items-end gap-1.5">
            {isCard ? (
              <span
                className="font-bold px-2.5 py-1 rounded-md text-[10px] border flex items-center gap-1"
                style={{ backgroundColor: '#EAF3F9', color: '#2563EB', borderColor: '#93C5FD' }}
              >
                Paid via Credit Card
              </span>
            ) : (
              <span
                className="font-bold px-2.5 py-1 rounded-md text-[10px] border flex items-center gap-1"
                style={{ backgroundColor: '#EAF3F9', color: '#2563EB', borderColor: '#93C5FD' }}
              >
                Paid via Bank Transfer
              </span>
            )}
          </div>

          {isPaid ? (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded border"
              style={{ backgroundColor: '#CDF4D3', color: '#00CC00', borderColor: '#86D892' }}
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
                : { backgroundColor: '#006AFF', color: '#FFFFFF', borderColor: '#2563EB' }
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
              color: '#475569',
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
// 5. Main Dashboard Page Component
// ----------------------------------------------------------------------
export default function AdminDashboardPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'history' | 'feedback'>('today');

  const [adminUser, setAdminUser] = useState<string>('Sam');
  const [selectedStaffMap, setSelectedStaffMap] = useState<{ [key: string]: string }>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const todayStr = getLocalDateString();

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
      router.push('/login');
    }
  };

  const loadFeedbacks = useCallback(async () => {
  try {
    const { data, error } = await supabase
      .from('feedbacks')
      .select(`
        *,
        bookings (
          customer_name,
          name,
          full_name,
          guest_name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      const { data: rawData } = await supabase
        .from('feedbacks')
        .select('*')
        .order('created_at', { ascending: false });
      if (rawData) setFeedbacks(rawData);
    } else if (data) {
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
        .select(`
          *,
          users (
            id,
            phone,
            phone_number,
            full_name,
            email
          )
        `)
        .order('scheduled_date', { ascending: true });

      if (error) {
        const { data: fallbackData } = await supabase
          .from('bookings')
          .select('*')
          .order('scheduled_date', { ascending: true });
          
        if (fallbackData) setTasks(fallbackData);
        return;
      }

      if (bookingData) {
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

        const enrichedTasks = bookingData.map((task) => ({
          ...task,
          fetched_service_name: task.service_id ? servicesMap[task.service_id] : '',
        }));

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

    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          assigned_staff: staffName,
          assigned_by: adminUser,
          status: 'Assigned',
        })
        .eq('id', task.id);

      if (error) throw error;

      setTasks((prevTasks) =>
        prevTasks.map((t) =>
          t.id === task.id
            ? { ...t, assigned_staff: staffName, assigned_by: adminUser, status: 'Assigned' }
            : t
        )
      );
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
        // ตัด replied_by ออก
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
    <div className="min-h-screen bg-slate-50/50 text-slate-800 p-2 sm:p-4 md:p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-4">
        
        <div className="text-xs font-semibold text-slate-500 pl-1">
          Admin Dashboard
        </div>

        {/* 1. Header Box */}
        <div 
          className="rounded-2xl border shadow-sm p-4 sm:p-5 space-y-3"
          style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
        >
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

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1">
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
              className="font-bold text-xs px-3.5 py-1.5 rounded-xl transition active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-xs border"
              style={{
                backgroundColor: '#D95353',
                color: '#FFFFFF',
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

        {/* 2. Task Management & Dispatch System */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-3 space-y-2">
          <h2 className="text-[11px] sm:text-xs font-bold text-slate-700">
            Task Management & Dispatch System (Realtime)
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 sm:gap-2">
            {STAFF_LIST.map((staff) => {
              const staffData = staffStatusMap[staff.name] || { count: 0, isBusy: false };
              const isBusy = staffData.isBusy;

              return (
                <div
                  key={staff.id}
                  className="bg-slate-50/80 border border-slate-200/70 rounded-lg p-1.5 sm:p-2 space-y-1 transition-all hover:bg-white hover:border-slate-300"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[11px] sm:text-xs text-slate-800 truncate">
                      {staff.name}
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full inline-block flex-shrink-0 ${
                        isBusy
                          ? 'bg-amber-400 border border-amber-500 animate-pulse'
                          : 'bg-emerald-500 border border-emerald-600'
                      }`}
                    ></span>
                  </div>
                  
                  <p className={`text-[9px] sm:text-[10px] leading-none ${
                    isBusy ? 'text-amber-600 font-bold' : 'text-slate-400 font-normal'
                  }`}>
                    {isBusy ? 'In Progress' : 'Available'}
                  </p>
                  
                  <div className="border-t border-slate-200/50 pt-1 flex justify-between items-center text-[9px] sm:text-[10px] text-slate-500">
                    <span>Done :</span>
                    <span className="font-semibold text-slate-800">{staffData.count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Navigation Tabs */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-2.5 sm:p-3">
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
            <button
              onClick={() => setActiveTab('history')}
              className={`py-1.5 px-1 sm:px-2 rounded-xl border text-[11px] sm:text-xs text-center font-medium transition cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-sky-50 border-sky-300 font-bold text-sky-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              History ({historyTasks.length})
            </button>

            <button
              onClick={() => setActiveTab('today')}
              className={`py-1.5 px-1 sm:px-2 rounded-xl border text-[11px] sm:text-xs text-center font-medium transition cursor-pointer ${
                activeTab === 'today'
                  ? 'bg-sky-50 border-sky-300 font-bold text-sky-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Today ({todayTasks.length})
            </button>

            <button
              onClick={() => setActiveTab('upcoming')}
              className={`py-1.5 px-1 sm:px-2 rounded-xl border text-[11px] sm:text-xs text-center font-medium transition cursor-pointer ${
                activeTab === 'upcoming'
                  ? 'bg-sky-50 border-sky-300 font-bold text-sky-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Upcoming ({upcomingTasks.length})
            </button>

            <button
              onClick={() => setActiveTab('feedback')}
              className={`py-1.5 px-1 sm:px-2 rounded-xl border text-[11px] sm:text-xs text-center font-medium transition cursor-pointer ${
                activeTab === 'feedback'
                  ? 'bg-amber-50 border-amber-300 font-bold text-amber-800'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
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
              <div className="bg-white border border-slate-200 rounded-2xl p-12 sm:p-16 text-center text-xs sm:text-sm text-slate-500 font-medium shadow-sm">
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
                    <div className="flex justify-center border-b border-slate-200/80 pb-1.5 my-1.5">
                      <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
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
              <div className="bg-white border border-slate-200 rounded-2xl p-12 sm:p-16 text-center text-xs sm:text-sm text-slate-500 font-medium shadow-sm">
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
                    <div className="flex justify-center border-b border-slate-200/80 pb-1.5 my-1.5">
                      <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
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
              <div className="bg-white border border-slate-200 rounded-2xl p-12 sm:p-16 text-center text-xs sm:text-sm text-slate-500 font-medium shadow-sm">
                No history tasks found.
              </div>
            )
          )}

          {/* Feedback Tab */}
          {activeTab === 'feedback' && (
            feedbacks.length > 0 ? (
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
              <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-12 sm:p-16 text-center text-xs sm:text-sm text-slate-600 font-medium shadow-sm">
                No customer feedbacks available yet.
              </div>
            )
          )}
        </div>

      </div>
    </div>
  );
}