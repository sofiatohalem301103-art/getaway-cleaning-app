'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface HeaderProps {
  title?: string;
}

// ตัด flag ออก เหลือเฉพาะ code และ iso เพื่อความคลีนและแก้ปัญหาตัวอักษรซ้ำบน Windows
const COUNTRY_CODES = [
  { code: '+357', iso: 'CY' },
  { code: '+44', iso: 'GB' },
  { code: '+1', iso: 'US' },
  { code: '+66', iso: 'TH' },
  { code: '+7', iso: 'RU' },
  { code: '+972', iso: 'IL' },
  { code: '+49', iso: 'DE' },
  { code: '+33', iso: 'FR' },
  { code: '+39', iso: 'IT' },
  { code: '+34', iso: 'ES' },
  { code: '+31', iso: 'NL' },
  { code: '+32', iso: 'BE' },
  { code: '+41', iso: 'CH' },
  { code: '+43', iso: 'AT' },
  { code: '+46', iso: 'SE' },
  { code: '+47', iso: 'NO' },
  { code: '+45', iso: 'DK' },
  { code: '+358', iso: 'FI' },
  { code: '+353', iso: 'IE' },
  { code: '+48', iso: 'PL' },
  { code: '+30', iso: 'GR' },
  { code: '+380', iso: 'UA' },
  { code: '+40', iso: 'RO' },
  { code: '+420', iso: 'CZ' },
  { code: '+36', iso: 'HU' },
  { code: '+351', iso: 'PT' },
  { code: '+971', iso: 'AE' },
  { code: '+966', iso: 'SA' },
  { code: '+974', iso: 'QA' },
  { code: '+81', iso: 'JP' },
  { code: '+82', iso: 'KR' },
  { code: '+86', iso: 'CN' },
  { code: '+852', iso: 'HK' },
  { code: '+886', iso: 'TW' },
  { code: '+65', iso: 'SG' },
  { code: '+60', iso: 'MY' },
  { code: '+61', iso: 'AU' },
  { code: '+64', iso: 'NZ' },
  { code: '+91', iso: 'IN' },
  { code: '+27', iso: 'ZA' },
  { code: '+55', iso: 'BR' },
  { code: '+52', iso: 'MX' },
];

