import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manage Restaurants | HimalHub",
  description:
    "Create and manage your restaurants on HimalHub — Nepal's premier food ordering platform.",
};

export default function ManageRestaurantsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
