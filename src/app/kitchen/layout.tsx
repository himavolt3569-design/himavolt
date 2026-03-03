import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kitchen Display | HimalHub",
  description:
    "Real-time kitchen order display for restaurant staff on HimalHub.",
};

export default function KitchenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
