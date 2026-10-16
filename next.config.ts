import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
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

  typescript: {
    ignoreBuildErrors: true,
  },

  // ปิดการแจ้งเตือน CSR Bailout และช่วยข้าม Prerender bail
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
} as any;

(nextConfig as any).eslint = {
  ignoreDuringBuilds: true,
};

export default nextConfig;