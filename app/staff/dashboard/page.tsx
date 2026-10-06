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
  rating?: number;
  rating_score?: number;
  comment?: string;
  is_read?: boolean;
  is_read_by_user?: boolean;
  admin_reply?: string;
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
  
  // แท็บเมนู: mytasks | history | reviews
  const [activeTab, setActiveTab] = useState<'mytasks' | 'history' | 'reviews'>('mytasks');

  // Feedbacks
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // โหลดข้อมูลงาน
  const loadStaffTasks = useCallback(async (staffId: string, staffName: string) => {
    try {
      const { data, error } = await supabase.from('bookings').select('*');
      if (error) throw error;

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

  // โหลด Feedbacks
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
            const name = b.customer_name || b.name || b.full_name || b.user_name;
            if (name && String(name).trim() !== '') {
              const strName = String(name).trim();
              if (b.id) customerNameMap[String(b.id)] = strName;
              if (b.booking_code) customerNameMap[String(b.booking_code)] = strName;
              if (b.booking_ref) customerNameMap[String(b.booking_ref)] = strName;
            }
          });
        }

        const enrichedFeedbacks: FeedbackItem[] = rawFeedbacks.map((item: any) => {
          const directName = item.customer_name || item.name || item.full_name || item.customerName;
          const joinedBookingName = item.bookings?.customer_name || item.bookings?.name;
          const nameFromBookingId = item.booking_id ? customerNameMap[String(item.booking_id)] : null;
          const finalName = directName || joinedBookingName || nameFromBookingId || 'Guest';

          return { ...item, resolved_customer_name: String(finalName).trim() };
        });

        enrichedFeedbacks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        setFeedbacks(enrichedFeedbacks);
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        loadStaffTasks(staffObj.id, staffObj.name);
      })
      .subscribe();

    const feedbackChannel = supabase
      .channel('staff-feedback-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feedbacks' }, () => {
        loadFeedbacks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(bookingChannel);
      supabase.removeChannel(feedbackChannel);
    };
  }, [router, loadStaffTasks, loadFeedbacks]);

  const handleUpdateStatus = async (taskId: string, nextStatus: string) => {
    if (nextStatus === 'Completed' && !window.confirm('Are you sure you want to mark this task as Completed?')) {
      return;
    }

    setLoadingId(taskId);
    try {
      let dbStatus = nextStatus;
      if (nextStatus === 'In Progress') dbStatus = 'in_progress';
      if (nextStatus === 'Completed') dbStatus = 'completed';

      const { error } = await supabase.from('bookings').update({ status: dbStatus }).eq('id', taskId);
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

  const handleLogout = () => {
    localStorage.removeItem('currentStaff');
    router.push('/staff/login');
  };

  const markFeedbacksAsRead = async () => {
    setActiveTab('reviews');
    if (unreadCount > 0) {
      setUnreadCount(0);
      try {
        await supabase
          .from('feedbacks')
          .update({ is_read_by_user: true, is_read: true })
          .or('is_read_by_user.eq.false,is_read.eq.false');

        setFeedbacks((prev) => prev.map((item) => ({ ...item, is_read_by_user: true, is_read: true })));
      } catch (err: any) {
        console.error('Error updating read status:', err.message);
      }
    }
  };

  if (!currentStaff) return null;

  const completedTasks = tasks.filter((t) => t.status === 'Completed' || t.status === 'completed');
  const activeTasks = tasks.filter((t) => t.status !== 'Completed' && t.status !== 'completed');
  
  const avgRating = feedbacks.length > 0
    ? (feedbacks.reduce((acc, curr) => acc + (curr.rating || curr.rating_score || 0), 0) / feedbacks.length).toFixed(1)
    : '-';

  const formattedStaffCode = currentStaff.id ? (currentStaff.id.length > 6 ? currentStaff.id.substring(0, 6).toUpperCase() : currentStaff.id) : 'GW-S1';

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E2B37] p-3 sm:p-6 font-sans">
      <div className="w-full max-w-7xl mx-auto space-y-5">
        
        {/* Section Header Tag */}
        <div className="text-[11px] font-extrabold text-[#8E9B9E] tracking-wider uppercase">
          Staff Dashboard
        </div>

        {/* 1. Header Box */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-2xs p-4 sm:p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#1E2B37] tracking-tight">
                Getaway Staff Dashboard
              </h1>
              <p className="text-xs font-semibold text-[#8E9B9E] mt-1">
                Task Management & Dispatch System (Realtime)
              </p>
            </div>

            {/* Logout Button */}
            <button
              type="button"
              onClick={handleLogout}
              className="font-bold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 bg-[#D95353] hover:bg-[#C94A4E] text-white shadow-xs shrink-0"
            >
              Logout
            </button>
          </div>

          {/* Staff Info Banner */}
          <div className="flex items-center gap-2 pt-3 border-t border-[#E2E8F0]">
            <span className="w-2 h-2 rounded-full bg-[#008800]" />
            <span className="text-xs font-semibold text-[#475569]">
              Staff: <span className="font-bold text-[#1E2B37]">{currentStaff.name}</span>
            </span>
          </div>
        </div>

        {/* 2. Stat Summary Section */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E2E8F0] shadow-2xs space-y-3">
          <div className="text-[11px] font-bold text-[#8E9B9E] uppercase tracking-wider">
            System Overview
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Card 1: Code & Status */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 flex flex-col justify-between h-[80px]">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-[#1E2B37]">{formattedStaffCode}</span>
                <span className="w-2 h-2 rounded-full bg-[#008800]"></span>
              </div>
              <div>
                <div className="text-[10px] font-medium text-[#8E9B9E]">Status</div>
                <div className="text-xs font-bold text-[#008800]">Available</div>
              </div>
            </div>

            {/* Card 2: Active Jobs */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 flex flex-col justify-between h-[80px]">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-[#1E2B37]">Active Jobs</span>
                <span className="w-2 h-2 rounded-full bg-[#006AFF]"></span>
              </div>
              <div>
                <div className="text-[10px] font-medium text-[#8E9B9E]">Pending Tasks</div>
                <div className="text-sm font-extrabold text-[#1E2B37]">{activeTasks.length}</div>
              </div>
            </div>

            {/* Card 3: Completed */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 flex flex-col justify-between h-[80px]">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-[#1E2B37]">Completed</span>
                <span className="w-2 h-2 rounded-full bg-[#008800]"></span>
              </div>
              <div>
                <div className="text-[10px] font-medium text-[#8E9B9E]">Total History</div>
                <div className="text-sm font-extrabold text-[#1E2B37]">{completedTasks.length}</div>
              </div>
            </div>

            {/* Card 4: Rating */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 flex flex-col justify-between h-[80px]">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-[#1E2B37]">Rating</span>
                <span className="text-[#FFB800] text-[10px] font-bold">Rating</span>
              </div>
              <div>
                <div className="text-[10px] font-medium text-[#8E9B9E]">Guest Rating</div>
                <div className="text-sm font-extrabold text-[#FFB800]">
                  {avgRating} <span className="text-[10px] font-normal text-[#8E9B9E]">/ 5.0</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Navigation Tabs */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs p-2">
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setActiveTab('history')}
              className={`py-2 px-3 rounded-xl border text-xs text-center font-bold transition cursor-pointer flex items-center justify-center ${
                activeTab === 'history'
                  ? 'bg-[#EBF5FF] border-[#006AFF]/30 text-[#006AFF]'
                  : 'bg-white border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC]'
              }`}
            >
              History ({completedTasks.length})
            </button>

            <button
              onClick={() => setActiveTab('mytasks')}
              className={`py-2 px-3 rounded-xl border text-xs text-center font-bold transition cursor-pointer flex items-center justify-center ${
                activeTab === 'mytasks'
                  ? 'bg-[#EBF5FF] border-[#006AFF]/30 text-[#006AFF]'
                  : 'bg-white border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC]'
              }`}
            >
              My Tasks ({activeTasks.length})
            </button>

            <button
              onClick={markFeedbacksAsRead}
              className={`py-2 px-3 rounded-xl border text-xs text-center font-bold transition cursor-pointer flex items-center justify-center relative ${
                activeTab === 'reviews'
                  ? 'bg-[#EBF5FF] border-[#006AFF]/30 text-[#006AFF]'
                  : 'bg-white border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC]'
              }`}
            >
              Reviews ({feedbacks.length})
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#F43F5E] text-white text-[9px] font-black rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 4. Tab Content Area */}
        <div className="space-y-4">
          
          {/* TAB 1: MY TASKS */}
          {activeTab === 'mytasks' && (
            activeTasks.length === 0 ? (
              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-12 text-center text-xs text-[#8E9B9E] font-semibold shadow-2xs">
                No tasks scheduled for today.
              </div>
            ) : (
              activeTasks.map((task) => {
                const isInProgress = task.status === 'In Progress' || task.status === 'in_progress';
                const isProcessing = loadingId === task.id;

                let details: Record<string, any> = {};
                if (task.details) {
                  if (typeof task.details === 'string') {
                    try { details = JSON.parse(task.details); } catch (e) { details = {}; }
                  } else if (typeof task.details === 'object') {
                    details = task.details;
                  }
                }

                let rawProgramName = details.program_name || details.program || task.service_name || task.program_name;
                if (rawProgramName === 'garden' || rawProgramName === 'Garden') {
                  rawProgramName = 'Garden Cleaning (Upon Request)';
                }
                const displayProgram = rawProgramName || task.room_type || task.title || 'Cleaning Service';

                const customerPhone = task.customer_phone || task.phone || details.customer_phone || details.phone || '';

                const addressLine = task.address_line || task.address || details.address || details.address_line || '';
                const cityArea = task.city_area || task.city || details.city_area || details.city || details.area || '';
                const building = task.building_complex || task.building || details.building_complex || details.building || details.buildingComplex || '';
                const houseApt = task.house_apt || task.apartment_house_no || details.house_apt || details.apartment_house_no || details.apartmentHouseNo || '';
                const mapsLink = details.google_maps_link || details.googleMapsLink || details.mapLink || task.map_link || task.google_maps_link;

                const propertyType = details.property_type || details.propertyType || task.property_type;
                const bedrooms = details.bedrooms ?? task.bedrooms;
                const bathrooms = details.bathrooms ?? task.bathrooms;
                const balconies = details.balconies ?? details.office_balconies ?? details.verandahs ?? task.balconies;

                const officeSqm = details.office_sqm || task.office_sqm;
                const officeToilets = details.office_toilets || task.office_toilets;
                const officeCleanWindows = details.office_clean_windows || task.office_clean_windows;
                const officeWindowsCount = details.office_windows_count || task.office_windows_count;

                const gardenSqm = details.garden_sqm || details.area_size || task.garden_sqm || task.area_size;
                const gardenType = details.garden_type || details.gardenType || task.garden_type;
                const gardenOtherDetails = details.garden_other_details || details.garden_notes || task.garden_other_details;

                const hasSpecs = Boolean(
                  propertyType || (bedrooms !== undefined && bedrooms !== null && bedrooms !== '') ||
                  (bathrooms !== undefined && bathrooms !== null && bathrooms !== '') ||
                  (balconies !== undefined && balconies !== null && balconies !== '') ||
                  officeSqm || officeToilets || officeCleanWindows ||
                  gardenSqm || gardenType || gardenOtherDetails
                );

                return (
                  <div key={task.id} className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs p-5 space-y-4 text-xs">
                    
                    {/* ID & Status Badge Header */}
                    <div className="flex justify-between items-start gap-3 border-b border-[#E2E8F0] pb-3">
                      <div>
                        <span className="text-[10px] font-extrabold tracking-wider uppercase text-[#006AFF] bg-[#006AFF]/10 px-2.5 py-1 rounded-md inline-block">
                          {task.booking_code || task.booking_ref || `REF-${task.id}`}
                        </span>
                        <h3 className="text-base font-extrabold text-[#1E2B37] mt-2">
                          {displayProgram}
                        </h3>
                      </div>

                      <span className={`text-[11px] font-bold px-3 py-1 rounded-full border ${
                        isInProgress ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]'
                      }`}>
                        {isInProgress ? 'In Progress' : 'Assigned'}
                      </span>
                    </div>

                    {/* LOCATION & GUEST DETAILS (รวมทั้งหมดเป็นบล็อกเดียว) */}
                    <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0] space-y-2.5">
                      <span className="font-extrabold text-[#1E2B37] text-[11px] uppercase tracking-wider block">
                        LOCATION DETAILS:
                      </span>
                      
                      <div className="space-y-1.5 pl-2.5 border-l-2 border-[#006AFF] text-xs">
                        {/* Guest Name & Phone */}
                        <p className="text-[#475569]">
                          Guest Name: <strong className="text-[#1E2B37] font-bold">{task.customer_name || task.guest_name || details.customer_name || 'Guest'}</strong>
                          {customerPhone && (
                            <span className="ml-2 font-medium">
                              | Phone: <a href={`tel:${customerPhone}`} className="text-[#006AFF] font-bold hover:underline">{customerPhone}</a>
                            </span>
                          )}
                        </p>

                        {/* Date & Time */}
                        <p className="text-[#475569]">
                          Date & Time: <strong className="text-[#1E2B37] font-bold">{task.scheduled_date || task.booking_date || '-'} | {task.scheduled_time || '09:00:00'}</strong>
                        </p>

                        {/* Location Breakdown */}
                        {houseApt && (
                          <p className="text-[#475569]">Apt/House No: <strong className="text-[#1E2B37]">{houseApt}</strong></p>
                        )}
                        {building && (
                          <p className="text-[#475569]">Building/Complex: <strong className="text-[#1E2B37]">{building}</strong></p>
                        )}
                        {addressLine && (
                          <p className="text-[#475569]">Address: <strong className="text-[#1E2B37]">{addressLine}</strong></p>
                        )}
                        {cityArea && (
                          <p className="text-[#475569]">Area/City: <strong className="text-[#1E2B37]">{cityArea}</strong></p>
                        )}
                      </div>

                      {/* Google Maps Link */}
                      {mapsLink && (
                        <div className="pt-1">
                          <a
                            href={mapsLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-bold text-[#006AFF] bg-[#006AFF]/10 hover:bg-[#006AFF] hover:text-white px-3 py-1.5 rounded-lg text-xs transition"
                          >
                            Open Location Link (Google Maps) ↗
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Service Specs */}
                    {hasSpecs && (
                      <div className="space-y-2">
                        <span className="font-extrabold text-[#1E2B37] text-[11px] uppercase tracking-wider block">
                          SERVICE DETAILS & SPECS:
                        </span>

                        <div className="flex flex-wrap gap-2 text-xs">
                          {propertyType && (
                            <div className="bg-[#F8FAFC] px-3 py-2 rounded-xl border border-[#E2E8F0] text-[#475569]">
                              Property: <strong className="text-[#1E2B37] capitalize">{propertyType}</strong>
                            </div>
                          )}
                          {bedrooms !== undefined && bedrooms !== null && bedrooms !== '' && (
                            <div className="bg-[#F8FAFC] px-3 py-2 rounded-xl border border-[#E2E8F0] text-[#475569]">
                              Bedrooms: <strong className="text-[#1E2B37]">{bedrooms}</strong>
                            </div>
                          )}
                          {bathrooms !== undefined && bathrooms !== null && bathrooms !== '' && (
                            <div className="bg-[#F8FAFC] px-3 py-2 rounded-xl border border-[#E2E8F0] text-[#475569]">
                              Bathrooms: <strong className="text-[#1E2B37]">{bathrooms}</strong>
                            </div>
                          )}
                          {balconies !== undefined && balconies !== null && balconies !== '' && (
                            <div className="bg-[#F8FAFC] px-3 py-2 rounded-xl border border-[#E2E8F0] text-[#475569]">
                              Balconies: <strong className="text-[#1E2B37]">{balconies}</strong>
                            </div>
                          )}
                          {officeSqm && (
                            <div className="bg-[#F8FAFC] px-3 py-2 rounded-xl border border-[#E2E8F0] text-[#475569]">
                              Area Size: <strong className="text-[#1E2B37]">{officeSqm} m²</strong>
                            </div>
                          )}
                          {gardenSqm && (
                            <div className="bg-[#F8FAFC] px-3 py-2 rounded-xl border border-[#E2E8F0] text-[#475569]">
                              Garden Area: <strong className="text-[#1E2B37]">{gardenSqm} m²</strong>
                            </div>
                          )}
                        </div>

                        {gardenOtherDetails && (
                          <div className="text-xs text-[#1E2B37] bg-amber-50/70 p-3 rounded-xl border border-amber-200/60 mt-1">
                            <span className="font-bold text-amber-800">Special Note:</span> {gardenOtherDetails}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Button */}
                    <div className="pt-2 flex justify-end border-t border-[#E2E8F0]">
                      {!isInProgress ? (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(task.id, 'In Progress')}
                          disabled={isProcessing}
                          className="w-full sm:w-auto font-bold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer bg-[#006AFF] hover:bg-[#2563EB] text-white shadow-xs disabled:opacity-50 active:scale-98"
                        >
                          {isProcessing ? 'Updating...' : 'Start Job'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(task.id, 'Completed')}
                          disabled={isProcessing}
                          className="w-full sm:w-auto font-bold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer bg-[#008800] hover:bg-[#007000] text-white shadow-xs disabled:opacity-50 active:scale-98"
                        >
                          {isProcessing ? 'Updating...' : 'Complete Job'}
                        </button>
                      )}
                    </div>

                  </div>
                );
              })
            )
          )}

          {/* TAB 2: HISTORY */}
          {activeTab === 'history' && (
            completedTasks.length === 0 ? (
              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-12 text-center text-xs text-[#8E9B9E] font-semibold shadow-2xs">
                No completed tasks in history.
              </div>
            ) : (
              completedTasks.map((task) => (
                <div key={task.id} className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs p-4 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[#006AFF] text-xs">
                      {task.booking_code || task.booking_ref || `REF-${task.id}`}
                    </span>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-[#E6F9E6] text-[#008800] border border-[#CDF4D3]">
                      Completed
                    </span>
                  </div>
                  <div className="text-[11px] text-[#8E9B9E]">
                    Completed on: <span className="font-semibold text-[#1E2B37]">{task.scheduled_date || task.booking_date || 'N/A'}</span>
                  </div>
                </div>
              ))
            )
          )}

          {/* TAB 3: REVIEWS */}
          {activeTab === 'reviews' && (
            feedbacks.length === 0 ? (
              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-12 text-center text-xs text-[#8E9B9E] font-semibold shadow-2xs">
                No guest reviews found.
              </div>
            ) : (
              feedbacks.map((fb) => (
                <div key={fb.id} className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs p-4 space-y-2.5">
                  <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-2">
                    <span className="font-bold text-[#006AFF] text-xs">
                      {fb.booking_ref || `REF-${fb.booking_id}`}
                    </span>
                    <span className="text-[10px] font-bold text-[#1E2B37] bg-[#F8FAFC] border border-[#E2E8F0] px-2.5 py-0.5 rounded-md">
                      Rating: {fb.rating || fb.rating_score || 5} / 5
                    </span>
                  </div>
                  <div className="text-xs text-[#475569] font-medium">
                    Guest: <span className="font-bold text-[#1E2B37]">{fb.resolved_customer_name}</span>
                  </div>
                  <p className="text-xs text-[#1E2B37] italic bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
                    "{fb.comment || 'No comment provided.'}"
                  </p>
                </div>
              ))
            )
          )}

        </div>

      </div>
    </div>
  );
}