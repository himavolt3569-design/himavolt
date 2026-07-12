"use client";

import React, { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { Typography } from "@/components/design-system/primitives/Typography";
import { Button } from "@/components/design-system/primitives/Button";
import { ChevronDown, X } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { DayPicker, DateRange } from "react-day-picker";
import { AnchoredMenu } from "@/components/shared/AnchoredMenu";
import "react-day-picker/style.css";

export function HotelBookingSidebar({
  hotelId,
  hotelSlug,
  startingPrice,
  hotelName,
  dateAnchorId,
}: {
  hotelId: string;
  hotelSlug: string;
  startingPrice: number;
  hotelName: string;
  dateAnchorId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const checkIn = searchParams.get("checkIn");
    const checkOut = searchParams.get("checkOut");
    if (checkIn && checkOut) {
      return { from: new Date(checkIn), to: new Date(checkOut) };
    }
    return undefined;
  });

  const [guests, setGuests] = useState<number>(
    Number(searchParams.get("adults")) || 2,
  );
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // Anchor ref for AnchoredMenu — points to the check-in/out trigger row
  const dateAnchorRef = useRef<HTMLDivElement>(null);

  const handleUpdate = () => {
    if (!dateRange?.from || !dateRange?.to) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("checkIn", format(dateRange.from, "yyyy-MM-dd"));
    params.set("checkOut", format(dateRange.to, "yyyy-MM-dd"));
    params.set("adults", guests.toString());
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      handleUpdate();
      setIsDatePickerOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, guests]);

  const handleReserve = () => {
    if (!dateRange?.from || !dateRange?.to) {
      setIsDatePickerOpen(true);
      return;
    }
    document.getElementById("rooms")?.scrollIntoView({ behavior: "smooth" });
  };

  const nights =
    dateRange?.from && dateRange?.to
      ? Math.ceil(
          (dateRange.to.getTime() - dateRange.from.getTime()) /
            (1000 * 3600 * 24),
        )
      : 0;

  return (
    <div className="bg-white rounded-3xl border border-[var(--border)] shadow-float p-6">
      {/* Price Header */}
      <div className="flex items-baseline gap-2 mb-6">
        <Typography variant="h2" className="text-2xl">
          Rs. {startingPrice.toLocaleString()}
        </Typography>
        <Typography variant="muted">night</Typography>
      </div>

      {/* Booking Form Grid */}
      <div className="border border-[var(--border-soft)] rounded-xl mb-4 bg-white">
        {/* Date trigger */}
        <div
          id={dateAnchorId}
          ref={dateAnchorRef}
          className="flex border-b border-[var(--border-soft)] cursor-pointer"
          onClick={() => setIsDatePickerOpen((o) => !o)}
        >
          <div className="flex-1 p-3 border-r border-[var(--border-soft)] hover:bg-[var(--surface-alt)] transition-colors rounded-tl-xl">
            <label className="uppercase text-[10px] tracking-wider text-[var(--text-3)] font-bold block mb-1 cursor-pointer">
              Check-in
            </label>
            <div className="text-sm font-semibold text-[var(--text-1)] truncate">
              {dateRange?.from
                ? format(dateRange.from, "MM/dd/yyyy")
                : "Add date"}
            </div>
          </div>
          <div className="flex-1 p-3 hover:bg-[var(--surface-alt)] transition-colors rounded-tr-xl">
            <label className="uppercase text-[10px] tracking-wider text-[var(--text-3)] font-bold block mb-1 cursor-pointer">
              Check-out
            </label>
            <div className="text-sm font-semibold text-[var(--text-1)] truncate">
              {dateRange?.to
                ? format(dateRange.to, "MM/dd/yyyy")
                : "Add date"}
            </div>
          </div>
        </div>

        {/* Guests */}
        <div className="p-3 relative hover:bg-[var(--surface-alt)] transition-colors rounded-b-xl">
          <label className="uppercase text-[10px] tracking-wider text-[var(--text-3)] font-bold block mb-1 cursor-pointer">
            Guests
          </label>
          <select
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            className="w-full bg-transparent outline-none text-sm font-semibold text-[var(--text-1)] appearance-none cursor-pointer"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
              <option key={num} value={num}>
                {num} guest{num > 1 ? "s" : ""}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-2)] pointer-events-none" />
        </div>
      </div>

      {/* Date Picker — portalled so it can't be clipped by overflow-hidden parents */}
      <AnchoredMenu
        anchorRef={dateAnchorRef}
        open={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        align="right"
        width={340}
        gap={8}
        className="bg-white rounded-3xl shadow-float border border-[var(--border-soft)] p-4"
      >
        <div className="flex justify-between items-center mb-2 px-2">
          <Typography variant="small" className="font-bold">
            Select dates
          </Typography>
          <button
            onClick={() => setIsDatePickerOpen(false)}
            className="p-1 hover:bg-[var(--surface-alt)] rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-[var(--text-2)]" />
          </button>
        </div>
        <DayPicker
          mode="range"
          selected={dateRange}
          onSelect={setDateRange}
          numberOfMonths={1}
          disabled={{ before: new Date() }}
          classNames={{
            selected: "bg-[var(--text-1)] text-white",
            today: "font-bold text-[var(--accent)]",
            day_button:
              "h-10 w-10 p-0 font-medium hover:bg-[var(--surface-alt)] rounded-full transition-colors",
            button_previous:
              "h-8 w-8 bg-transparent hover:bg-[var(--surface-alt)] rounded-full flex items-center justify-center transition-colors",
            button_next:
              "h-8 w-8 bg-transparent hover:bg-[var(--surface-alt)] rounded-full flex items-center justify-center transition-colors",
          }}
        />
        <div className="flex justify-end mt-2 px-2">
          <button
            onClick={() => setDateRange(undefined)}
            className="text-sm font-semibold underline text-[var(--text-2)] hover:text-[var(--text-1)]"
          >
            Clear dates
          </button>
        </div>
      </AnchoredMenu>

      <Button
        size="lg"
        className="w-full text-base py-6 rounded-xl"
        onClick={handleReserve}
      >
        Check Availability
      </Button>

      <Typography variant="muted" className="text-center text-sm mt-4 block">
        You won&apos;t be charged yet
      </Typography>

      {nights > 0 && (
        <div className="mt-4 pt-4 border-t border-[var(--border-soft)]">
          <div className="flex justify-between text-sm mb-2 text-[var(--text-2)]">
            <span>
              Rs. {startingPrice.toLocaleString()} x {nights} night
              {nights > 1 ? "s" : ""}
            </span>
            <span>Rs. {(startingPrice * nights).toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-bold text-[var(--text-1)] mt-2">
            <span>Total estimate</span>
            <span>Rs. {(startingPrice * nights).toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}
