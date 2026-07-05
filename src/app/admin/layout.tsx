import type { Metadata } from "next";
import AdminThemeLock from "./AdminThemeLock";
import { Poppins } from "next/font/google";

const poppins = Poppins({
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
  display: "swap",
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Panel | HimaVolt",
  description: "System administration, audit logs, and platform analytics.",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={poppins.className}
      style={{
        colorScheme: "light",
        backgroundColor: "#F7F9FC", // Soft, airy light background
        minHeight: "100vh",
      }}
    >
      <AdminThemeLock />
      {children}
    </div>
  );
}
