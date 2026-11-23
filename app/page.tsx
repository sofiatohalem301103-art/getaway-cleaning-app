'use client';

export const dynamic = 'force-dynamic';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function StartCustomerPage() {
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const [user, setUser] = useState<any>(null);
  const [profileName, setProfileName] = useState<string>('');
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

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
    const handleScroll = () => {
      const currentScroll =
        window.scrollY ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0;

      setIsScrolled(currentScroll > 20);
      setShowBackToTop(currentScroll > 300);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    const loadLoginStatus = async () => {
      try {
        if (supabase) {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (authUser) {
            setUser(authUser);

            let fullName =
              authUser.user_metadata?.full_name ||
              authUser.user_metadata?.name ||
              '';

            const { data: userData } = await supabase
              .from('users')
              .select('full_name')
              .eq('id', authUser.id)
              .maybeSingle();

            if (userData?.full_name) {
              fullName = userData.full_name;
            }

            if (!fullName) {
              const first = localStorage.getItem('user_first_name') || '';
              const last = localStorage.getItem('user_last_name') || '';
              fullName =
                localStorage.getItem('user_name') ||
                `${first} ${last}`.trim();
            }

            setProfileName(fullName || authUser.email || 'Profile');
            return;
          }
        }

        const savedFirst = localStorage.getItem('user_first_name') || '';
        const savedLast = localStorage.getItem('user_last_name') || '';
        const savedName =
          localStorage.getItem('user_name') ||
          `${savedFirst} ${savedLast}`.trim();

        if (savedName) {
          setProfileName(savedName);
        }
      } catch (err) {
        console.error('Error loading login status on home page:', err);
      }
    };

    loadLoginStatus();
  }, []);

  const handleLogout = async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error('Error signing out:', err);
    }
    setUser(null);
    setProfileName('');
    setIsProfileDropdownOpen(false);
    localStorage.clear();
    sessionStorage.clear();
    router.push('/auth/login');
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
    document.documentElement.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const minBookingDateString = useMemo(() => {
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 2);
    return minDate.toISOString().split('T')[0];
  }, []);

  const getBookingUrl = (programName?: string) => {
    const params = new URLSearchParams();
    params.set('startDate', minBookingDateString);
    if (programName) params.set('program', programName);

    const targetBookingPath = `/customer/booking?${params.toString()}`;
    if (user || profileName) {
      return targetBookingPath;
    }
    return `/auth/login?redirect=${encodeURIComponent(targetBookingPath)}`;
  };

  return (
    <main className="min-h-screen w-full bg-[#F8FAFC] text-[#1E2B37] font-sans antialiased overflow-x-hidden relative">
      
      {/* ================= NAVIGATION BAR (FIXED TOP HEADER) ================= */}
      <nav 
        className={`fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300 ${
          isScrolled 
            ? 'bg-white/95 backdrop-blur-md shadow-md border-b border-slate-200/80 py-0' 
            : 'bg-white/90 backdrop-blur-md border-b border-slate-100 py-1 sm:py-1.5'
        }`}
      >
        <div 
          className={`max-w-7xl mx-auto px-3.5 sm:px-6 md:px-12 flex items-center justify-between gap-2 transition-all duration-300 ${
            isScrolled ? 'h-16 sm:h-20' : 'h-20 sm:h-24'
          }`}
        >
          
          {/* Logo Brand ใน Navbar */}
          <button
            type="button"
            onClick={scrollToTop}
            className="flex items-center gap-2 group py-1 cursor-pointer shrink-0 touch-manipulation"
          >
            <img 
              src="/getaway-cleaning-logo-transparent__1_-removebg-preview.png" 
              alt="Getaway Cleaning Logo" 
              className={`w-auto object-contain transition-all duration-300 group-hover:scale-105 ${
                isScrolled ? 'h-11 sm:h-14' : 'h-14 sm:h-18 md:h-24'
              }`}
            />
          </button>

          <div className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-medium text-slate-600">
            <a href="#home" className="hover:text-[#006AFF] transition">Home</a>
            <a href="#about" className="hover:text-[#006AFF] transition">About Us</a>
            <a href="#how-it-works" className="hover:text-[#006AFF] transition">How It Works</a>
            <a href="#services" className="hover:text-[#006AFF] transition">Services Program</a>
          </div>

          <div className="shrink-0 flex items-center gap-2 sm:gap-4 min-w-0">
            {(user || profileName) && (
              <div className="relative" ref={profileDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="flex items-center gap-1 text-[11px] sm:text-sm font-bold text-[#0F172A] hover:text-[#006AFF] transition-colors cursor-pointer py-1 touch-manipulation"
                >
                  <span className="underline decoration-2 underline-offset-4 truncate max-w-[85px] sm:max-w-[160px]">
                    {profileName || 'Profile'}
                  </span>
                  <span className="text-[9px] sm:text-[10px] shrink-0">▼</span>
                </button>

                {isProfileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 sm:w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 sm:py-2 z-50">
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        router.push('/customer/booking?setup_profile=true');
                      }}
                      className="w-full text-left px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-[#006AFF] transition cursor-pointer"
                    >
                      <span>Profile & Settings</span>
                    </button>

                    <div className="border-t border-slate-100 my-1" />

                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        router.push('/customer/history');
                      }}
                      className="w-full text-left px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-[#006AFF] transition flex items-center gap-2 cursor-pointer"
                    >
                      <span>History</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        router.push('/customer/feedback');
                      }}
                      className="w-full text-left px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-[#006AFF] transition flex items-center gap-2 cursor-pointer"
                    >
                      <span>Feedback</span>
                    </button>

                    <div className="border-t border-slate-100 my-1" />

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-rose-500 hover:bg-rose-50 transition flex items-center justify-between cursor-pointer"
                    >
                      <span>Log out</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            <a 
              href={getBookingUrl()}
              className={`inline-flex items-center justify-center bg-[#006AFF] hover:bg-[#2563EB] text-white font-bold rounded-full shadow-md shadow-blue-500/20 transition-all duration-300 cursor-pointer whitespace-nowrap touch-manipulation ${
                isScrolled 
                  ? 'px-3.5 sm:px-5 py-1.5 text-[11px] sm:text-xs' 
                  : 'px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm'
              }`}
            >
              Book Now
            </a>
          </div>

        </div>
      </nav>

      {/* ================= SECTION 1: HERO BANNER ================= */}
      <section id="home" className="relative w-full bg-gradient-to-b from-[#EBF5FF]/60 via-[#F8FAFC] to-[#F8FAFC] pt-24 sm:pt-28 md:pt-32 pb-12 sm:py-16 md:pb-20 px-4 sm:px-8 md:px-12 overflow-hidden">
        
        {/* Subtle Ambient Glow */}
        <div className="absolute top-10 right-10 w-72 sm:w-96 h-72 sm:h-96 bg-blue-200/30 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Content Left */}
          <div className="lg:col-span-7 min-w-0 space-y-4 sm:space-y-6 text-left">
            
            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-blue-50 border border-blue-100 text-[#006AFF] px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-semibold tracking-wide">
              <span>GETAWAY CLEANING — PAPHOS, CYPRUS</span>
            </div>
            
            {/* Main Title */}
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-[1.18] sm:leading-[1.15] break-words">
              A Cleaner Space. <br />
              <span className="text-[#006AFF]">A Better Life.</span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-slate-600 text-sm sm:text-base md:text-lg max-w-xl font-normal leading-relaxed">
              Professional Cleaning Services You Can Trust. Enjoy a spotless, fresh, and welcoming space without the stress. We provide reliable, high-quality cleaning for homes and offices with attention to every detail.
            </p>

            {/* Commitment Box */}
            <div className="p-3.5 sm:p-4 bg-white rounded-xl sm:rounded-2xl border border-slate-100 shadow-xs inline-block">
              <p className="text-xs sm:text-sm font-medium text-slate-700">
                Your Space, Our Care, Our Commitment to Excellence.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 pt-1 sm:pt-2">
              <a 
                href={getBookingUrl()} 
                className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-[#006AFF] hover:bg-[#2563EB] text-white font-bold rounded-xl sm:rounded-2xl shadow-xl shadow-blue-500/25 transition transform active:scale-98 text-center text-xs sm:text-sm tracking-wide cursor-pointer touch-manipulation"
              >
                BOOK YOUR CLEANING TODAY!
              </a>
              <a 
                href="#services" 
                className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold rounded-xl sm:rounded-2xl transition text-center text-xs sm:text-sm shadow-xs cursor-pointer active:scale-98 touch-manipulation"
              >
                Explore Services
              </a>
            </div>

            {/* Open Date Status */}
            <div className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-500 font-normal pt-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="leading-tight">Bookings open from {minBookingDateString} (2 days in advance) | Mon–Sat, 09:00–16:00</span>
            </div>

          </div>

          {/* Image Right */}
          <div className="lg:col-span-5 min-w-0 relative mt-6 lg:mt-0">
            <div className="relative rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white bg-slate-100">
              <img 
                src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80" 
                alt="Clean & Spotless Living Room" 
                className="w-full h-[280px] sm:h-[400px] md:h-[480px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
            </div>

            {/* Floating Promise Card */}
            <div className="absolute -bottom-4 left-3 right-3 sm:right-auto sm:-bottom-6 sm:-left-6 bg-white/95 backdrop-blur-md p-3.5 sm:p-5 rounded-xl sm:rounded-2xl shadow-xl border border-slate-100 flex items-center gap-3 sm:gap-4 max-w-xs">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 text-[#006AFF] rounded-xl flex items-center justify-center font-bold text-lg sm:text-xl shrink-0">✓</div>
              <div className="min-w-0">
                <p className="text-[9px] sm:text-[10px] uppercase font-semibold tracking-wider text-slate-400">Our Promise</p>
                <p className="text-[11px] sm:text-xs font-bold text-slate-800 leading-snug">
                  Quality you can see and freshness you can feel
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ================= SECTION 2: ABOUT US ================= */}
      <section id="about" className="py-14 sm:py-16 px-4 sm:px-8 md:px-12 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="text-center space-y-1.5 sm:space-y-2">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#006AFF]">Why Choose Us</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">About Getaway Cleaning</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-50 text-[#006AFF] rounded-xl flex items-center justify-center font-bold text-base sm:text-lg">✓</div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Professional & Reliable</h3>
              <p className="text-xs text-slate-500 font-normal leading-relaxed">Trusted housekeeping team dedicated to quality service.</p>
            </div>

            <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-50 text-[#006AFF] rounded-xl flex items-center justify-center font-bold text-base sm:text-lg">✓</div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Exceptional Attention</h3>
              <p className="text-xs text-slate-500 font-normal leading-relaxed">Attentive to every detail and reachable surface in your space.</p>
            </div>

            <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-50 text-[#006AFF] rounded-xl flex items-center justify-center font-bold text-base sm:text-lg">✓</div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Flexible Solutions</h3>
              <p className="text-xs text-slate-500 font-normal leading-relaxed">Tailored for regular cleaning, one-time general or deep clean.</p>
            </div>

            <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-50 text-[#006AFF] rounded-xl flex items-center justify-center font-bold text-base sm:text-lg">✓</div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Guaranteed Freshness</h3>
              <p className="text-xs text-slate-500 font-normal leading-relaxed">Leaving your property neat, hygienic, fresh, and presentable.</p>
            </div>

          </div>
        </div>
      </section>

      {/* ================= SECTION 3: HOW IT WORKS ================= */}
      <section id="how-it-works" className="py-14 sm:py-20 px-4 sm:px-8 md:px-12 bg-slate-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto space-y-10 sm:space-y-12">
          
          <div className="text-center space-y-2 sm:space-y-3 max-w-2xl mx-auto">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#006AFF]">Simple Step-by-Step Process</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900">How It Works</h2>
            <p className="text-xs sm:text-sm text-slate-500 font-normal">We make booking and arranging your cleaning service simple and hassle-free.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 relative">
            
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-2.5 sm:space-y-3 min-w-0">
              <span className="text-3xl sm:text-4xl font-black text-[#006AFF]/20">01</span>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">Book & Contact</h3>
              <p className="text-xs text-slate-600 font-normal leading-relaxed">
                Contact us to book your cleaning service or submit a request online.
              </p>
            </div>

            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-2.5 sm:space-y-3 min-w-0">
              <span className="text-3xl sm:text-4xl font-black text-[#006AFF]/20">02</span>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">Property Inspection</h3>
              <p className="text-xs text-slate-600 font-normal leading-relaxed">
                Our housekeeping team will arrange an inspection of your property.
              </p>
            </div>

            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-2.5 sm:space-y-3 min-w-0">
              <span className="text-3xl sm:text-4xl font-black text-[#006AFF]/20">03</span>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">Tailored Quotation</h3>
              <p className="text-xs text-slate-600 font-normal leading-relaxed">
                A quotation will be provided based on size, condition, and requirements.
              </p>
            </div>

            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-2.5 sm:space-y-3 min-w-0">
              <span className="text-3xl sm:text-4xl font-black text-[#006AFF]/20">04</span>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">Service Executed</h3>
              <p className="text-xs text-slate-600 font-normal leading-relaxed">
                Once approved, we will arrange and deliver your professional clean.
              </p>
            </div>

          </div>

          <div className="bg-blue-50/80 border border-blue-100 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center max-w-3xl mx-auto">
            <p className="text-xs sm:text-sm text-[#006AFF] font-medium leading-relaxed">
              <strong className="font-bold">Fast Response Guarantee:</strong> Once your booking request is received, our Customer Care Administration team will get back to you within the same day!
            </p>
          </div>

        </div>
      </section>

      {/* ================= SECTION 4: 4 SERVICE PROGRAMS ================= */}
      <section id="services" className="py-14 sm:py-20 px-4 sm:px-8 md:px-12 bg-white">
        <div className="max-w-7xl mx-auto space-y-12 sm:space-y-16">
          
          <div className="text-center space-y-2 sm:space-y-3 max-w-2xl mx-auto">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#006AFF]">Tailored Cleaning Solutions</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900">Our 4 Cleaning Programs</h2>
            <p className="text-xs sm:text-sm text-slate-500 font-normal">Choose the perfect program tailored to your property, office, or outdoor space.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            
            {/* 1. GENERAL CLEANING */}
            <div className="bg-slate-50 rounded-2xl sm:rounded-3xl border border-slate-200/80 overflow-hidden flex flex-col justify-between hover:shadow-lg transition group min-w-0">
              <div>
                <div className="h-44 sm:h-52 w-full overflow-hidden relative">
                  <img 
                    src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80" 
                    alt="General Cleaning Service" 
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute top-3 left-3 sm:top-4 sm:left-4">
                    <span className="bg-white/90 backdrop-blur-md text-[#006AFF] text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-xs">
                      Routine Maintenance
                    </span>
                  </div>
                </div>

                <div className="p-5 sm:p-8 space-y-3 sm:space-y-4">
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900">General Cleaning</h3>
                  <p className="text-xs text-slate-600 font-normal leading-relaxed">
                    General cleaning is a routine cleaning service designed to maintain cleanliness, hygiene, and overall appearance of a property.
                  </p>

                  <div className="pt-1 sm:pt-2 space-y-2">
                    <p className="text-[11px] sm:text-xs font-semibold text-slate-800 uppercase tracking-wider">The service includes:</p>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 text-xs text-slate-700">
                      <li className="flex items-start gap-2 font-normal"><span className="text-[#006AFF] font-bold">✓</span> Dusting reachable surfaces & furniture</li>
                      <li className="flex items-start gap-2 font-normal"><span className="text-[#006AFF] font-bold">✓</span> Sweeping, vacuuming & mopping floors</li>
                      <li className="flex items-start gap-2 font-normal"><span className="text-[#006AFF] font-bold">✓</span> Kitchen countertops, sink & appliance exterior</li>
                      <li className="flex items-start gap-2 font-normal"><span className="text-[#006AFF] font-bold">✓</span> Disinfecting toilets, sinks, showers & mirrors</li>
                      <li className="flex items-start gap-2 font-normal"><span className="text-[#006AFF] font-bold">✓</span> Living areas & bedrooms tidying / bed making</li>
                      <li className="flex items-start gap-2 font-normal"><span className="text-[#006AFF] font-bold">✓</span> Wiping door handles & touchpoints</li>
                      <li className="flex items-start gap-2 font-normal"><span className="text-[#006AFF] font-bold">✓</span> Cleaning accessible mirrors & glass</li>
                      <li className="flex items-start gap-2 font-normal"><span className="text-[#006AFF] font-bold">✓</span> Bin emptying & liner replacement</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. DEEP CLEANING */}
            <div className="bg-slate-50 rounded-2xl sm:rounded-3xl border border-slate-200/80 overflow-hidden flex flex-col justify-between hover:shadow-lg transition group relative min-w-0">
              <div>
                <div className="h-44 sm:h-52 w-full overflow-hidden relative">
                  <img 
                    src="https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=800&q=80" 
                    alt="Deep Cleaning Service" 
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute top-3 left-3 sm:top-4 sm:left-4">
                    <span className="bg-amber-100/90 backdrop-blur-md text-amber-900 text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-xs">
                      Deep Clean
                    </span>
                  </div>
                  <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
                    <span className="bg-[#006AFF] text-white text-[9px] sm:text-[10px] font-bold uppercase px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full tracking-wider shadow-xs">
                      Intensive & Detailed
                    </span>
                  </div>
                </div>

                <div className="p-5 sm:p-8 space-y-3 sm:space-y-4">
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900">Deep Cleaning</h3>
                  <p className="text-xs text-slate-600 font-normal leading-relaxed">
                    Intensive cleaning service intended to remove accumulated dirt, grease, grime, and build-up.
                  </p>

                  <div className="pt-1 sm:pt-2 space-y-2">
                    <p className="text-[11px] sm:text-xs font-semibold text-slate-800 uppercase tracking-wider">In addition to general cleaning, includes:</p>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 text-xs text-slate-700">
                      <li className="flex items-start gap-2 font-normal"><span className="text-[#006AFF] font-bold">✓</span> Detailed dusting: skirting boards & frames</li>
                      <li className="flex items-start gap-2 font-normal"><span className="text-[#006AFF] font-bold">✓</span> Kitchen deep clean: grease, hobs & oven</li>
                      <li className="flex items-start gap-2 font-normal"><span className="text-[#006AFF] font-bold">✓</span> Bathroom scrubbing: tiles, grout & limescale</li>
                      <li className="flex items-start gap-2 font-normal"><span className="text-[#006AFF] font-bold">✓</span> Detailed floor edges & beneath movable furniture</li>
                      <li className="flex items-start gap-2 font-normal"><span className="text-[#006AFF] font-bold">✓</span> Doors, handles & woodwork dirt removal</li>
                      <li className="flex items-start gap-2 font-normal"><span className="text-[#006AFF] font-bold">✓</span> Interior windows, glass panels & mirrors</li>
                      <li className="flex items-start gap-2 font-normal"><span className="text-[#006AFF] font-bold">✓</span> Hard-to-reach accessible area cleaning</li>
                      <li className="flex items-start gap-2 font-normal"><span className="text-[#006AFF] font-bold">✓</span> Final sanitising & thorough inspection</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="px-5 pb-5 sm:px-8 sm:pb-8">
                <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-3.5 border border-slate-200/80 text-[10px] sm:text-[11px] text-slate-500 font-normal">
                  <strong className="font-semibold text-slate-700">NOTE:</strong> Fridges, curtains, carpets steam, and construction debris are available upon separate request.
                </div>
              </div>
            </div>

            {/* 3. OFFICE CLEANING */}
            <div className="bg-slate-50 rounded-2xl sm:rounded-3xl border border-slate-200/80 overflow-hidden flex flex-col justify-between hover:shadow-lg transition group min-w-0">
              <div>
                <div className="h-44 sm:h-52 w-full overflow-hidden relative">
                  <img 
                    src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80" 
                    alt="Office Cleaning Service" 
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute top-3 left-3 sm:top-4 sm:left-4">
                    <span className="bg-white/90 backdrop-blur-md text-[#006AFF] text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-xs">
                      Commercial & Workspaces
                    </span>
                  </div>
                </div>

                <div className="p-5 sm:p-8 space-y-3 sm:space-y-4">
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900">Office Cleaning</h3>
                  <p className="text-xs text-slate-600 font-normal leading-relaxed">
                    Tailored professional cleaning for corporate offices and commercial spaces.
                  </p>

                  <div className="pt-1 sm:pt-2 space-y-2">
                    <p className="text-[11px] sm:text-xs font-semibold text-slate-800 uppercase tracking-wider">The service includes:</p>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 text-xs text-slate-700">
                      <li className="flex items-start gap-2 font-normal"><span className="text-[#006AFF] font-bold">✓</span> Workstation & desk surface dusting</li>
                      <li className="flex items-start gap-2 font-normal"><span className="text-[#006AFF] font-bold">✓</span> Reception & meeting room care</li>
                      <li className="flex items-start gap-2 font-normal"><span className="text-[#006AFF] font-bold">✓</span> Office pantry & kitchenette sanitisation</li>
                      <li className="flex items-start gap-2 font-normal"><span className="text-[#006AFF] font-bold">✓</span> Restroom cleaning & disinfection</li>
                      <li className="flex items-start gap-2 font-normal"><span className="text-[#006AFF] font-bold">✓</span> Floor sweeping, vacuuming & mopping</li>
                      <li className="flex items-start gap-2 font-normal"><span className="text-[#006AFF] font-bold">✓</span> High-touchpoint sanitising</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. GARDEN CLEANING */}
            <div className="bg-slate-50 rounded-2xl sm:rounded-3xl border border-slate-200/80 overflow-hidden flex flex-col justify-between hover:shadow-lg transition group min-w-0">
              <div>
                <div className="h-44 sm:h-52 w-full overflow-hidden relative">
                  <img 
                    src="https://images.unsplash.com/photo-1558904541-efa843a96f01?auto=format&fit=crop&w=800&q=80" 
                    alt="Garden Cleaning Service" 
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute top-3 left-3 sm:top-4 sm:left-4">
                    <span className="bg-emerald-100/90 backdrop-blur-md text-emerald-800 text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-xs">
                      Outdoor & Patio
                    </span>
                  </div>
                </div>

                <div className="p-5 sm:p-8 space-y-3 sm:space-y-4">
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900">Garden Cleaning <span className="text-xs font-normal text-slate-500">(Upon Request)</span></h3>
                  <p className="text-xs text-slate-600 font-normal leading-relaxed">
                    Outdoor maintenance to keep your garden, patio, and veranda tidy and welcoming.
                  </p>

                  <div className="pt-1 sm:pt-2 space-y-2">
                    <p className="text-[11px] sm:text-xs font-semibold text-slate-800 uppercase tracking-wider">The service includes:</p>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 text-xs text-slate-700">
                      <li className="flex items-start gap-2 font-normal"><span className="text-[#006AFF] font-bold">✓</span> Sweeping leaves, twigs & debris</li>
                      <li className="flex items-start gap-2 font-normal"><span className="text-[#006AFF] font-bold">✓</span> Patio, balcony & veranda floor cleaning</li>
                      <li className="flex items-start gap-2 font-normal"><span className="text-[#006AFF] font-bold">✓</span> Outdoor furniture dusting & wiping</li>
                      <li className="flex items-start gap-2 font-normal"><span className="text-[#006AFF] font-bold">✓</span> Pool surround & walkway tidying</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ================= SECTION 5: FOOTER ================= */}
      <footer className="bg-slate-900 text-slate-400 py-10 sm:py-12 px-4 sm:px-8 md:px-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          
          <div className="space-y-3 min-w-0">
            <img 
              src="/getaway-cleaning-logo-transparent__1_-removebg-preview.png" 
              alt="Getaway Cleaning Logo" 
              className="h-12 sm:h-14 w-auto object-contain brightness-0 invert opacity-90"
            />
            <p className="text-xs text-blue-400 font-medium">A Cleaner Space. A Better Life.</p>
            <p className="text-xs text-slate-400 font-normal max-w-sm">
              Let us take care of the cleaning while you enjoy what matters most.
            </p>
          </div>

          <div className="space-y-1.5 text-left md:text-right text-xs text-slate-400 font-normal min-w-0">
            <p className="text-white font-bold text-sm">Getaway Cleaning Services</p>
            <p>Tel: 00357 96330400</p>
            <p>Email: info@getawayhomes.com</p>
            <p className="break-words">Address: Neofytos Nicolaides Avenue 61, 8011, Paphos, Cyprus</p>
            <p className="text-[10px] text-slate-500 pt-2 font-normal">
              Copyright © {new Date().getFullYear()} Getaway Cleaning | All Rights Reserved
            </p>
          </div>

        </div>
      </footer>

      {/* ================= FLOATING SCROLL TO TOP BUTTON ================= */}
      {showBackToTop && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Scroll to top"
          style={{ bottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
          className="fixed right-4 sm:right-6 z-50 w-11 h-11 sm:w-12 sm:h-12 bg-white/95 hover:bg-white text-slate-700 hover:text-[#006AFF] border border-slate-200/90 shadow-xl rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer backdrop-blur-xs touch-manipulation"
        >
          <svg 
            className="w-5 h-5 sm:w-6 sm:h-6" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth={2.5} 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
          </svg>
        </button>
      )}

    </main>
  );
}