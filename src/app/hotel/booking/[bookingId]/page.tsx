import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { BookingStatusView } from "./components/BookingStatusView";
import { Mountain } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BookingConfirmationPage(props: {
  params: Promise<{ bookingId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { bookingId } = await props.params;
  const searchParams = await props.searchParams;
  const paymentState = typeof searchParams.payment === "string" ? searchParams.payment : null;

  const booking = await db.roomBooking.findUnique({
    where: { id: bookingId },
    include: {
      room: {
        select: {
          name: true,
          roomNumber: true,
          type: true,
          imageUrls: true,
          bedType: true,
        },
      },
      restaurant: {
        select: {
          name: true,
          slug: true,
          phone: true,
          address: true,
          currency: true,
          openingTime: true,
          closingTime: true,
        },
      },
    },
  });

  if (!booking) notFound();

  return (
    <div className="min-h-screen bg-[var(--canvas)] flex flex-col">
      {/* Minimal header */}
      <header className="h-[68px] bg-white border-b border-[var(--border)] sticky top-0 z-50 flex items-center">
        <div className="container mx-auto px-4 md:px-8 flex items-center justify-between">
          <Link href="/hotels" className="flex items-center gap-2 group">
            <div className="h-8 w-8 rounded-xl bg-[var(--accent)] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Mountain className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-fraunces text-lg font-bold tracking-tight text-[var(--text-1)]">
              HimaVolt <span className="text-sm font-sans font-medium opacity-60">Stays</span>
            </span>
          </Link>
          <Link href="/hotels" className="text-sm font-semibold text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors">
            Explore stays
          </Link>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 md:px-8 py-10 md:py-16 max-w-3xl">
        <BookingStatusView booking={booking} paymentState={paymentState} />
      </main>

      <footer className="border-t border-[var(--border)] py-6">
        <p className="text-center text-sm text-[var(--text-3)]">
          &copy; {new Date().getFullYear()} HimaVolt Stays · Need help?{" "}
          <Link href="/" className="underline underline-offset-2 hover:text-[var(--text-1)]">
            Contact support
          </Link>
        </p>
      </footer>
    </div>
  );
}
