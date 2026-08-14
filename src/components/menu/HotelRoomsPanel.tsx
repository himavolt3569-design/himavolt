"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BedDouble, Loader2, Users } from "lucide-react";
import { formatPrice } from "@/lib/currency";

/**
 * Rooms, inside the menu page.
 *
 * A hotel listed on the marketplace is one venue with two things to sell: food
 * and a bed. Customers arrive on the menu page from a nearby search and then
 * have to be able to reach the booking flow, so this shows real rooms and hands
 * off to /hotel/[slug] where the gallery, reviews and availability already live.
 */

/** Mirrors the `rooms` projection from GET /api/public/hotel/[slug]. */
interface Room {
  id: string;
  name: string | null;
  roomNumber: string;
  type: string;
  price: number;
  maxGuests: number;
  imageUrls: string[];
  isAvailable: boolean;
}

export default function HotelRoomsPanel({
  slug,
  name,
}: {
  slug: string;
  name: string;
}) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currency, setCurrency] = useState("NPR");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/public/hotel/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        setRooms(d.rooms ?? []);
        if (d.hotel?.currency) setCurrency(d.hotel.currency);
      })
      .catch(() => {
        /* the hand-off link below still works without the preview */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <div className="py-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-[19px] font-black text-[var(--text-1)]">
            <BedDouble className="h-5 w-5 text-[var(--accent)]" />
            Stay at {name}
          </h2>
          <p className="mt-1 text-[13px] text-[var(--text-2)]">
            Book a room and order food to it from the same place.
          </p>
        </div>
        <Link
          href={`/hotel/${slug}`}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--accent)] px-5 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-[var(--accent-hover)]"
        >
          See rooms and availability
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--text-3)]" />
        </div>
      ) : rooms.length === 0 ? (
        <div className="rounded-2xl bg-[var(--surface)] px-4 py-10 text-center">
          <BedDouble className="mx-auto mb-3 h-7 w-7 text-[var(--text-3)]" />
          <p className="text-[14px] font-bold text-[var(--text-1)]">
            No rooms listed yet
          </p>
          <p className="mt-1 text-[12px] text-[var(--text-3)]">
            Check the full hotel page for availability and contact details.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.slice(0, 6).map((room) => (
            <Link
              key={room.id}
              href={`/hotel/${slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--canvas)] transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="relative h-36 w-full overflow-hidden bg-[var(--surface)]">
                {room.imageUrls?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={room.imageUrls[0]}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <BedDouble className="h-7 w-7 text-[var(--text-3)]" />
                  </div>
                )}
                {!room.isAvailable && (
                  <div className="absolute inset-0 flex items-end bg-black/50 p-3">
                    <span className="rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-neutral-800">
                      Fully booked
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col gap-1 p-3">
                <h3 className="truncate text-[14px] font-bold text-[var(--text-1)]">
                  {room.name || `Room ${room.roomNumber}`}
                </h3>
                <p className="truncate text-[11px] capitalize text-[var(--text-3)]">
                  {room.type.replace(/_/g, " ").toLowerCase()}
                </p>
                <div className="mt-auto flex items-center justify-between pt-2">
                  <span className="flex items-center gap-1 text-[11px] text-[var(--text-2)]">
                    <Users className="h-3 w-3" />
                    {room.maxGuests} guests
                  </span>
                  <span className="text-[15px] font-black text-[var(--text-1)]">
                    {formatPrice(room.price, currency)}
                    <span className="text-[10px] font-medium text-[var(--text-3)]">
                      {" "}
                      / night
                    </span>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
