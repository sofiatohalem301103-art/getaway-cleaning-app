import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-black">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 w-full max-w-sm text-center">
        
        <div className="flex justify-center mb-6">
          <Image 
            src="/logo.jpeg" 
            alt="Company Logo" 
            width={180} 
            height={200} 
            className="object-contain"
            priority
          />
        </div>

        <h1 className="text-xl font-bold text-gray-800 mb-2">
          Cleaning Service Booking
        </h1>
        <p className="text-xs text-gray-500 mb-6">
          Please select your access type
        </p>

        <div className="space-y-3">
          <Link 
            href="/auth/login" 
            className="block w-full bg-emerald-600 text-white font-medium py-3 rounded-xl hover:bg-emerald-700 transition text-sm"
          >
            Customer
          </Link>

          <Link 
            href="/staff/login" 
            className="block w-full bg-slate-800 text-white font-medium py-3 rounded-xl hover:bg-slate-900 transition text-sm"
          >
            Staff Login
          </Link>
          
          <Link 
            href="/admin/login" 
            className="block w-full bg-indigo-600 text-white font-medium py-3 rounded-xl hover:bg-indigo-700 transition text-sm"
          >
            Admin Login 
          </Link>
        </div>

      </div>
    </main>
  );
}