'use client';

import { Suspense, useRef, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

function ConfirmationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const receiptRef = useRef<HTMLDivElement>(null);

  const room = searchParams.get('room') || 'Beautiful Apartment in Harbour Paphos';
  const rawDate = searchParams.get('date') || '22 Aug 2026';
  const time = searchParams.get('time') || '10:00 - 11:00';
  const program = searchParams.get('program') || 'General cleaning';
  const price = searchParams.get('price') || '90€';

  // ป้องกัน Hydration Mismatch ด้วยการสร้าง Ref ID เมื่อ Component Mount
  const [bookingRef, setBookingRef] = useState('');

  useEffect(() => {
    setBookingRef(`REF-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`);
  }, []);

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

  const generateCanvas = async () => {
    if (!receiptRef.current) return null;
    const html2canvasModule = await import('html2canvas');
    const html2canvas = html2canvasModule.default || html2canvasModule;

    return await html2canvas(receiptRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      onclone: (clonedDoc) => {
        const styles = clonedDoc.querySelectorAll('style, link[rel="stylesheet"]');
        styles.forEach((style) => {
          if (style.textContent?.includes('lab(') || style.textContent?.includes('oklch(')) {
            style.remove();
          }
        });
      },
    });
  };

  // บันทึกรูปภาพ (.png)
  const handleDownloadImage = async () => {
    try {
      const canvas = await generateCanvas();
      if (!canvas) return;
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `Booking_Receipt_${bookingRef}.png`;
      link.click();
    } catch (error) {
      console.error('Error saving image:', error);
      alert('Could not save image.');
    }
  };

  // บันทึกไฟล์ PDF (.pdf) แบบหน้าเดียว
  const handleDownloadPDF = async () => {
    try {
      const canvas = await generateCanvas();
      if (!canvas) return;
      
      const jsPDFModule = await import('jspdf');
      const jsPDF = jsPDFModule.jsPDF || jsPDFModule.default;

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 140; // ความกว้างใบเสร็จใน A4 (มม.)
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const xPos = (210 - imgWidth) / 2; // จัดกึ่งกลางแนวนอน
      const yPos = 20;

      pdf.addImage(imgData, 'PNG', xPos, yPos, imgWidth, imgHeight);
      pdf.save(`Booking_Receipt_${bookingRef}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Could not generate PDF file.');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto relative flex flex-col items-center">
      
      {/* ส่วนตัวใบเสร็จ */}
      <div 
        ref={receiptRef} 
        style={{ backgroundColor: '#ffffff', borderColor: '#f3f4f6' }}
        className="p-8 rounded-2xl shadow-sm border w-full relative flex flex-col items-center"
      >
        <div 
          style={{ backgroundColor: '#d1fae5', color: '#059669' }}
          className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h2 style={{ color: '#1f2937' }} className="text-xl font-bold mb-1">
          Payment Successful!
        </h2>
        <p style={{ color: '#6b7280' }} className="text-xs mb-6 text-center">
          Thank you. Your booking has been confirmed.
        </p>

        <div 
          style={{ backgroundColor: '#f9fafb', borderColor: '#f3f4f6' }}
          className="w-full rounded-xl p-5 mb-2 border space-y-3"
        >
          <div 
            style={{ borderColor: '#e5e7eb' }}
            className="flex justify-between items-start border-b pb-3"
          >
            <span style={{ color: '#6b7280' }} className="text-xs">Booking Ref</span>
            <span style={{ color: '#1f2937' }} className="text-xs font-bold">{bookingRef || 'Loading...'}</span>
          </div>
          
          <div className="space-y-2 pt-1">
            <div className="flex justify-between">
              <span style={{ color: '#6b7280' }} className="text-xs">Location</span>
              <span style={{ color: '#1f2937' }} className="text-xs font-medium text-right max-w-[60%]">{room}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: '#6b7280' }} className="text-xs">Date</span>
              <span style={{ color: '#1f2937' }} className="text-xs font-medium">{rawDate.includes('20') ? formatDate(rawDate) : rawDate}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: '#6b7280' }} className="text-xs">Time</span>
              <span style={{ color: '#1f2937' }} className="text-xs font-medium">{time}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: '#6b7280' }} className="text-xs">Program</span>
              <span style={{ color: '#1f2937' }} className="text-xs font-medium">{program}</span>
            </div>
          </div>

          <div 
            style={{ borderColor: '#e5e7eb' }}
            className="flex justify-between items-center border-t pt-3 mt-1"
          >
            <span style={{ color: '#374151' }} className="text-sm font-bold">Total Paid</span>
            <span style={{ color: '#059669' }} className="text-lg font-bold">{price}</span>
          </div>
        </div>

        <div className="flex justify-center mt-6 opacity-60">
          <Image 
            src="/logo.jpeg" 
            alt="Company Logo" 
            width={80} 
            height={80} 
            className="object-contain w-auto h-auto" 
          />
        </div>
      </div>

      {/* ปุ่มกดดาวน์โหลด */}
      <div className="w-full grid grid-cols-2 gap-3 mt-6">
        <button
          onClick={handleDownloadImage}
          className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg text-xs transition flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Save Image
        </button>
        <button
          onClick={handleDownloadPDF}
          className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg text-xs transition flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Save PDF
        </button>
      </div>

      <button
        onClick={() => router.push('/')}
        className="w-full py-3 bg-slate-700 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs transition mt-3"
      >
        Back to Home
      </button>

    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <Suspense fallback={<div className="text-xs text-gray-500">Loading...</div>}>
        <ConfirmationContent />
      </Suspense>
    </main>
  );
}