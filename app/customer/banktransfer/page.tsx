'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';

function BankTransferContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ดึงค่า Query Parameters
  const room = searchParams.get('room') || '';
  const rawDate = searchParams.get('date') || '';
  const time = searchParams.get('time') || '';
  const program = searchParams.get('program') || '';
  const price = searchParams.get('price') || '';

  // ----------------------------------------------------------------------
  // Dynamic User State & Fetching
  // ----------------------------------------------------------------------
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    email: string;
    phone: string;
  } | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const bankDetails = {
    bankName: 'ALPHA BANK 1 (Rental - Sublets)',
    accountName: 'REALSOL CYPRUS LTD',
    accountNo: '651-101-012445-8',
    iban: 'CY61009006510006511010124458',
    bic: 'ABKLCY2N',
  };

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
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

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      alert('Please upload your payment slip.');
      return;
    }

    setIsSubmitting(true);

    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('slips')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw new Error(`Upload slip failed: ${uploadError.message}`);

      const { data: publicUrlData } = supabase.storage
        .from('slips')
        .getPublicUrl(filePath);

      const slipUrl = publicUrlData.publicUrl;
      const bookingRef = `REF-${Math.floor(100000 + Math.random() * 900000)}`;

      // บันทึกลง Supabase Bookings (เอา customer_phone ออกป้องกัน Column Not Found)
      const { error: insertError } = await supabase.from('bookings').insert([
        {
          booking_code: bookingRef,
          customer_name: currentUser?.name || 'Guest',
          customer_email: currentUser?.email || '',
          room_type: room,
          address: room,
          booking_date: rawDate,
          booking_time: time,
          program: program,
          amount: price,
          payment_slip: slipUrl,
          status: 'Pending',
        },
      ]);

      if (insertError) throw new Error(`Insert booking failed: ${insertError.message}`);

      // ส่ง Email Notification (ส่ง phone ให้ระบบการแจ้งเตือนใช้งานได้ปกติ)
      try {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName: currentUser?.name || 'Guest',
            email: currentUser?.email || '',
            phone: currentUser?.phone || '',
            room: room,
            date: rawDate,
            time: time,
            amount: price,
            paymentMethod: 'Bank Transfer (Slip Uploaded)',
            refNumber: bookingRef,
          }),
        });
      } catch (notifyErr) {
        console.error('Failed to send email notification:', notifyErr);
      }

      // สร้าง Query Parameters โดยระบุ paymentMethod และข้อมูลลูกค้าข้ามไปยัง Confirmation
      const query = new URLSearchParams({
        ref: bookingRef,
        room,
        date: rawDate,
        time,
        program,
        price,
        paymentMethod: 'Bank Transfer',
        customerName: currentUser?.name || '',
        email: currentUser?.email || '',
        phone: currentUser?.phone || '',
      }).toString();

      router.push(`/customer/confirmation?${query}`);
    } catch (err: unknown) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md min-h-[620px] bg-white p-5 sm:p-6 rounded-[32px] shadow-sm border border-slate-100 flex flex-col justify-between items-center relative shrink-0 my-auto">
      
      {/* Header Section */}
      <div className="w-full relative">
        
        {/* Profile Badge */}
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
          Payment
        </h2>
      </div>

      {/* Main Body */}
      <div className="w-full flex-1 flex flex-col justify-between py-4 space-y-4">
        <div className="space-y-4 my-auto">
          
          {/* Bank Account Info */}
          <div>
            <h3 className="text-xs font-bold text-slate-700 mb-2">
              Bank Account Info
            </h3>
            <div className="bg-[#f2fcf7]/50 border border-emerald-100 rounded-2xl p-3.5 text-xs space-y-2.5">
              <div className="font-bold text-[#10b981] border-b border-emerald-100 pb-2 text-xs">
                {bankDetails.bankName}
              </div>

              <div>
                <span className="text-slate-400 text-[10px] block uppercase font-medium">Account Name</span>
                <span className="font-bold text-slate-800 text-xs">{bankDetails.accountName}</span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
                <span className="text-slate-400 text-[10px] block uppercase font-medium">Account No.</span>
                <span className="font-mono font-semibold text-slate-800 text-xs">{bankDetails.accountNo}</span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
                <span className="text-slate-400 text-[10px] block uppercase font-medium">IBAN</span>
                <span className="font-mono font-semibold text-slate-800 break-all text-[11px]">{bankDetails.iban}</span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
                <span className="text-slate-400 text-[10px] block uppercase font-medium">BIC</span>
                <span className="font-mono font-semibold text-slate-800 text-xs">{bankDetails.bic}</span>
              </div>

              {price && (
                <div className="text-center pt-2 border-t border-emerald-100">
                  <span className="text-[#10b981] font-bold text-sm">
                    Amount to pay: {price}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Upload Slip Section */}
          <div>
            <h3 className="text-xs font-bold text-slate-700 mb-2">
              Upload Slip
            </h3>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 px-3 border border-slate-900 rounded-2xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
            >
              {selectedFile ? (
                <span className="text-[#10b981] font-bold truncate text-xs flex items-center gap-1">
                  <span>✓</span> {selectedFile.name}
                </span>
              ) : (
                <span className="text-slate-600 font-medium flex items-center gap-1.5 text-xs">
                  <span>📁</span> Choose File / Photo / Camera
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <form onSubmit={handleConfirm} className="w-full pt-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="w-1/3 py-2.5 min-h-[44px] bg-[#edf2f7] hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-semibold rounded-2xl text-sm transition duration-150 cursor-pointer touch-manipulation text-center"
            >
              ← Back
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-2/3 py-2.5 min-h-[44px] bg-[#27354a] hover:bg-slate-800 active:bg-slate-900 text-white font-semibold rounded-2xl text-sm transition duration-150 cursor-pointer disabled:opacity-50 shadow-sm text-center touch-manipulation"
            >
              {isSubmitting ? 'Uploading Slip...' : 'Confirm'}
            </button>
          </div>
        </form>
      </div>

      {/* Footer */}
      <div className="w-full pt-1 text-center shrink-0">
        <p className="text-[11px] text-slate-400">
          © Getaway Cleaning Service
        </p>
      </div>

    </div>
  );
}

export default function BankTransferPage() {
  return (
    <main className="min-h-[100dvh] bg-[#f8fafc] flex flex-col items-center justify-center p-4 text-slate-800 font-sans">
      <Suspense fallback={<div className="text-xs text-slate-500">Loading payment options...</div>}>
        <BankTransferContent />
      </Suspense>
    </main>
  );
}