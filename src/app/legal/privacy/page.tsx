import type { Metadata } from "next";
import {
  ArrowLeft,
  Mountain,
  Eye,
  Database,
  Lock,
  Share2,
  Cookie,
  UserCheck,
  Trash2,
  Bell,
} from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | HimaVolt",
  description:
    "Learn how HimaVolt collects, uses, and protects your personal information when you use our food ordering platform.",
};

const sections = [
  {
    icon: Database,
    title: "1. Information We Collect",
    content:
      "We collect information you provide directly to us including: (a) Personal information such as name, email address, phone number, and delivery address when you create an account; (b) Order information including items ordered, restaurant preferences, and payment details; (c) Device information such as browser type, operating system, and IP address; (d) Location data when you use our services to find nearby restaurants. We also collect usage data automatically through cookies and similar technologies.",
  },
  {
    icon: Eye,
    title: "2. How We Use Your Information",
    content:
      "We use your information to: (a) Process and deliver your food orders; (b) Communicate with you about orders, promotions, and updates; (c) Personalize your experience and recommend restaurants and dishes; (d) Process payments and prevent fraud; (e) Improve our platform and develop new features; (f) Comply with legal obligations. We may also use aggregated, anonymized data for analytics and research purposes.",
  },
  {
    icon: Share2,
    title: "3. Information Sharing",
    content:
      "We share your information with: (a) Restaurant partners to fulfill your orders, including your name, delivery address, and order details; (b) Payment processors to handle transactions securely; (c) Delivery personnel who need your address and contact information; (d) Service providers who help us operate the platform. We do not sell your personal information to third parties. We may disclose information if required by law or to protect our rights.",
  },
  {
    icon: Lock,
    title: "4. Data Security",
    content:
      "We implement industry-standard security measures to protect your personal information including encryption, secure servers, and access controls. Payment information is processed through PCI-DSS compliant payment gateways. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security. We encourage you to use strong passwords and protect your account credentials.",
  },
  {
    icon: Cookie,
    title: "5. Cookies and Tracking",
    content:
      "We use cookies and similar tracking technologies to enhance your experience on HimaVolt. Essential cookies are required for the platform to function properly. Analytics cookies help us understand how users interact with our platform. Marketing cookies may be used to provide relevant advertisements. You can manage your cookie preferences through your browser settings, though disabling certain cookies may affect platform functionality.",
  },
  {
    icon: UserCheck,
    title: "6. Your Rights",
    content:
      "You have the right to: (a) Access the personal information we hold about you; (b) Request correction of inaccurate information; (c) Request deletion of your account and associated data; (d) Opt out of marketing communications at any time; (e) Request a copy of your data in a portable format. To exercise any of these rights, please contact our support team through the Contact Us page.",
  },
  {
    icon: Trash2,
    title: "7. Data Retention",
    content:
      "We retain your personal information for as long as your account is active or as needed to provide services. Order history and transaction records are retained for a minimum of 5 years for legal and accounting purposes. If you request account deletion, we will remove your personal information within 30 days, except where retention is required by law. Anonymized data may be retained indefinitely for analytics purposes.",
  },
  {
    icon: Bell,
    title: "8. Changes to This Policy",
    content:
      "We may update this Privacy Policy from time to time to reflect changes in our practices or applicable laws. We will notify you of any material changes by posting the updated policy on our platform and, where appropriate, sending you an email notification. Your continued use of HimaVolt after changes are posted constitutes acceptance of the updated policy. We recommend reviewing this policy periodically.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/80 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6 lg:px-10">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-[#1F2A2A] transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Link href="/" className="flex items-center gap-2">
              <Mountain className="h-6 w-6 text-[#FF9933]" strokeWidth={2.5} />
              <span className="text-lg font-extrabold tracking-tight text-[#1F2A2A]">
                Himal<span className="text-[#FF9933]">Hub</span>
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Link
              href="/legal/terms"
              className="font-bold hover:text-[#FF9933] transition-colors"
            >
              Terms
            </Link>
            <span>/</span>
            <Link
              href="/legal/refund"
              className="font-bold hover:text-[#FF9933] transition-colors"
            >
              Refund Policy
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#1F2A2A] via-[#2a3838] to-[#0A4D3C] text-white">
        <div className="relative z-10 mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20 lg:px-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white/80 mb-5 backdrop-blur-sm border border-white/10">
              <Lock className="h-4 w-4" />
              Legal
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl mb-4">
              Privacy Policy
            </h1>
            <p className="text-base text-white/50 font-medium max-w-lg">
              Last updated: March 1, 2026. This policy describes how HimaVolt
              collects, uses, and protects your personal information.
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-10">
        <div className="space-y-10">
          {sections.map((section, i) => (
            <div
              key={section.title}
              className="group animate-in fade-in slide-in-from-bottom-2"
              style={{
                animationDelay: `${i * 40}ms`,
                animationFillMode: "backwards",
              }}
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#1F2A2A]/5 text-[#1F2A2A] group-hover:bg-[#1F2A2A]/10 transition-colors mt-0.5">
                  <section.icon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#1F2A2A] mb-2">
                    {section.title}
                  </h2>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {section.content}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Contact notice */}
        <div className="mt-16 rounded-2xl bg-gray-50 border border-gray-100 p-8 text-center">
          <p className="text-sm text-gray-500 mb-3">
            Have questions about how we handle your data?
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-xl bg-[#1F2A2A] px-6 py-3 text-sm font-bold text-white hover:bg-[#2a3838] transition-all"
          >
            Contact Our Privacy Team
          </Link>
        </div>
      </section>
    </div>
  );
}
