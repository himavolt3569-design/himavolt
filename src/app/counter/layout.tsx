import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Counter Display | HimaVolt",
  description:
    "Real-time counter display for restaurant staff on HimaVolt — manage ready orders, payments, and customer handoffs.",
};

export default function CounterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
