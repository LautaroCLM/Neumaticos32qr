const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
let supabaseOrigin = '';
let supabaseWsOrigin = '';

if (supabaseUrl) {
  try {
    const parsed = new URL(supabaseUrl);
    supabaseOrigin = parsed.origin;
    const wsProto = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
    supabaseWsOrigin = `${wsProto}//${parsed.host}`;
  } catch {
    // Ignorar error de parsing en build time si no está definida
  }
}

const connectSources = [
  "'self'",
  supabaseOrigin,
  supabaseWsOrigin,
  // En desarrollo o pruebas locales se admiten localhost y 127.0.0.1
  process.env.NODE_ENV !== 'production' ? 'http://127.0.0.1:* http://localhost:* ws://127.0.0.1:* ws://localhost:*' : '',
]
  .filter(Boolean)
  .join(' ');

const isProd = process.env.NODE_ENV === 'production';
const scriptSrc = isProd
  ? "script-src 'self' 'unsafe-inline'"
  : "script-src 'self' 'unsafe-eval' 'unsafe-inline'";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  compiler: {
    removeConsole: isProd ? { exclude: ['error'] } : false,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              scriptSrc,
              "style-src 'self' 'unsafe-inline'",
              `img-src 'self' data: blob: ${supabaseOrigin} https:`.trim(),
              "font-src 'self' data:",
              `connect-src ${connectSources}`,
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
      {
        source: '/v/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, max-age=0' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
        ],
      },
      {
        source: '/admin/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, max-age=0' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          // same-origin y no no-referrer: con no-referrer el navegador manda "Origin: null" en los
          // formularios enviados antes de que React hidrate y las server actions responden 500.
          // Igual no se filtra la URL del panel a otros sitios.
          { key: 'Referrer-Policy', value: 'same-origin' },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, max-age=0' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ];
  },
};

export default nextConfig;
