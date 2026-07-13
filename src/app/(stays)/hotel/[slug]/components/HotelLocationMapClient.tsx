"use client";

import dynamic from "next/dynamic";

const HotelLocationMap = dynamic(
  () => import("./HotelLocationMap").then((m) => m.HotelLocationMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full rounded-3xl bg-[var(--surface-alt)] animate-pulse" />
    ),
  },
);

export function HotelLocationMapClient(props: {
  name: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
}) {
  return <HotelLocationMap {...props} />;
}
