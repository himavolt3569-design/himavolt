import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import Providers from "./providers";
import PWAInstallPrompt from "@/components/shared/PWAInstallPrompt";
import BottomNav from "@/components/layout/BottomNav";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "HimaVolt -- Scan. Order. Stay.",
  description:
    "Scan. Order. Enjoy. -- Nepal's premium QR table ordering and food delivery platform.",
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
  themeColor: "#ff9933",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" data-scroll-behavior="smooth">
        <head>
          <link
            rel="apple-touch-icon"
            sizes="180x180"
            href="/icons/icon-192x192.png"
          />
        </head>
        <body
          className={`${inter.variable} antialiased selection:bg-saffron-flame selection:text-white`}
        >
          <Providers>
            {children}
            <BottomNav />
            <PWAInstallPrompt />
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
