'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const receiptRef = useRef<HTMLDivElement>(null);

  const [isDownloading, setIsDownloading] = useState(false);

  const customerName = searchParams.get('customerName') || 'Customer';
  const bookingRefParam = searchParams.get('bookingRef');
  const room = searchParams.get('room') || 'Beautiful Apartment in Harbour Paphos | Central';
  const rawDate = searchParams.get('date') || '27 Aug 2026';
  const time = searchParams.get('time') || '10:00 - 11:00';
  const program = searchParams.get('program') || 'General cleaning';
  const price = searchParams.get('price') || '90€';

  const [bookingRef, setBookingRef] = useState(bookingRefParam || '');

  useEffect(() => {
    if (!bookingRefParam) {
      setBookingRef(`REF-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`);
    }
  }, [bookingRefParam]);

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
      scale: 2,
      useCORS: true,
      allowTaint: false,
      logging: false,
      backgroundColor: '#ffffff',
      onclone: (clonedDoc) => {
        // แก้ไข Unsupported color function "lab" / "oklch"
        const elements = clonedDoc.querySelectorAll('*');
        elements.forEach((node) => {
          const el = node as HTMLElement;
          const style = window.getComputedStyle(el);
          if (style.color && (style.color.includes('lab') || style.color.includes('oklch'))) {
            el.style.color = '#1f2937';
          }
          if (style.borderColor && (style.borderColor.includes('lab') || style.borderColor.includes('oklch'))) {
            el.style.borderColor = '#e5e7eb';
          }
          if (style.backgroundColor && (style.backgroundColor.includes('lab') || style.backgroundColor.includes('oklch'))) {
            el.style.backgroundColor = '#f9fafb';
          }
        });
      },
    });
  };

  const handleDownloadImage = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const canvas = await generateCanvas();
      if (!canvas) throw new Error('Canvas render failed');

      canvas.toBlob((blob) => {
        if (blob) {
          triggerMobileDownload(blob, `receipt_${bookingRef}.png`);
        } else {
          alert('Could not save image.');
        }
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
      if (!canvas) throw new Error('Canvas render failed');

      const jsPDFModule = await import('jspdf');
      const jsPDF = jsPDFModule.jsPDF || jsPDFModule.default;

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 140;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const xPos = (210 - imgWidth) / 2;
      const yPos = 20;

      pdf.addImage(imgData, 'PNG', xPos, yPos, imgWidth, imgHeight);

      const pdfBlob = pdf.output('blob');
      triggerMobileDownload(pdfBlob, `receipt_${bookingRef}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Could not generate PDF file.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto flex flex-col justify-between flex-1 py-2">
      
      {/* ใบเสร็จการ์ดสีขาว */}
      <div 
        ref={receiptRef} 
        style={{ backgroundColor: '#ffffff', borderColor: '#f1f5f9' }}
        className="p-6 sm:p-8 rounded-[32px] shadow-sm border w-full flex flex-col items-center"
      >
        <div 
          style={{ backgroundColor: '#d1fae5', color: '#059669' }}
          className="w-16 h-16 rounded-full flex items-center justify-center mb-4 text-2xl font-bold"
        >
          ✓
        </div>

        <h2 style={{ color: '#1e293b' }} className="text-xl font-bold mb-1 text-center">
          Payment Successful!
        </h2>
        <p style={{ color: '#64748b' }} className="text-xs mb-6 text-center font-medium">
          Thank you. Your booking has been confirmed.
        </p>

        <div 
          style={{ backgroundColor: '#f8fafc', borderColor: '#f1f5f9' }}
          className="w-full border rounded-2xl p-4 sm:p-5 mb-4 space-y-3"
        >
          <div style={{ borderColor: '#e2e8f0' }} className="flex justify-between items-center border-b pb-3">
            <span style={{ color: '#94a3b8' }} className="text-xs font-medium">Booking Ref</span>
            <span style={{ color: '#1e293b' }} className="text-xs font-bold">{bookingRef || 'Loading...'}</span>
          </div>
          
          <div className="space-y-2.5 pt-1">
            <div className="flex justify-between items-start">
              <span style={{ color: '#94a3b8' }} className="text-xs font-medium shrink-0">Location</span>
              <span style={{ color: '#334155' }} className="text-xs font-semibold text-right max-w-[65%] leading-relaxed">{room}</span>
            </div>
            <div className="flex justify-between items-center">
              <span style={{ color: '#94a3b8' }} className="text-xs font-medium">Date</span>
              <span style={{ color: '#334155' }} className="text-xs font-semibold">{rawDate.includes('-') ? formatDate(rawDate) : rawDate}</span>
            </div>
            <div className="flex justify-between items-center">
              <span style={{ color: '#94a3b8' }} className="text-xs font-medium">Time</span>
              <span style={{ color: '#334155' }} className="text-xs font-semibold">{time}</span>
            </div>
            <div className="flex justify-between items-center">
              <span style={{ color: '#94a3b8' }} className="text-xs font-medium">Program</span>
              <span style={{ color: '#334155' }} className="text-xs font-semibold">{program}</span>
            </div>
          </div>

          <div style={{ borderColor: '#e2e8f0' }} className="flex justify-between items-center border-t pt-3 mt-2">
            <span style={{ color: '#1e293b' }} className="text-xs sm:text-sm font-bold">Total Paid</span>
            <span style={{ color: '#059669' }} className="text-base sm:text-lg font-bold">{price}</span>
          </div>
        </div>

        <div className="flex justify-center mt-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src="/logo.jpeg" 
            alt="Getaway Cleaning Logo" 
            className="h-12 w-auto object-contain"
            crossOrigin="anonymous"
          />
        </div>
      </div>

      {/* ปุ่มกด Action */}
      <div className="w-full space-y-3 mt-4">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleDownloadImage}
            disabled={isDownloading}
            className="w-full py-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-semibold rounded-2xl text-xs transition flex items-center justify-center gap-2 cursor-pointer border border-slate-200/50 disabled:opacity-50 touch-manipulation"
          >
            <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {isDownloading ? 'Processing...' : 'Save Image'}
          </button>

          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className="w-full py-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-semibold rounded-2xl text-xs transition flex items-center justify-center gap-2 cursor-pointer border border-slate-200/50 disabled:opacity-50 touch-manipulation"
          >
            <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            {isDownloading ? 'Processing...' : 'Save PDF'}
          </button>
        </div>

        <button
          type="button"
          onClick={() => router.push('/customer/booking')}
          className="w-full py-3.5 bg-[#2c3e50] hover:bg-[#1a252f] active:bg-black text-white font-semibold rounded-2xl text-xs transition cursor-pointer touch-manipulation shadow-sm"
        >
          Back to Home
        </button>
      </div>

    </div>
  );
}

export default function SuccessPage() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-between p-4 text-slate-800 font-sans">
      <Suspense fallback={<div className="text-xs text-slate-500 my-auto">Loading receipt...</div>}>
        <SuccessContent />
      </Suspense>
      <footer className="py-2 text-center text-[11px] text-slate-400 shrink-0">
        © Getaway Cleaning Service
      </footer>
    </main>
  );
}