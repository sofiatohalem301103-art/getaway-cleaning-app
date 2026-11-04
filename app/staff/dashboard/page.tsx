'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface StaffUser {
  id: string;
  code?: string;
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

const getLocalToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const parseCleanDateStr = (dateVal: any): string => {
  if (!dateVal) return '';
  const str = String(dateVal).trim();
  const dateOnly = str.includes('T') ? str.split('T')[0] : str.split(' ')[0];
  
  const parts = dateOnly.split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const month = String(parts[1]).padStart(2, '0');
    const day = String(parts[2]).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  return dateOnly;
};

const formatDateDisplay = (dateString: string) => {
  if (!dateString) return '-';
  const cleanDate = parseCleanDateStr(dateString);
  const [year, month, day] = cleanDate.split('-');
  
  if (!year || !month || !day) return dateString;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = months[parseInt(month, 10) - 1] || month;
  
  return `${parseInt(day, 10)} ${monthName} ${year}`;
};

const groupBookingsByDate = (taskList: any[]) => {
  return taskList.reduce((acc: { [key: string]: any[] }, task) => {
    const dateKey = parseCleanDateStr(task.scheduled_date || task.booking_date) || 'Unscheduled';
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(task);
    return acc;
  }, {});
};

export default function StaffDashboardPage() {
  const router = useRouter();
  const [currentStaff, setCurrentStaff] = useState<StaffUser | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'mytasks' | 'upcoming' | 'history' | 'reviews'>('mytasks');

  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const todayStr = getLocalToday();

  const formatRefCode = (rawRef: any, fallbackId: any) => {
    if (rawRef && typeof rawRef === 'string' && rawRef.trim() !== '') {
      const cleanRef = rawRef.trim().toUpperCase().replace(/^REF-/, '');
      return cleanRef.length > 6 ? cleanRef.slice(-6) : cleanRef;
    }
    const strId = String(fallbackId || '').toUpperCase();
    if (strId.length > 6) {
      return strId.slice(-6);
    }
    return strId || 'N/A';
  };

  const loadStaffTasks = useCallback(async (staffId: string, staffName: string) => {
    try {
      const { data: bookingData, error } = await supabase.from('bookings').select('*').order('scheduled_date', { ascending: true });
      if (error) throw error;

      if (bookingData && bookingData.length > 0) {
        const serviceIds = Array.from(new Set(bookingData.map((b: any) => b.service_id).filter(Boolean)));
        let serviceMap: Record<string, string> = {};

        if (serviceIds.length > 0) {
          const { data: servicesData } = await supabase
            .from('services')
            .select('id, name, title, service_name')
            .in('id', serviceIds);

          if (servicesData) {
            servicesData.forEach((s: any) => {
              serviceMap[String(s.id)] = s.name || s.title || s.service_name;
            });
          }
        }

        const enrichedData = bookingData.map((item: any) => {
          let detailsObj: Record<string, any> = {};
          if (item.details) {
            if (typeof item.details === 'string') {
              try { detailsObj = JSON.parse(item.details); } catch (e) { detailsObj = {}; }
            } else if (typeof item.details === 'object') {
              detailsObj = item.details;
            }
          }

          const fromServiceMap = item.service_id ? serviceMap[String(item.service_id)] : null;
          
          const candidateNames = [
            item.program_name,
            fromServiceMap,
            detailsObj.program_name,
            detailsObj.program_title,
            detailsObj.program,
            detailsObj.selectedProgram,
            detailsObj.service_name,
            detailsObj.title,
            item.program,
            item.selected_program,
            item.service_name,
            item.title,
            item.package_name,
            item.room_type,
            item.service_type
          ];

          let actualName = candidateNames.find(
            (val) => Boolean(val) && String(val).trim() !== '' && String(val).trim() !== 'Cleaning Service'
          );

          if (!actualName) {
            actualName = 'Custom Service / Private Booking';
          }

          if (actualName === 'garden' || actualName === 'Garden') {
            actualName = 'Garden Cleaning (Upon Request)';
          }

          return {
            ...item,
            fetched_service_name: actualName,
            service_name: actualName
          };
        });

        const normalize = (str: any) => String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

        const targetIdNorm = normalize(staffId);
        const targetNameNorm = normalize(staffName);

        const numMatch = String(staffId || '').match(/\d+/) || String(staffName || '').match(/\d+/);
        const targetNumber = numMatch ? numMatch[0] : null;

        const myTasks = enrichedData.filter((item: any) => {
          let detailsObj: Record<string, any> = {};
          if (item.details) {
            if (typeof item.details === 'string') {
              try { detailsObj = JSON.parse(item.details); } catch (e) {}
            } else if (typeof item.details === 'object') {
              detailsObj = item.details;
            }
          }

          const possibleStaffValues = [
            item.assigned_staff,
            item.cleaner_id,
            item.staff_id,
            detailsObj.assigned_staff,
            detailsObj.staff_name,
            detailsObj.staff,
            detailsObj.cleaner
          ].filter(Boolean);

          if (possibleStaffValues.length === 0) return false;

          return possibleStaffValues.some((rawVal) => {
            const valNorm = normalize(rawVal);
            if (!valNorm) return false;

            if (valNorm === targetIdNorm || valNorm === targetNameNorm) return true;
            if (targetIdNorm && valNorm.includes(targetIdNorm)) return true;
            if (targetNameNorm && valNorm.includes(targetNameNorm)) return true;
            if (targetIdNorm && targetIdNorm.includes(valNorm)) return true;
            if (targetNameNorm && targetNameNorm.includes(valNorm)) return true;

            if (targetNumber) {
              const valNumMatch = String(rawVal).match(/\d+/);
              if (valNumMatch && valNumMatch[0] === targetNumber) {
                return true;
              }
            }

            return false;
          });
        });

        setTasks(myTasks);
      } else {
        setTasks([]);
      }
    } catch (error: any) {
      console.error('Error loading tasks:', error.message);
    }
  }, []);

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
            let detailsObj: any = {};
            if (typeof b.details === 'string') {
              try { detailsObj = JSON.parse(b.details); } catch (e) {}
            } else if (typeof b.details === 'object' && b.details !== null) {
              detailsObj = b.details;
            }

            const name = b.customer_name || b.name || b.full_name || b.user_name || b.guest_name || detailsObj.customer_name || detailsObj.guest_name;
            if (name && String(name).trim() !== '') {
              const strName = String(name).trim();
              if (b.id) customerNameMap[String(b.id)] = strName;
            }
          });
        }

        const enrichedFeedbacks: FeedbackItem[] = rawFeedbacks.map((item: any) => {
          const directName = item.customer_name || item.name || item.full_name || item.customerName;
          const joinedBookingName = item.bookings?.customer_name || item.bookings?.name || item.bookings?.guest_name;
          const nameFromBookingId = item.booking_id ? customerNameMap[String(item.booking_id)] : null;
          const finalName = directName || joinedBookingName || nameFromBookingId || 'Guest';

          const rawRating = item.rating !== undefined && item.rating !== null ? item.rating : item.rating_score;
          const cleanRating = Number(rawRating) || 0;

          const rawRef = item.booking_ref || item.bookings?.booking_ref || item.bookings?.booking_code;
          const formattedRef = formatRefCode(rawRef, item.booking_id);

          return {
            ...item,
            rating: cleanRating,
            booking_ref: formattedRef,
            resolved_customer_name: String(finalName).trim()
          };
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
      let dbStatus = nextStatus.toLowerCase().replace(/\s+/g, '_');

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

  const todayTasks = tasks.filter((t) => {
    const st = String(t.status || '').toLowerCase();
    const taskDate = parseCleanDateStr(t.scheduled_date || t.booking_date);
    return taskDate === todayStr && st !== 'completed' && st !== 'done';
  });

  const upcomingTasks = tasks.filter((t) => {
    const st = String(t.status || '').toLowerCase();
    const taskDate = parseCleanDateStr(t.scheduled_date || t.booking_date);
    return taskDate > todayStr && st !== 'completed' && st !== 'done';
  });

  const completedTasks = tasks.filter((t) => {
    const st = String(t.status || '').toLowerCase();
    return st === 'completed' || st === 'done';
  });

  const validFeedbacks = feedbacks.filter((f) => Number(f.rating || 0) > 0);
  const avgRating = validFeedbacks.length > 0
    ? (validFeedbacks.reduce((acc, curr) => acc + Number(curr.rating || 0), 0) / validFeedbacks.length).toFixed(1)
    : '0.0';

  const formattedStaffCode = currentStaff.id ? (currentStaff.id.length > 6 ? currentStaff.id.slice(-6).toUpperCase() : currentStaff.id.toUpperCase()) : 'GW-S1';

  const renderTaskCard = (task: any) => {
    const st = String(task.status || '').toLowerCase();
    const isInProgress = st === 'in_progress' || st === 'in progress';
    const isProcessing = loadingId === task.id;

    let details: Record<string, any> = {};
    if (task.details) {
      if (typeof task.details === 'string') {
        try { details = JSON.parse(task.details); } catch (e) { details = {}; }
      } else if (typeof task.details === 'object') {
        details = task.details;
      }
    }

    const assignedByAdmin = 
      task.assigned_by || 
      details.admin_name || 
      details.assigned_by || 
      (details.assigned_by_admin ? 'Admin' : null);

    const possibleProgramNames = [
      task.program_name, details.program_name, details.program_title, details.program, details.selectedProgram, details.service_name, details.title,
      task.program, task.selected_program, task.service_name, task.title, task.package_name, task.room_type, task.fetched_service_name
    ];

    let foundProgram = possibleProgramNames.find(
      (val) => Boolean(val) && String(val).trim() !== '' && String(val).trim() !== 'Cleaning Service'
    );
    if (!foundProgram) foundProgram = task.service_type || 'Cleaning Service';
    if (foundProgram === 'garden' || foundProgram === 'Garden') foundProgram = 'Garden Cleaning (Upon Request)';
    const displayProgram = foundProgram;

    const guestName = task.customer_name || details.customer_name || details.guest_name || details.name || details.full_name || details.customer || task.guest_name || task.full_name || task.name || task.customer || task.client_name || 'Guest';
    const customerPhone = task.customer_phone || task.phone || details.customer_phone || details.phone || '';

    const addressLine = task.address || task.address_line || details.address || details.address_line || details.property || '';
    const cityArea = details.city_area || details.city || details.area || task.city_area || task.city || '';
    const building = details.building_complex || details.building || details.buildingComplex || task.building_complex || task.building || '';
    const houseApt = details.house_apt || details.apartment_house_no || details.apartmentHouseNo || task.house_apt || task.apartment_house_no || '';
    const mapsLink = details.google_maps_link || details.googleMapsLink || details.mapLink || task.map_link || task.google_maps_link;

    const propertyType = details.property_type || details.propertyType || task.property_type;
    const bedrooms = details.bedrooms ?? task.bedrooms;
    const bathrooms = details.bathrooms ?? task.bathrooms;
    const balconies = details.balconies ?? details.office_balconies ?? details.verandahs ?? task.balconies;

    const officeSqm = details.office_sqm || task.office_sqm;
    const officeToilets = details.office_toilets || task.office_toilets;
    const officeCleanWindows = details.office_clean_windows || task.office_clean_windows;

    const gardenSqm = details.garden_sqm || details.area_size || task.garden_sqm || task.area_size;
    const gardenOtherDetails = task.notes || details.garden_other_details || details.garden_notes || task.garden_other_details;

    const hasSpecs = Boolean(
      propertyType || (bedrooms !== undefined && bedrooms !== null && bedrooms !== '') ||
      (bathrooms !== undefined && bathrooms !== null && bathrooms !== '') ||
      (balconies !== undefined && balconies !== null && balconies !== '') ||
      officeSqm || officeToilets || officeCleanWindows ||
      gardenSqm || gardenOtherDetails
    );

    const taskRefCode = formatRefCode(task.booking_code || task.booking_ref, task.id);

    return (
      <div key={task.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4 text-xs">
        
        {/* ID & Status Badge Header */}
        <div className="flex justify-between items-start gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold tracking-wider uppercase text-[#006AFF] bg-blue-50 px-2.5 py-1 rounded-md inline-block">
                REF-{taskRefCode}
              </span>

              {assignedByAdmin && (
                <span className="text-[10px] font-normal text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md inline-block">
                  Assigned by: <strong className="text-slate-800 font-semibold">{assignedByAdmin}</strong>
                </span>
              )}
            </div>

            {/* ชื่องาน: เด่นที่สุดในส่วนหัว */}
            <h3 className="text-base font-bold text-slate-900 mt-2">
              {displayProgram}
            </h3>
          </div>

          <span className={`text-[11px] font-semibold px-3 py-1 rounded-full border shrink-0 ${
            isInProgress ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}>
            {isInProgress ? 'In Progress' : 'Assigned'}
          </span>
        </div>

        {/* LOCATION & GUEST DETAILS */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
          <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider block">
            LOCATION DETAILS:
          </span>
          
          <div className="space-y-1.5 pl-2.5 border-l-2 border-[#006AFF] text-xs">
            <p className="text-slate-600 font-normal">
              Guest Name: <strong className="text-slate-900 font-bold">{guestName}</strong>
              {customerPhone && (
                <span className="ml-2 font-normal">
                  | Phone: <a href={`tel:${customerPhone}`} className="text-[#006AFF] font-bold hover:underline">{customerPhone}</a>
                </span>
              )}
            </p>

            <p className="text-slate-600 font-normal">
              Date & Time: <strong className="text-slate-900 font-bold">{parseCleanDateStr(task.scheduled_date || task.booking_date) || '-'} | {task.scheduled_time || '09:00:00'}</strong>
            </p>

            {houseApt && (
              <p className="text-slate-600 font-normal">Apt/House No: <strong className="text-slate-900 font-bold">{houseApt}</strong></p>
            )}
            {building && (
              <p className="text-slate-600 font-normal">Building/Complex: <strong className="text-slate-900 font-bold">{building}</strong></p>
            )}
            {addressLine && (
              <p className="text-slate-600 font-normal">Address: <strong className="text-slate-900 font-bold">{addressLine}</strong></p>
            )}
            {cityArea && (
              <p className="text-slate-600 font-normal">Area/City: <strong className="text-slate-900 font-bold">{cityArea}</strong></p>
            )}
          </div>

          {mapsLink && (
            <div className="pt-1">
              <a
                href={mapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-bold text-[#006AFF] bg-blue-50 hover:bg-[#006AFF] hover:text-white px-3 py-1.5 rounded-lg text-xs transition"
              >
                Open Location Link (Google Maps) ↗
              </a>
            </div>
          )}
        </div>

        {/* Service Specs */}
        {hasSpecs && (
          <div className="space-y-2">
            <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider block">
              SERVICE DETAILS & SPECS:
            </span>

            <div className="flex flex-wrap gap-2 text-xs">
              {propertyType && (
                <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-normal">
                  Property: <strong className="text-slate-900 font-semibold capitalize">{propertyType}</strong>
                </div>
              )}
              {bedrooms !== undefined && bedrooms !== null && bedrooms !== '' && (
                <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-normal">
                  Bedrooms: <strong className="text-slate-900 font-semibold">{bedrooms}</strong>
                </div>
              )}
              {bathrooms !== undefined && bathrooms !== null && bathrooms !== '' && (
                <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-normal">
                  Bathrooms: <strong className="text-slate-900 font-semibold">{bathrooms}</strong>
                </div>
              )}
              {balconies !== undefined && balconies !== null && balconies !== '' && (
                <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-normal">
                  Balconies: <strong className="text-slate-900 font-semibold">{balconies}</strong>
                </div>
              )}
              {officeSqm && (
                <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-normal">
                  Area Size: <strong className="text-slate-900 font-semibold">{officeSqm} m²</strong>
                </div>
              )}
              {gardenSqm && (
                <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-normal">
                  Garden Area: <strong className="text-slate-900 font-semibold">{gardenSqm} m²</strong>
                </div>
              )}
            </div>

            {gardenOtherDetails && (
              <div className="text-xs text-slate-900 bg-amber-50/70 p-3 rounded-xl border border-amber-200/60 mt-1">
                <span className="font-bold text-amber-800">Special Note:</span> <span className="font-normal">{gardenOtherDetails}</span>
              </div>
            )}
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2 flex justify-end border-t border-slate-100">
          {!isInProgress ? (
            <button
              type="button"
              onClick={() => handleUpdateStatus(task.id, 'In Progress')}
              disabled={isProcessing}
              className="w-full sm:w-auto font-bold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer bg-[#006AFF] hover:bg-blue-700 text-white shadow-xs disabled:opacity-50 active:scale-98"
            >
              {isProcessing ? 'Updating...' : 'Start Job'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleUpdateStatus(task.id, 'Completed')}
              disabled={isProcessing}
              className="w-full sm:w-auto font-bold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs disabled:opacity-50 active:scale-98"
            >
              {isProcessing ? 'Updating...' : 'Complete Job'}
            </button>
          )}
        </div>

      </div>
    );
  };

  const renderGroupedTasks = (taskList: any[]) => {
    const grouped = groupBookingsByDate(taskList);
    const sortedDates = Object.keys(grouped).sort();

    if (sortedDates.length === 0) {
      return (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-xs text-slate-400 font-medium shadow-xs">
          No tasks found.
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {sortedDates.map((dateKey) => (
          <div key={dateKey} className="space-y-3">
            <div className="flex items-center gap-3 my-3">
              <div className="h-[1px] flex-1 bg-slate-200"></div>
              <div className="bg-slate-100 border border-slate-300 text-slate-700 font-bold px-3.5 py-1 rounded-full text-xs shadow-xs flex items-center gap-1.5">
                 📅 {formatDateDisplay(dateKey)}
              </div>
              <div className="h-[1px] flex-1 bg-slate-200"></div>
            </div>

            {grouped[dateKey].map((task) => renderTaskCard(task))}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen p-2 sm:p-4 md:p-6 font-sans bg-slate-50 text-slate-900">
      <div className="max-w-7xl mx-auto space-y-4">
        
        {/* Section Header Tag */}
        <div className="text-xs font-semibold pl-1 text-slate-400 uppercase tracking-wider">
          STAFF DASHBOARD
        </div>

        {/* 1. Header Box */}
        <div className="rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-3 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                Getaway Staff Dashboard
              </h1>
              <p className="text-xs font-normal text-slate-500 mt-0.5">
                Task Management & Dispatch System (Realtime)
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="font-bold text-xs px-3.5 py-1.5 rounded-xl transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shadow-xs bg-rose-600 hover:bg-rose-700 text-white self-start sm:self-auto"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs font-medium text-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse inline-block" />
            <span>Staff: <strong className="font-bold text-[#006AFF]">{currentStaff.name}</strong></span>
          </div>
        </div>

        {/* 2. System Overview Box */}
        <div className="rounded-xl border border-slate-200 shadow-xs p-3 space-y-2 bg-white">
          <h2 className="text-[11px] sm:text-xs font-bold text-slate-800 uppercase tracking-wider">
            SYSTEM OVERVIEW
          </h2>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-2">
            
            {/* Card 1: Status */}
            <div className="border border-slate-200 rounded-lg p-2 space-y-1 bg-slate-50">
              <div className="flex justify-between items-center">
                <span className="font-bold text-[11px] sm:text-xs text-slate-900 truncate">{formattedStaffCode}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse inline-block" />
              </div>
              <p className="text-[9px] sm:text-[10px] text-slate-400 font-normal">Status</p>
              <div className="border-t border-slate-200 pt-1 flex justify-between items-center text-[9px] sm:text-[10px]">
                <span className="font-bold text-emerald-700">Available</span>
              </div>
            </div>

            {/* Card 2: Today Jobs */}
            <div className="border border-slate-200 rounded-lg p-2 space-y-1 bg-slate-50">
              <div className="flex justify-between items-center">
                <span className="font-bold text-[11px] sm:text-xs text-slate-900 truncate">Today Jobs</span>
                <span className="w-2 h-2 rounded-full bg-[#006AFF] inline-block" />
              </div>
              <p className="text-[9px] sm:text-[10px] text-slate-400 font-normal">Pending Tasks</p>
              <div className="border-t border-slate-200 pt-1 flex justify-between items-center text-[9px] sm:text-[10px] text-slate-500">
                <span className="font-normal">Count:</span>
                <span className="font-black text-slate-900 text-xs sm:text-sm">{todayTasks.length}</span>
              </div>
            </div>

            {/* Card 3: Upcoming Jobs */}
            <div className="border border-slate-200 rounded-lg p-2 space-y-1 bg-slate-50">
              <div className="flex justify-between items-center">
                <span className="font-bold text-[11px] sm:text-xs text-slate-900 truncate">Upcoming</span>
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              </div>
              <p className="text-[9px] sm:text-[10px] text-slate-400 font-normal">Future Tasks</p>
              <div className="border-t border-slate-200 pt-1 flex justify-between items-center text-[9px] sm:text-[10px] text-slate-500">
                <span className="font-normal">Count:</span>
                <span className="font-black text-slate-900 text-xs sm:text-sm">{upcomingTasks.length}</span>
              </div>
            </div>

            {/* Card 4: Rating */}
            <div className="border border-slate-200 rounded-lg p-2 space-y-1 bg-slate-50">
              <div className="flex justify-between items-center">
                <span className="font-bold text-[11px] sm:text-xs text-slate-900 truncate">Rating</span>
                <span className="text-[10px] font-bold text-amber-600">★ Star</span>
              </div>
              <p className="text-[9px] sm:text-[10px] text-slate-400 font-normal">Guest Rating</p>
              <div className="border-t border-slate-200 pt-1 flex justify-between items-center text-[9px] sm:text-[10px]">
                <span className="font-bold text-amber-700">★ {avgRating}</span>
                <span className="text-slate-400 font-normal">/ 5.0</span>
              </div>
            </div>

          </div>
        </div>

        {/* 3. Navigation Tabs */}
        <div className="rounded-2xl border border-slate-200 shadow-xs p-2.5 sm:p-3 bg-white">
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
            <button
              onClick={() => setActiveTab('history')}
              className={`py-1.5 px-1 sm:px-2 rounded-xl border text-[11px] sm:text-xs text-center transition cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-blue-50 border-blue-300 text-[#006AFF] font-bold'
                  : 'bg-white border-slate-200 text-slate-700 font-medium hover:bg-slate-50'
              }`}
            >
              History ({completedTasks.length})
            </button>

            <button
              onClick={() => setActiveTab('mytasks')}
              className={`py-1.5 px-1 sm:px-2 rounded-xl border text-[11px] sm:text-xs text-center transition cursor-pointer ${
                activeTab === 'mytasks'
                  ? 'bg-blue-50 border-blue-300 text-[#006AFF] font-bold'
                  : 'bg-white border-slate-200 text-slate-700 font-medium hover:bg-slate-50'
              }`}
            >
              Today ({todayTasks.length})
            </button>

            <button
              onClick={() => setActiveTab('upcoming')}
              className={`py-1.5 px-1 sm:px-2 rounded-xl border text-[11px] sm:text-xs text-center transition cursor-pointer ${
                activeTab === 'upcoming'
                  ? 'bg-blue-50 border-blue-300 text-[#006AFF] font-bold'
                  : 'bg-white border-slate-200 text-slate-700 font-medium hover:bg-slate-50'
              }`}
            >
              Upcoming ({upcomingTasks.length})
            </button>

            <button
              onClick={markFeedbacksAsRead}
              className={`py-1.5 px-1 sm:px-2 rounded-xl border text-[11px] sm:text-xs text-center transition cursor-pointer relative ${
                activeTab === 'reviews'
                  ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold'
                  : 'bg-white border-slate-200 text-slate-700 font-medium hover:bg-slate-50'
              }`}
            >
              Reviews ({feedbacks.length})
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 4. Tab Content Area */}
        <div className="space-y-4">
          
          {activeTab === 'mytasks' && renderGroupedTasks(todayTasks)}
          {activeTab === 'upcoming' && renderGroupedTasks(upcomingTasks)}
          {activeTab === 'history' && renderGroupedTasks(completedTasks)}

          {activeTab === 'reviews' && (
            feedbacks.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-xs text-slate-400 font-medium shadow-xs">
                No guest reviews found.
              </div>
            ) : (
              feedbacks.map((fb) => (
                <div key={fb.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-2.5">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="font-bold text-[#006AFF] text-xs">
                      REF-{fb.booking_ref}
                    </span>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                      ★ {fb.rating || 0} / 5
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 font-normal">
                    Guest: <strong className="font-bold text-slate-900">{fb.resolved_customer_name}</strong>
                  </div>
                  <p className="text-xs text-slate-800 italic bg-slate-50 p-3 rounded-xl border border-slate-200 font-normal leading-relaxed">
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