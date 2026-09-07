'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface StaffUser {
  id: string;
  name: string;
}

export default function StaffDashboardPage() {
  const router = useRouter();
  const [currentStaff, setCurrentStaff] = useState<StaffUser | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const loadStaffTasks = useCallback(async (staffId: string) => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('assigned_staff', staffId)
        .order('booking_date', { ascending: true })
        .order('booking_time', { ascending: true });

      if (error) throw error;
      setTasks(data || []);
    } catch (error: any) {
      console.error('Error loading tasks:', error.message);
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

    loadStaffTasks(staffObj.id);

    const channel = supabase
      .channel(`staff-feed-${staffObj.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => {
          loadStaffTasks(staffObj.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router, loadStaffTasks]);

  const handleUpdateStatus = async (taskId: string, nextStatus: string) => {
    if (
      nextStatus === 'Completed' &&
      !window.confirm('Are you sure you want to mark this task as Completed?')
    ) {
      return;
    }

    setLoadingId(taskId);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: nextStatus })
        .eq('id', taskId);

      if (error) throw error;

      if (currentStaff) {
        await loadStaffTasks(currentStaff.id);
      }
    } catch (err: any) {
      alert('Error updating status: ' + err.message);
    } finally {
      setLoadingId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('currentStaff');
    router.push('/staff/login');
  };

  if (!currentStaff) {
    return null;
  }

  const activeTasks = tasks.filter((t) => t.status !== 'Completed');
  const completedTasks = tasks.filter((t) => t.status === 'Completed');

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
            {currentStaff.id} ({currentStaff.name})
          </div>
        </div>

        {/* Section: Current Tasks */}
        <div className="w-full bg-[#FFFFFF] border-2 border-[#8E9B9E] rounded-xl p-4 flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#1E1E1E]">Current Tasks</h2>
            <span className="bg-[#CDF4D3] border border-[#86D892] text-[#1E2B37] text-xs font-bold px-3 py-0.5 rounded-full">
              {activeTasks.length} Active
            </span>
          </div>

          {/* Task Items */}
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
                const isInProgress = task.status === 'In Progress';

                return (
                  <div
                    key={task.id}
                    className="w-full bg-[#EAF3F9]/60 border-2 border-[#93C5FD] rounded-xl p-3.5 flex flex-col space-y-2.5"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold bg-[#2563EB] text-white px-3 py-1 rounded-full shadow-xs">
                        {task.booking_code || `REF-${task.id}`}
                      </span>

                      {/* Badge สถานะใช้สีจาก Palette Chart 100% (#006AFF และ #93C5FD) */}
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
                      {task.room_type || task.address || 'Cleaning Service'}
                    </p>

                    {(task.customer_name || task.name) && (
                      <p className="text-xs text-[#1E1E1E]/80 font-semibold">
                        Customer: {task.customer_name || task.name}
                      </p>
                    )}

                    <p className="text-xs text-[#1E1E1E]/70 font-medium pb-1 border-b border-[#8E9B9E]/40">
                      Time: {task.booking_date} | {task.booking_time}
                    </p>

                    {/* Action Button */}
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
            <div className="mt-3 pt-3 border-t border-[#8E9B9E]/40 text-xs">
              {completedTasks.length === 0 ? (
                <div className="text-center py-3 text-[#1E1E1E]/50 font-medium">
                  No completed jobs in your history.
                </div>
              ) : (
                <div className="space-y-2">
                  {completedTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-2.5 bg-[#EAF3F9]/30 rounded-lg border border-[#8E9B9E] flex justify-between items-center"
                    >
                      <div>
                        <p className="font-bold text-[#1E1E1E]">
                          {task.booking_code || `REF-${task.id}`} - Completed
                        </p>
                        <p className="text-[11px] text-[#1E1E1E]/60">
                          {task.booking_date} | {task.booking_time}
                        </p>
                      </div>
                      <span className="text-[#00CC00] font-bold text-xs">Done</span>
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