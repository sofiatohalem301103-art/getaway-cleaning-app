'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface StaffUser {
  id: string;
  name: string;
}

interface Task {
  id: string;
  assignedStaffId: string;
  assignedStaffName: string;
  customerName?: string;
  location?: string;
  time?: string;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt?: string;
  [key: string]: any;
}

export default function StaffDashboardPage() {
  const router = useRouter();
  const [currentStaff, setCurrentStaff] = useState<StaffUser | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // ฟังก์ชันดึงงานของ Staff คนนี้
  const loadStaffTasks = (staffId: string) => {
    try {
      // ดึงงานทั้งหมดจาก localStorage (คีย์ dispatches หรือ assignedTasks)
      const savedDispatches = localStorage.getItem('dispatches') || localStorage.getItem('assignedTasks') || '[]';
      const allTasks: Task[] = JSON.parse(savedDispatches);

      // กรองเฉพาะงานที่ถูกจ่ายให้ Staff คนนี้
      const myTasks = allTasks.filter((task) => task.assignedStaffId === staffId);
      setTasks(myTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  useEffect(() => {
    const savedStaff = localStorage.getItem('currentStaff');
    if (!savedStaff) {
      router.push('/staff/login');
      return;
    }

    const staffObj: StaffUser = JSON.parse(savedStaff);
    setCurrentStaff(staffObj);

    // ดึงงานครั้งแรก
    loadStaffTasks(staffObj.id);

    // ดักฟัง Event เมื่อ Admin บันทึกงานลง LocalStorage (ทำให้เด้งทันทีโดยไม่ต้อง Refresh)
    const handleStorageChange = () => {
      loadStaffTasks(staffObj.id);
    };

    window.addEventListener('storage', handleStorageChange);
    // เช็กข้อมูลทุกๆ 2 วินาที (เผื่อเปิดคนละ Tab)
    const interval = setInterval(() => loadStaffTasks(staffObj.id), 2000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('currentStaff');
    router.push('/staff/login');
  };

  if (!currentStaff) {
    return null;
  }

  // แยกงานที่กำลังทำ (Active) กับงานที่เสร็จแล้ว (Completed)
  const activeTasks = tasks.filter((t) => t.status !== 'completed');
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  return (
    <main className="min-h-[100dvh] bg-[#EAF3F9] flex justify-center p-0 sm:p-6 text-[#1E2B37] font-sans">
      <div className="w-full min-h-[100dvh] sm:min-h-0 sm:max-w-md bg-[#FFFFFF] p-4 sm:p-6 sm:rounded-[32px] shadow-none sm:shadow-xl border-none sm:border border-[#D9D9D9] flex flex-col space-y-4">
        
        {/* Header: Staff Workstation */}
        <div className="w-full bg-[#FFFFFF] border border-[#D9D9D9] rounded-2xl p-4 shadow-sm">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h1 className="text-xl font-bold text-[#1E2B37] tracking-tight">
                Staff Workstation
              </h1>
              <p className="text-xs text-[#1E1E1E]/60 font-medium">
                Task Management & History
              </p>
            </div>
            
            <button
              onClick={handleLogout}
              className="bg-[#EF8B8D] hover:bg-[#E56B6E] active:scale-95 border-2 border-[#C94A4E] text-[#1E2B37] text-xs font-bold px-4 py-1 rounded-full transition duration-150 cursor-pointer shadow-sm select-none"
            >
              Logout
            </button>
          </div>

          <div className="inline-block bg-[#93C5FD]/25 border border-[#93C5FD] text-[#1E2B37] text-xs font-semibold px-3 py-1 rounded-xl mt-1">
            {currentStaff.id} ({currentStaff.name})
          </div>
        </div>

        {/* Section: Current Tasks */}
        <div className="w-full bg-[#FFFFFF] border border-[#D9D9D9] rounded-2xl p-4 shadow-sm flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#1E2B37]">
              Current Tasks
            </h2>
            <span className="bg-[#86D892]/30 border border-[#86D892] text-[#1E2B37] text-xs font-bold px-2.5 py-0.5 rounded-full">
              {activeTasks.length} Active
            </span>
          </div>

          {/* รายการงาน activeTasks */}
          {activeTasks.length === 0 ? (
            <div className="w-full min-h-[160px] bg-[#EAF3F9]/60 border border-[#93C5FD]/60 rounded-xl p-6 flex items-center justify-center text-center">
              <p className="text-xs sm:text-sm text-[#1E1E1E]/70 font-medium leading-relaxed">
                ☕ No active tasks assigned to you. Waiting for Admin dispatch...
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeTasks.map((task) => (
                <div key={task.id} className="w-full bg-[#EAF3F9]/40 border-2 border-[#93C5FD] rounded-xl p-4 flex flex-col space-y-2 shadow-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold bg-[#2563EB] text-white px-2.5 py-0.5 rounded-md">
                      Job #{task.id}
                    </span>
                    <span className="text-xs font-semibold text-[#2563EB]">
                      {task.status === 'in_progress' ? 'In Progress' : 'Assigned'}
                    </span>
                  </div>
                  {task.customerName && (
                    <p className="text-sm font-bold text-[#1E2B37]">
                      👤 {task.customerName}
                    </p>
                  )}
                  {task.location && (
                    <p className="text-xs text-[#1E2B37]/80 font-medium">
                      📍 {task.location}
                    </p>
                  )}
                  {task.time && (
                    <p className="text-xs text-[#1E2B37]/80 font-medium">
                      ⏰ {task.time}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section: Job History Accordion */}
        <div className="w-full bg-[#FFFFFF] border border-[#D9D9D9] rounded-2xl p-3 shadow-sm transition duration-150">
          <button
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            className="w-full flex items-center justify-between p-1 cursor-pointer select-none"
          >
            <div className="flex items-center space-x-2.5">
              <span
                className="w-6 h-6 rounded-lg bg-[#EAF3F9] border border-[#D9D9D9] text-[#1E2B37] text-xs font-bold flex items-center justify-center transition-transform duration-200"
                style={{ transform: isHistoryOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
              >
                &gt;
              </span>
              <span className="text-sm font-bold text-[#1E2B37]">
                Job History
              </span>
            </div>

            <span className="bg-[#EAF3F9] border border-[#D9D9D9] text-[#1E2B37] text-xs font-bold px-2.5 py-0.5 rounded-full">
              {completedTasks.length}
            </span>
          </button>

          {isHistoryOpen && (
            <div className="mt-3 pt-3 border-t border-[#D9D9D9] text-xs text-[#1E1E1E]/70 py-2">
              {completedTasks.length === 0 ? (
                <div className="text-center py-2 text-[#1E1E1E]/50">
                  No completed jobs in your history.
                </div>
              ) : (
                <div className="space-y-2">
                  {completedTasks.map((task) => (
                    <div key={task.id} className="p-2.5 bg-[#EAF3F9]/30 rounded-lg border border-[#D9D9D9]">
                      <p className="font-bold">Job #{task.id} - Completed</p>
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