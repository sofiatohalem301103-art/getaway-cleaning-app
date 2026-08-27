'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function StaffDashboardPage() {
  const router = useRouter();
  const [assignedTasks, setAssignedTasks] = useState<any[]>([]);
  const [currentStaff, setCurrentStaff] = useState<any>(null);

  // Collapsible state for Job History
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Audio Context Ref for playing alert sound automatically
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Load current staff from LocalStorage
  useEffect(() => {
    const savedStaff = localStorage.getItem('currentStaff');
    if (savedStaff) {
      try {
        const staffObj = JSON.parse(savedStaff);
        setCurrentStaff(staffObj);
      } catch (e) {
        router.push('/staff/login');
      }
    } else {
      router.push('/staff/login');
    }
  }, [router]);

  // Function to play alert sound automatically
  const playNotificationSound = () => {
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) audioCtxRef.current = new AudioContextClass();
      }

      const audioCtx = audioCtxRef.current;
      if (!audioCtx) return;

      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // 880Hz pitch
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.6);
    } catch (e) {
      console.error('Audio playback error:', e);
    }
  };

  // Load staff tasks assigned to current staff ID
  const loadStaffTasks = useCallback(async () => {
    if (!currentStaff?.id) return;

    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('assigned_staff', currentStaff.id)
      .order('id', { ascending: false });

    if (!error) {
      setAssignedTasks(data || []);
    }
  }, [currentStaff]);

  useEffect(() => {
    if (!currentStaff?.id) return;

    loadStaffTasks();

    const channel = supabase
      .channel(`staff-feed-${currentStaff.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `assigned_staff=eq.${currentStaff.id}`,
        },
        (payload: any) => {
          const isNewInsert = payload.eventType === 'INSERT';
          const isStatusUpdated =
            payload.eventType === 'UPDATE' &&
            payload.new?.status === 'Assigned' &&
            payload.old?.status !== 'Assigned';

          if (isNewInsert || isStatusUpdated) {
            playNotificationSound();

            alert(
              `🚨 NEW TASK ASSIGNED!\n\nRef: ${
                payload.new.booking_code || `REF-${payload.new.id}`
              }\nCustomer: ${payload.new.customer_name}\nTime: ${
                payload.new.booking_time || '-'
              }`
            );
          }
          loadStaffTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentStaff, loadStaffTasks]);

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem('currentStaff');
    router.push('/staff/login');
  };

  // Update Task Status (In Progress -> Completed)
  const handleUpdateStatus = async (
    task: any,
    newStatus: string,
    confirmMsg?: string
  ) => {
    if (confirmMsg) {
      const confirmAction = window.confirm(confirmMsg);
      if (!confirmAction) return;
    }

    const updatePayload: any = { status: newStatus };
    if (newStatus === 'Completed') {
      updatePayload.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('bookings')
      .update(updatePayload)
      .eq('id', task.id);

    if (error) {
      alert('Error updating status: ' + error.message);
    } else {
      if (newStatus === 'In Progress') {
        alert('Task accepted! You may now begin.');
      } else if (newStatus === 'Completed') {
        alert('Task completed successfully! Working time recorded.');
      }
      loadStaffTasks();
    }
  };

  // Render Status Badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'In Progress':
        return (
          <span className="font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md text-[11px] animate-pulse">
            🧹 In Progress
          </span>
        );
      case 'Completed':
        return (
          <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md text-[11px]">
            ✅ Completed
          </span>
        );
      case 'Assigned':
        return (
          <span className="font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md text-[11px]">
            📩 New Assigned
          </span>
        );
      default:
        return (
          <span className="font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md text-[11px]">
            ⏳ {status || 'Pending'}
          </span>
        );
    }
  };

  const activeTasks = assignedTasks.filter((t) => t.status !== 'Completed');
  const historyTasks = assignedTasks.filter((t) => t.status === 'Completed');

  const groupedHistory = historyTasks.reduce(
    (acc: { [key: string]: any[] }, task) => {
      const dateKey = task.booking_date || 'Unknown Date';
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(task);
      return acc;
    },
    {}
  );

  if (!currentStaff) return null;

  return (
    <main className="min-h-screen bg-slate-50 p-3 sm:p-6 text-slate-800 font-sans">
      <div className="max-w-4xl mx-auto space-y-4">
        
        {/* 1. Top Header Card */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-800">
              Staff Workstation
            </h1>
            <p className="text-xs text-slate-400">Task Management & History</p>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap">
            {/* Staff Badge */}
            <div className="bg-slate-100 border border-slate-200/80 px-2.5 py-1.5 rounded-xl text-xs flex items-center gap-1 font-bold text-slate-700">
              <span>👷‍♂️</span>
              <span>{currentStaff.id}</span>
              <span className="text-slate-400 text-[11px]">({currentStaff.name})</span>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>

        {/* 2. Current Active Tasks Section (ย้ายขึ้นมาอยู่บนสุด) */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-base">📌</span>
              <h2 className="text-sm font-bold text-slate-800">Current Tasks</h2>
            </div>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              {activeTasks.length} Active
            </span>
          </div>

          {activeTasks.length === 0 ? (
            <div className="bg-slate-50/50 p-8 rounded-2xl text-center border border-dashed border-slate-200 text-slate-400 text-xs">
              ☕ No active tasks assigned to you. Waiting for Admin dispatch...
            </div>
          ) : (
            activeTasks.map((task) => (
              <div
                key={task.id}
                className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3 text-xs"
              >
                <div className="flex justify-between items-center border-b pb-2 border-slate-100">
                  <span className="font-bold text-emerald-600 text-sm">
                    {task.booking_code || `REF-${task.id}`}
                  </span>
                  <span className="text-slate-400 font-medium text-[11px]">
                    📅 {task.booking_date} | {task.booking_time}
                  </span>
                </div>

                <div className="space-y-1">
                  <p className="font-bold text-slate-800 text-sm">
                    {task.room_type || task.program || 'Cleaning Service'}
                  </p>
                  <p className="text-slate-600">
                    👤 Customer: <span className="font-semibold text-slate-800">{task.customer_name}</span>
                  </p>
                  <p className="text-slate-500">📍 Location: {task.address || task.room_type || '-'}</p>
                </div>

                {/* Status & Action Buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Status: </span>
                    {renderStatusBadge(task.status)}
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto justify-end pt-1 sm:pt-0">
                    {(!task.status ||
                      task.status === 'Assigned' ||
                      task.status === 'Confirmed' ||
                      task.status === 'Pending') && (
                      <button
                        onClick={() => handleUpdateStatus(task, 'In Progress')}
                        className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold rounded-xl text-xs transition cursor-pointer shadow-sm flex items-center justify-center gap-1"
                      >
                        🚀 Accept & Start
                      </button>
                    )}

                    {task.status === 'In Progress' && (
                      <button
                        onClick={() =>
                          handleUpdateStatus(
                            task,
                            'Completed',
                            'Are you sure you have completed this cleaning task?'
                          )
                        }
                        className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold rounded-xl text-xs transition cursor-pointer shadow-sm flex items-center justify-center gap-1"
                      >
                        ✅ Complete Job
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 3. Job History Card (ย้ายมาไว้ข้างล่างสุด) */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden transition-all duration-200">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 active:scale-95 transition cursor-pointer"
                aria-label="Toggle History"
              >
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${
                    isHistoryOpen ? 'rotate-90' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>

              <span className="text-base">📜</span>
              <h2 className="text-sm font-bold text-slate-800">Job History</h2>
            </div>

            <span className="text-[11px] bg-slate-100 text-slate-500 font-bold px-2.5 py-0.5 rounded-full">
              {historyTasks.length}
            </span>
          </div>

          {isHistoryOpen && (
            <div className="px-4 pb-4 pt-1 border-t border-slate-50">
              {historyTasks.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">
                  No completed jobs yet.
                </p>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {Object.keys(groupedHistory).map((date) => (
                    <div key={date} className="space-y-2">
                      <div className="flex items-center gap-2 my-2">
                        <div className="h-[1px] bg-slate-100 flex-grow"></div>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200">
                          📅 {date}
                        </span>
                        <div className="h-[1px] bg-slate-100 flex-grow"></div>
                      </div>

                      {groupedHistory[date].map((task) => (
                        <div
                          key={task.id}
                          className="p-3 bg-slate-50/60 rounded-2xl border border-slate-100 space-y-1 text-xs hover:border-slate-300 transition"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-700">
                              {task.booking_code || `REF-${task.id}`}
                            </span>
                            <span className="text-[10px] text-emerald-600 font-semibold">
                              ✅ Completed
                            </span>
                          </div>
                          <p className="font-medium text-slate-800 truncate">
                            {task.room_type || task.program || 'Cleaning Service'}
                          </p>
                          <div className="text-[10px] text-slate-400 flex justify-between pt-1 border-t border-slate-200/40">
                            <span>👤 {task.customer_name}</span>
                            <span>⏰ {task.booking_time || '-'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}