import type { Metadata } from "next";

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
      style={{
        colorScheme: "light",
        color: "#1e293b",         /* slate-800 — overrides brand #3e1e0c */
        backgroundColor: "#F5F8FF",
        minHeight: "100vh",
      }}
    >
      {children}
    </div>
  );
}
