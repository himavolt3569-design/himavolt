import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Staff Login | HimaVolt",
  description: "Staff login portal for HimaVolt restaurant team members.",
};

export default function StaffLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
