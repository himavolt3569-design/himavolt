import React from "react";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { Typography } from "@/components/design-system/primitives/Typography";
import { BedDouble, Calendar as CalendarIcon, Users } from "lucide-react";
import { CheckoutForm } from "./components/CheckoutForm";
import { SafeImage } from "@/components/design-system/SafeImage";
import { roomTypeLabel } from "@/lib/room-display";

export default async function CheckoutPage(props: {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { roomId } = await props.params;
  const searchParams = await props.searchParams;

  const checkInStr = typeof searchParams.checkIn === "string" ? searchParams.checkIn : undefined;
  const checkOutStr = typeof searchParams.checkOut === "string" ? searchParams.checkOut : undefined;
  const adultsCount = typeof searchParams.adults === "string" ? parseInt(searchParams.adults) : 2;

  if (!checkInStr || !checkOutStr) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <Typography variant="h3">Invalid Booking Link</Typography>
        <Typography variant="p" className="mt-2 text-[var(--text-2)]">Please go back and select valid check-in and check-out dates.</Typography>
      </div>
    );
  }

  const checkInDate = new Date(checkInStr);
  const checkOutDate = new Date(checkOutStr);
  const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 3600 * 24));

  if (nights < 1) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <Typography variant="h3">Invalid Dates</Typography>
        <Typography variant="p" className="mt-2 text-[var(--text-2)]">Check-out date must be after check-in date.</Typography>
      </div>
    );
  }

  // Fetch Room & Restaurant
  const room = await db.room.findUnique({
    where: { id: roomId },
    include: { restaurant: true }
  });

  if (!room || !room.isActive) notFound();

  // Price Calculation
  const subtotal = room.price * nights;
  const taxRate = room.restaurant.taxEnabled ? room.restaurant.taxRate : 0;
  const tax = (subtotal * taxRate) / 100;
  const total = subtotal + tax;

  const coverImage = room.imageUrls && room.imageUrls.length > 0 
    ? room.imageUrls[0] 
    : "https://images.unsplash.com/photo-1542314831-c6a4d14d8373?auto=format&fit=crop&w=800&q=80";

  return (
    <div className="container mx-auto px-4 md:px-8 py-8 md:py-12 max-w-6xl">
      
      <div className="flex items-center gap-4 mb-8">
        <Typography variant="h1" className="text-3xl md:text-4xl">Confirm and pay</Typography>
      </div>

      <div className="flex flex-col lg:flex-row gap-12 relative">
        
        {/* Left Column: Form */}
        <div className="flex-1 space-y-10">
          <CheckoutForm 
            roomId={room.id}
            restaurantId={room.restaurant.id}
            checkIn={checkInStr}
            checkOut={checkOutStr}
            guests={adultsCount}
            totalPrice={total}
          />
        </div>

        {/* Right Column: Order Summary (Sticky) */}
        <div className="w-full lg:w-[420px] shrink-0">
          <div className="sticky top-[100px] bg-white rounded-3xl border border-[var(--border)] shadow-float p-6">
            
            {/* Room Snapshot */}
            <div className="flex gap-4 mb-6">
              <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-[var(--surface-alt)] shrink-0">
                <SafeImage src={coverImage} alt={room.name || "Room"} sizes="96px" />
              </div>
              <div className="flex flex-col justify-center">
                <Typography variant="small" className="text-[var(--text-3)] font-semibold uppercase tracking-wider mb-1">
                  {room.restaurant.name}
                </Typography>
                <Typography variant="large" className="font-semibold leading-tight line-clamp-2">
                  {room.name || `Room ${room.roomNumber}`}
                </Typography>
                <div className="flex items-center gap-2 mt-2 text-sm text-[var(--text-2)] font-medium">
                  <BedDouble className="h-4 w-4" /> {roomTypeLabel(room.type)}
                </div>
              </div>
            </div>

            <hr className="border-[var(--border)] mb-6" />

            {/* Trip Details */}
            <Typography variant="h4" className="mb-4">Your trip</Typography>
            <div className="space-y-4 mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <Typography variant="p" className="font-semibold block mb-0.5">Dates</Typography>
                  <Typography variant="small" className="text-[var(--text-2)]">
                    {checkInDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {checkOutDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Typography>
                </div>
              </div>
              <div className="flex items-start justify-between">
                <div>
                  <Typography variant="p" className="font-semibold block mb-0.5">Guests</Typography>
                  <Typography variant="small" className="text-[var(--text-2)]">
                    {adultsCount} guest{adultsCount > 1 ? 's' : ''}
                  </Typography>
                </div>
              </div>
            </div>

            <hr className="border-[var(--border)] mb-6" />

            {/* Price Breakdown */}
            <Typography variant="h4" className="mb-4">Price details</Typography>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-[var(--text-2)]">
                <span>Rs. {room.price.toLocaleString()} x {nights} night{nights > 1 ? 's' : ''}</span>
                <span>Rs. {subtotal.toLocaleString()}</span>
              </div>
              {tax > 0 && (
                <div className="flex justify-between text-[var(--text-2)]">
                  <span className="underline decoration-dotted cursor-help" title={`Taxes and fees (${taxRate}%)`}>
                    Taxes & fees
                  </span>
                  <span>Rs. {tax.toLocaleString()}</span>
                </div>
              )}
            </div>
            
            <hr className="border-[var(--border)] mb-6" />

            <div className="flex justify-between items-center">
              <Typography variant="large" className="font-bold">Total (NPR)</Typography>
              <Typography variant="h3" className="text-xl">Rs. {total.toLocaleString()}</Typography>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
