import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Typography } from "@/components/design-system/primitives/Typography";
import {
  BedDouble,
  Users,
  Wifi,
  UtensilsCrossed,
  CalendarCheck,
  MapPin,
  Phone,
} from "lucide-react";
import { Metadata } from "next";

const HOTEL_TYPES = ["HOTEL", "RESORT", "GUEST_HOUSE"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; roomNumber: string }>;
}): Promise<Metadata> {
  const { slug, roomNumber } = await params;
  const hotel = await db.restaurant.findUnique({
    where: { slug: decodeURIComponent(slug) },
    select: { name: true },
  });
  if (!hotel) return { title: "Room Not Found" };
  return {
    title: `Room ${decodeURIComponent(roomNumber)} · ${hotel.name} | Stays by HimaVolt`,
  };
}

// In-room QR landing: the guest scanning this either wants to book the room
// (pre-stay) or order food to it (in-stay). Serve both, plus WiFi since
// they're standing in the room.
export default async function RoomLandingPage({
  params,
}: {
  params: Promise<{ slug: string; roomNumber: string }>;
}) {
  const { slug: encodedSlug, roomNumber: encodedRoomNumber } = await params;
  const slug = decodeURIComponent(encodedSlug);
  const roomNumber = decodeURIComponent(encodedRoomNumber);

  const hotel = await db.restaurant.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
      address: true,
      city: true,
      phone: true,
      currency: true,
      isActive: true,
      wifiName: true,
      wifiPassword: true,
    },
  });

  if (!hotel || !hotel.isActive || !HOTEL_TYPES.includes(hotel.type)) {
    notFound();
  }

  const room = await db.room.findUnique({
    where: {
      restaurantId_roomNumber: {
        restaurantId: hotel.id,
        roomNumber: roomNumber.trim(),
      },
    },
    select: {
      id: true,
      roomNumber: true,
      name: true,
      type: true,
      price: true,
      maxGuests: true,
      bedType: true,
      bedCount: true,
      description: true,
      amenities: true,
      imageUrls: true,
      isAvailable: true,
      isActive: true,
    },
  });

  if (!room || !room.isActive) {
    notFound();
  }

  const now = new Date();
  const liveBooking = await db.roomBooking.findFirst({
    where: {
      roomId: room.id,
      status: { in: ["CONFIRMED", "CHECKED_IN"] },
      checkIn: { lte: now },
      checkOut: { gt: now },
    },
    select: { checkOut: true },
  });

  const roomLabel = room.name || `Room ${room.roomNumber}`;
  const isFree = room.isAvailable && !liveBooking;
  const heroImage = room.imageUrls[0];

  return (
    <div className="min-h-screen bg-(--canvas) pb-16">
      <div className="container mx-auto px-4 md:px-8 pt-6 md:pt-10 max-w-2xl">

        {/* Room hero */}
        <div className="rounded-3xl overflow-hidden border border-(--border) bg-(--surface) shadow-sm">
          {heroImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={heroImage}
              alt={roomLabel}
              className="w-full h-56 md:h-72 object-cover"
            />
          )}
          <div className="p-6 md:p-8 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Typography variant="h2" className="leading-tight">{roomLabel}</Typography>
                <p className="text-(--text-2) mt-1 flex items-center gap-1.5 text-sm">
                  <MapPin className="h-4 w-4 shrink-0" />
                  {hotel.name}, {hotel.city}
                </p>
              </div>
              <span
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  isFree
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-amber-50 text-amber-600"
                }`}
              >
                {isFree ? "Available" : "Occupied"}
              </span>
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-(--text-2) font-medium">
              <span className="flex items-center gap-1.5">
                <BedDouble className="h-4 w-4" strokeWidth={1.5} />
                {room.bedCount} × {room.bedType}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" strokeWidth={1.5} />
                Up to {room.maxGuests} guests
              </span>
              <span className="font-bold text-(--text-1)">
                Rs. {room.price.toLocaleString()} / night
              </span>
            </div>

            {room.description && (
              <p className="text-(--text-2) text-sm leading-relaxed">{room.description}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 grid gap-3">
          <Link
            href={`/menu/${hotel.slug}?room=${encodeURIComponent(room.roomNumber)}`}
            className="flex items-center justify-between gap-4 bg-(--accent) hover:bg-(--accent-hover) active:scale-[0.99] text-white rounded-2xl px-6 py-5 transition-all shadow-lg"
          >
            <span className="flex items-center gap-3 font-bold">
              <UtensilsCrossed className="h-5 w-5" />
              Order food to this room
            </span>
            <span className="text-white/70 text-sm font-medium">In-stay</span>
          </Link>

          <Link
            href={`/hotel/${hotel.slug}#rooms`}
            className="flex items-center justify-between gap-4 bg-(--surface) border border-(--border) hover:border-(--text-3) active:scale-[0.99] text-(--text-1) rounded-2xl px-6 py-5 transition-all"
          >
            <span className="flex items-center gap-3 font-bold">
              <CalendarCheck className="h-5 w-5" />
              Book a stay at {hotel.name}
            </span>
            <span className="text-(--text-3) text-sm font-medium">Pre-stay</span>
          </Link>
        </div>

        {/* WiFi — guest is physically in the room, so credentials are fair game */}
        {hotel.wifiName && (
          <div className="mt-6 rounded-2xl border border-(--border) bg-(--surface) p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-(--canvas) flex items-center justify-center shrink-0">
              <Wifi className="h-6 w-6 text-(--text-2)" strokeWidth={1.5} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-(--text-3)">WiFi</p>
              <p className="font-bold text-(--text-1) truncate">{hotel.wifiName}</p>
              {hotel.wifiPassword && (
                <p className="text-sm text-(--text-2) font-mono">{hotel.wifiPassword}</p>
              )}
            </div>
          </div>
        )}

        {/* Contact */}
        {hotel.phone && (
          <a
            href={`tel:${hotel.phone}`}
            className="mt-3 rounded-2xl border border-(--border) bg-(--surface) p-6 flex items-center gap-4 hover:border-(--text-3) transition-all"
          >
            <div className="h-12 w-12 rounded-2xl bg-(--canvas) flex items-center justify-center shrink-0">
              <Phone className="h-6 w-6 text-(--text-2)" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-(--text-3)">Reception</p>
              <p className="font-bold text-(--text-1)">{hotel.phone}</p>
            </div>
          </a>
        )}
      </div>
    </div>
  );
}
