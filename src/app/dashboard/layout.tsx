import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | HimalHub",
  description:
    "Manage your restaurants, orders, staff, and analytics from the HimalHub owner dashboard.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