function HeaderContent({ title = 'Booking Service' }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<any>(null);
  const [profileName, setProfileName] = useState<string>('');
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const profileDropdownRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    countryCode: '+357',
    customCode: '',
    phoneNumber: '',
  });

  const isCustomerArea = pathname?.includes('/customer');
  const isOtpStep = 
    pathname?.includes('/verify') || 
    pathname?.includes('/otp') || 
    searchParams?.get('step') === 'verify' ||
    searchParams?.has('email');

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
    if (digits.length <= 8) return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
    return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 9)}`;
  };

  const parsePhone = (rawPhone: string) => {
    if (!rawPhone) return { code: '+357', custom: '', num: '' };
    
    // เรียงรหัสที่ยาวกว่าขึ้นก่อน ป้องกันกรณีจับคู่ผิด
    const sortedCodes = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
    const matched = sortedCodes.find(c => rawPhone.startsWith(c.code));
    
    if (matched) {
      const rawNum = rawPhone.replace(matched.code, '').trim();
      return { code: matched.code, custom: '', num: formatPhoneNumber(rawNum) };
    }

    // ตรวจสอบกรณีเป็นรหัสประเทศอื่นนอกรายการ
    const customMatch = rawPhone.match(/^(\+\d{1,4})/);
    if (customMatch) {
      const customCode = customMatch[1];
      const rawNum = rawPhone.replace(customCode, '').trim();
      return { code: 'OTHER', custom: customCode, num: formatPhoneNumber(rawNum) };
    }

    return { code: '+357', custom: '', num: formatPhoneNumber(rawPhone.trim()) };
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const loadUserData = async () => {
      const savedFirstName = localStorage.getItem('user_first_name') || '';
      const savedLastName = localStorage.getItem('user_last_name') || '';
      const savedName = localStorage.getItem('user_name') || `${savedFirstName} ${savedLastName}`.trim();
      const savedEmail = localStorage.getItem('user_email') || '';
      const savedPhone = localStorage.getItem('user_phone') || '';

      const { code, custom, num } = parsePhone(savedPhone);

      if (savedName) setProfileName(savedName);

      setFormData({
        firstName: savedFirstName || savedName.split(' ')[0] || '',
        lastName: savedLastName || savedName.split(' ').slice(1).join(' ') || '',
        email: savedEmail,
        countryCode: code,
        customCode: custom,
        phoneNumber: num,
      });

      if (supabase) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          setUser(authUser);
          
          const currentUserEmail = authUser.email || savedEmail;
          const providerData = authUser.user_metadata;
          let fullName = providerData?.full_name || providerData?.name || savedName;
          
          let extractedFirstName = providerData?.given_name || providerData?.first_name || '';
          let extractedLastName = providerData?.family_name || providerData?.last_name || '';

          if (!extractedFirstName && fullName) {
            const parts = fullName.split(' ');
            extractedFirstName = parts[0] || '';
            extractedLastName = parts.slice(1).join(' ') || '';
          }

          const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .maybeSingle();

          if (userData) {
            fullName = userData.full_name || fullName;
            const fullPhone = userData.phone || savedPhone;
            const parsed = parsePhone(fullPhone);

            const profileNameParts = fullName ? fullName.split(' ') : [];
            const pFirstName = profileNameParts[0] || extractedFirstName || savedFirstName;
            const pLastName = profileNameParts.slice(1).join(' ') || extractedLastName || savedLastName;

            setFormData({
              firstName: pFirstName,
              lastName: pLastName,
              email: userData.email || currentUserEmail || savedEmail,
              countryCode: parsed.code,
              customCode: parsed.custom,
              phoneNumber: parsed.num,
            });
          } else {
            setFormData(prev => ({
              ...prev,
              firstName: extractedFirstName || prev.firstName,
              lastName: extractedLastName || prev.lastName,
              email: currentUserEmail || savedEmail,
            }));
          }

          if (fullName) setProfileName(fullName);
        }
      }
    };

    loadUserData();
  }, [pathname, searchParams]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, phoneNumber: formatPhoneNumber(e.target.value) });
  };

  const handleCustomCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^\d+]/g, '');
    if (!val.startsWith('+')) {
      val = '+' + val.replace(/\+/g, '');
    }
    setFormData({ ...formData, customCode: val });
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const activeCode = formData.countryCode === 'OTHER' 
      ? formData.customCode.trim() 
      : formData.countryCode;

    const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim();
    const fullPhone = `${activeCode} ${formData.phoneNumber.trim()}`.trim();
    const finalEmail = formData.email.trim() || localStorage.getItem('user_email') || user?.email || '';

    localStorage.setItem('user_first_name', formData.firstName);
    localStorage.setItem('user_last_name', formData.lastName);
    localStorage.setItem('user_name', fullName);
    localStorage.setItem('user_email', finalEmail);
    localStorage.setItem('user_phone', fullPhone);

    try {
      if (supabase && finalEmail) {
        const cleanEmail = finalEmail.toLowerCase();
        let targetUserId = user?.id;

        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (existingUser?.id) {
          targetUserId = existingUser.id;
        } else if (!targetUserId) {
          let guestId = localStorage.getItem('guest_user_id');
          if (!guestId) {
            guestId = crypto.randomUUID();
            localStorage.setItem('guest_user_id', guestId);
          }
          targetUserId = guestId;
        }

        const { error: userError } = await supabase.from('users').upsert({
          id: targetUserId,
          full_name: fullName,
          email: cleanEmail,
          phone: fullPhone,
          role: 'customer',
        }, { onConflict: 'id' });

        if (userError) {
          console.error('Supabase users Insert Error:', userError.message);
          alert(`Profile Save Error: ${userError.message}`);
        } else {
          localStorage.setItem('user_id', targetUserId);
        }

        if (user) {
          await supabase.auth.updateUser({
            data: { full_name: fullName, phone: fullPhone }
          });
        }
      }
    } catch (err) {
      console.error('Error saving profile:', err);
    }

    setProfileName(fullName);
    setLoading(false);
    setIsProfileModalOpen(false);
  };

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
      setUser(null);
      localStorage.clear();
      setProfileName('');
      setIsProfileDropdownOpen(false);
      router.push('/auth/login');
    }
  };

  if (
    pathname === '/' ||
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/staff') ||
    pathname?.startsWith('/auth')
  ) {
    return null;
  }

  return (
    <>
      <header className="w-full bg-white border-b border-[#E2E8F0] shadow-xs sticky top-0 z-40">
        <div className="w-full px-4 sm:px-8 sm:px-12 h-20 sm:h-28 flex justify-between items-center">
          
          <div className="flex items-center h-full py-1">
            <img 
              src="/getaway-cleaning-logo-transparent__1_-removebg-preview.png" 
              alt="Getaway Cleaning Logo" 
              className="h-16 sm:h-24 w-auto object-contain transition-all cursor-pointer hover:scale-[1.02]"
              onClick={() => router.push('/customer/booking')}
            />
          </div>

          <div className="flex items-center gap-4">
            <h1 className="hidden md:block text-sm sm:text-base font-semibold text-[#8E9B9E] shrink-0">
              {title}
            </h1>

            {user || isCustomerArea ? (
              <div className="relative" ref={profileDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#0F172A] hover:text-[#0082CD] transition-colors cursor-pointer py-1"
                >
                  <span className="underline decoration-2 underline-offset-4 truncate max-w-[120px] sm:max-w-none">
                    {profileName || 'Profile'}
                  </span>
                  <span className="text-[10px]">▼</span>
                </button>

                {isProfileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50">
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        setIsProfileModalOpen(true);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-[#0082CD] transition cursor-pointer"
                    >
                      Profile & Settings
                    </button>

                    <div className="border-t border-slate-100 my-1" />

                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        router.push('/customer/history');
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-[#0082CD] transition flex items-center gap-2 cursor-pointer"
                    >
                      <span>History</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        router.push('/customer/feedback');
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-[#0082CD] transition flex items-center gap-2 cursor-pointer"
                    >
                      <span>Feedback</span>
                    </button>

                    <div className="border-t border-slate-100 my-1" />

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2.5 text-xs sm:text-sm font-bold text-rose-500 hover:bg-rose-50 transition flex items-center justify-between cursor-pointer"
                    >
                      <span>Log out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : isOtpStep ? (
              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-600">
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse" />
                <span>Verifying...</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => router.push('/auth/login')}
                className="text-xs sm:text-sm font-bold text-[#0F172A] hover:text-[#0082CD] transition-colors cursor-pointer underline decoration-2 underline-offset-4"
              >
                Login
              </button>
            )}
          </div>

        </div>
      </header>

      {/* MODAL PROFILE */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 p-6 sm:p-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-[#0F172A]">Profile Details</h3>
                <p className="text-xs text-slate-400 mt-0.5">Edit your personal details & preferences</p>
              </div>
              <button 
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    placeholder="John"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm font-medium focus:outline-none focus:border-[#0082CD] focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm font-medium focus:outline-none focus:border-[#0082CD] focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  disabled={Boolean(user?.email)} 
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-base sm:text-sm font-medium transition ${
                    user?.email 
                      ? 'bg-slate-100 text-slate-500 cursor-not-allowed' 
                      : 'bg-slate-50 focus:bg-white focus:border-[#0082CD]'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Phone Number</label>
                <div className="flex gap-2">
                  <div className="w-[110px] shrink-0">
                    <select
                      value={formData.countryCode}
                      onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
                      className="w-full px-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#0082CD] focus:bg-white transition appearance-none cursor-pointer text-slate-700"
                    >
                      {COUNTRY_CODES.map((c, index) => (
                        <option key={`${c.code}-${index}`} value={c.code}>
                          {c.code} ({c.iso})
                        </option>
                      ))}
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  {formData.countryCode === 'OTHER' && (
                    <div className="w-[85px] shrink-0">
                      <input
                        type="text"
                        required
                        placeholder="+000"
                        value={formData.customCode}
                        onChange={handleCustomCodeChange}
                        className="w-full px-2.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#0082CD] focus:bg-white transition text-center"
                      />
                    </div>
                  )}

                  <div className="flex-1">
                    <input
                      type="tel"
                      required
                      placeholder="99 123 456"
                      value={formData.phoneNumber}
                      onChange={handlePhoneChange}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm font-medium focus:outline-none focus:border-[#0082CD] focus:bg-white transition"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="w-1/2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-1/2 py-3 bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-sm rounded-xl transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default function Header(props: HeaderProps) {
  return (
    <Suspense fallback={null}>
      <HeaderContent {...props} />
    </Suspense>
  );
}