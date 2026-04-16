import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ESLint is run separately; skip during production build
  async redirects() {
    return [
      {
        source: '/explore',
        destination: '/',
        permanent: false, // 임시 리다이렉트
      },
      // TODO: 추후 탐색 기능 업데이트 시 활성화 (위 리다이렉트 제거)
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.google.com',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'flagcdn.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'places.googleapis.com',
      },
    ],
  },
};

export default nextConfig;
