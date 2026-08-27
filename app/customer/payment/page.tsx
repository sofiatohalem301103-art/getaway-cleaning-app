'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';

function PaymentOptionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 1. ดึงค่าจาก Query String
  const room = searchParams.get('room') || '';
  const date = searchParams.get('date') || '';
  const time = searchParams.get('time') || '';
  const program = searchParams.get('program') || '';
  const price = searchParams.get('price') || '90€';

  // State สำหรับ Profile User
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // เก็บค่าช่องทางที่ผู้ใช้เลือก ('card' หรือ 'bank')
  const [selectedMethod, setSelectedMethod] = useState<'card' | 'bank'>('card');

  // ดึงข้อมูล User (URL Query > Supabase Auth > LocalStorage)
  const loadUserData = async () => {
    try {
      setIsLoadingUser(true);

      const nameParam = searchParams.get('customerName') || searchParams.get('name');
      const emailParam = searchParams.get('email');
      const idParam = searchParams.get('userId');

      // 1. ดึงจาก URL Query Parameters
      if (nameParam || emailParam) {
        setCurrentUser({
          id: idParam || '',
          name: nameParam || emailParam?.split('@')[0] || 'User',
          email: emailParam || '',
        });
        return;
      }

      // 2. ดึงจาก Supabase Auth Session
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
          '';

        const email = profile?.email || user.email || '';

        setCurrentUser({ id: user.id, name, email });
        return;
      }

      // 3. ดึงจาก localStorage
      const localUser = localStorage.getItem('user') || localStorage.getItem('sb-user');
      if (localUser) {
        const parsed = JSON.parse(localUser);
        setCurrentUser({
          id: parsed.id || '',
          name: parsed.name || parsed.full_name || (parsed.email ? parsed.email.split('@')[0] : ''),
          email: parsed.email || localStorage.getItem('user_email') || '',
        });
        return;
      }

      // 4. กรณีไม่พบข้อมูลผู้ใช้ในทุกช่องทาง
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
  }, []);

  const handleNext = () => {
    const query = new URLSearchParams({
      userId: currentUser?.id || '',
      customerName: currentUser?.name || '',
      email: currentUser?.email || '',
      room,
      date,
      time,
      program,
      price,
    }).toString();

    if (selectedMethod === 'card') {
      router.push(`/customer/cardpayment?${query}`);
    } else {
      router.push(`/customer/banktransfer?${query}`);
    }
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
              : 'U'}
          </div>
          <span>Profile</span>
        </button>

        {/* Profile Popup */}
        {showProfileMenu && (
          <div className="absolute left-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 text-left z-30">
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
                onClick={() => router.push('/login')}
                className="w-full text-left text-xs font-medium text-emerald-600 hover:bg-emerald-50 p-2 rounded-xl transition cursor-pointer"
              >
                Log in
              </button>
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
          Select Payment
        </h2>

        {/* Total Amount Summary */}
        <div className="w-full bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-3.5 text-center">
          <span className="text-xs text-emerald-800 font-medium">Total Amount: </span>
          <span className="text-base font-bold text-emerald-700">{price}</span>
        </div>

        {/* Payment Options Selection */}
        <div className="w-full space-y-3">
          {/* Option 1: Credit / Debit Card */}
          <label
            onClick={() => setSelectedMethod('card')}
            className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition touch-manipulation ${
              selectedMethod === 'card'
                ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-base">
                💳
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Credit / Debit Card</p>
                <p className="text-[11px] text-slate-500">Pay securely with Visa, Mastercard</p>
              </div>
            </div>
            <input
              type="radio"
              name="payment_method"
              checked={selectedMethod === 'card'}
              onChange={() => setSelectedMethod('card')}
              className="accent-emerald-600 w-4 h-4 cursor-pointer"
            />
          </label>

          {/* Option 2: Bank Transfer */}
          <label
            onClick={() => setSelectedMethod('bank')}
            className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition touch-manipulation ${
              selectedMethod === 'bank'
                ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-base">
                🏦
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Bank Transfer</p>
                <p className="text-[11px] text-slate-500">Alpha Bank & upload slip</p>
              </div>
            </div>
            <input
              type="radio"
              name="payment_method"
              checked={selectedMethod === 'bank'}
              onChange={() => setSelectedMethod('bank')}
              className="accent-emerald-600 w-4 h-4 cursor-pointer"
            />
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-2 gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 min-h-[48px] bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-semibold rounded-2xl text-sm transition duration-150 cursor-pointer touch-manipulation"
          >
            ← Back
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="px-8 py-3 min-h-[48px] bg-slate-700 hover:bg-slate-800 active:bg-slate-900 active:scale-[0.98] text-white font-semibold rounded-2xl text-sm transition duration-150 shadow-sm cursor-pointer touch-manipulation"
          >
            Continue
          </button>
        </div>
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

export default function PaymentPage() {
  return (
    <main className="min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center p-0 sm:p-4 text-slate-800 font-sans">
      <Suspense fallback={<div className="text-xs text-slate-500">Loading payment options...</div>}>
        <PaymentOptionsContent />
      </Suspense>
    </main>
  );
}