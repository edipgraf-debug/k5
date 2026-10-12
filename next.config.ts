import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // IIS + ARR arkasında Node süreci olarak çalışır (Kalıtım B2B ile aynı yapı).
  output: 'standalone',
  poweredByHeader: false,
  serverExternalPackages: ['mssql', 'nodemailer'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
