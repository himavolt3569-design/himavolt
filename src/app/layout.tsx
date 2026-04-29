import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import PWAInstallPrompt from "@/components/shared/PWAInstallPrompt";
import BottomNav from "@/components/layout/BottomNav";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/icons/icon-192x192.png"
        />
      </head>
      <body
        className={`${inter.variable} antialiased selection:bg-[var(--accent)] selection:text-white`}
      >
        <Providers>
          {children}
          <BottomNav />
          <PWAInstallPrompt />
        </Providers>
        <SpeedInsights />
      </body>
    </html>
  );
}
