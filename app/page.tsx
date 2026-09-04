import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  return (
    // มือถือ: bg-white เต็มจอ / คอมพิวเตอร์ (sm:): bg-[#EAF3F9] ตรงกลาง
    <main className="min-h-[100dvh] w-full bg-[#FFFFFF] sm:bg-[#EAF3F9] flex flex-col sm:items-center sm:justify-center p-0 sm:p-6 text-[#1E1E1E] font-sans antialiased">
      
      {/* Spacer บนสำหรับมือถือ */}
      <div className="flex-1 sm:hidden" />

      {/* มือถือ: w-full เต็มจอ ไร้ขอบ (rounded-none, border-none)
          คอมพิวเตอร์ (sm:): การ์ดลอยขนาด max-w-md มน 32px เงา shadow-xl */}
      <div className="w-full sm:max-w-md bg-[#FFFFFF] rounded-none sm:rounded-[32px] p-6 sm:p-10 border-none sm:border sm:border-[#D9D9D9]/70 shadow-none sm:shadow-xl sm:shadow-[#006AFF]/5 flex flex-col items-center text-center space-y-6">
        
        {/* Header & Logo Section */}
        <div className="w-full flex flex-col items-center space-y-4">
          
          {/* Logo ขนาดเท่าภาพที่ 2 (width 140) */}
          <div className="flex items-center justify-center">
            <Image 
              src="/logo.jpeg" 
              alt="Getaway Cleaning Logo" 
              width={140} 
              height={140} 
              className="object-contain"
              style={{ width: 'auto', height: 'auto' }}
              priority
            />
          </div>

          {/* Title & Description */}
          <div className="space-y-1.5 w-full">
            <h1 className="text-xl sm:text-2xl font-bold text-[#1E1E1E] tracking-tight whitespace-nowrap">
              Cleaning Service Booking
            </h1>
            <p className="text-xs sm:text-sm text-[#1E1E1E]/60 px-2 leading-relaxed whitespace-nowrap">
              Book professional cleaning service in just a few clicks
            </p>
          </div>
        </div>

        {/* Action Button & Footer Section */}
        <div className="w-full space-y-4 pt-2">
          <Link
            href="/auth/login"
            className="flex items-center justify-center w-full min-h-[52px] bg-[#2563EB] hover:bg-[#006AFF] active:scale-[0.98] text-[#FFFFFF] font-semibold rounded-2xl text-base transition-all duration-150 shadow-sm touch-manipulation cursor-pointer"
          >
            Get Start / Sign in
          </Link>

          <p className="text-[11px] text-[#1E1E1E]/40 font-medium tracking-wide">
            © Getaway Cleaning Service
          </p>
        </div>

      </div>

      {/* Spacer ล่างสำหรับมือถือ */}
      <div className="flex-1 sm:hidden" />

    </main>
  );
}