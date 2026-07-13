import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { Typography } from "@/components/design-system/primitives/Typography";
import { MapPin, Wifi, Coffee, Tv, Wind, Bath, Car, Dumbbell, UtensilsCrossed, Shield, Clock } from "lucide-react";
import { HotelHeroGallery } from "./components/HotelHeroGallery";
import { HotelBookingSidebar } from "./components/HotelBookingSidebar";
import { RoomCategoryCard } from "./components/RoomCategoryCard";
import { ReviewSection } from "./components/ReviewSection";
import { HotelLocationMapClient } from "./components/HotelLocationMapClient";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const hotel = await db.restaurant.findUnique({
    where: { slug },
    select: { name: true, city: true }
  });
  if (!hotel) return { title: "Hotel Not Found" };
  return {
    title: `${hotel.name} - ${hotel.city} | Stays by HimaVolt`,
    description: `Book your stay at ${hotel.name} in ${hotel.city} with HimaVolt.`,
  };
}

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

export default async function HotelDetailPage(props: { 
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { slug } = await props.params;
  const searchParams = await props.searchParams;
  
  const checkInStr = typeof searchParams.checkIn === "string" ? searchParams.checkIn : undefined;
  const checkOutStr = typeof searchParams.checkOut === "string" ? searchParams.checkOut : undefined;
  const adultsCount = typeof searchParams.adults === "string" ? parseInt(searchParams.adults) : 2;

  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Sequential transaction — prod DB pool = 1 connection; Promise.all would deadlock
  const [hotel, reviews] = await db.$transaction([
    db.restaurant.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        address: true,
        city: true,
        phone: true,
        imageUrl: true,
        coverUrl: true,
        rating: true,
        latitude: true,
        longitude: true,
        showReviews: true,
        heroSlides: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
          select: { imageUrl: true, title: true, subtitle: true },
        },
        rooms: {
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { type: "asc" }, { price: "asc" }],
          // Explicit field list — selecting the full Room model pulls columns
          // (floorLabel/latitude/longitude) that may not exist yet on a DB that
          // hasn't run the latest `prisma db push`, which would throw P2022 and
          // take the whole page down. Only request what the UI actually renders.
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
          },
        },
      },
    }),
    db.review.findMany({
      where: { restaurant: { slug } },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: { select: { name: true, email: true, imageUrl: true } } },
    }),
  ]);

  if (!hotel || !hotel.rooms || hotel.rooms.length === 0) {
    notFound();
  }

  // 1. Availability Check Logic
  let occupiedRoomIds = new Set<string>();
  let hasValidDates = false;
  
  if (checkInStr && checkOutStr) {
    const checkInDate = new Date(checkInStr);
    const checkOutDate = new Date(checkOutStr);
    
    // Ensure checkIn is before checkOut and in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (!isNaN(checkInDate.getTime()) && !isNaN(checkOutDate.getTime()) && checkInDate < checkOutDate && checkInDate >= today) {
      hasValidDates = true;
      const overlaps = await db.roomBooking.findMany({
        where: {
          room: { restaurantId: hotel.id },
          status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] },
          checkIn: { lt: checkOutDate },
          checkOut: { gt: checkInDate }
        },
        select: { roomId: true }
      });
      occupiedRoomIds = new Set(overlaps.map(o => o.roomId));
    }
  }

  // Enrich rooms with availability status
  const enrichedRooms = hotel.rooms.map(room => ({
    ...room,
    isAvailableForDates: hasValidDates ? !occupiedRoomIds.has(room.id) : null,
    fitsGuests: room.maxGuests >= adultsCount
  }));

  // Extract images
  let allImages: string[] = [];
  if (hotel.heroSlides && hotel.heroSlides.length > 0) {
    allImages = hotel.heroSlides.map(s => s.imageUrl);
  }
  if (hotel.coverUrl && !allImages.includes(hotel.coverUrl)) allImages.push(hotel.coverUrl);
  if (hotel.imageUrl && !allImages.includes(hotel.imageUrl)) allImages.push(hotel.imageUrl);

  // Backfill with room images if needed for the gallery grid
  for (const room of hotel.rooms) {
    for (const img of room.imageUrls) {
      if (!allImages.includes(img)) allImages.push(img);
    }
  }
  if (allImages.length === 0) allImages.push("https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=2000&q=80");
  
  // Aggregate unique amenities from rooms to represent hotel-wide amenities
  const hotelAmenities = Array.from(new Set(hotel.rooms.flatMap(r => r.amenities))).slice(0, 8);

  const startingPrice = Math.min(...hotel.rooms.map(r => r.price));

  return (
    <div className="min-h-screen bg-(--canvas) pb-28 lg:pb-12">
      <div className="container mx-auto px-4 md:px-8 pt-6 md:pt-10">
        
        {/* Hero gallery — hotel name, address, rating are overlaid inside the hero */}
        <HotelHeroGallery
          images={allImages}
          hotelName={hotel.name}
          address={hotel.address}
          city={hotel.city}
          rating={hotel.rating}
        />

        {/* Mobile booking card — dates/guests live here since the sidebar is desktop-only */}
        <div className="lg:hidden mt-6">
          <HotelBookingSidebar
            hotelId={hotel.id}
            hotelSlug={hotel.slug}
            startingPrice={startingPrice}
            hotelName={hotel.name}
            dateAnchorId="booking-dates"
          />
        </div>

        {/* Main Content Layout */}
        <div className="mt-8 md:mt-12 flex flex-col lg:flex-row gap-12 relative">

          {/* Left Column: Story, Amenities, Rooms */}
          <div className="flex-1 max-w-4xl space-y-8 md:space-y-12">
            
            {/* Story */}
            <section>
              <Typography variant="h3" className="mb-4">About this property</Typography>
              <Typography variant="p" className="text-(--text-2) leading-relaxed text-lg">
                Nestled in the heart of {hotel.city}, {hotel.name} offers a luxurious escape blending modern comforts with authentic Nepalese hospitality. Whether you&apos;re here for adventure or relaxation, our premium amenities and dedicated staff ensure an unforgettable stay.
              </Typography>
            </section>

            {/* Amenities Grid */}
            <section>
              <Typography variant="h3" className="mb-6">What this place offers</Typography>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-4">
                {hotelAmenities.map(am => {
                  const Icon = AMENITY_ICONS[am] || Coffee;
                  return (
                    <div key={am} className="flex items-center gap-3 text-(--text-1)">
                      <Icon className="h-6 w-6 text-(--text-2)" strokeWidth={1.5} />
                      <span className="text-base font-medium">{am}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            <hr className="border-(--border)" />

            {/* Room Categories */}
            <section id="rooms">
              <Typography variant="h3" className="mb-6">Select your room</Typography>
              <div className="space-y-6">
                {enrichedRooms.map(room => (
                  <RoomCategoryCard 
                    key={room.id} 
                    room={room} 
                    hasValidDates={hasValidDates}
                    searchParams={{ checkIn: checkInStr, checkOut: checkOutStr, adults: adultsCount.toString() }}
                  />
                ))}
              </div>
            </section>

            <hr className="border-(--border)" />

            {/* Map */}
            <section>
              <Typography variant="h3" className="mb-2">Where you&apos;ll be</Typography>
              <p className="text-(--text-2) mb-5 flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-(--accent) shrink-0" />
                {hotel.address}, {hotel.city}
              </p>
              <div className="w-full h-[240px] md:h-[360px] rounded-2xl md:rounded-3xl overflow-hidden border border-(--border) shadow-sm">
                <HotelLocationMapClient
                  name={hotel.name}
                  city={hotel.city}
                  latitude={hotel.latitude}
                  longitude={hotel.longitude}
                />
              </div>
            </section>

            <hr className="border-(--border)" />

            {/* Reviews */}
            {hotel.showReviews && (
              <section id="reviews">
                <Typography variant="h3" className="mb-6">Guest reviews</Typography>
                <ReviewSection
                  restaurantId={hotel.id}
                  initialReviews={reviews as unknown as Parameters<typeof ReviewSection>[0]["initialReviews"]}
                  isSignedIn={!!user}
                  currentUserId={user?.id}
                />
              </section>
            )}

          </div>

          {/* Right Column: Sticky Booking Card — desktop only */}
          <div className="hidden lg:block w-[380px] shrink-0">
            <div className="sticky top-[100px]">
              <HotelBookingSidebar
                hotelId={hotel.id}
                hotelSlug={hotel.slug}
                startingPrice={startingPrice}
                hotelName={hotel.name}
              />
            </div>
          </div>

        </div>
      </div>

      {/* Mobile sticky booking footer */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-[var(--border)] px-4 py-3 flex items-center justify-between gap-4 shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
        <div>
          <p className="text-[10px] text-[var(--text-3)] font-black uppercase tracking-widest">From</p>
          <p className="text-lg font-bold text-[var(--text-1)] leading-tight">
            Rs. {startingPrice.toLocaleString()}
            <span className="text-xs font-medium text-[var(--text-3)] ml-1">/ night</span>
          </p>
        </div>
        <a
          href="#rooms"
          className="flex items-center justify-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:scale-95 text-white font-bold text-sm px-6 py-3.5 rounded-2xl transition-all shadow-lg"
        >
          See Rooms
        </a>
      </div>
    </div>
  );
}
