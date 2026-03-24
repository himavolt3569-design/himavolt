"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BedDouble,
  Users,
  MapPin,
  Phone,
  Star,
  Wifi,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle,
  Loader2,
  Mountain,
  ArrowLeft,
  Coffee,
  Tv,
  Wind,
  Bath,
  Car,
  Dumbbell,
  UtensilsCrossed,
  Shield,
  Clock,
  CreditCard,
  Building2,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

/* ─── Types ─────────────────────────────────────────────────────── */
interface Room {
  id: string;
  roomNumber: string;
  name: string | null;
  type: string;
  floor: number;
  price: number;
  maxGuests: number;
  bedType: string | null;
  bedCount: number;
  description: string | null;
  amenities: string[];
  imageUrls: string[];
  videoUrl: string | null;
  isAvailable: boolean;
}

interface Hotel {
  id: string;
  name: string;
  slug: string;
  type: string;
  address: string;
  city: string;
  phone: string;
  imageUrl: string | null;
  coverUrl: string | null;
  currency: string;
  rating: number;
  openingTime: string;
  closingTime: string;
  hotelAdvanceType: string;
  hotelAdvanceValue: number;
  heroSlides: { id: string; imageUrl: string; title?: string; subtitle?: string }[];
}

interface BookingForm {
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  guestAddress: string;
  adults: number;
  children: number;
  checkIn: string;
  checkOut: string;
  notes: string;
}

/* ─── Amenity icon map ─────────────────────────────────────────── */
const AMENITY_ICONS: Record<string, typeof Wifi> = {
  WiFi: Wifi,
  TV: Tv,
  AC: Wind,
  Bathroom: Bath,
  Parking: Car,
  Gym: Dumbbell,
  Restaurant: UtensilsCrossed,
  Security: Shield,
  "24/7 Reception": Clock,
};

