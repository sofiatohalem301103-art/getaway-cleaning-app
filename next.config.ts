import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // ปิดปุ่ม Dev Indicator (ตัว N)
  devIndicators: false,

  allowedDevOrigins: [
    'cleaning-service-booking.local',
    'cleaning-service-booking.local:3000',
    '192.168.1.86',
    '192.168.1.86:3000',
    'localhost:3000',
  ],

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },

  // ข้ามการตรวจ TypeScript Error ระหว่าง Build
  typescript: {
    ignoreBuildErrors: true,
  },
} as any; // ใส่ as any เพื่อให้ยอมรับ property eslint โดยไม่ติด Type Error

// ใส่ค่า eslint เพิ่มเติมหลังจากสร้าง object
(nextConfig as any).eslint = {
  ignoreDuringBuilds: true,
};

export default nextConfig;