import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** Static export for offline-first APK bundle (run scripts/prepare-static-export.mjs first). */
const isCapacitorStaticExport = process.env.CAPACITOR_STATIC_EXPORT === 'true';

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(isCapacitorStaticExport
    ? {
        output: 'export',
        distDir: 'dist',
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {
        output: 'standalone',
        async headers() {
          return [
            {
              source: '/(.*)',
              headers: [
                { key: 'X-Content-Type-Options', value: 'nosniff' },
                { key: 'X-Frame-Options', value: 'DENY' },
                { key: 'X-XSS-Protection', value: '1; mode=block' },
                { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
                {
                  key: 'Content-Security-Policy-Report-Only',
                  value: [
                    "default-src 'self'",
                    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
                    "style-src 'self' 'unsafe-inline'",
                    "img-src 'self' data: blob:",
                    "font-src 'self'",
                    "connect-src 'self' https: wss:",
                    "frame-src 'self' https://music.yandex.ru",
                    "frame-ancestors 'none'",
                  ].join('; '),
                },
                { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
              ],
            },
          ];
        },
      }),
  reactStrictMode: true,
  turbopack: {
    root: process.cwd(),
  },
  /** Убирает лишний dev-only индикатор «building…» (отдельный от react-dev-overlay). */
  devIndicators: {
    buildActivity: false,
  },
};

export default withNextIntl(nextConfig);
