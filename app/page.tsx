import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-0 sm:p-4 text-slate-800 font-sans">
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
            Book professional cleaning service in just a few clicks
          </p>
        </div>

        {/* ปุ่มกดสำหรับลูกค้าอย่างเดียว */}
        <div className="w-full space-y-3 my-auto sm:my-8">
          <Link 
            href="/auth/login" 
            className="flex items-center justify-center w-full min-h-[52px] bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 active:scale-[0.98] text-white font-semibold py-3 rounded-2xl transition duration-150 text-sm touch-manipulation shadow-sm"
          >
            Get Started / Sign In
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