import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manage Restaurants | HimaVolt",
  description:
    "Create and manage your restaurants on HimaVolt — Nepal's premier food ordering platform.",
};

export default function ManageRestaurantsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
