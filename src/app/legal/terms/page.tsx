import type { Metadata } from "next";
import {
  ArrowLeft,
  Mountain,
  FileText,
  Shield,
  Scale,
  AlertTriangle,
  Globe,
} from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms & Conditions | HimaVolt",
  description:
    "Read the terms and conditions governing your use of the HimaVolt food ordering platform in Nepal.",
};

const sections = [
  {
    icon: FileText,
    title: "1. Acceptance of Terms",
    content:
      "By accessing and using HimaVolt, you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you must not use our platform. These terms apply to all visitors, users, restaurant owners, and others who access or use the Service.",
  },
  {
    icon: Shield,
    title: "2. User Accounts",
    content:
      "When you create an account with us, you must provide accurate, complete, and current information. You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password. You agree not to disclose your password to any third party. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.",
  },
  {
    icon: Scale,
    title: "3. Orders and Payments",
    content:
      "All orders placed through HimaVolt are subject to acceptance by the respective restaurant. Prices listed on the platform are set by the restaurants and may change without notice. You agree to pay the total amount shown at checkout including food charges, applicable taxes, service fees, and delivery charges. Payment processing is handled through secure third-party payment gateways.",
  },
  {
    icon: Globe,
    title: "4. Restaurant Partners",
    content:
      "Restaurant partners registered on HimaVolt are responsible for maintaining the accuracy of their menus, pricing, and availability. HimaVolt acts as an intermediary platform and is not directly responsible for the quality, safety, or legality of the food items offered by restaurant partners. Restaurants must comply with all applicable food safety regulations in Nepal.",
  },
  {
    icon: AlertTriangle,
    title: "5. Prohibited Activities",
    content:
      "Users must not: (a) Use the platform for any unlawful purpose or in violation of any applicable laws; (b) Attempt to interfere with or disrupt the operation of the platform; (c) Impersonate any person or entity; (d) Submit false or misleading information; (e) Engage in any form of harassment or abuse toward restaurant staff, delivery personnel, or other users.",
  },
  {
    icon: Shield,
    title: "6. Intellectual Property",
    content:
      "The HimaVolt platform, including its logo, design, text, graphics, and other content, is the property of HimaVolt and is protected by copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, modify, or create derivative works from any content on the platform without prior written consent.",
  },
  {
    icon: AlertTriangle,
    title: "7. Limitation of Liability",
    content:
      "HimaVolt shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the platform. Our liability in any case shall not exceed the amount you paid for the specific order in question. We do not guarantee uninterrupted or error-free operation of the platform.",
  },
  {
    icon: Scale,
    title: "8. Governing Law",
    content:
      "These Terms shall be governed by and construed in accordance with the laws of Nepal. Any disputes arising out of or relating to these terms shall be subject to the exclusive jurisdiction of the courts in Kathmandu, Nepal.",
  },
  {
    icon: FileText,
    title: "9. Changes to Terms",
    content:
      "HimaVolt reserves the right to modify or replace these Terms at any time. Material changes will be communicated through the platform or via email. Your continued use of the Service after changes are posted constitutes acceptance of those changes.",
  },
];

export default function TermsPage() {
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
              href="/legal/refund"
              className="font-bold hover:text-[#FF9933] transition-colors"
            >
              Refund Policy
            </Link>
            <span>/</span>
            <Link
              href="/legal/privacy"
              className="font-bold hover:text-[#FF9933] transition-colors"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#0A4D3C] via-[#0d3d30] to-[#1F2A2A] text-white">
        <div className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-[#FF9933]/8 blur-3xl" />
        <div className="relative z-10 mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20 lg:px-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white/80 mb-5 backdrop-blur-sm border border-white/10">
              <Scale className="h-4 w-4" />
              Legal
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl mb-4">
              Terms & Conditions
            </h1>
            <p className="text-base text-white/50 font-medium max-w-lg">
              Last updated: March 1, 2026. Please read these terms carefully
              before using the HimaVolt platform.
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
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#0A4D3C]/5 text-[#0A4D3C] group-hover:bg-[#0A4D3C]/10 transition-colors mt-0.5">
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
            If you have any questions about these Terms & Conditions, please
            contact us.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-xl bg-[#0A4D3C] px-6 py-3 text-sm font-bold text-white hover:bg-[#083a2d] transition-all"
          >
            Contact Us
          </Link>
        </div>
      </section>
    </div>
  );
}
