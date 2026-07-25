import Link from "next/link";
import { Gift, Percent, Truck } from "lucide-react";

/**
 * Promotional strip.
 *
 * Deliberately generic and copy-only — these are platform-level messages, not
 * per-restaurant offers. Real discounts come from the `Coupon` model and are
 * validated server-side at checkout; nothing here creates or implies a code that
 * the order path would not honour, so the panel cannot promise a price the
 * server then refuses.
 */
const PROMOS = [
  {
    icon: Percent,
    title: "Free delivery over Rs. 1,500",
    body: "Many kitchens waive the charge on bigger orders — look for the green badge.",
    href: "/nearby",
    cta: "Find them",
    tone: "dark" as const,
  },
  {
    icon: Truck,
    title: "Order from anywhere nearby",
    body: "Restaurants, hotels, cafes and bars. Food and drinks, one basket.",
    href: "/nearby",
    cta: "Browse all",
    tone: "accent" as const,
  },
  {
    icon: Gift,
    title: "Run a kitchen?",
    body: "List your place, take orders, and use your own riders. No commission on pickup.",
    href: "/features",
    cta: "Become a partner",
    tone: "soft" as const,
  },
];

const TONES = {
  dark: "bg-[var(--text-1)] text-[var(--canvas)]",
  accent: "bg-[var(--accent-muted)] text-[var(--text-1)]",
  soft: "bg-[var(--surface)] text-[var(--text-1)]",
};

export default function PromoBanners() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <div className="grid gap-4 md:grid-cols-3">
        {PROMOS.map(({ icon: Icon, title, body, href, cta, tone }) => (
          <Link
            key={title}
            href={href}
            className={`group flex flex-col gap-2 rounded-2xl p-5 transition-transform hover:-translate-y-0.5 ${TONES[tone]}`}
          >
            <Icon className="h-6 w-6 opacity-80" />
            <h3 className="text-[16px] font-black leading-tight">{title}</h3>
            <p className="text-[12px] leading-relaxed opacity-75">{body}</p>
            <span className="mt-auto pt-2 text-[12px] font-bold underline-offset-4 group-hover:underline">
              {cta} →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
