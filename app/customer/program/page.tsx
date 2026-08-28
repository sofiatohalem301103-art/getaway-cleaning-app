'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';

function SelectProgramContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 1. ดึงค่าจาก Query String
  const room = searchParams.get('room') || '';
  const date = searchParams.get('date') || '';
  const time = searchParams.get('time') || '';

  // State สำหรับ Profile User
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    email: string;
    phone: string;
  } | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const [selectedProgram, setSelectedProgram] = useState<string>('general');

  // ดึงข้อมูล User ( URL Query Params > Supabase Auth > LocalStorage )
  const loadUserData = async () => {
    try {
      setIsLoadingUser(true);

      const nameParam = searchParams.get('customerName') || searchParams.get('name');
      const emailParam = searchParams.get('email');
      const phoneParam = searchParams.get('phone');
      const idParam = searchParams.get('userId') || searchParams.get('id');

      if (nameParam || emailParam || phoneParam) {
        const userDataFromUrl = {
          id: idParam || '',
          name: nameParam || 'sofia',
          email: emailParam || '',
          phone: phoneParam || '0962568961',
        };
        
        setCurrentUser(userDataFromUrl);
        localStorage.setItem('user', JSON.stringify(userDataFromUrl));
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      let user = session?.user;

      if (!user) {
        const { data: userData } = await supabase.auth.getUser();
        user = userData?.user ?? undefined;
      }

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, name, email, phone, phone_number')
          .eq('id', user.id)
          .maybeSingle();

        const name =
          profile?.full_name ||
          profile?.name ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split('@')[0] ||
          'sofia';

        const email = profile?.email || user.email || '';
        const phone = profile?.phone || profile?.phone_number || user.user_metadata?.phone || '0962568961';

        const fetchedUser = { id: user.id, name, email, phone };
        setCurrentUser(fetchedUser);
        localStorage.setItem('user', JSON.stringify(fetchedUser));
        return;
      }

      const localUser = localStorage.getItem('user') || localStorage.getItem('sb-user');
      if (localUser) {
        const parsed = JSON.parse(localUser);
        setCurrentUser({
          id: parsed.id || '',
          name: parsed.name || parsed.full_name || 'sofia',
          email: parsed.email || localStorage.getItem('user_email') || '',
          phone: parsed.phone || parsed.phone_number || '0962568961',
        });
        return;
      }

      setCurrentUser({
        id: '',
        name: 'sofia',
        email: '',
        phone: '0962568961',
      });
    } catch (err) {
      console.error('Failed to load user:', err);
      setCurrentUser({
        id: '',
        name: 'sofia',
        email: '',
        phone: '0962568961',
      });
    } finally {
      setIsLoadingUser(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, [searchParams]);

  const programs = [
    { id: 'general', title: 'General cleaning', subtitle: '', price: '90€' },
    {
      id: 'turnover',
      title: 'Turn over Cleaning',
      subtitle: '(Cleaning & change all sheets and towels)',
      price: '150€',
    },
  ];

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    const programObj = programs.find((p) => p.id === selectedProgram);

    const query = new URLSearchParams({
      userId: currentUser?.id || '',
      customerName: currentUser?.name || 'sofia',
      email: currentUser?.email || '',
      phone: currentUser?.phone || '0962568961',
      room,
      date,
      time,
      program: programObj?.title || 'General cleaning',
      price: programObj?.price || '90€',
    }).toString();

    router.push(`/customer/payment?${query}`);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('user');
    localStorage.removeItem('sb-user');
    localStorage.removeItem('user_email');
    localStorage.removeItem('temp_email');
    setCurrentUser(null);
    setShowProfileMenu(false);
    router.push('/login');
  };

  return (
    <div className="w-full max-w-md min-h-[620px] bg-white p-5 sm:p-6 rounded-[32px] shadow-sm border border-slate-100 flex flex-col justify-between items-center relative shrink-0 my-auto">
      
      {/* Header Section */}
      <div className="w-full relative">
        
        {/* Profile Badge (ดึงขึ้นด้านบนให้ชิดขอบการ์ดมากยิ่งขึ้นด้วย top-[-12px]) */}
        <div className="absolute top-[-12px] left-0 z-10">
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-full py-1 px-2.5 shadow-2xs transition active:scale-95 cursor-pointer touch-manipulation"
          >
            <div className="w-6 h-6 rounded-full bg-[#00875A] text-white flex items-center justify-center text-xs font-bold shrink-0">
              {isLoadingUser
                ? '...'
                : currentUser?.name
                ? currentUser.name.charAt(0).toUpperCase()
                : 'S'}
            </div>
            <div className="flex flex-col text-left pr-0.5 overflow-hidden">
              <span className="text-[11px] font-semibold text-slate-700 leading-tight truncate max-w-[80px] sm:max-w-[95px]">
                {isLoadingUser ? '...' : currentUser?.name || 'sofia'}
              </span>
              <span className="text-[9px] text-slate-400 leading-tight truncate max-w-[80px] sm:max-w-[95px]">
                {isLoadingUser ? '...' : currentUser?.phone || '0962568961'}
              </span>
            </div>
          </button>

          {/* Profile Dropdown Menu */}
          {showProfileMenu && (
            <div className="absolute left-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 text-left z-30">
              <div className="border-b border-slate-100 pb-2 mb-2">
                <p className="text-xs font-bold text-slate-800">
                  {isLoadingUser ? 'Loading...' : currentUser?.name || 'sofia'}
                </p>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                  {isLoadingUser ? 'Checking...' : currentUser?.email || 'No Email'}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {currentUser?.phone || '0962568961'}
                </p>
              </div>

              {currentUser ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full text-left text-xs font-medium text-red-600 hover:bg-red-50 p-1.5 rounded-xl transition cursor-pointer"
                >
                  Log out
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push('/login')}
                  className="w-full text-left text-xs font-medium text-emerald-600 hover:bg-emerald-50 p-1.5 rounded-xl transition cursor-pointer"
                >
                  Log in
                </button>
              )}
            </div>
          )}
        </div>

        {/* Logo Section */}
        <div className="w-full flex justify-center pt-5 pb-1">
          <Image
            src="/logo.jpeg"
            alt="Getaway Cleaning"
            width={160}
            height={65}
            className="object-contain max-h-[60px] w-auto"
            priority
          />
        </div>

        {/* Title */}
        <h2 className="text-base font-bold text-slate-800 text-center mt-3">
          Select The Program
        </h2>
      </div>

      {/* Form & Actions */}
      <form onSubmit={handleNext} className="w-full flex-1 flex flex-col justify-between py-5 space-y-4">
        
        <div className="space-y-3.5 my-auto">
          {programs.map((item) => {
            const isSelected = selectedProgram === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedProgram(item.id)}
                className={`w-full py-4 px-4 rounded-2xl border text-center transition flex flex-col items-center justify-center cursor-pointer touch-manipulation ${
                  isSelected
                    ? 'border-[#10b981] bg-[#f2fcf7] ring-1 ring-[#10b981]/30'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <span className="text-sm font-bold text-slate-800">
                  {item.title}
                </span>
                {item.subtitle && (
                  <span className="text-[11px] text-slate-500 mt-0.5 font-medium">
                    {item.subtitle}
                  </span>
                )}
                <span className="text-sm font-bold text-slate-800 mt-1">
                  {item.price}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex justify-between items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2.5 min-h-[44px] bg-[#edf2f7] hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-semibold rounded-2xl text-sm transition duration-150 cursor-pointer touch-manipulation"
          >
            ← Back
          </button>

          <button
            type="submit"
            className="px-8 py-2.5 min-h-[44px] bg-[#27354a] hover:bg-slate-800 active:bg-slate-900 active:scale-[0.98] text-white font-semibold rounded-2xl text-sm transition duration-150 cursor-pointer touch-manipulation"
          >
            Next
          </button>
        </div>
      </form>

      {/* Footer */}
      <div className="w-full pt-1 text-center shrink-0">
        <p className="text-[11px] text-slate-400">
          © Getaway Cleaning Service
        </p>
      </div>

    </div>
  );
}

export default function SelectProgramPage() {
  return (
    <main className="min-h-[100dvh] bg-[#f8fafc] flex flex-col items-center justify-center p-4 text-slate-800 font-sans">
      <Suspense fallback={<div className="text-xs text-slate-500">Loading...</div>}>
        <SelectProgramContent />
      </Suspense>
    </main>
  );
}