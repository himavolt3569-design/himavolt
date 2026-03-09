import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kitchen Display | HimaVolt",
  description:
    "Real-time kitchen order display for restaurant staff on HimaVolt.",
};

export default function KitchenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
