'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';

function CardPaymentContent() {
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

  // State สำหรับ ฟอร์มบัตร
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ดึงข้อมูล User
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

  // ฟอร์แมตเลขบัตร
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
  };

  // ฟอร์แมต MM/YY
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (value.length >= 2) {
      value = value.slice(0, 2) + '/' + value.slice(2);
    }
    setExpiryDate(value);
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const query = new URLSearchParams({
      userId: currentUser?.id || '',
      customerName: currentUser?.name || '',
      email: currentUser?.email || '',
      room,
      date,
      time,
      program,
      price,
      paymentMethod: 'card',
    }).toString();

    setTimeout(() => {
      setIsSubmitting(false);
      router.push(`/customer/success?${query}`);
    }, 1500);
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
      <form onSubmit={handleNext} className="w-full my-auto py-6 space-y-5 text-left">
        <h2 className="text-base sm:text-lg font-bold text-[#1e293b]">
          Credit / Debit Card Payment
        </h2>

        <div className="w-full space-y-4">
          {/* 1. Card Number */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">
              Card Number
            </label>
            <input
              type="text"
              inputMode="numeric"
              required
              placeholder="1234 5678 9012 3456"
              value={cardNumber}
              onChange={handleCardNumberChange}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-base sm:text-sm text-slate-700 placeholder-slate-400 outline-none transition touch-manipulation tracking-wider"
            />
          </div>

          {/* 2. Cardholder Name */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">
              Cardholder Name
            </label>
            <input
              type="text"
              required
              placeholder="NAME ON CARD"
              value={cardHolder}
              onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck="false"
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-base sm:text-sm text-slate-700 placeholder-slate-400 outline-none transition touch-manipulation uppercase"
            />
          </div>

          {/* 3. Expiry & CVV/CVC */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">
                Expiry (MM/YY)
              </label>
              <input
                type="text"
                inputMode="numeric"
                required
                placeholder="MM/YY"
                value={expiryDate}
                onChange={handleExpiryChange}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-base sm:text-sm text-slate-700 placeholder-slate-400 outline-none transition touch-manipulation text-center"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">
                CVV/CVC
              </label>
              <input
                type="password"
                inputMode="numeric"
                required
                maxLength={4}
                placeholder="123"
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-base sm:text-sm text-slate-700 placeholder-slate-400 outline-none transition touch-manipulation text-center"
              />
            </div>
          </div>
        </div>

        {/* Action Button: Pay Now */}
        <div className="pt-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-[#00a66c] hover:bg-[#008f5d] active:bg-[#00784e] text-white font-bold rounded-2xl text-base transition duration-150 shadow-sm cursor-pointer touch-manipulation disabled:opacity-50"
          >
            {isSubmitting ? 'Processing...' : `Pay ${price} Now`}
          </button>
        </div>
      </form>

      {/* Footer */}
      <div className="w-full pb-4 sm:pb-0 text-center">
        <p className="text-[11px] text-slate-400">
          © Getaway Cleaning Service
        </p>
      </div>

    </div>
  );
}

export default function CardPaymentPage() {
  return (
    <main className="min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center p-0 sm:p-4 text-slate-800 font-sans">
      <Suspense fallback={<div className="text-xs text-slate-500">Loading card payment...</div>}>
        <CardPaymentContent />
      </Suspense>
    </main>
  );
}