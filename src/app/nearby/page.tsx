import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

// Location resolution and the search are entirely client-side, so there is
// nothing meaningful to server-render here.
const NearbySearch = dynamic(() => import("@/components/nearby/NearbySearch"));

export const metadata: Metadata = {
  title: "Order near you — HimaVolt",
  description:
    "Find restaurants, cafes and bars near you that are open right now and deliver to your door. Food and drinks across Nepal.",
};

export default function NearbyPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto min-h-screen w-full max-w-6xl px-4 pb-20 pt-24 sm:px-6">
        <header className="mb-8">
          <h1 className="text-[28px] font-black tracking-tight text-[var(--text-1)] sm:text-[34px]">
            Order near you
          </h1>
          <p className="mt-2 max-w-xl text-[14px] text-[var(--text-2)]">
            Places that are open right now and deliver to where you are. Food and
            drinks both count.
          </p>
        </header>

        <NearbySearch initialLimit={30} />
      </main>
      <Footer />
    </>
  );
}
