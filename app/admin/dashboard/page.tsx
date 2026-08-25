'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

// รายชื่อพนักงาน GW-S1 ถึง GW-S5
const STAFF_LIST = [
  { id: 'GW-S1', name: 'Staff 01' },
  { id: 'GW-S2', name: 'Staff 02' },
  { id: 'GW-S3', name: 'Staff 03' },
  { id: 'GW-S4', name: 'Staff 04' },
  { id: 'GW-S5', name: 'Staff 05' },
];

const getValidSlipUrl = (task: any): string | null => {
  if (!task) return null;
  let rawUrl = task.slip_url || task.slipUrl || task.payment_slip || task.slip;
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  if (rawUrl.includes('/slips/slips/')) {
    rawUrl = rawUrl.replace('/slips/slips/', '/slips/');
  }
  return rawUrl;
};

export default function AdminDashboardPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'history'>('today');
  const [adminUser] = useState('zaza');
  const [selectedStaffMap, setSelectedStaffMap] = useState<{ [key: string]: string }>({});

  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

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

  const playAdminSound = (type: 'new_booking' | 'job_completed') => {
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

      if (type === 'new_booking') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime);
        oscillator.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.15);
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.4);
      } else if (type === 'job_completed') {
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime);
        oscillator.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.12);
        gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.5);
      }
    } catch (e) {
      console.error('Audio play error:', e);
    }
  };

  const loadBookings = useCallback(async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('booking_date', { ascending: true })
      .order('booking_time', { ascending: true });

    if (!error && data) {
      setTasks(data);
    }
  }, []);

  useEffect(() => {
    loadBookings();

    const channel = supabase
      .channel('admin-dashboard-feed')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bookings' },
        (payload: any) => {
          if (
            payload.new?.status === 'Completed' &&
            payload.old?.status !== 'Completed'
          ) {
            playAdminSound('job_completed');
            const code = payload.new.booking_code || `REF-${payload.new.id}`;
            const staff = payload.new.assigned_staff || 'Staff';
            alert(`🎉 TASK COMPLETED!\n\nTask: ${code}\nCompleted by: ${staff}`);
          }
          loadBookings();
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bookings' },
        (payload: any) => {
          playAdminSound('new_booking');
          const newBooking = payload.new;

          if (newBooking.booking_date === todayStr) {
            setActiveTab('today');
          } else if (newBooking.booking_date > todayStr) {
            setActiveTab('upcoming');
          }

          loadBookings();
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'bookings' },
        () => loadBookings()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [todayStr, loadBookings, isAudioEnabled]);

  const handleSelectStaffLocal = (taskId: any, staffName: string) => {
    setSelectedStaffMap((prev) => ({
      ...prev,
      [taskId]: staffName,
    }));
  };

  const handleDispatchTask = async (taskId: any, staffName: string) => {
    if (!staffName) {
      alert('Please select a staff member first!');
      return;
    }

    const { error } = await supabase
      .from('bookings')
      .update({
        assigned_staff: staffName,
        assigned_by: adminUser,
        status: 'Assigned',
      })
      .eq('id', taskId);

    if (error) {
      alert('Error assigning task: ' + error.message);
    } else {
      alert(`Task successfully assigned to ${staffName}!`);
      setSelectedStaffMap((prev) => {
        const updated = { ...prev };
        delete updated[taskId];
        return updated;
      });
      loadBookings();
    }
  };

  const handleDeleteTask = async (taskId: any) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    const { error } = await supabase.from('bookings').delete().eq('id', taskId);

    if (error) {
      alert('Error deleting task: ' + error.message);
    } else {
      loadBookings();
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm(`Are you sure you want to delete ALL tasks in "${activeTab.toUpperCase()}"?`)) return;

    const idsToDelete = currentTasks.map((t) => t.id);
    if (idsToDelete.length === 0) return;

    const { error } = await supabase.from('bookings').delete().in('id', idsToDelete);

    if (error) {
      alert('Error clearing tasks: ' + error.message);
    } else {
      loadBookings();
    }
  };

  // เช็กสถานะ Realtime ของพนักงาน
  const getStaffStatus = (staffId: string) => {
    const activeTask = tasks.find(
      (b) => b.assigned_staff === staffId && b.status === 'In Progress'
    );
    const assignedTask = tasks.find(
      (b) => b.assigned_staff === staffId && b.status === 'Assigned'
    );
    const completedCount = tasks.filter(
      (b) => b.assigned_staff === staffId && b.status === 'Completed'
    ).length;

    if (activeTask) {
      return {
        color: 'bg-amber-500',
        text: `🧹 Working on ${activeTask.booking_code || `REF-${activeTask.id}`}`,
        completedCount,
      };
    }
    if (assignedTask) {
      return {
        color: 'bg-blue-500',
        text: `📩 Waiting (${assignedTask.booking_code || `REF-${assignedTask.id}`})`,
        completedCount,
      };
    }
    return {
      color: 'bg-emerald-500',
      text: '🟢 Available',
      completedCount,
    };
  };

  const todayTasks = tasks.filter(
    (t) => t.booking_date === todayStr && t.status !== 'Completed'
  );

  const upcomingTasks = tasks.filter(
    (t) => t.booking_date > todayStr && t.status !== 'Completed'
  );

  const historyTasks = tasks.filter((t) => t.status === 'Completed');

  const currentTasks =
    activeTab === 'today'
      ? todayTasks
      : activeTab === 'upcoming'
      ? upcomingTasks
      : historyTasks;

  const groupByDate = (taskList: any[]) => {
    return taskList.reduce((acc: { [key: string]: any[] }, task) => {
      const dateKey = task.booking_date || 'Unknown Date';
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(task);
      return acc;
    }, {});
  };

  const groupedTasks = groupByDate(currentTasks);

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-6 text-black">
      <div className="max-w-5xl mx-auto space-y-4">
        
        {/* Header */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center flex-wrap gap-2">
          <div>
            <h1 className="text-lg font-bold text-slate-800">
              Getaway Admin Dashboard
            </h1>
            <p className="text-xs text-gray-400">
              Task Management & Dispatch System (Realtime)
            </p>
          </div>

          <div className="flex items-center gap-2">
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

            <button
              onClick={handleClearAll}
              className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition active:scale-95 cursor-pointer"
            >
              🗑️ Clear All
            </button>

            <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold rounded-lg px-3 py-1.5 text-xs">
              🧑‍💼 {adminUser}
            </span>
          </div>
        </div>

        {/* 👷‍♂️ Staff Realtime Status Bar */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-2">
          <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            👷‍♂️ Staff Monitor (Realtime)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {STAFF_LIST.map((staff) => {
              const info = getStaffStatus(staff.id);
              return (
                <div
                  key={staff.id}
                  className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1 text-xs"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800">{staff.id}</span>
                    <span className={`w-2 h-2 rounded-full ${info.color} animate-pulse`}></span>
                  </div>
                  <p className="text-[10px] text-gray-500 truncate">{info.text}</p>
                  <div className="text-[9px] text-gray-400 pt-1 border-t border-gray-200/60 flex justify-between">
                    <span>Done:</span>
                    <span className="font-bold text-slate-600">{info.completedCount}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-gray-200/60 p-1 rounded-xl flex gap-1 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 rounded-lg transition ${
              activeTab === 'history'
                ? 'bg-white text-slate-800 shadow-sm font-bold'
                : 'text-gray-500 hover:text-slate-800'
            }`}
          >
            📜 History ({historyTasks.length})
          </button>
          <button
            onClick={() => setActiveTab('today')}
            className={`flex-1 py-2 rounded-lg transition ${
              activeTab === 'today'
                ? 'bg-white text-slate-800 shadow-sm font-bold'
                : 'text-gray-500 hover:text-slate-800'
            }`}
          >
            📍 Today ({todayTasks.length})
          </button>
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`flex-1 py-2 rounded-lg transition ${
              activeTab === 'upcoming'
                ? 'bg-white text-slate-800 shadow-sm font-bold'
                : 'text-gray-500 hover:text-slate-800'
            }`}
          >
            📅 Upcoming ({upcomingTasks.length})
          </button>
        </div>

        {/* Task List */}
        {Object.keys(groupedTasks).length === 0 ? (
          <div className="bg-white p-12 rounded-2xl text-center border border-dashed border-gray-200 text-gray-400 text-xs">
            No tasks found for this view.
          </div>
        ) : (
          <div className="space-y-6">
            {Object.keys(groupedTasks).map((date) => (
              <div key={date} className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-[1px] bg-gray-300 flex-grow"></div>
                  <span className="text-xs font-bold text-gray-600 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
                    📅 {date}
                  </span>
                  <div className="h-[1px] bg-gray-300 flex-grow"></div>
                </div>

                {groupedTasks[date].map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    selectedStaff={selectedStaffMap[task.id] || ''}
                    handleSelectStaffLocal={handleSelectStaffLocal}
                    handleDispatchTask={handleDispatchTask}
                    handleDeleteTask={handleDeleteTask}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function TaskCard({
  task,
  selectedStaff,
  handleSelectStaffLocal,
  handleDispatchTask,
  handleDeleteTask,
}: {
  task: any;
  selectedStaff: string;
  handleSelectStaffLocal: (id: any, staff: string) => void;
  handleDispatchTask: (id: any, staff: string) => void;
  handleDeleteTask: (id: any) => void;
}) {
  const slipImage = getValidSlipUrl(task);

  const currentAssigned = task.assigned_staff || '';
  const activeStaffChoice = selectedStaff || currentAssigned;

  const isAlreadyAssigned =
    task.status === 'Assigned' &&
    (!selectedStaff || selectedStaff === currentAssigned);

  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3 text-xs relative group">
      <div className="flex justify-between items-center border-b pb-2 border-gray-50">
        <span className="font-bold text-emerald-600 text-sm">
          {task.booking_code || `REF-${task.id}`}
        </span>

        <div className="flex items-center gap-2">
          <span className="text-gray-500 font-medium">
            📅 {task.booking_date} | {task.booking_time}
          </span>
          <button
            onClick={() => handleDeleteTask(task.id)}
            className="text-gray-400 hover:text-red-600 p-1 hover:bg-red-50 rounded transition cursor-pointer"
            title="Delete Task"
          >
            🗑️
          </button>
        </div>
      </div>

      <div className="flex justify-between items-start gap-4">
        <div className="space-y-1 flex-1">
          <p className="font-bold text-slate-800 text-sm">
            {task.room_type || task.program || 'Cleaning Service'}
          </p>
          <p className="text-gray-600">
            👤 Customer: <span className="font-semibold text-gray-800">{task.customer_name}</span>
          </p>
          <p className="text-gray-500">
            📍 Address / Room: {task.address || task.room_type || '-'}
          </p>

          {(task.price || task.amount) && (
            <p className="font-bold text-emerald-600">
              💵 Amount: {String(task.price || task.amount).replace(/€/g, '').trim()}€
            </p>
          )}
        </div>

        {/* แสดงภาพ Payment Slip */}
        <div className="text-right">
          <span className="text-[10px] text-gray-400 block mb-1">Payment Slip:</span>
          {slipImage ? (
            <a href={slipImage} target="_blank" rel="noreferrer" title="Click to view full image">
              <img
                src={slipImage}
                alt="Payment Slip"
                className="w-[50px] h-[70px] rounded-lg border object-cover shadow-sm hover:scale-105 transition cursor-pointer"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </a>
          ) : (
            <div className="w-12 h-16 bg-gray-100 border border-dashed rounded-lg flex items-center justify-center text-[10px] text-gray-400">
              No Slip
            </div>
          )}
        </div>
      </div>

      <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-gray-400 font-medium">Assigned To:</span>

          {/* อัปเดตตัวเลือกพนักงานเป็น GW-S1 ถึง GW-S5 */}
          <select
            value={activeStaffChoice}
            onChange={(e) => handleSelectStaffLocal(task.id, e.target.value)}
            disabled={task.status === 'Completed'}
            className={`border font-bold px-2.5 py-1 rounded-lg text-xs focus:outline-none focus:ring-2 transition ${
              task.status === 'Completed'
                ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'
                : activeStaffChoice
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700 cursor-pointer'
                : 'bg-gray-50 border-gray-300 text-gray-600 focus:ring-emerald-500 cursor-pointer'
            }`}
          >
            <option value="">-- Select Staff --</option>
            {STAFF_LIST.map((staff) => (
              <option key={staff.id} value={staff.id}>
                👷‍♂️ {staff.id} ({staff.name})
              </option>
            ))}
          </select>

          {task.assigned_by && (
            <span className="text-[10px] text-gray-400 hidden sm:inline">
              (by 🧑‍💼 {task.assigned_by})
            </span>
          )}
        </div>

        <div>
          {task.status === 'Completed' ? (
            <span className="bg-emerald-100 text-emerald-700 border border-emerald-300 font-bold px-3 py-1.5 rounded-xl text-[11px] flex items-center gap-1">
              ✅ Completed
            </span>
          ) : task.status === 'In Progress' ? (
            <span className="bg-amber-100 text-amber-800 border border-amber-300 font-bold px-3 py-1.5 rounded-xl text-[11px] flex items-center gap-1 animate-pulse">
              🧹 In Progress
            </span>
          ) : isAlreadyAssigned ? (
            <button
              disabled
              className="bg-gray-100 border border-gray-200 text-gray-400 font-bold px-3 py-1.5 rounded-xl text-[11px] cursor-not-allowed flex items-center gap-1 opacity-80"
            >
              ⏳ Assigned
            </button>
          ) : (
            <button
              onClick={() => handleDispatchTask(task.id, activeStaffChoice)}
              disabled={!activeStaffChoice}
              className={`font-bold px-3 py-1.5 rounded-xl text-[11px] border shadow-sm transition active:scale-95 flex items-center gap-1 ${
                activeStaffChoice
                  ? 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 cursor-pointer'
                  : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              📤 Assign Task
            </button>
          )}
        </div>
      </div>
    </div>
  );
}