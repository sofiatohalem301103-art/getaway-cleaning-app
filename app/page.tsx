import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-0 sm:p-4 text-slate-800 font-sans">
      
      {/* การ์ดหลัก: บนมือถือขยายเต็มจอพอดี บนคอมเป็นทรงการ์ดมินิมอล */}
      <div className="w-full min-h-screen sm:min-h-0 sm:max-w-md bg-white p-6 sm:p-8 sm:rounded-3xl shadow-none sm:shadow-sm border-none sm:border border-slate-100 flex flex-col justify-between sm:justify-center items-center text-center">
        
        {/* Header & Logo */}
        <div className="w-full flex flex-col items-center pt-8 sm:pt-0">
          <div className="mb-6">
            <Image 
              src="/logo.jpeg" 
              alt="Company Logo" 
              width={160} 
              height={180} 
              className="object-contain"
              style={{ width: 'auto', height: 'auto' }}
              priority
            />
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
            Cleaning Service Booking
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Please select your access type
          </p>
        </div>

        {/* ปุ่มกดทั้งหมด (มี Active State กดแล้วปุ่มตอบสนองทันที) */}
        <div className="w-full space-y-3 my-auto sm:my-8">
          
          {/* ปุ่ม Customer (ถ้านะต้องการเปลี่ยนหน้า ให้แก้ href ตามโฟลเดอร์จริง เช่น /customer หรือ /auth/login) */}
          <Link 
            href="/auth/login" 
            className="flex items-center justify-center w-full min-h-[52px] bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 active:scale-[0.98] text-white font-medium py-3 rounded-2xl transition duration-150 text-sm touch-manipulation shadow-sm"
          >
            Customer
          </Link>

          {/* ปุ่ม Staff */}
          <Link 
            href="/staff/login" 
            className="flex items-center justify-center w-full min-h-[52px] bg-slate-800 hover:bg-slate-900 active:bg-black active:scale-[0.98] text-white font-medium py-3 rounded-2xl transition duration-150 text-sm touch-manipulation shadow-sm"
          >
            Staff Login
          </Link>
          
          {/* ปุ่ม Admin */}
          <Link 
            href="/admin/login" 
            className="flex items-center justify-center w-full min-h-[52px] bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 active:scale-[0.98] text-white font-medium py-3 rounded-2xl transition duration-150 text-sm touch-manipulation shadow-sm"
          >
            Admin Login 
          </Link>

        </div>

        {/* Footer */}
        <div className="w-full pb-4 sm:pb-0">
          <p className="text-[11px] text-slate-400">
            © Getaway Cleaning Service
          </p>
        </div>

      </div>
    </main>
  );
}