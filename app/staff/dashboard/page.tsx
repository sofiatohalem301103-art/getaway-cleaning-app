'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function StaffDashboardPage() {
  const router = useRouter();
  const [assignedTasks, setAssignedTasks] = useState<any[]>([]);
  const [currentStaff, setCurrentStaff] = useState<any>(null);

  // 🔔 State & Ref สำหรับระบบเสียงแจ้งเตือน
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // โหลดข้อมูลพนักงานที่ล็อกอินอยู่จาก LocalStorage
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

  // ฟังก์ชันสลับสถานะเปิด/ปิดเสียง
  const toggleAudio = () => {
    try {
      if (!isAudioEnabled) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!audioCtxRef.current && AudioContextClass) {
          audioCtxRef.current = new AudioContextClass();
        }
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume();
        }
        setIsAudioEnabled(true);
      } else {
        setIsAudioEnabled(false);
      }
    } catch (e) {
      console.error('Failed to initialize AudioContext:', e);
    }
  };

  // 🔔 เล่นเสียงแจ้งเตือน
  const playNotificationSound = () => {
    if (!isAudioEnabled) return;

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
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.error('Audio play error:', e);
    }
  };

  // ดึงงานที่มอบหมายเฉพาะ Staff ID ของคนที่ล็อกอินอยู่
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
  }, [currentStaff, loadStaffTasks, isAudioEnabled]);

  // ฟังก์ชัน Logout
  const handleLogout = () => {
    localStorage.removeItem('currentStaff');
    router.push('/staff/login');
  };

  // 🔄 อัปเดตสถานะงาน (In Progress -> Completed)
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
      alert('Error: ' + error.message);
    } else {
      if (newStatus === 'In Progress') {
        alert('รับงานเรียบร้อย! กำลังเริ่มดำเนินการ');
      } else if (newStatus === 'Completed') {
        alert('ปิดงานสำเร็จ! ระบบบันทึกเวลาทำงานเรียบร้อยครับ');
      }
      loadStaffTasks();
    }
  };

  // Badge แสดงสถานะ
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
    <main className="min-h-screen bg-gray-50 p-4 md:p-6 text-black">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Top Header */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center flex-wrap gap-2">
          <div>
            <h1 className="text-lg font-bold text-slate-800">
              Staff Workstation
            </h1>
            <p className="text-xs text-gray-400">Task Management & History</p>
          </div>

          <div className="flex items-center gap-3">
            {/* ปุ่มเปิดใช้งานเสียง */}
            <button
              onClick={toggleAudio}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition flex items-center gap-1 cursor-pointer ${
                isAudioEnabled
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                  : 'bg-amber-50 border-amber-300 text-amber-700 animate-pulse'
              }`}
            >
              {isAudioEnabled ? '🔔 Sound On' : '🔇 Enable Sound'}
            </button>

            {/* แสดงชื่อและรหัสพนักงานที่ล็อกอินอยู่ */}
            <div className="bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 font-bold text-slate-700">
              <span>👷‍♂️</span>
              <span>{currentStaff.id}</span>
              <span className="text-gray-400">({currentStaff.name})</span>
            </div>

            {/* ปุ่ม Logout */}
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-bold transition cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Layout Grid: Left History | Right Active Tasks */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column: Job History */}
          <div className="md:col-span-1 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3 h-fit">
            <div className="flex justify-between items-center border-b pb-2 border-gray-100">
              <h2 className="text-sm font-bold text-slate-800">📜 Job History</h2>
              <span className="text-[11px] bg-gray-100 text-gray-600 font-bold px-2 py-0.5 rounded-full">
                {historyTasks.length}
              </span>
            </div>

            {historyTasks.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">
                No completed jobs yet.
              </p>
            ) : (
              <div className="space-y-4 max-h-[550px] overflow-y-auto pr-1">
                {Object.keys(groupedHistory).map((date) => (
                  <div key={date} className="space-y-2">
                    <div className="flex items-center gap-2 my-1">
                      <div className="h-[1px] bg-gray-200 flex-grow"></div>
                      <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                        📅 {date}
                      </span>
                      <div className="h-[1px] bg-gray-200 flex-grow"></div>
                    </div>

                    {groupedHistory[date].map((task) => (
                      <div
                        key={task.id}
                        className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-1 text-xs hover:border-gray-300 transition"
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
                        <div className="text-[10px] text-gray-400 flex justify-between pt-1 border-t border-gray-200/50">
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

          {/* Right Column: Active Tasks */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-800">📌 Current Tasks</h2>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">
                {activeTasks.length} Active
              </span>
            </div>

            {activeTasks.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl text-center border border-dashed border-gray-200 text-gray-400 text-xs">
                ☕ No active tasks assigned to you. Waiting for Admin dispatch...
              </div>
            ) : (
              activeTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3 text-xs"
                >
                  <div className="flex justify-between items-center border-b pb-2 border-gray-50">
                    <span className="font-bold text-emerald-600 text-sm">
                      {task.booking_code || `REF-${task.id}`}
                    </span>
                    <span className="text-gray-500 font-medium">
                      📅 {task.booking_date} | {task.booking_time}
                    </span>
                  </div>

                  <div>
                    <p className="font-bold text-slate-800 text-sm">
                      {task.room_type || task.program || 'Cleaning Service'}
                    </p>
                    <p className="text-gray-600 mt-1">
                      👤 Customer: <span className="font-semibold text-gray-800">{task.customer_name}</span>
                    </p>
                    <p className="text-gray-500">📍 Location: {task.address || task.room_type || '-'}</p>
                  </div>

                  {/* Status & Action Buttons */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400">Status: </span>
                      {renderStatusBadge(task.status)}
                    </div>

                    <div className="flex gap-2">
                      {(!task.status ||
                        task.status === 'Assigned' ||
                        task.status === 'Confirmed' ||
                        task.status === 'Pending') && (
                        <button
                          onClick={() => handleUpdateStatus(task, 'In Progress')}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold rounded-lg text-xs transition cursor-pointer shadow-sm flex items-center gap-1"
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
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold rounded-lg text-xs transition cursor-pointer shadow-sm flex items-center gap-1"
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
        </div>
      </div>
    </main>
  );
}