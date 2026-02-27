import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "HimalHub - Nepal's Smartest Food Delivery",
  description:
    "Scan. Order. Enjoy. — Nepal's premium QR table ordering and food delivery platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${inter.variable} antialiased selection:bg-saffron-flame selection:text-white`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
