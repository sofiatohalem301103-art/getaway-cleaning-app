'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { User } from '@supabase/supabase-js';

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // ดึงข้อมูล User จาก Supabase Auth
  const loadUserData = async () => {
    try {
      setIsLoadingUser(true);

      const { data: { session } } = await supabase.auth.getSession();
      let user: User | null = session?.user ?? null;

      if (!user) {
        const { data: userData } = await supabase.auth.getUser();
        user = userData?.user ?? null;
      }

      if (user) {
        // ดึงข้อมูล profile เพิ่มเติม (ถ้ามี table profiles)
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, name, email')
          .eq('id', user.id)
          .maybeSingle();

        const email = profile?.email || user.email || '';
        const name =
          profile?.full_name ||
          profile?.name ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          (email ? email.split('@')[0] : 'User');

        setCurrentUser({ id: user.id, name, email });
        return;
      }

      // ดึงจาก LocalStorage สำรองกรณี Auth Session ยังไม่พร้อม
      const localUser = localStorage.getItem('user') || localStorage.getItem('sb-user');
      if (localUser) {
        const parsed = JSON.parse(localUser);
        const email = parsed.email || localStorage.getItem('user_email') || '';
        setCurrentUser({
          id: parsed.id || '',
          name: parsed.name || (email ? email.split('@')[0] : 'User'),
          email,
        });
        return;
      }

      setCurrentUser(null);
    } catch (err) {
      console.error('Failed to load user:', err);
      setCurrentUser(null);
    } finally {
      setIsLoadingUser(false);
    }
  };

  useEffect(() => {
    loadUserData();

    // คอยฟัง Event เมื่อสถานะ Login เปลี่ยนแปลง
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadUserData();
      } else {
        setCurrentUser(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    setCurrentUser(null);
    setShowProfileMenu(false);
    router.push('/login');
  };

  return (
    <div className="relative min-h-screen bg-slate-50">
      {/* Global Profile Bar (มุมซ้ายบน) */}
      <div className="fixed top-4 left-4 z-50">
        <button
          type="button"
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white/90 backdrop-blur border border-slate-200 hover:bg-slate-100 px-3 py-1.5 rounded-xl shadow-sm transition active:scale-95 cursor-pointer touch-manipulation"
        >
          <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
            {isLoadingUser
              ? '...'
              : currentUser?.name
              ? currentUser.name.charAt(0).toUpperCase()
              : 'U'}
          </div>
          <span>Profile</span>
        </button>

        {/* Profile Dropdown Popup */}
        {showProfileMenu && (
          <div className="absolute left-0 mt-2 w-60 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 text-left z-50">
            <div className="border-b border-slate-100 pb-2 mb-2">
              <p className="text-xs font-bold text-slate-800">
                {isLoadingUser ? 'Loading...' : currentUser?.name || 'Guest User'}
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                {isLoadingUser ? 'Checking...' : currentUser?.email || 'No email associated'}
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
              <button
                type="button"
                onClick={() => {
                  setShowProfileMenu(false);
                  router.push('/login');
                }}
                className="w-full text-left text-xs font-medium text-emerald-600 hover:bg-emerald-50 p-2 rounded-xl transition cursor-pointer"
              >
                Log in
              </button>
            )}
          </div>
        )}
      </div>

      {/* Render หน้าลูกๆ (booking, program, payment ฯลฯ) */}
      {children}
    </div>
  );
}