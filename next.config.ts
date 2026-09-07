import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.NODE_ENV === 'production' && { output: 'export' }),
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: [
    '192.168.17.13',
    '192.168.11.223',
    'localhost'
  ],
};

export default nextConfig;
