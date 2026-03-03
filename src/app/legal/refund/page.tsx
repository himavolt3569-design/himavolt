import type { Metadata } from "next";
import {
  ArrowLeft,
  Mountain,
  RefreshCcw,
  Clock,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  HelpCircle,
} from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy | HimalHub",
  description:
    "Understand how refunds and cancellations work on HimalHub. Learn about eligibility, process, and timelines.",
};

const sections = [
  {
    icon: RefreshCcw,
    title: "1. Refund Eligibility",
    content:
      "You may be eligible for a refund if: (a) Your order was not delivered within the estimated delivery time by more than 30 minutes without prior notification; (b) The food items received were significantly different from what was described on the menu; (c) The food was damaged, spoiled, or unfit for consumption upon delivery; (d) You were charged incorrectly for your order. Refund requests must be made within 24 hours of the order being placed.",
  },
  {
    icon: XCircle,
    title: "2. Non-Refundable Situations",
    content:
      "Refunds will not be issued for: (a) Change of mind after the order has been accepted by the restaurant; (b) Incorrect orders due to user error during the ordering process; (c) Minor variations in food presentation from menu images; (d) Orders that have been fully consumed; (e) Delays caused by circumstances beyond our control such as extreme weather, strikes, or natural disasters.",
  },
  {
    icon: Clock,
    title: "3. Cancellation Policy",
    content:
      "Orders can be cancelled free of charge if the restaurant has not yet started preparing your food. Once preparation has begun, a cancellation fee of up to 50% of the order value may apply. For dine-in QR orders, cancellation is only possible before the order is sent to the kitchen. The restaurant reserves the right to reject cancellation requests for items that have already been prepared.",
  },
  {
    icon: CreditCard,
    title: "4. Refund Process",
    content:
      "Once a refund is approved, it will be processed within 5 to 7 business days. Refunds will be credited to the original payment method used for the order. For cash payments, refunds will be provided as HimalHub credits in your account wallet. You will receive a confirmation notification once the refund has been initiated.",
  },
  {
    icon: CheckCircle2,
    title: "5. Partial Refunds",
    content:
      "In cases where only part of your order was affected, a partial refund proportional to the affected items may be issued. Delivery charges may or may not be refunded depending on the nature of the issue. Service fees are generally non-refundable unless the entire order is cancelled before preparation.",
  },
  {
    icon: AlertTriangle,
    title: "6. Dispute Resolution",
    content:
      "If you disagree with a refund decision, you can escalate the matter by contacting our customer support team within 48 hours of the refund decision. Provide your order number, detailed description of the issue, and any supporting evidence such as photos. Our team will review the case and provide a final resolution within 3 business days.",
  },
  {
    icon: HelpCircle,
    title: "7. How to Request a Refund",
    content:
      "To request a refund: (a) Navigate to your order history in the HimalHub app or website; (b) Select the order in question and tap 'Request Refund'; (c) Choose the reason for your refund request; (d) Provide any additional details or photos to support your claim; (e) Submit the request. Alternatively, you can contact our customer support team directly through the Contact Us page or by calling our support hotline.",
  },
];

export default function RefundPage() {
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
              href="/legal/privacy"
              className="font-bold hover:text-[#FF9933] transition-colors"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#FF9933] via-[#ff8811] to-[#e67a00] text-white">
        <div className="relative z-10 mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20 lg:px-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-bold text-white/90 mb-5 backdrop-blur-sm border border-white/15">
              <RefreshCcw className="h-4 w-4" />
              Legal
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl mb-4">
              Refund & Cancellation Policy
            </h1>
            <p className="text-base text-white/70 font-medium max-w-lg">
              Last updated: March 1, 2026. Understand how refunds and
              cancellations work on HimalHub.
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
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FF9933]/8 text-[#FF9933] group-hover:bg-[#FF9933]/15 transition-colors mt-0.5">
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
        <div className="mt-16 rounded-2xl bg-[#FF9933]/5 border border-[#FF9933]/10 p-8 text-center">
          <p className="text-sm text-gray-500 mb-3">
            Need to request a refund or have questions about our policy?
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-xl bg-[#FF9933] px-6 py-3 text-sm font-bold text-white hover:bg-[#ff8811] transition-all"
          >
            Contact Support
          </Link>
        </div>
      </section>
    </div>
  );
}
