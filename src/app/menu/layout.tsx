import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse Menu | HimalHub",
  description:
    "Browse restaurants and explore menus on HimalHub — Nepal's QR table ordering and food delivery platform.",
};

export default function MenuLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
