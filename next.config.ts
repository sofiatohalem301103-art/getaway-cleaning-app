import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    'cleaning-service-booking.local',
    'cleaning-service-booking.local:3000',
    '192.168.1.86',
    '192.168.1.86:3000',
    'localhost:3000',
  ],

  // ข้ามการตรวจ TypeScript ตอนสั่ง Build
  typescript: {
    ignoreBuildErrors: true,
  },
  // ข้ามการตรวจ ESLint ตอนสั่ง Build
  eslint: {
    ignoreDuringBuilds: true,
  },
} as NextConfig;

export default nextConfig;