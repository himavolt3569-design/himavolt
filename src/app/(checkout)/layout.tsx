import React from "react";
import Link from "next/link";
import { Typography } from "@/components/design-system/primitives/Typography";
import { CheckoutBackButton } from "./components/CheckoutBackButton";

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--canvas)] flex flex-col">
      <header className="h-[80px] bg-white border-b border-[var(--border)] sticky top-0 z-50 flex items-center">
        <div className="container mx-auto px-4 md:px-8 flex items-center justify-between">
          
          <CheckoutBackButton />

          <Link href="/hotels" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center">
              <span className="text-white font-black text-xl leading-none">H</span>
            </div>
            <Typography variant="h3" className="text-xl tracking-tight m-0">HimaVolt</Typography>
          </Link>

          <div className="w-16"></div> {/* Spacer for center alignment */}
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="bg-white border-t border-[var(--border)] py-8 mt-auto">
        <div className="container mx-auto px-4 md:px-8 text-center">
          <Typography variant="small" className="text-[var(--text-3)] font-semibold">
            &copy; {new Date().getFullYear()} HimaVolt Stays. All rights reserved.
          </Typography>
        </div>
      </footer>
    </div>
  );
}
