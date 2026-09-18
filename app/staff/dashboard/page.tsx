'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface StaffUser {
  id: string;
  name: string;
}

interface FeedbackItem {
  id: string | number;
  booking_id: string | number;
  booking_ref?: string;
  customer_name?: string;
  name?: string;
  full_name?: string;
  customerName?: string;
  customer_email?: string;
  customer_phone?: string;
  email?: string;
  rating?: number;
  rating_score?: number;
  comment?: string;
  is_read?: boolean;
  is_read_by_user?: boolean;
  admin_reply?: string;
  replied_by?: string;
  replied_at?: string;
  created_at: string;
  resolved_customer_name?: string;
  bookings?: any;
}

export default function StaffDashboardPage() {
  const router = useRouter();
  const [currentStaff, setCurrentStaff] = useState<StaffUser | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // States สำหรับ Feedback
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  // โหลดข้อมูลงาน
  const loadStaffTasks = useCallback(async (staffId: string, staffName: string) => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*');

      if (error) {
        console.error('Error fetching bookings from Supabase:', error);
        throw error;
      }

      if (data) {
        const cleanStr = (val: any) => String(val || '').replace(/\s+/g, '').toLowerCase();

        const targetId = cleanStr(staffId);
        const targetName = cleanStr(staffName);

        const myTasks = data.filter((item: any) => {
          const valCleanerId = cleanStr(item.cleaner_id || item.staff_id || item.assigned_to);
          const valCleanerName = cleanStr(item.cleaner_name || item.staff_name || item.assigned_staff);

          const isIdMatch = Boolean(valCleanerId) && (valCleanerId === targetId || valCleanerId === targetName);
          const isNameMatch = Boolean(valCleanerName) && (valCleanerName === targetName || valCleanerName === targetId);

          return isIdMatch || isNameMatch;
        });

        setTasks(myTasks);
      } else {
        setTasks([]);
      }
    } catch (error: any) {
      console.error('Error loading tasks:', error.message);
    }
  }, []);

  // ฟังก์ชันดึงข้อมูล Feedbacks
  const loadFeedbacks = useCallback(async () => {
    try {
      const { data: feedbackData, error: fbError } = await supabase
        .from('feedbacks')
        .select('*, bookings(*)');

      let rawFeedbacks = feedbackData;

      if (fbError) {
        const { data: fallbackFb } = await supabase.from('feedbacks').select('*');
        rawFeedbacks = fallbackFb;
      }

      if (rawFeedbacks && rawFeedbacks.length > 0) {
        let customerNameMap: Record<string, string> = {};

        const { data: bookingData } = await supabase.from('bookings').select('*');

        if (bookingData) {
          bookingData.forEach((b: any) => {
            const name =
              b.customer_name ||
              b.name ||
              b.full_name ||
              b.user_name ||
              b.client_name ||
              b.contact_name ||
              b.guest_name;

            if (name && String(name).trim() !== '') {
              const strName = String(name).trim();
              if (b.id) customerNameMap[String(b.id)] = strName;
              if (b.booking_code) customerNameMap[String(b.booking_code)] = strName;
              if (b.booking_ref) customerNameMap[String(b.booking_ref)] = strName;
              if (b.email) customerNameMap[String(b.email).toLowerCase()] = strName;
              if (b.customer_email) customerNameMap[String(b.customer_email).toLowerCase()] = strName;
              if (b.user_id) customerNameMap[String(b.user_id)] = strName;
            }
          });
        }

        const { data: profileData } = await supabase.from('profiles').select('*');

        if (profileData) {
          profileData.forEach((p: any) => {
            const name = p.full_name || p.name || p.display_name || p.username;
            if (name && String(name).trim() !== '') {
              const strName = String(name).trim();
              if (p.id) customerNameMap[String(p.id)] = strName;
              if (p.user_id) customerNameMap[String(p.user_id)] = strName;
              if (p.email) customerNameMap[String(p.email).toLowerCase()] = strName;
            }
          });
        }

        const enrichedFeedbacks: FeedbackItem[] = rawFeedbacks.map((item: any) => {
          const directName =
            item.customer_name ||
            item.name ||
            item.full_name ||
            item.customerName ||
            item.user_name;

          const joinedBookingName =
            item.bookings?.customer_name ||
            item.bookings?.name ||
            item.bookings?.full_name ||
            item.bookings?.user_name;

          const nameFromBookingId = item.booking_id ? customerNameMap[String(item.booking_id)] : null;
          const nameFromBookingRef = item.booking_ref ? customerNameMap[String(item.booking_ref)] : null;
          const nameFromUserId = item.user_id ? customerNameMap[String(item.user_id)] : null;
          
          const emailKey = (item.customer_email || item.email || item.bookings?.email || '').toLowerCase();
          const nameFromEmail = emailKey ? customerNameMap[emailKey] : null;

          const finalName =
            directName ||
            joinedBookingName ||
            nameFromBookingId ||
            nameFromBookingRef ||
            nameFromUserId ||
            nameFromEmail;

          const resolvedName = (finalName && String(finalName).trim() !== '' && finalName !== 'Guest')
            ? String(finalName).trim()
            : 'Sofia';

          return {
            ...item,
            resolved_customer_name: resolvedName,
          };
        });

        enrichedFeedbacks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        setFeedbacks(enrichedFeedbacks);
        
        // รองรับทั้งคอลัมน์ is_read_by_user และ is_read
        const unread = enrichedFeedbacks.filter((item) => {
          if (item.is_read_by_user !== undefined) return !item.is_read_by_user;
          return !item.is_read;
        }).length;

        setUnreadCount(unread);
      } else {
        setFeedbacks([]);
        setUnreadCount(0);
      }
    } catch (err: any) {
      console.error('Error loading feedbacks:', err.message);
    }
  }, []);

  useEffect(() => {
    const savedStaff = localStorage.getItem('currentStaff');
    if (!savedStaff) {
      router.push('/staff/login');
      return;
    }

    const staffObj: StaffUser = JSON.parse(savedStaff);
    setCurrentStaff(staffObj);

    loadStaffTasks(staffObj.id, staffObj.name);
    loadFeedbacks();

    const bookingChannel = supabase
      .channel(`staff-feed-${staffObj.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => {
          loadStaffTasks(staffObj.id, staffObj.name);
        }
      )
      .subscribe();

    const feedbackChannel = supabase
      .channel('staff-feedback-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'feedbacks' },
        () => {
          loadFeedbacks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(bookingChannel);
      supabase.removeChannel(feedbackChannel);
    };
  }, [router, loadStaffTasks, loadFeedbacks]);

  // ฟังก์ชันเปิด/ปิด Feedback Accordion
  const toggleFeedbackAccordion = async () => {
    const nextState = !isFeedbackOpen;
    setIsFeedbackOpen(nextState);

    if (nextState && unreadCount > 0) {
      setUnreadCount(0);

      try {
        // อัปเดตสถานะอ่านแล้วรองรับทั้งสองฟีลด์
        await supabase
          .from('feedbacks')
          .update({ is_read_by_user: true, is_read: true })
          .or('is_read_by_user.eq.false,is_read.eq.false');

        setFeedbacks((prev) =>
          prev.map((item) => ({ ...item, is_read_by_user: true, is_read: true }))
        );
      } catch (err: any) {
        console.error('Error updating read status:', err.message);
      }
    }
  };

  // อัปเดตสถานะงาน
  const handleUpdateStatus = async (taskId: string, nextStatus: string) => {
    if (
      nextStatus === 'Completed' &&
      !window.confirm('Are you sure you want to mark this task as Completed?')
    ) {
      return;
    }

    setLoadingId(taskId);
    try {
      let dbStatus = nextStatus;
      if (nextStatus === 'In Progress') dbStatus = 'in_progress';
      if (nextStatus === 'Completed') dbStatus = 'completed';

      const { error } = await supabase
        .from('bookings')
        .update({ status: dbStatus })
        .eq('id', taskId);

      if (error) throw error;

      if (currentStaff) {
        await loadStaffTasks(currentStaff.id, currentStaff.name);
      }
    } catch (err: any) {
      alert('Error updating status: ' + err.message);
    } finally {
      setLoadingId(null);
    }
  };

  // ฟังก์ชัน Logout
  const handleLogout = () => {
    localStorage.removeItem('currentStaff');
    router.push('/staff/login');
  };

  if (!currentStaff) {
    return null;
  }

  const activeTasks = tasks.filter((t) => t.status !== 'Completed' && t.status !== 'completed');
  const completedTasks = tasks.filter((t) => t.status === 'Completed' || t.status === 'completed');

  // จัดกลุ่มงานที่เสร็จแล้วแยกตามวันที่
  const groupedCompletedTasks: Record<string, any[]> = completedTasks.reduce((acc, task) => {
    const dateKey = task.scheduled_date || task.booking_date || task.date || task.service_date || 'Unscheduled';
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(task);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <main className="min-h-screen bg-[#FFFFFF] flex justify-center p-4 sm:p-8 text-[#1E1E1E] font-sans">
      <div className="w-full max-w-md bg-[#FFFFFF] border-2 border-[#8E9B9E] rounded-2xl p-4 sm:p-5 flex flex-col space-y-4 shadow-sm">
        
        {/* Header: Staff Workstation */}
        <div className="w-full bg-[#FFFFFF] border-2 border-[#8E9B9E] rounded-xl p-4 flex flex-col space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-[#1E1E1E] tracking-tight">
                Staff Workstation
              </h1>
              <p className="text-[11px] text-[#1E1E1E]/70 font-medium mt-0.5">
                Task Management & History
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="bg-[#E87171] hover:bg-[#D95353] active:scale-95 border border-[#8E9B9E] text-[#FFFFFF] text-xs font-bold px-3.5 py-1 rounded-full transition duration-150 cursor-pointer shadow-xs select-none"
            >
              Logout
            </button>
          </div>

          <div className="self-start bg-[#EAF3F9] border border-[#93C5FD] text-[#1E2B37] text-xs font-semibold px-3 py-1 rounded-full">
            {currentStaff?.id} ({currentStaff?.name})
          </div>
        </div>

        {/* Section: Customer Feedbacks */}
        <div className="w-full bg-[#FFFFFF] border-2 border-[#8E9B9E] rounded-xl p-3">
          <button
            onClick={toggleFeedbackAccordion}
            className="w-full flex items-center justify-between p-1 cursor-pointer select-none"
          >
            <div className="flex items-center space-x-2.5">
              <span
                className="w-6 h-6 rounded-md bg-[#EAF3F9] border border-[#8E9B9E] text-[#1E1E1E] text-xs font-bold flex items-center justify-center transition-transform duration-200"
                style={{ transform: isFeedbackOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
              >
                &gt;
              </span>
              <span className="text-sm font-bold text-[#1E1E1E]">Customer Feedbacks</span>
            </div>

            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-black text-white bg-[#FF3B30] rounded-full animate-pulse">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
              <span className="bg-[#93C5FD]/40 border border-[#8E9B9E] text-[#1E2B37] text-xs font-bold px-2.5 py-0.5 rounded-full">
                {feedbacks.length}
              </span>
            </div>
          </button>

          {isFeedbackOpen && (
            <div className="mt-3 pt-3 border-t border-[#8E9B9E]/40 text-xs space-y-3 max-h-[350px] overflow-y-auto pr-0.5">
              {feedbacks.length === 0 ? (
                <div className="text-center py-3 text-[#1E1E1E]/50 font-medium">
                  No feedback received yet.
                </div>
              ) : (
                feedbacks.map((item) => {
                  const score = item.rating || item.rating_score || 0;
                  const isUnread = item.is_read_by_user !== undefined ? !item.is_read_by_user : !item.is_read;

                  const displayRef = item.booking_ref
                    ? item.booking_ref
                    : `REF-${String(item.booking_id).split('-')[0].toUpperCase()}`;

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-xl border flex flex-col space-y-2 transition-all duration-200 ${
                        isUnread
                          ? 'bg-white border-[#006AFF] ring-1 ring-[#006AFF]/20 shadow-xs'
                          : 'bg-[#F8FAFC] border-[#8E9B9E]/50'
                      }`}
                    >
                      <div className="flex justify-between items-center gap-2 border-b border-gray-100 pb-2">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <span className="font-extrabold text-[#006AFF] text-xs tracking-wide truncate">
                            {displayRef}
                          </span>
                          {isUnread && (
                            <span className="shrink-0 text-[9px] font-black text-white bg-[#FF3B30] px-1.5 py-0.5 rounded-full">
                              NEW
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 bg-[#FFF9E6] border border-[#FFE599] px-2 py-0.5 rounded-lg shrink-0">
                          <span className="text-amber-500 text-xs">★</span>
                          <span className="text-xs font-bold text-[#1E2B37]">{score}/5</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-[#8E9B9E] font-medium px-0.5">
                        <span className="font-bold text-[#1E1E1E] truncate max-w-[220px]">
                          Customer Name: {item.resolved_customer_name}
                        </span>
                        <span>{item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}</span>
                      </div>

                      <div className="bg-white p-2.5 rounded-lg border border-[#8E9B9E]/30">
                        <p className="text-xs font-semibold text-[#1E1E1E] leading-relaxed">
                          {item.comment && item.comment.trim() !== ''
                            ? `"${item.comment}"`
                            : 'No comment provided.'}
                        </p>
                      </div>

                      {item.admin_reply && (
                        <div className="bg-[#EAF3F9] p-2.5 rounded-lg border border-[#93C5FD]/60 space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-[#006AFF]">
                              Admin Reply:
                            </span>
                            {item.replied_at && (
                              <span className="text-[9px] text-[#8E9B9E]">
                                {new Date(item.replied_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-medium text-[#1E2B37]">
                            {item.admin_reply}
                          </p>
                        </div>
                      )}

                      <div className="flex justify-end items-center pt-1">
                        <span className="text-[10px] text-[#8E9B9E]">
                          {item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>

                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Section: Current Tasks */}
        <div className="w-full bg-[#FFFFFF] border-2 border-[#8E9B9E] rounded-xl p-4 flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#1E1E1E]">Current Tasks</h2>
            <span className="bg-[#CDF4D3] border border-[#86D892] text-[#1E2B37] text-xs font-bold px-3 py-0.5 rounded-full">
              {activeTasks.length} Active
            </span>
          </div>

          {activeTasks.length === 0 ? (
            <div className="w-full min-h-[140px] bg-[#EAF3F9]/40 border border-[#8E9B9E] rounded-xl p-6 flex items-center justify-center text-center">
              <p className="text-xs text-[#1E1E1E]/60 font-medium">
                No active tasks assigned to you.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeTasks.map((task) => {
                const isProcessing = loadingId === task.id;
                const isInProgress = task.status === 'In Progress' || task.status === 'in_progress';
                const taskDate = task.scheduled_date || task.booking_date || task.date || task.service_date || '';
                const taskTime = task.scheduled_time || task.booking_time || task.time || task.service_time || '';

                return (
                  <div
                    key={task.id}
                    className="w-full bg-[#EAF3F9]/60 border-2 border-[#93C5FD] rounded-xl p-3.5 flex flex-col space-y-2.5"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold bg-[#2563EB] text-white px-3 py-1 rounded-full shadow-xs">
                        {task.booking_code || task.booking_ref || `REF-${task.id}`}
                      </span>

                      <span
                        className={`text-xs font-bold px-3 py-0.5 rounded-full border shadow-xs ${
                          isInProgress
                            ? 'bg-[#006AFF] text-white border-[#8E9B9E]'
                            : 'bg-[#93C5FD] text-[#1E2B37] border border-[#8E9B9E]'
                        }`}
                      >
                        {isInProgress ? 'In Progress' : 'Assigned'}
                      </span>
                    </div>

                    <p className="text-sm font-bold text-[#1E1E1E] pt-1">
                      {task.room_type || task.address_line || task.address || 'Cleaning Service'}
                    </p>

                    {(task.customer_name || task.name) && (
                      <p className="text-xs text-[#1E1E1E]/80 font-semibold">
                        Customer: {task.customer_name || task.name}
                      </p>
                    )}

                    <p className="text-xs text-[#1E1E1E]/70 font-medium pb-1 border-b border-[#8E9B9E]/40">
                      Time: {taskDate} {taskTime ? `| ${taskTime}` : ''}
                    </p>

                    <div className="pt-1">
                      {!isInProgress ? (
                        <button
                          onClick={() => handleUpdateStatus(task.id, 'In Progress')}
                          disabled={isProcessing}
                          className="w-full bg-[#FFC943] hover:bg-[#f0ba35] active:scale-[0.98] border border-[#8E9B9E] text-[#1E1E1E] font-bold text-xs py-2 rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          {isProcessing ? 'Updating...' : 'Start Job'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateStatus(task.id, 'Completed')}
                          disabled={isProcessing}
                          className="w-full bg-[#00CC00] hover:bg-[#00b300] active:scale-[0.98] border border-[#8E9B9E] text-white font-bold text-xs py-2 rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          {isProcessing ? 'Updating...' : 'Complete Job'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section: Job History Accordion */}
        <div className="w-full bg-[#FFFFFF] border-2 border-[#8E9B9E] rounded-xl p-3">
          <button
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            className="w-full flex items-center justify-between p-1 cursor-pointer select-none"
          >
            <div className="flex items-center space-x-2.5">
              <span
                className="w-6 h-6 rounded-md bg-[#EAF3F9] border border-[#8E9B9E] text-[#1E1E1E] text-xs font-bold flex items-center justify-center transition-transform duration-200"
                style={{ transform: isHistoryOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
              >
                &gt;
              </span>
              <span className="text-sm font-bold text-[#1E1E1E]">Job History</span>
            </div>

            <span className="bg-[#93C5FD]/40 border border-[#8E9B9E] text-[#1E2B37] text-xs font-bold px-3 py-0.5 rounded-full">
              {completedTasks.length}
            </span>
          </button>

          {isHistoryOpen && (
            <div className="mt-3 pt-3 border-t border-[#8E9B9E]/40 text-xs space-y-4 max-h-[350px] overflow-y-auto pr-0.5">
              {completedTasks.length === 0 ? (
                <div className="text-center py-3 text-[#1E1E1E]/50 font-medium">
                  No completed jobs in your history.
                </div>
              ) : (
                Object.entries(groupedCompletedTasks).map(([date, items]: [string, any[]]) => (
                  <div key={date} className="space-y-1.5">
                    {/* ป้าย Badge ระบุวันที่ จัดวางไว้ตรงกลาง (justify-center) */}
                    <div className="flex justify-center pb-1">
                      <span className="bg-[#EAF3F9] text-[#1E2B37] border border-[#B8D7ED] text-[11px] font-medium px-2.5 py-0.5 rounded-md shadow-xs">
                        {date}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {items.map((task: any) => {
                        const rawTime = task.scheduled_time || task.booking_time || task.time || task.service_time || '09:00:00';
                        const formattedTime = rawTime.includes(':') && rawTime.split(':').length === 2 ? `${rawTime}:00` : rawTime;

                        return (
                          <div
                            key={task.id}
                            className="p-3 bg-[#F8FAFC] rounded-xl border border-[#8E9B9E]/60 flex justify-between items-center shadow-xs"
                          >
                            <div className="space-y-0.5">
                              <p className="font-bold text-[#1E1E1E] text-xs">
                                {task.booking_code || task.booking_ref || `REF-${task.id}`} - Completed
                              </p>
                              <p className="text-[11px] text-[#8E9B9E] font-normal">
                                {date} | {formattedTime}
                              </p>
                            </div>
                            <span className="text-[#00CC00] font-bold text-xs shrink-0 pl-2">Done</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}