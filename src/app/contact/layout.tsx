import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us | HimaVolt",
  description:
    "Get in touch with HimaVolt. We'd love to hear your feedback, questions, or partnership inquiries.",
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
