import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=(self)",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js requires unsafe-inline for hydration scripts + style injection
      // va.vercel-scripts.com = Vercel Speed Insights; gstatic.com = Firebase SDK (service worker)
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://www.gstatic.com https://www.googleapis.com",
      "style-src 'self' 'unsafe-inline'",
      // Images from Supabase storage + Google profile pics + data URIs
      "img-src 'self' data: blob: https://*.supabase.co https://*.storage.supabase.co https://lh3.googleusercontent.com https://images.unsplash.com",
      "font-src 'self' data:",
      "media-src 'self' blob: https://*.supabase.co https://*.storage.supabase.co",
      // API calls: self + Supabase (auth + realtime) + Vercel Speed Insights telemetry
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.supabase.in https://vitals.vercel-insights.com",
      // No Flash / plugins
      "object-src 'none'",
      // Prevent <base> tag injection
      "base-uri 'self'",
      // Forms: self + payment gateways (eSewa, Khalti)
      "form-action 'self' https://rc-epay.esewa.com.np https://epay.esewa.com.np https://a.khalti.com",
      // Stronger than X-Frame-Options
      "frame-ancestors 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    useLightningcss: true,
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  images: {
    // Serve modern formats automatically — AVIF first (smaller, slightly
    // pricier to encode), WebP as the broad-compat fallback. Browsers that
    // support neither still get the original via Next/image's last fallback.
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.storage.supabase.co" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
// Force Next.js to reload and pick up the newly generated Prisma Client