function AmenityChip({ label }: { label: string }) {
  const Icon = AMENITY_ICONS[label] ?? Coffee;
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[12px] font-medium text-amber-700 ring-1 ring-amber-100">
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

const TYPE_COLORS: Record<string, string> = {
  STANDARD: "bg-slate-100 text-slate-700",
  DELUXE: "bg-amber-100 text-amber-700",
  SUITE: "bg-purple-100 text-purple-700",
  DORMITORY: "bg-green-100 text-green-700",
};

/* ─── Image Carousel ───────────────────────────────────────────── */
function ImageCarousel({ images, name }: { images: string[]; name: string }) {
  const [idx, setIdx] = useState(0);
  if (!images.length) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
        <BedDouble className="h-12 w-12 text-amber-200" />
      </div>
    );
  }
  return (
    <div className="relative h-full w-full group">
      <img
        src={images[idx]}
        alt={name}
        className="h-full w-full object-cover transition-all duration-500"
      />
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); setIdx((i) => (i - 1 + images.length) % images.length); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setIdx((i) => (i + 1) % images.length); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight className="h-3 w-3" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full transition-all ${i === idx ? "bg-white w-4" : "bg-white/50"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Booking Modal ────────────────────────────────────────────── */
function BookingModal({
  room,
  hotel,
  onClose,
  onSuccess,
}: {
  room: Room;
  hotel: Hotel;
  onClose: () => void;
  onSuccess: (bookingId: string) => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  const [form, setForm] = useState<BookingForm>({
    guestName: "",
    guestPhone: "",
    guestEmail: "",
    guestAddress: "",
    adults: 1,
    children: 0,
    checkIn: today,
    checkOut: tomorrow,
    notes: "",
  });
  const [payMethod, setPayMethod] = useState<"ESEWA" | "KHALTI" | "CASH">("ESEWA");
  const [step, setStep] = useState<"form" | "payment" | "processing">("form");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const esewaFormRef = useRef<HTMLFormElement>(null);
  const [esewaData, setEsewaData] = useState<Record<string, string> | null>(null);

  const nights = Math.max(
    1,
    Math.ceil(
      (new Date(form.checkOut).getTime() - new Date(form.checkIn).getTime()) / 86400000,
    ),
  );
  const totalPrice = room.price * nights;
  let advanceAmount =
    hotel.hotelAdvanceType === "PERCENTAGE"
      ? Math.round((totalPrice * hotel.hotelAdvanceValue) / 100)
      : hotel.hotelAdvanceValue;

  const cur = hotel.currency === "USD" ? "$" : hotel.currency === "INR" ? "₹" : "Rs.";

  const handleBook = async () => {
    if (!form.guestName.trim() || !form.guestPhone.trim()) {
      setError("Name and phone are required");
      return;
    }
    if (new Date(form.checkOut) <= new Date(form.checkIn)) {
      setError("Check-out must be after check-in");
      return;
    }
    setError("");
    setLoading(true);
    try {
      // 1. Create booking
      const res = await fetch(`/api/public/hotel/${hotel.slug}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: room.id,
          guestName: form.guestName.trim(),
          guestPhone: form.guestPhone.trim(),
          guestEmail: form.guestEmail.trim() || undefined,
          guestAddress: form.guestAddress.trim() || undefined,
          adults: form.adults,
          children: form.children,
          checkIn: form.checkIn,
          checkOut: form.checkOut,
          notes: form.notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Booking failed"); setLoading(false); return; }
      const bid = data.booking.id;
      setBookingId(bid);

      // 2. If cash, mark paid immediately (staff will confirm)
      if (payMethod === "CASH") {
        await fetch("/api/payments/room-booking/initiate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId: bid, method: "CASH" }),
        });
        onSuccess(bid);
        return;
      }

      // 3. Initiate eSewa/Khalti
      const payRes = await fetch("/api/payments/room-booking/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: bid, method: payMethod }),
      });
      const payData = await payRes.json();
      if (!payRes.ok) { setError(payData.error || "Payment initiation failed"); setLoading(false); return; }

      if (payMethod === "KHALTI" && payData.paymentUrl) {
        window.location.href = payData.paymentUrl;
        return;
      }
      if (payMethod === "ESEWA" && payData.gateway) {
        setEsewaData(payData.gateway.formData);
        setStep("payment");
        setLoading(false);
        return;
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  // Auto-submit eSewa form
  useEffect(() => {
    if (esewaData && esewaFormRef.current) {
      esewaFormRef.current.submit();
    }
  }, [esewaData]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/95 backdrop-blur-sm px-6 py-4">
          <div>
            <h2 className="text-[16px] font-bold text-gray-900">Book Room</h2>
            <p className="text-[12px] text-gray-500">
              {room.name || `Room ${room.roomNumber}`} · {cur}{room.price.toLocaleString()}/night
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Check-in</label>
              <input
                type="date"
                value={form.checkIn}
                min={today}
                onChange={(e) => setForm((f) => ({ ...f, checkIn: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-[13px] font-medium text-gray-800 focus:border-amber-400 focus:outline-none focus:bg-white transition-all"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Check-out</label>
              <input
                type="date"
                value={form.checkOut}
                min={form.checkIn}
                onChange={(e) => setForm((f) => ({ ...f, checkOut: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-[13px] font-medium text-gray-800 focus:border-amber-400 focus:outline-none focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Price preview */}
          <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100">
            <div className="flex justify-between text-[13px] mb-1">
              <span className="text-gray-600">{cur}{room.price.toLocaleString()} × {nights} night{nights > 1 ? "s" : ""}</span>
              <span className="font-semibold text-gray-800">{cur}{totalPrice.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[13px] font-bold text-amber-700 border-t border-amber-100 pt-2 mt-2">
              <span>Advance required ({hotel.hotelAdvanceType === "PERCENTAGE" ? `${hotel.hotelAdvanceValue}%` : "Fixed"})</span>
              <span>{cur}{advanceAmount.toLocaleString()}</span>
            </div>
          </div>

          {/* Guest count */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Adults</label>
              <input
                type="number"
                min={1}
                max={room.maxGuests}
                value={form.adults}
                onChange={(e) => setForm((f) => ({ ...f, adults: parseInt(e.target.value) || 1 }))}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-[13px] font-medium text-gray-800 focus:border-amber-400 focus:outline-none focus:bg-white transition-all"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Children</label>
              <input
                type="number"
                min={0}
                max={room.maxGuests}
                value={form.children}
                onChange={(e) => setForm((f) => ({ ...f, children: parseInt(e.target.value) || 0 }))}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-[13px] font-medium text-gray-800 focus:border-amber-400 focus:outline-none focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Guest info */}
          {[
            { field: "guestName" as const, label: "Full Name *", placeholder: "Your full name" },
            { field: "guestPhone" as const, label: "Phone *", placeholder: "+977 98XXXXXXXX" },
            { field: "guestEmail" as const, label: "Email", placeholder: "your@email.com" },
            { field: "guestAddress" as const, label: "Address", placeholder: "Your home address" },
          ].map(({ field, label, placeholder }) => (
            <div key={field}>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">{label}</label>
              <input
                type={field === "guestEmail" ? "email" : "text"}
                value={form[field] as string}
                onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                placeholder={placeholder}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-[13px] text-gray-800 placeholder:text-gray-400 focus:border-amber-400 focus:outline-none focus:bg-white transition-all"
              />
            </div>
          ))}

          {/* Special requests */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Special Requests</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Any special requirements..."
              rows={2}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-[13px] text-gray-800 placeholder:text-gray-400 focus:border-amber-400 focus:outline-none focus:bg-white transition-all resize-none"
            />
          </div>

          {/* Payment method */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2">Pay Advance via</label>
            <div className="grid grid-cols-3 gap-2">
              {(["ESEWA", "KHALTI", "CASH"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setPayMethod(m)}
                  className={`rounded-xl border-2 py-2.5 text-[12px] font-bold transition-all ${
                    payMethod === m
                      ? "border-amber-500 bg-amber-50 text-amber-700"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  {m === "ESEWA" ? "eSewa" : m === "KHALTI" ? "Khalti" : "Cash"}
                </button>
              ))}
            </div>
            {payMethod === "CASH" && (
              <p className="mt-2 text-[11px] text-gray-500">
                Pay the advance at the hotel front desk. Your booking will be confirmed by staff.
              </p>
            )}
          </div>

          {error && (
            <p className="rounded-xl bg-rose-50 px-4 py-3 text-[12px] font-medium text-rose-600 ring-1 ring-rose-100">
              {error}
            </p>
          )}

          <button
            onClick={handleBook}
            disabled={loading}
            className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 py-4 text-[14px] font-bold text-white shadow-lg hover:from-amber-400 hover:to-orange-400 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
            ) : (
              <>Confirm &amp; Pay {cur}{advanceAmount.toLocaleString()} Advance</>
            )}
          </button>
        </div>

        {/* Hidden eSewa form */}
        {esewaData && (
          <form ref={esewaFormRef} method="POST" action="https://rc-epay.esewa.com.np/api/epay/main/v2/form" className="hidden">
            {Object.entries(esewaData).map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ─── Room Card ────────────────────────────────────────────────── */
function RoomCard({
  room,
  currency,
  onBook,
}: {
  room: Room;
  currency: string;
  onBook: () => void;
}) {
  const cur = currency === "USD" ? "$" : currency === "INR" ? "₹" : "Rs.";
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl bg-white ring-1 ring-gray-100 shadow-sm hover:shadow-md transition-all"
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden bg-gray-50">
        <ImageCarousel images={room.imageUrls} name={room.name || `Room ${room.roomNumber}`} />
        {!room.isAvailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="rounded-full bg-white/90 px-4 py-1.5 text-[12px] font-bold text-gray-800">
              Not Available
            </span>
          </div>
        )}
        <div className="absolute top-3 left-3 flex gap-1.5">
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${TYPE_COLORS[room.type] || "bg-gray-100 text-gray-600"}`}>
            {room.type}
          </span>
          <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-gray-700">
            Floor {room.floor}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="text-[15px] font-bold text-gray-900">
              {room.name || `Room ${room.roomNumber}`}
            </h3>
            <p className="text-[11px] text-gray-500">Room #{room.roomNumber}</p>
          </div>
          <div className="text-right">
            <p className="text-[17px] font-black text-amber-600">{cur}{room.price.toLocaleString()}</p>
            <p className="text-[10px] text-gray-400">per night</p>
          </div>
        </div>

        {/* Bed & guests */}
        <div className="flex items-center gap-4 mb-3">
          {room.bedType && (
            <span className="flex items-center gap-1 text-[12px] text-gray-600">
              <BedDouble className="h-3.5 w-3.5 text-amber-500" />
              {room.bedCount > 1 ? `${room.bedCount}x ` : ""}{room.bedType}
            </span>
          )}
          <span className="flex items-center gap-1 text-[12px] text-gray-600">
            <Users className="h-3.5 w-3.5 text-amber-500" />
            Up to {room.maxGuests} guests
          </span>
        </div>

        {room.description && (
          <p className="text-[12px] text-gray-500 mb-3 line-clamp-2">{room.description}</p>
        )}

        {room.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {room.amenities.slice(0, 5).map((a) => (
              <AmenityChip key={a} label={a} />
            ))}
            {room.amenities.length > 5 && (
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] text-gray-500">
                +{room.amenities.length - 5} more
              </span>
            )}
          </div>
        )}

        <button
          onClick={onBook}
          disabled={!room.isAvailable}
          className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 text-[13px] font-bold text-white shadow-sm hover:from-amber-400 hover:to-orange-400 active:scale-[0.97] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {room.isAvailable ? "Book Now" : "Not Available"}
        </button>
      </div>
    </motion.div>
  );
}

/* ─── Main Page ────────────────────────────────────────────────── */
export default function HotelPublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [grouped, setGrouped] = useState<Record<string, Room[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [bookedId, setBookedId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string>("ALL");
  const [heroIdx, setHeroIdx] = useState(0);

  useEffect(() => {
    fetch(`/api/public/hotel/${slug}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); setLoading(false); return; }
        setHotel(d.hotel);
        setRooms(d.rooms);
        setGrouped(d.grouped);
        setLoading(false);
      })
      .catch(() => { setError("Failed to load hotel"); setLoading(false); });
  }, [slug]);

  // Auto-rotate hero slides
  useEffect(() => {
    if (!hotel?.heroSlides?.length) return;
    const t = setInterval(() => setHeroIdx((i) => (i + 1) % hotel.heroSlides.length), 4000);
    return () => clearInterval(t);
  }, [hotel?.heroSlides?.length]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500">
            <Mountain className="h-6 w-6 text-white" />
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
          <p className="text-[13px] text-gray-500">Loading hotel...</p>
        </div>
      </div>
    );
  }

  if (error || !hotel) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <Building2 className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <p className="text-[15px] font-semibold text-gray-600">{error || "Hotel not found"}</p>
          <Link href="/" className="mt-4 inline-block text-[13px] text-amber-600 hover:underline">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const roomTypes = ["ALL", ...Object.keys(grouped)];
  const displayedRooms =
    activeType === "ALL" ? rooms : grouped[activeType] ?? [];

  const cur = hotel.currency === "USD" ? "$" : hotel.currency === "INR" ? "₹" : "Rs.";

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Nav */}
      <nav className="sticky top-0 z-40 flex items-center justify-between border-b border-gray-200/50 bg-white/80 backdrop-blur-xl px-5 py-3.5 shadow-sm">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500">
            <Mountain className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[15px] font-bold text-gray-900">
            Hima<span className="text-amber-500">Volt</span>
          </span>
        </Link>
        <div className="flex items-center gap-1.5 text-[12px] text-gray-500">
          <MapPin className="h-3 w-3" />
          {hotel.city}
        </div>
      </nav>

      {/* Hero */}
      <div className="relative h-64 sm:h-80 md:h-96 overflow-hidden bg-gradient-to-br from-amber-900 to-gray-900">
        {hotel.heroSlides.length > 0 ? (
          <img
            src={hotel.heroSlides[heroIdx].imageUrl}
            alt={hotel.name}
            className="h-full w-full object-cover opacity-80 transition-all duration-700"
          />
        ) : hotel.coverUrl ? (
          <img src={hotel.coverUrl} alt={hotel.name} className="h-full w-full object-cover opacity-80" />
        ) : hotel.imageUrl ? (
          <img src={hotel.imageUrl} alt={hotel.name} className="h-full w-full object-cover opacity-80" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Building2 className="h-24 w-24 text-white/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-6 left-5 right-5">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-amber-300">
            {hotel.type.replace("_", " ")}
          </p>
          <h1 className="text-[28px] sm:text-[36px] font-black text-white leading-tight drop-shadow-lg">
            {hotel.name}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-[12px] text-white/80">
              <MapPin className="h-3 w-3" />
              {hotel.address}, {hotel.city}
            </span>
            {hotel.rating > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-amber-400/20 px-2.5 py-0.5 text-[11px] font-bold text-amber-300">
                <Star className="h-2.5 w-2.5 fill-amber-300" />
                {hotel.rating.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Info bar */}
      <div className="bg-white border-b border-gray-100 px-5 py-3 flex items-center gap-6 overflow-x-auto scrollbar-hide">
        <span className="flex items-center gap-1.5 text-[12px] text-gray-600 whitespace-nowrap">
          <Phone className="h-3.5 w-3.5 text-amber-500" />
          {hotel.phone}
        </span>
        <span className="flex items-center gap-1.5 text-[12px] text-gray-600 whitespace-nowrap">
          <Clock className="h-3.5 w-3.5 text-amber-500" />
          {hotel.openingTime} – {hotel.closingTime}
        </span>
        <span className="flex items-center gap-1.5 text-[12px] text-amber-700 font-semibold whitespace-nowrap">
          <CreditCard className="h-3.5 w-3.5" />
          {hotel.hotelAdvanceType === "PERCENTAGE"
            ? `${hotel.hotelAdvanceValue}% advance`
            : `${cur}${hotel.hotelAdvanceValue} advance`}
        </span>
        <span className="flex items-center gap-1 text-[12px] text-emerald-600 font-medium whitespace-nowrap">
          <CheckCircle className="h-3.5 w-3.5" />
          {rooms.filter((r) => r.isAvailable).length} rooms available
        </span>
      </div>

      {/* Room type filter */}
      <div className="sticky top-[57px] z-30 bg-white/90 backdrop-blur-sm border-b border-gray-100 px-5 py-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {roomTypes.map((type) => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-[12px] font-semibold transition-all ${
                activeType === type
                  ? "bg-amber-500 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {type === "ALL" ? `All Rooms (${rooms.length})` : `${type} (${grouped[type]?.length ?? 0})`}
            </button>
          ))}
        </div>
      </div>

      {/* Rooms grid */}
      <main className="mx-auto max-w-6xl px-4 py-8">
        {displayedRooms.length === 0 ? (
          <div className="py-20 text-center">
            <BedDouble className="mx-auto h-12 w-12 text-gray-200 mb-3" />
            <p className="text-[14px] font-medium text-gray-400">No rooms found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayedRooms.map((room, i) => (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <RoomCard
                  room={room}
                  currency={hotel.currency}
                  onBook={() => setSelectedRoom(room)}
                />
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white px-5 py-6 text-center">
        <p className="text-[11px] text-gray-400">
          Powered by{" "}
          <Link href="/" className="font-bold text-amber-500">HimaVolt</Link>
        </p>
      </footer>

      {/* Booking modal */}
      <AnimatePresence>
        {selectedRoom && hotel && (
          <BookingModal
            room={selectedRoom}
            hotel={hotel}
            onClose={() => setSelectedRoom(null)}
            onSuccess={(id) => {
              setBookedId(id);
              setSelectedRoom(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Success toast */}
      <AnimatePresence>
        {bookedId && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl bg-emerald-600 px-6 py-4 text-white shadow-2xl"
          >
            <CheckCircle className="h-5 w-5 shrink-0" />
            <div>
              <p className="text-[13px] font-bold">Booking Submitted!</p>
              <p className="text-[11px] text-emerald-100">
                Staff will confirm your booking shortly.
              </p>
            </div>
            <button onClick={() => setBookedId(null)} className="ml-2 rounded-full p-1 hover:bg-white/20 transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
