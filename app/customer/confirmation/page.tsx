'use client';

import { Suspense, useRef, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';

function ConfirmationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const receiptRef = useRef<HTMLDivElement>(null);

  // ดึงค่า Query Parameters พร้อม Fallback สำหรับ Booking Details
  const room = searchParams.get('room') || searchParams.get('location') || 'Beautiful Apartment in Harbour Paphos | Central';
  const rawDate = searchParams.get('date') || '28 Aug 2026';
  const time = searchParams.get('time') || '10:00 - 11:00';
  const program = searchParams.get('program') || 'General cleaning';
  const price = searchParams.get('price') || searchParams.get('amount') || '90€';
  const rawPaymentMethod = searchParams.get('paymentMethod') || searchParams.get('method') || 'Card';
  const refFromParam = searchParams.get('ref') || searchParams.get('refNumber');

  // State สำหรับ Customer Information (เริ่มต้นดึงจาก URL)
  const [customerInfo, setCustomerInfo] = useState({
    name: searchParams.get('customerName') || searchParams.get('name') || searchParams.get('userName') || '',
    email: searchParams.get('email') || searchParams.get('customerEmail') || '',
    phone: searchParams.get('phone') || searchParams.get('customerPhone') || searchParams.get('mobile') || '',
  });

  const [bookingRef, setBookingRef] = useState(refFromParam || 'REF-913879');
  const [isDownloading, setIsDownloading] = useState(false);

  // ดึงข้อมูล User จาก Supabase / LocalStorage เพิ่มเติม (หากใน URL ไม่มี)
  useEffect(() => {
    if (!refFromParam && !bookingRef) {
      setBookingRef(`REF-${Math.floor(100000 + Math.random() * 900000)}`);
    }

    const loadUserData = async () => {
      let currentName = customerInfo.name;
      let currentEmail = customerInfo.email;
      let currentPhone = customerInfo.phone;

      // 1. Try Supabase
      if (!currentName || !currentEmail || !currentPhone) {
        try {
          if (supabase) {
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;

            if (user) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();

              if (!currentName) currentName = profile?.full_name || profile?.name || user.user_metadata?.full_name || '';
              if (!currentEmail) currentEmail = profile?.email || user.email || '';
              if (!currentPhone) currentPhone = profile?.phone || profile?.phone_number || profile?.mobile || user.user_metadata?.phone || '';
            }
          }
        } catch (err) {
          console.error('Failed to load user info from Supabase:', err);
        }
      }

      // 2. Try LocalStorage
      if (!currentName || !currentEmail || !currentPhone) {
        try {
          const localUser = localStorage.getItem('user') || localStorage.getItem('booking_customer') || localStorage.getItem('checkout_info');
          if (localUser) {
            const parsed = JSON.parse(localUser);
            if (!currentName) currentName = parsed.name || parsed.full_name || parsed.customerName || '';
            if (!currentEmail) currentEmail = parsed.email || parsed.customerEmail || '';
            if (!currentPhone) currentPhone = parsed.phone || parsed.phone_number || parsed.mobile || '';
          }
        } catch (e) {
          console.error('Failed to read localStorage:', e);
        }
      }

      setCustomerInfo({
        name: currentName,
        email: currentEmail,
        phone: currentPhone,
      });
    };

    loadUserData();
  }, [searchParams]);

  const formatPaymentMethod = (method: string) => {
    const lower = method.toLowerCase();
    if (lower.includes('card') || lower.includes('stripe') || lower.includes('credit')) return 'Credit / Debit Card';
    if (lower.includes('bank') || lower.includes('transfer')) return 'Bank Transfer';
    return method || 'Credit / Debit Card';
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const triggerMobileDownload = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
  };

  const generateCanvas = async () => {
    if (!receiptRef.current) return null;
    const html2canvasModule = await import('html2canvas');
    const html2canvas = html2canvasModule.default || html2canvasModule;

    return await html2canvas(receiptRef.current, {
      scale: 3,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
    });
  };

  const handleDownloadImage = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const canvas = await generateCanvas();
      if (!canvas) return;
      canvas.toBlob((blob) => {
        if (blob) triggerMobileDownload(blob, `Booking_Receipt_${bookingRef}.png`);
      }, 'image/png');
    } catch (error) {
      console.error('Error saving image:', error);
      alert('Could not save image.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const canvas = await generateCanvas();
      if (!canvas) return;

      const jsPDFModule = await import('jspdf');
      const jsPDF = jsPDFModule.jsPDF || jsPDFModule.default;
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const imgWidth = 140;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const xPos = (210 - imgWidth) / 2;
      const yPos = 20;

      pdf.addImage(imgData, 'PNG', xPos, yPos, imgWidth, imgHeight);
      const pdfBlob = pdf.output('blob');
      triggerMobileDownload(pdfBlob, `Booking_Receipt_${bookingRef}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Could not generate PDF file.');
    } finally {
      setIsDownloading(false);
    }
  };

  // ตรวจสอบว่ามีข้อมูล Customer ให้แสดงหรือไม่
  const hasCustomerInfo = Boolean(customerInfo.name || customerInfo.email || customerInfo.phone);

  return (
    <div className="w-full max-w-md mx-auto relative flex flex-col items-center">
      
      {/* ใบเสร็จรับเงิน */}
      <div 
        ref={receiptRef} 
        style={{ backgroundColor: '#ffffff', borderColor: '#f3f4f6' }}
        className="p-6 sm:p-8 rounded-3xl shadow-sm border w-full relative flex flex-col items-center"
      >
        {/* Icon Success */}
        <div 
          style={{ backgroundColor: '#d1fae5', color: '#059669' }}
          className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h2 style={{ color: '#1f2937' }} className="text-xl font-bold mb-1 text-center">
          Payment Successful!
        </h2>
        <p style={{ color: '#6b7280' }} className="text-xs mb-6 text-center">
          Thank you. Your booking has been confirmed.
        </p>

        {/* Details Box */}
        <div 
          style={{ backgroundColor: '#f9fafb', borderColor: '#f3f4f6' }}
          className="w-full rounded-2xl p-5 mb-3 border space-y-3 text-xs"
        >
          {/* Booking Ref */}
          <div 
            style={{ borderColor: '#e5e7eb' }}
            className="flex justify-between items-center border-b pb-3"
          >
            <span style={{ color: '#6b7280' }}>Booking Ref</span>
            <span style={{ color: '#1f2937' }} className="font-bold font-mono text-sm">{bookingRef}</span>
          </div>

          {/* Customer Details Section (แสดงผลเฉพาะเมื่อมีข้อมูลอย่างน้อย 1 อย่าง) */}
          {hasCustomerInfo && (
            <div 
              style={{ borderColor: '#e5e7eb' }}
              className="space-y-2 border-b pb-3 pt-1"
            >
              {customerInfo.name && (
                <div className="flex justify-between items-center">
                  <span style={{ color: '#6b7280' }}>Customer</span>
                  <span style={{ color: '#1f2937' }} className="font-semibold">{customerInfo.name}</span>
                </div>
              )}
              {customerInfo.phone && (
                <div className="flex justify-between items-center">
                  <span style={{ color: '#6b7280' }}>Phone</span>
                  <span style={{ color: '#374151' }} className="font-medium">{customerInfo.phone}</span>
                </div>
              )}
              {customerInfo.email && (
                <div className="flex justify-between items-start gap-2">
                  <span style={{ color: '#6b7280' }} className="shrink-0">Email</span>
                  <span style={{ color: '#374151' }} className="font-medium truncate max-w-[200px] text-right">{customerInfo.email}</span>
                </div>
              )}
            </div>
          )}

          {/* Service Details Section */}
          <div 
            style={{ borderColor: '#e5e7eb' }}
            className="space-y-2 border-b pb-3 pt-1"
          >
            <div className="flex justify-between items-start gap-3">
              <span style={{ color: '#6b7280' }} className="shrink-0">Location</span>
              <span style={{ color: '#1f2937' }} className="font-semibold text-right max-w-[65%]">{room}</span>
            </div>
            <div className="flex justify-between items-center">
              <span style={{ color: '#6b7280' }}>Date</span>
              <span style={{ color: '#1f2937' }} className="font-semibold">{rawDate.includes('20') ? formatDate(rawDate) : rawDate}</span>
            </div>
            <div className="flex justify-between items-center">
              <span style={{ color: '#6b7280' }}>Time</span>
              <span style={{ color: '#1f2937' }} className="font-semibold">{time}</span>
            </div>
            <div className="flex justify-between items-center">
              <span style={{ color: '#6b7280' }}>Program</span>
              <span style={{ color: '#1f2937' }} className="font-semibold">{program}</span>
            </div>
          </div>

          {/* Payment Method Section */}
          <div className="flex justify-between items-center pt-1">
            <span style={{ color: '#6b7280' }}>Payment Method</span>
            <span style={{ color: '#374151', backgroundColor: '#e5e7eb' }} className="font-medium px-2 py-0.5 rounded text-[11px]">
              💳 {formatPaymentMethod(rawPaymentMethod)}
            </span>
          </div>

          {/* Total Paid Section */}
          <div 
            style={{ borderColor: '#e5e7eb' }}
            className="flex justify-between items-center border-t pt-3 mt-2"
          >
            <span style={{ color: '#1f2937' }} className="font-bold text-sm">Total Paid</span>
            <span style={{ color: '#059669' }} className="text-lg font-bold">{price}</span>
          </div>
        </div>

        {/* Footer Logo */}
        <div className="flex justify-center mt-4">
          <Image 
            src="/logo.jpeg" 
            alt="Getaway Cleaning" 
            width={120} 
            height={45} 
            className="object-contain max-h-[40px] w-auto" 
            priority
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="w-full grid grid-cols-2 gap-3 mt-5">
        <button
          onClick={handleDownloadImage}
          disabled={isDownloading}
          className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 font-semibold rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {isDownloading ? 'Downloading...' : 'Save Image'}
        </button>
        <button
          onClick={handleDownloadPDF}
          disabled={isDownloading}
          className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 font-semibold rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          {isDownloading ? 'Downloading...' : 'Save PDF'}
        </button>
      </div>

      <button
        onClick={() => router.push('/')}
        className="w-full py-3 bg-slate-800 hover:bg-slate-900 active:bg-black text-white font-semibold rounded-xl text-xs transition mt-3 cursor-pointer"
      >
        Back to Home
      </button>

    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <Suspense fallback={<div className="text-xs text-gray-500">Loading receipt...</div>}>
        <ConfirmationContent />
      </Suspense>
    </main>
  );
}