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
  } | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const [selectedProgram, setSelectedProgram] = useState<string>('general');

  // ดึงข้อมูล User (Supabase > URL Query > LocalStorage)
  const loadUserData = async () => {
    try {
      setIsLoadingUser(true);

      const nameParam = searchParams.get('customerName') || searchParams.get('name');
      const emailParam = searchParams.get('email');
      const idParam = searchParams.get('userId');

      if (nameParam) {
        setCurrentUser({
          id: idParam || 'usr_sofia',
          name: nameParam,
          email: emailParam || 'sofia.ross@example.com',
        });
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      let user: any = session?.user;

      if (!user) {
        const { data: userData } = await supabase.auth.getUser();
        user = userData?.user;
      }

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, name, email')
          .eq('id', user.id)
          .maybeSingle();

        const name =
          profile?.full_name ||
          profile?.name ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.user_metadata?.user_name ||
          user.email?.split('@')[0] ||
          'Sofia Ross';

        const email = profile?.email || user.email || 'sofia.ross@example.com';

        setCurrentUser({ id: user.id, name, email });
        return;
      }

      const localUser = localStorage.getItem('user') || localStorage.getItem('sb-user');
      if (localUser) {
        const parsed = JSON.parse(localUser);
        setCurrentUser({
          id: parsed.id || 'usr_sofia',
          name: parsed.name || parsed.full_name || 'Sofia Ross',
          email: parsed.email || 'sofia.ross@example.com',
        });
        return;
      }

      setCurrentUser({
        id: 'usr_sofia',
        name: 'Sofia Ross',
        email: 'sofia.ross@example.com',
      });

    } catch (err) {
      console.error('Failed to load user:', err);
      setCurrentUser({
        id: 'usr_sofia',
        name: 'Sofia Ross',
        email: 'sofia.ross@example.com',
      });
    } finally {
      setIsLoadingUser(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

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
      customerName: currentUser?.name || 'Sofia Ross',
      email: currentUser?.email || 'sofia.ross@example.com',
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
    setCurrentUser(null);
    setShowProfileMenu(false);
    router.push('/customer/booking');
  };

  return (
    <div className="w-full min-h-[100dvh] sm:min-h-0 sm:max-w-md bg-white p-6 sm:p-8 sm:rounded-3xl shadow-none sm:shadow-sm border-none sm:border border-slate-100 flex flex-col justify-between items-center relative">
      
      {/* Profile Menu (Top Left) */}
      <div className="absolute top-5 left-5 z-20">
        <button
          type="button"
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition active:scale-95 cursor-pointer touch-manipulation"
        >
          <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
            {isLoadingUser
              ? '...'
              : currentUser?.name
              ? currentUser.name.charAt(0).toUpperCase()
              : 'S'}
          </div>
          <span>Profile</span>
        </button>

        {/* Profile Popup */}
        {showProfileMenu && (
          <div className="absolute left-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 text-left z-30">
            <div className="border-b border-slate-100 pb-2 mb-2">
              <p className="text-xs font-bold text-slate-800">
                {isLoadingUser ? 'Loading...' : currentUser?.name || 'Sofia Ross'}
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                {isLoadingUser ? 'Checking...' : currentUser?.email || 'sofia.ross@example.com'}
              </p>
            </div>

            {currentUser ? (
              <button
                type="button"
                onClick={handleLogout}
                className="w-full text-left text-xs font-medium text-red-600 hover:bg-red-50 p-2 rounded-xl transition cursor-pointer"
              >
                Log out
              </button>
            ) : (
              <p className="text-[10px] text-slate-400 text-center py-1">
                Not logged in
              </p>
            )}
          </div>
        )}
      </div>

      {/* Logo Section */}
      <div className="w-full flex flex-col items-center pt-4 sm:pt-0">
        <Image
          src="/logo.jpeg"
          alt="Company Logo"
          width={130}
          height={130}
          className="object-contain"
          style={{ width: 'auto', height: 'auto' }}
          priority
        />
      </div>

      {/* Form Body */}
      <div className="w-full my-auto py-6 space-y-6">
        <h2 className="text-base font-bold text-slate-800 text-center">
          Select The Program
        </h2>

        <form onSubmit={handleNext} className="w-full space-y-6">
          <div className="space-y-3">
            {programs.map((item) => {
              const isSelected = selectedProgram === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedProgram(item.id)}
                  className={`w-full p-4 rounded-2xl border text-center transition flex flex-col items-center justify-center cursor-pointer touch-manipulation ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <span className="text-sm font-bold text-slate-800">
                    {item.title}
                  </span>
                  {item.subtitle && (
                    <span className="text-xs text-slate-500 mt-1">
                      {item.subtitle}
                    </span>
                  )}
                  <span className="text-sm font-bold text-slate-800 mt-2">
                    {item.price}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 min-h-[48px] bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-semibold rounded-2xl text-sm transition duration-150 cursor-pointer touch-manipulation"
            >
              ← Back
            </button>

            <button
              type="submit"
              className="px-8 py-3 min-h-[48px] bg-slate-700 hover:bg-slate-800 active:bg-slate-900 active:scale-[0.98] text-white font-semibold rounded-2xl text-sm transition duration-150 shadow-sm cursor-pointer touch-manipulation"
            >
              Next
            </button>
          </div>
        </form>
      </div>

      {/* Footer */}
      <div className="w-full pb-4 sm:pb-0 text-center">
        <p className="text-[11px] text-slate-400">
          © Getaway Cleaning Service
        </p>
      </div>

    </div>
  );
}

export default function SelectProgramPage() {
  return (
    <main className="min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center p-0 sm:p-4 text-slate-800 font-sans">
      <Suspense fallback={<div className="text-xs text-slate-500">Loading...</div>}>
        <SelectProgramContent />
      </Suspense>
    </main>
  );
}