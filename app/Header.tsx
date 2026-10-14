'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface HeaderProps {
  title?: string;
}

const COUNTRY_CODES = [
  { code: '+357', flag: '🇨🇾' },
  { code: '+44', flag: '🇬🇧' },
  { code: '+7', flag: '🇷🇺' },
  { code: '+972', flag: '🇮🇱' },
  { code: '+49', flag: '🇩🇪' },
  { code: '+33', flag: '🇫🇷' },
  { code: '+380', flag: '🇺🇦' },
  { code: '+1', flag: '🇺🇸' },
  { code: '+66', flag: '🇹🇭' },
];

export default function Header({ title = 'Booking Service' }: HeaderProps) {
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
    if (!rawPhone) return { code: '+357', num: '' };
    const matched = COUNTRY_CODES.find(c => rawPhone.startsWith(c.code));
    if (matched) {
      const rawNum = rawPhone.replace(matched.code, '').trim();
      return { code: matched.code, num: formatPhoneNumber(rawNum) };
    }
    const cleanNum = rawPhone.replace(/^\+357/, '').trim();
    return { code: '+357', num: formatPhoneNumber(cleanNum) };
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

      const { code, num } = parsePhone(savedPhone);

      if (savedName) setProfileName(savedName);

      setFormData({
        firstName: savedFirstName || savedName.split(' ')[0] || '',
        lastName: savedLastName || savedName.split(' ').slice(1).join(' ') || '',
        email: savedEmail,
        countryCode: code,
        phoneNumber: num,
      });

      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUser(user);
          
          const currentUserEmail = user.email || savedEmail;
          const providerData = user.user_metadata;
          let fullName = providerData?.full_name || providerData?.name || savedName;
          
          let extractedFirstName = providerData?.given_name || providerData?.first_name || '';
          let extractedLastName = providerData?.family_name || providerData?.last_name || '';

          if (!extractedFirstName && fullName) {
            const parts = fullName.split(' ');
            extractedFirstName = parts[0] || '';
            extractedLastName = parts.slice(1).join(' ') || '';
          }

          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

          if (profile) {
            fullName = profile.full_name || profile.name || fullName;
            const fullPhone = profile.phone || profile.mobile || savedPhone;
            const parsed = parsePhone(fullPhone);

            setFormData({
              firstName: profile.first_name || extractedFirstName || savedFirstName,
              lastName: profile.last_name || extractedLastName || savedLastName,
              email: profile.email || currentUserEmail,
              countryCode: parsed.code,
              phoneNumber: parsed.num,
            });
          } else {
            setFormData(prev => ({
              ...prev,
              firstName: extractedFirstName || prev.firstName,
              lastName: extractedLastName || prev.lastName,
              email: currentUserEmail,
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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim();
    const fullPhone = `${formData.countryCode} ${formData.phoneNumber.trim()}`.trim();

    localStorage.setItem('user_first_name', formData.firstName);
    localStorage.setItem('user_last_name', formData.lastName);
    localStorage.setItem('user_name', fullName);
    localStorage.setItem('user_email', formData.email);
    localStorage.setItem('user_phone', fullPhone);

    try {
      if (supabase && user) {
        await supabase.from('profiles').upsert({
          id: user.id,
          full_name: fullName,
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: fullPhone,
          updated_at: new Date().toISOString(),
        });

        await supabase.auth.updateUser({
          data: { full_name: fullName, phone: fullPhone }
        });
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
                  <div className="w-[95px] shrink-0">
                    <select
                      value={formData.countryCode}
                      onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
                      className="w-full px-2.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm font-medium focus:outline-none focus:border-[#0082CD] focus:bg-white transition appearance-none cursor-pointer text-slate-700"
                    >
                      {COUNTRY_CODES.map((c, index) => (
                        <option key={`${c.code}-${index}`} value={c.code}>
                          {c.flag} {c.code}
                        </option>
                      ))}
                    </select>
                  </div>

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