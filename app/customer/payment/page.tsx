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
    phone: string;
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
      const phoneParam = searchParams.get('phone');
      const idParam = searchParams.get('userId') || searchParams.get('id');

      // 1. ตรวจสอบข้อมูลจาก URL Query String
      if (nameParam || emailParam || phoneParam) {
        const userDataFromUrl = {
          id: idParam || '',
          name: nameParam || 'Guest',
          email: emailParam || '',
          phone: phoneParam || '',
        };
        
        setCurrentUser(userDataFromUrl);
        localStorage.setItem('user', JSON.stringify(userDataFromUrl));
        return;
      }

      // 2. ดึงข้อมูลจาก Supabase Auth & Table profiles
      const { data: { session } } = await supabase.auth.getSession();
      let user = session?.user;

      if (!user) {
        const { data: userData } = await supabase.auth.getUser();
        user = userData?.user ?? undefined;
      }

      if (user) {
        // ค้นหาข้อมูลจากตาราง profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        const name =
          profile?.full_name ||
          profile?.name ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split('@')[0] ||
          'User';

        const email = profile?.email || user.email || '';
        
        // ดึงเบอร์โทรศัพท์ตามลำดับความสำคัญ (Profile DB > Metadata)
        const phone = 
          profile?.phone || 
          profile?.phone_number || 
          profile?.mobile || 
          user.user_metadata?.phone || 
          user.user_metadata?.phone_number || 
          '';

        const fetchedUser = { id: user.id, name, email, phone };
        setCurrentUser(fetchedUser);
        localStorage.setItem('user', JSON.stringify(fetchedUser));
        return;
      }

      // 3. Fallback ไปดูใน LocalStorage
      const localUser = localStorage.getItem('user') || localStorage.getItem('sb-user');
      if (localUser) {
        const parsed = JSON.parse(localUser);
        setCurrentUser({
          id: parsed.id || '',
          name: parsed.name || parsed.full_name || 'User',
          email: parsed.email || localStorage.getItem('user_email') || '',
          phone: parsed.phone || parsed.phone_number || parsed.mobile || '',
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
  }, [searchParams]);

  const handleNext = () => {
    const query = new URLSearchParams({
      userId: currentUser?.id || '',
      customerName: currentUser?.name || '',
      email: currentUser?.email || '',
      phone: currentUser?.phone || '',
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
    <div className="w-full min-h-[100dvh] sm:min-h-0 sm:max-w-md bg-white p-5 sm:p-6 rounded-none sm:rounded-[32px] shadow-none sm:shadow-sm border-0 sm:border border-slate-100 flex flex-col justify-between items-center relative overflow-y-auto my-auto">
      
      {/* Header Section */}
      <div className="w-full relative shrink-0">
        
        {/* Profile Badge */}
        <div className="absolute top-0 left-0 z-10">
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
                : 'U'}
            </div>
            <div className="flex flex-col text-left pr-0.5 overflow-hidden">
              <span className="text-[11px] font-semibold text-slate-700 leading-tight truncate max-w-[80px] sm:max-w-[95px]">
                {isLoadingUser ? '...' : currentUser?.name || 'Guest'}
              </span>
              {currentUser?.phone && (
                <span className="text-[9px] text-slate-400 leading-tight truncate max-w-[80px] sm:max-w-[95px]">
                  {isLoadingUser ? '...' : currentUser.phone}
                </span>
              )}
            </div>
          </button>

          {/* Profile Dropdown Menu */}
          {showProfileMenu && (
            <div className="absolute left-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 text-left z-30">
              <div className="border-b border-slate-100 pb-2 mb-2">
                <p className="text-xs font-bold text-slate-800">
                  {isLoadingUser ? 'Loading...' : currentUser?.name || 'Guest'}
                </p>
                {currentUser?.email && (
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {currentUser.email}
                  </p>
                )}
                {currentUser?.phone && (
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {currentUser.phone}
                  </p>
                )}
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
        <div className="w-full flex justify-center pt-8 sm:pt-4 pb-1">
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
          Select Payment
        </h2>
      </div>

      {/* Form Body */}
      <div className="w-full flex-1 flex flex-col justify-between py-5 space-y-4 my-auto shrink-0">
        <div className="space-y-4 my-auto">
          {/* Total Amount Summary */}
          <div className="w-full bg-[#f2fcf7] border border-[#10b981]/30 rounded-2xl p-3.5 text-center">
            <span className="text-xs text-slate-600 font-medium">Total Amount: </span>
            <span className="text-base font-bold text-[#10b981]">{price}</span>
          </div>

          {/* Payment Options Selection */}
          <div className="w-full space-y-3">
            {/* Option 1: Credit / Debit Card */}
            <label
              onClick={() => setSelectedMethod('card')}
              className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition touch-manipulation ${
                selectedMethod === 'card'
                  ? 'border-[#10b981] bg-[#f2fcf7] ring-1 ring-[#10b981]/30'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* SVG Icon บัตรเครดิต */}
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[#10b981] flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
                  </svg>
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
                className="accent-[#10b981] w-4 h-4 cursor-pointer shrink-0"
              />
            </label>

            {/* Option 2: Bank Transfer */}
            <label
              onClick={() => setSelectedMethod('bank')}
              className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition touch-manipulation ${
                selectedMethod === 'bank'
                  ? 'border-[#10b981] bg-[#f2fcf7] ring-1 ring-[#10b981]/30'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* SVG Icon ธนาคาร */}
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM2 22h19v-3H2v3zm14-12v7h3v-7h-3zm-4.5-9L2 6v2h19V6l-9.5-5z" />
                  </svg>
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
                className="accent-[#10b981] w-4 h-4 cursor-pointer shrink-0"
              />
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2.5 min-h-[44px] bg-[#edf2f7] hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-semibold rounded-2xl text-sm transition duration-150 cursor-pointer touch-manipulation"
          >
            ← Back
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="px-8 py-2.5 min-h-[44px] bg-[#27354a] hover:bg-slate-800 active:bg-slate-900 active:scale-[0.98] text-white font-semibold rounded-2xl text-sm transition duration-150 cursor-pointer touch-manipulation"
          >
            Continue
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full pt-2 pb-1 text-center shrink-0">
        <p className="text-[11px] text-slate-400">
          © Getaway Cleaning Service
        </p>
      </div>

    </div>
  );
}

export default function PaymentPage() {
  return (
    <main className="w-full min-h-[100dvh] bg-white sm:bg-[#f8fafc] flex flex-col items-center justify-center p-0 sm:p-4 text-slate-800 font-sans overflow-x-hidden">
      <Suspense fallback={<div className="text-xs text-slate-500 p-4">Loading payment options...</div>}>
        <PaymentOptionsContent />
      </Suspense>
    </main>
  );
}