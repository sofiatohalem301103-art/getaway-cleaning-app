'use client';

export const dynamic = 'force-dynamic';

import React, { useMemo, useState, useEffect } from 'react';

export default function StartCustomerPage() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const tomorrowDateString = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }, []);

  const getBookingUrl = (programName?: string) => {
    const params = new URLSearchParams();
    params.set('startDate', tomorrowDateString);
    if (programName) params.set('program', programName);
    
    const targetBookingPath = `/customer/booking?${params.toString()}`;
    return `/auth/login?redirect=${encodeURIComponent(targetBookingPath)}`;
  };

  return (
    <main className="min-h-screen w-full bg-[#F8FAFC] text-[#1E2B37] font-sans antialiased">
      
      {/* ================= NAVIGATION BAR (SMART STICKY HEADER) ================= */}
      <nav 
        className={`sticky top-0 z-50 w-full transition-all duration-300 ${
          isScrolled 
            ? 'bg-white/95 backdrop-blur-md shadow-md border-b border-slate-200/80 py-0' 
            : 'bg-white/80 backdrop-blur-md border-b border-slate-100 py-2'
        }`}
      >
        <div 
          className={`max-w-7xl mx-auto px-6 sm:px-12 flex items-center justify-between transition-all duration-300 ${
            isScrolled ? 'h-14 sm:h-16' : 'h-16 sm:h-20'
          }`}
        >
          
          <a href="#home" className="flex items-center gap-2 group">
            <span className="text-lg sm:text-xl font-black tracking-tight text-slate-900 group-hover:opacity-90 transition">
              GETAWAY <span className="text-[#006AFF]">CLEANING</span>
            </span>
          </a>

          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <a href="#home" className="hover:text-[#006AFF] transition">Home</a>
            <a href="#about" className="hover:text-[#006AFF] transition">About Us</a>
            <a href="#how-it-works" className="hover:text-[#006AFF] transition">How It Works</a>
            <a href="#services" className="hover:text-[#006AFF] transition">Services Program</a>
          </div>

          <div>
            <a 
              href={getBookingUrl()}
              className={`inline-flex items-center justify-center bg-[#006AFF] hover:bg-[#2563EB] text-white font-bold rounded-full shadow-md shadow-blue-500/20 transition-all duration-300 ${
                isScrolled 
                  ? 'px-5 py-1.5 text-xs' 
                  : 'px-6 py-2.5 text-sm'
              }`}
            >
              Book Now
            </a>
          </div>

        </div>
      </nav>

      {/* ================= SECTION 1: HERO BANNER ================= */}
      <section id="home" className="relative w-full bg-gradient-to-b from-[#EBF5FF]/60 via-[#F8FAFC] to-[#F8FAFC] py-16 sm:py-20 px-6 sm:px-12 overflow-hidden">
        
        {/* Subtle Ambient Glow */}
        <div className="absolute top-10 right-10 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Content Left */}
          <div className="lg:col-span-7 space-y-6 text-left">
            
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-[#006AFF] px-4 py-1.5 rounded-full text-xs font-bold tracking-wide">
              <span>GETAWAY CLEANING — PAPHOS, CYPRUS</span>
            </div>
            
            {/* Main Title */}
            <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-[1.15]">
              A Cleaner Space. <br />
              <span className="text-[#006AFF]">A Better Life.</span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-slate-600 text-base sm:text-lg max-w-xl font-normal leading-relaxed">
              Professional Cleaning Services You Can Trust. Enjoy a spotless, fresh, and welcoming space without the stress. We provide reliable, high-quality cleaning for homes and offices with attention to every detail.
            </p>

            {/* Commitment Box */}
            <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-xs inline-block">
              <p className="text-sm font-semibold text-slate-800">
                Your Space, Our Care, Our Commitment to Excellence.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
              <a 
                href={getBookingUrl()} 
                className="w-full sm:w-auto px-8 py-4 bg-[#006AFF] hover:bg-[#2563EB] text-white font-extrabold rounded-2xl shadow-xl shadow-blue-500/25 transition transform hover:-translate-y-0.5 text-center text-sm tracking-wide"
              >
                BOOK YOUR CLEANING TODAY!
              </a>
              <a 
                href="#services" 
                className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold rounded-2xl transition text-center text-sm shadow-xs"
              >
                Explore Services
              </a>
            </div>

            {/* Open Date Status */}
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium pt-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Bookings open starting tomorrow ({tomorrowDateString}) | Mon–Sat, 09:00–16:00</span>
            </div>

          </div>

          {/* Image Right */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white bg-slate-100">
              <img 
                src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80" 
                alt="Clean & Spotless Living Room" 
                className="w-full h-[420px] sm:h-[480px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
            </div>

            {/* Floating Promise Card */}
            <div className="absolute -bottom-6 -left-6 bg-white/95 backdrop-blur-md p-4 sm:p-5 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-4 max-w-xs">
              <div className="w-12 h-12 bg-blue-50 text-[#006AFF] rounded-xl flex items-center justify-center font-bold text-xl shrink-0">✓</div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Our Promise</p>
                <p className="text-xs font-extrabold text-slate-800 leading-snug">
                  Quality you can see and freshness you can feel
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ================= SECTION 2: ABOUT US ================= */}
      <section id="about" className="py-16 px-6 sm:px-12 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#006AFF]">Why Choose Us</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">About Getaway Cleaning</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="w-10 h-10 bg-blue-50 text-[#006AFF] rounded-xl flex items-center justify-center font-bold text-lg">✓</div>
              <h3 className="font-bold text-slate-900">Professional & Reliable</h3>
              <p className="text-xs text-slate-500 leading-relaxed">Trusted housekeeping team dedicated to quality service.</p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="w-10 h-10 bg-blue-50 text-[#006AFF] rounded-xl flex items-center justify-center font-bold text-lg">✓</div>
              <h3 className="font-bold text-slate-900">Exceptional Attention</h3>
              <p className="text-xs text-slate-500 leading-relaxed">Attentive to every detail and reachable surface in your space.</p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="w-10 h-10 bg-blue-50 text-[#006AFF] rounded-xl flex items-center justify-center font-bold text-lg">✓</div>
              <h3 className="font-bold text-slate-900">Flexible Solutions</h3>
              <p className="text-xs text-slate-500 leading-relaxed">Tailored for regular cleaning, one-time general or deep clean.</p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="w-10 h-10 bg-blue-50 text-[#006AFF] rounded-xl flex items-center justify-center font-bold text-lg">✓</div>
              <h3 className="font-bold text-slate-900">Guaranteed Freshness</h3>
              <p className="text-xs text-slate-500 leading-relaxed">Leaving your property neat, hygienic, fresh, and presentable.</p>
            </div>

          </div>
        </div>
      </section>

      {/* ================= SECTION 3: HOW IT WORKS ================= */}
      <section id="how-it-works" className="py-20 px-6 sm:px-12 bg-slate-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-[#006AFF]">Simple Step-by-Step Process</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">How It Works</h2>
            <p className="text-sm text-slate-500">We make booking and arranging your cleaning service simple and hassle-free.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <span className="text-4xl font-black text-[#006AFF]/20">01</span>
              <h3 className="text-base font-bold text-slate-900">Book & Contact</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Contact us to book your cleaning service or submit a request online.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <span className="text-4xl font-black text-[#006AFF]/20">02</span>
              <h3 className="text-base font-bold text-slate-900">Property Inspection</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Our housekeeping team will arrange an inspection of your property.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <span className="text-4xl font-black text-[#006AFF]/20">03</span>
              <h3 className="text-base font-bold text-slate-900">Tailored Quotation</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                A quotation will be provided based on size, condition, and requirements.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <span className="text-4xl font-black text-[#006AFF]/20">04</span>
              <h3 className="text-base font-bold text-slate-900">Service Executed</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Once approved, we will arrange and deliver your professional clean.
              </p>
            </div>

          </div>

          <div className="bg-blue-50/80 border border-blue-100 rounded-2xl p-4 sm:p-6 text-center max-w-3xl mx-auto">
            <p className="text-xs sm:text-sm text-[#006AFF] font-medium">
              <strong>Fast Response Guarantee:</strong> Once your booking request is received, our Customer Care Administration team will get back to you within the same day!
            </p>
          </div>

        </div>
      </section>

      {/* ================= SECTION 4: 4 SERVICE PROGRAMS ================= */}
      <section id="services" className="py-20 px-6 sm:px-12 bg-white">
        <div className="max-w-7xl mx-auto space-y-16">
          
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-[#006AFF]">Tailored Cleaning Solutions</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">Our 4 Cleaning Programs</h2>
            <p className="text-sm text-slate-500">Choose the perfect program tailored to your property, office, or outdoor space.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* 1. GENERAL CLEANING */}
            <div className="bg-slate-50 rounded-3xl border border-slate-200/80 overflow-hidden flex flex-col justify-between hover:shadow-lg transition group">
              <div>
                <div className="h-52 w-full overflow-hidden relative">
                  <img 
                    src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80" 
                    alt="General Cleaning Service" 
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="bg-white/90 backdrop-blur-md text-[#006AFF] text-xs font-bold px-3 py-1.5 rounded-full shadow-xs">
                      Routine Maintenance
                    </span>
                  </div>
                </div>

                <div className="p-8 space-y-4">
                  <h3 className="text-2xl font-bold text-slate-900">General Cleaning</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    General cleaning is a routine cleaning service designed to maintain cleanliness, hygiene, and overall appearance of a property.
                  </p>

                  <div className="pt-2 space-y-2">
                    <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">The service includes:</p>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                      <li className="flex items-start gap-2"><span className="text-[#006AFF] font-bold">✓</span> Dusting reachable surfaces & furniture</li>
                      <li className="flex items-start gap-2"><span className="text-[#006AFF] font-bold">✓</span> Sweeping, vacuuming & mopping floors</li>
                      <li className="flex items-start gap-2"><span className="text-[#006AFF] font-bold">✓</span> Kitchen countertops, sink & appliance exterior</li>
                      <li className="flex items-start gap-2"><span className="text-[#006AFF] font-bold">✓</span> Disinfecting toilets, sinks, showers & mirrors</li>
                      <li className="flex items-start gap-2"><span className="text-[#006AFF] font-bold">✓</span> Living areas & bedrooms tidying / bed making</li>
                      <li className="flex items-start gap-2"><span className="text-[#006AFF] font-bold">✓</span> Wiping door handles & touchpoints</li>
                      <li className="flex items-start gap-2"><span className="text-[#006AFF] font-bold">✓</span> Cleaning accessible mirrors & glass</li>
                      <li className="flex items-start gap-2"><span className="text-[#006AFF] font-bold">✓</span> Bin emptying & liner replacement</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. DEEP CLEANING */}
            <div className="bg-slate-50 rounded-3xl border border-slate-200/80 overflow-hidden flex flex-col justify-between hover:shadow-lg transition group relative">
              <div>
                <div className="h-52 w-full overflow-hidden relative">
                  <img 
                    src="https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=800&q=80" 
                    alt="Deep Cleaning Service" 
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="bg-amber-100/90 backdrop-blur-md text-amber-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-xs">
                      Deep Clean
                    </span>
                  </div>
                  <div className="absolute top-4 right-4">
                    <span className="bg-[#006AFF] text-white text-[10px] font-extrabold uppercase px-3 py-1.5 rounded-full tracking-wider shadow-xs">
                      Intensive & Detailed
                    </span>
                  </div>
                </div>

                <div className="p-8 space-y-4">
                  <h3 className="text-2xl font-bold text-slate-900">Deep Cleaning</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Intensive cleaning service intended to remove accumulated dirt, grease, grime, and build-up.
                  </p>

                  <div className="pt-2 space-y-2">
                    <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">In addition to general cleaning, includes:</p>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                      <li className="flex items-start gap-2"><span className="text-[#006AFF] font-bold">✓</span> Detailed dusting: skirting boards & frames</li>
                      <li className="flex items-start gap-2"><span className="text-[#006AFF] font-bold">✓</span> Kitchen deep clean: grease, hobs & oven</li>
                      <li className="flex items-start gap-2"><span className="text-[#006AFF] font-bold">✓</span> Bathroom scrubbing: tiles, grout & limescale</li>
                      <li className="flex items-start gap-2"><span className="text-[#006AFF] font-bold">✓</span> Detailed floor edges & beneath movable furniture</li>
                      <li className="flex items-start gap-2"><span className="text-[#006AFF] font-bold">✓</span> Doors, handles & woodwork dirt removal</li>
                      <li className="flex items-start gap-2"><span className="text-[#006AFF] font-bold">✓</span> Interior windows, glass panels & mirrors</li>
                      <li className="flex items-start gap-2"><span className="text-[#006AFF] font-bold">✓</span> Hard-to-reach accessible area cleaning</li>
                      <li className="flex items-start gap-2"><span className="text-[#006AFF] font-bold">✓</span> Final sanitising & thorough inspection</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="px-8 pb-8">
                <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 text-[11px] text-slate-500">
                  <strong>NOTE:</strong> Fridges, curtains, carpets steam, and construction debris are available upon separate request.
                </div>
              </div>
            </div>

            {/* 3. OFFICE CLEANING */}
            <div className="bg-slate-50 rounded-3xl border border-slate-200/80 overflow-hidden flex flex-col justify-between hover:shadow-lg transition group">
              <div>
                <div className="h-52 w-full overflow-hidden relative">
                  <img 
                    src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80" 
                    alt="Office Cleaning Service" 
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="bg-white/90 backdrop-blur-md text-[#006AFF] text-xs font-bold px-3 py-1.5 rounded-full shadow-xs">
                      Commercial & Workspaces
                    </span>
                  </div>
                </div>

                <div className="p-8 space-y-4">
                  <h3 className="text-2xl font-bold text-slate-900">Office Cleaning</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Tailored professional cleaning for corporate offices and commercial spaces.
                  </p>

                  <div className="pt-2 space-y-2">
                    <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">The service includes:</p>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                      <li className="flex items-start gap-2"><span className="text-[#006AFF] font-bold">✓</span> Workstation & desk surface dusting</li>
                      <li className="flex items-start gap-2"><span className="text-[#006AFF] font-bold">✓</span> Reception & meeting room care</li>
                      <li className="flex items-start gap-2"><span className="text-[#006AFF] font-bold">✓</span> Office pantry & kitchenette sanitisation</li>
                      <li className="flex items-start gap-2"><span className="text-[#006AFF] font-bold">✓</span> Restroom cleaning & disinfection</li>
                      <li className="flex items-start gap-2"><span className="text-[#006AFF] font-bold">✓</span> Floor sweeping, vacuuming & mopping</li>
                      <li className="flex items-start gap-2"><span className="text-[#006AFF] font-bold">✓</span> High-touchpoint sanitising</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. GARDEN CLEANING */}
            <div className="bg-slate-50 rounded-3xl border border-slate-200/80 overflow-hidden flex flex-col justify-between hover:shadow-lg transition group">
              <div>
                <div className="h-52 w-full overflow-hidden relative">
                  <img 
                    src="https://images.unsplash.com/photo-1558904541-efa843a96f01?auto=format&fit=crop&w=800&q=80" 
                    alt="Garden Cleaning Service" 
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="bg-emerald-100/90 backdrop-blur-md text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-full shadow-xs">
                      Outdoor & Patio
                    </span>
                  </div>
                </div>

                <div className="p-8 space-y-4">
                  <h3 className="text-2xl font-bold text-slate-900">Garden Cleaning <span className="text-xs font-semibold text-slate-500">(Upon Request)</span></h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Outdoor maintenance to keep your garden, patio, and veranda tidy and welcoming.
                  </p>

                  <div className="pt-2 space-y-2">
                    <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">The service includes:</p>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                      <li className="flex items-start gap-2"><span className="text-[#006AFF] font-bold">✓</span> Sweeping leaves, twigs & debris</li>
                      <li className="flex items-start gap-2"><span className="text-[#006AFF] font-bold">✓</span> Patio, balcony & veranda floor cleaning</li>
                      <li className="flex items-start gap-2"><span className="text-[#006AFF] font-bold">✓</span> Outdoor furniture dusting & wiping</li>
                      <li className="flex items-start gap-2"><span className="text-[#006AFF] font-bold">✓</span> Pool surround & walkway tidying</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ================= SECTION 5: FOOTER ================= */}
      <footer className="bg-slate-900 text-slate-400 py-12 px-6 sm:px-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          
          <div className="space-y-2">
            <h3 className="text-2xl font-black text-white tracking-wide">GETAWAY CLEANING</h3>
            <p className="text-xs text-blue-400 font-medium">A Cleaner Space. A Better Life.</p>
            <p className="text-xs text-slate-400 pt-2 max-w-sm">
              Let us take care of the cleaning while you enjoy what matters most.
            </p>
          </div>

          <div className="space-y-1.5 text-left md:text-right text-xs text-slate-400">
            <p className="text-white font-bold text-sm">Getaway Cleaning Services</p>
            <p>Tel: 00357 96330400</p>
            <p>Email: info@getawayhomes.com</p>
            <p>Address: Neofytos Nicolaides Avenue 61, 8011, Paphos, Cyprus</p>
            <p className="text-[10px] text-slate-500 pt-2">
              Copyright © {new Date().getFullYear()} Getaway Cleaning | All Rights Reserved
            </p>
          </div>

        </div>
      </footer>

    </main>
  );
}