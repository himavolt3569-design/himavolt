import type { Metadata } from "next";
import RiderClient from "./RiderClient";

export const metadata: Metadata = {
  title: "Delivery, HimaVolt",
  // A rider link is a bearer credential. It must never be indexed, and it must
  // never appear in a Referer header when the rider taps out to a map app.
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function RiderPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <RiderClient token={token} />;
}
