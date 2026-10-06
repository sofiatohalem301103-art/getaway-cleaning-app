'use client';

import React from 'react';
import Link from 'next/link';

export default function StartCustomerPage() {
  return (
    <main className="min-h-screen w-full bg-[#F8FAFC] flex flex-col justify-between p-6 sm:p-12 text-[#1E2B37] font-sans antialiased">
      
      {/* Spacer Top */}
      <div className="w-full max-w-7xl mx-auto h-6"></div>

      {/* Center Main Content (Minimalist & Clean) */}
      <section className="w-full max-w-2xl mx-auto my-auto flex flex-col items-center text-center space-y-8 py-12">
        
        {/* Title & Subtitle */}
        <div className="space-y-4 w-full">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-[#1E2B37] tracking-tight leading-tight">
            Cleaning Service Booking
          </h1>
          
          <p className="text-sm sm:text-lg text-slate-500 font-normal max-w-md mx-auto leading-relaxed">
            Book professional cleaning service in just a few clicks
          </p>
        </div>

        {/* Single Get Started Button -> Links to Login/Register Page */}
        <div className="pt-4 w-full max-w-xs sm:max-w-sm">
          <Link
            href="/auth/login"
            className="w-full py-4 px-8 bg-[#1E2B37] hover:bg-[#2c3d4e] active:scale-95 text-white font-semibold rounded-2xl text-base sm:text-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center cursor-pointer touch-manipulation"
          >
            Get Started
          </Link>
        </div>

      </section>

      {/* Footer Text */}
      <footer className="w-full text-center py-4 max-w-7xl mx-auto">
        <p className="text-xs sm:text-sm text-slate-400 font-medium">
          © Getaway Cleaning Service
        </p>
      </footer>

    </main>
  );
}