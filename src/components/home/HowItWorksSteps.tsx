import { CreditCard, MapPin, ShoppingBag, Truck } from "lucide-react";

const STEPS = [
  {
    icon: MapPin,
    title: "Choose a store",
    body: "We show what is open and can reach your address right now.",
  },
  {
    icon: ShoppingBag,
    title: "Add to cart",
    body: "Food and drinks together. The kitchen and the bar both get the ticket.",
  },
  {
    icon: CreditCard,
    title: "Place your order",
    body: "Pay with eSewa or Khalti, or cash where the restaurant allows it.",
  },
  {
    icon: Truck,
    title: "Follow it to your door",
    body: "Every step, from accepted to handed over, with the rider on a map.",
  },
];

export default function HowItWorksSteps() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6">
      <h2 className="mb-8 text-[22px] font-black tracking-tight text-[var(--text-1)] sm:text-[26px]">
        How it works
      </h2>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map(({ icon: Icon, title, body }, i) => (
          <div key={title} className="relative flex flex-col gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-muted)]">
              <Icon className="h-5 w-5 text-[var(--accent-text)]" />
            </span>
            <span className="absolute right-0 top-0 text-[34px] font-black leading-none text-[var(--surface)]">
              {i + 1}
            </span>
            <h3 className="text-[15px] font-bold text-[var(--text-1)]">{title}</h3>
            <p className="text-[12px] leading-relaxed text-[var(--text-2)]">
              {body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
