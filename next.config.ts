import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
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
};

export default nextConfig;