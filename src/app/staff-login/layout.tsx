import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Staff Login | HimalHub",
  description: "Staff login portal for HimalHub restaurant team members.",
};

export default function StaffLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
