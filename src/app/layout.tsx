import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import Providers from "./providers";
import PWAInstallPrompt from "@/components/shared/PWAInstallPrompt";
import BottomNav from "@/components/layout/BottomNav";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";

// Poppins is the only typeface used across the app — see globals.css, where
// every other font token (--font-sans/-serif/-display/-fraunces/-syne) is
// remapped to this same variable so no component needs to change.
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL("https://himavolt.com"),
  title: {
    default: "HimaVolt - QR Table Ordering & Food Delivery in Nepal",
    template: "%s | HimaVolt",
  },
  description:
    "Scan. Order. Enjoy. - Nepal's premium QR table ordering and food delivery platform.",
  keywords: ["QR Ordering", "Food Delivery Nepal", "HimaVolt", "Restaurant Pos", "Table Ordering", "Nepal Food Delivery"],
  authors: [{ name: "HimaVolt" }],
  creator: "HimaVolt",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://himavolt.com",
    title: "HimaVolt - QR Table Ordering & Food Delivery in Nepal",
    description: "Scan. Order. Enjoy. - Nepal's premium QR table ordering and food delivery platform.",
    siteName: "HimaVolt",
    images: [{
      url: "/icons/icon-512x512.png",
      width: 512,
      height: 512,
      alt: "HimaVolt Logo",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "HimaVolt - QR Table Ordering.",
    description: "Scan. Order. Enjoy. - Nepal's premium QR table ordering and food delivery platform.",
    images: ["/icons/icon-512x512.png"],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HimaVolt",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#eaa94d",
  // Required for env(safe-area-inset-*) to be non-zero on iOS — without it
  // the pb-safe padding on fixed bottom bars resolves to 0.
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* Apply the stored theme before paint to avoid a flash of the wrong
            theme on load. Mirrors the logic in ThemeContext. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem('theme')==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/icons/icon-192x192.png"
        />
      </head>
      <body
        className={`${poppins.variable} antialiased selection:bg-[var(--accent)] selection:text-white`}
      >
        <Providers>
          {children}
          <BottomNav />
          <PWAInstallPrompt />
        </Providers>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
