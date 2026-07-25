import { MapPin, ShieldCheck, Truck, Wallet } from "lucide-react";

/**
 * The four promises, stated in terms the platform can actually keep.
 *
 * Note "Live tracking" is qualified rather than absolute: rider location depends
 * on the rider's phone being awake with data, so the copy promises visible
 * progress, which always works, rather than a moving dot, which does not.
 */
const ITEMS = [
  {
    icon: Truck,
    title: "Fast Delivery",
    body: "Real ETAs from real distance",
  },
  {
    icon: ShieldCheck,
    title: "Only Open Places",
    body: "Never sent to a closed kitchen",
  },
  {
    icon: Wallet,
    title: "Secure Payment",
    body: "eSewa, Khalti or cash",
  },
  {
    icon: MapPin,
    title: "Live Tracking",
    body: "Follow every step to your door",
  },
];

export default function TrustBar() {
  return (
    // Pulled up over the hero, which reserves matching bottom padding so the
    // card overlaps the image rather than the headline. `relative z-10` keeps it
    // above the hero's own stacking context, which is what was clipping the
    // labels before.
    <section className="relative z-10 mx-auto -mt-20 w-full max-w-7xl px-4 sm:-mt-28 sm:px-6">
      <div className="grid grid-cols-2 gap-3 rounded-2xl border border-[var(--border)] bg-[var(--canvas)] p-3.5 shadow-xl sm:gap-4 sm:p-6 lg:grid-cols-4">
        {ITEMS.map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-muted)]">
              <Icon className="h-4.5 w-4.5 text-[var(--accent-text)]" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-bold text-[var(--text-1)]">
                {title}
              </span>
              <span className="block truncate text-[11px] text-[var(--text-3)]">
                {body}
              </span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
