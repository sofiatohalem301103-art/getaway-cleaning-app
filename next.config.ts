import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // ใส่ทั้ง Domain และ IP Address (รวมถึง Port 3000) เพื่อป้องกันโดนบล็อกบนมือถือ
  allowedDevOrigins: [
    'cleaning-service-booking.local',
    'cleaning-service-booking.local:3000',
    '192.168.1.86',
    '192.168.1.86:3000',
    'localhost:3000',
  ],
};

export default nextConfig;