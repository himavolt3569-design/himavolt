import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Scan QR Code | HimalHub",
  description:
    "Scan a restaurant QR code to instantly view the menu and place your order with HimalHub.",
};

export default function ScanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
