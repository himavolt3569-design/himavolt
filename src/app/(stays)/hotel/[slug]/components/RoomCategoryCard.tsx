"use client";

import React from "react";
import { Typography } from "@/components/design-system/primitives/Typography";
import { Button } from "@/components/design-system/primitives/Button";
import { BedDouble, Users, Check, XCircle, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { SafeImage } from "@/components/design-system/SafeImage";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/utils";
import { roomTypeLabel } from "@/lib/room-display";
import { stripHtml } from "@/components/shared/RichTextEditor";

export function RoomCategoryCard({ 
  room, 
  hasValidDates, 
  searchParams 
}: { 
  room: any,
  hasValidDates: boolean,
  searchParams: any
}) {
  const router = useRouter();
  const { showToast } = useToast();

  const images = room.imageUrls && room.imageUrls.length > 0
    ? room.imageUrls
    : ["https://images.unsplash.com/photo-1542314831-c6a4d14d8373?auto=format&fit=crop&w=800&q=80"];

  const handleSelect = () => {
    if (!hasValidDates) {
      // Scroll to the booking card (mobile-inline or desktop-sticky) so the dates can be picked
      document.getElementById("booking-dates")?.scrollIntoView({ behavior: "smooth", block: "center" });
      showToast("Please add your check-in and check-out dates first.", "error");
      return;
    }
    
    // Move to checkout flow
    const sp = new URLSearchParams();
    if (searchParams.checkIn) sp.set("checkIn", searchParams.checkIn);
    if (searchParams.checkOut) sp.set("checkOut", searchParams.checkOut);
    if (searchParams.adults) sp.set("adults", searchParams.adults);
    
    router.push(`/book/${room.id}?${sp.toString()}`);
  };

  const isUnavailable = hasValidDates && room.isAvailableForDates === false;
  const isTooSmall = hasValidDates && room.fitsGuests === false;
  const isDisabled = isUnavailable || isTooSmall;

  return (
    <div className={cn(
      "flex flex-col sm:flex-row gap-6 p-4 rounded-3xl border transition-colors bg-white",
      isDisabled ? "opacity-60 border-[var(--border-soft)] grayscale-[20%]" : "border-[var(--border-soft)] hover:border-[var(--border)]"
    )}>
      
      {/* Room Thumbnail (Desktop left, Mobile top) */}
      <div className="w-full sm:w-1/3 aspect-[4/3] rounded-2xl overflow-hidden bg-[var(--surface-alt)] relative shrink-0">
        <SafeImage
          src={images[0]}
          alt={room.name || `Room ${room.roomNumber}`}
          sizes="(max-width: 640px) 100vw, 33vw"
          className="transition-transform duration-500 hover:scale-105"
        />
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-xs font-bold text-[var(--text-1)] shadow-sm">
          {roomTypeLabel(room.type)}
        </div>
      </div>

      {/* Room Details */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <div className="flex flex-wrap justify-between items-start gap-1 mb-2">
            <Typography variant="h4" className="text-lg md:text-xl">{room.name || `Room ${room.roomNumber}`}</Typography>
            <div className="text-right shrink-0">
              <Typography variant="large" className="font-semibold block">Rs. {room.price.toLocaleString()}</Typography>
              <Typography variant="small" className="text-[var(--text-3)] block uppercase tracking-wider text-[10px] font-bold">/ night</Typography>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-[var(--text-2)] mb-4">
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <BedDouble className="h-4 w-4" /> 
              {room.bedCount > 1 ? `${room.bedCount}x ` : ""}{room.bedType || "Standard Bed"}
            </span>
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <Users className="h-4 w-4" /> 
              Up to {room.maxGuests} guests
            </span>
          </div>

          <Typography variant="muted" className="text-[var(--text-2)] text-sm mb-4 line-clamp-2">
            {stripHtml(room.description) || "A beautiful and spacious room designed for comfort and relaxation, featuring premium amenities and stunning views."}
          </Typography>

          {/* Top 4 Amenities */}
          {room.amenities && room.amenities.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              {room.amenities.slice(0, 4).map((am: string) => (
                <div key={am} className="flex items-center gap-2 text-[var(--text-2)] text-sm">
                  <Check className="h-4 w-4 text-green-600 shrink-0" />
                  <span className="truncate">{am}</span>
                </div>
              ))}
            </div>
          )}
          
          {/* Trust Elements */}
          <div className="flex flex-col gap-1 mt-2 p-3 bg-green-50/50 rounded-xl border border-green-100">
            <Typography variant="small" className="text-green-800 font-semibold flex items-center gap-1.5">
              <Check className="h-3 w-3" /> Breakfast Included
            </Typography>
            <Typography variant="small" className="text-green-800 font-semibold flex items-center gap-1.5">
              <Check className="h-3 w-3" /> Free cancellation (up to 48 hours prior)
            </Typography>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 mt-4">
          <div className="text-sm font-medium">
            {isUnavailable && (
              <span className="flex items-center gap-1.5 text-red-600">
                <XCircle className="h-4 w-4" /> Not available for these dates
              </span>
            )}
            {isTooSmall && !isUnavailable && (
              <span className="flex items-center gap-1.5 text-amber-600">
                <AlertCircle className="h-4 w-4" /> Room capacity exceeded
              </span>
            )}
          </div>
          <Button
            variant={isDisabled ? "secondary" : "default"}
            className="w-full sm:w-auto rounded-xl px-6"
            onClick={handleSelect}
            disabled={isDisabled}
          >
            {hasValidDates ? "Reserve" : "Check Availability"}
          </Button>
        </div>
      </div>
    </div>
  );
}
