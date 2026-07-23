"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Cpu, MonitorSmartphone, Printer, Laptop, ArrowRight, BadgeCheck, Store } from "lucide-react";
import { formatPrice } from "@/lib/currency";

interface HardwareProduct {
  id: string;
  name: string;
  type: string;
  price: number;
  stock: number;
  imageUrl: string;
  sellerName: string;
  isPlatformListing: boolean;
}

const TYPE_ICON: Record<string, typeof Cpu> = {
  Terminal: Laptop,
  Screen: MonitorSmartphone,
  Printer: Printer,
  Accessory: Cpu,
};

export default function HardwareShowcase() {
  const [products, setProducts] = useState<HardwareProduct[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/public/hardware")
      .then((res) => res.json())
      .then((data) => setProducts(Array.isArray(data.products) ? data.products.slice(0, 10) : []))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  // Nothing to show yet → render nothing (no empty section / layout shift).
  if (!loaded || products.length === 0) return null;

  return (
    <section className="py-14 md:py-20 bg-[var(--canvas)] border-b border-[var(--border-soft)]">
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)] mb-2">
              Hardware Marketplace
            </p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-[var(--text-1)]">
              Gear up your venue
            </h2>
            <p className="mt-2 text-[15px] font-medium text-[var(--text-2)] max-w-xl">
              POS terminals, kitchen displays and printers — from HimaVolt and trusted local
              sellers. Buy directly, no account needed.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/hardware/sell"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-2.5 text-sm font-bold text-[var(--text-1)] hover:bg-[var(--surface-alt)] transition-all"
            >
              <Store className="h-4 w-4" />
              Sell yours
            </Link>
            <Link
              href="/hardware"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[var(--accent-hover)] transition-all shadow-sm shadow-[var(--accent)]/20"
            >
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Horizontal product rail */}
        <div className="flex gap-4 md:gap-5 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0">
          {products.map((item, i) => {
            const Icon = TYPE_ICON[item.type] || Cpu;
            const soldOut = item.stock <= 0;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: Math.min(i * 0.04, 0.3), ease: "easeOut" }}
                className="group w-[240px] md:w-[260px] shrink-0 snap-start rounded-3xl border border-[var(--border-soft)] bg-[var(--surface)] overflow-hidden shadow-sm hover:shadow-xl transition-all"
              >
                <Link href={`/hardware/checkout/${item.id}`} className="block">
                  <div className="relative aspect-[5/4] bg-[var(--surface-alt)] flex items-center justify-center overflow-hidden">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-full w-full object-contain p-5 group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <Icon className="h-14 w-14 text-[var(--text-3)]" />
                    )}
                    <span className="absolute top-3 left-3 text-[10px] bg-[var(--surface)] text-[var(--text-1)] px-2.5 py-1 rounded-full font-bold uppercase tracking-widest shadow-sm">
                      {item.type}
                    </span>
                    {item.isPlatformListing && (
                      <span className="absolute top-3 right-3 flex items-center gap-1 text-[10px] bg-[var(--accent)] text-white px-2 py-1 rounded-full font-bold uppercase tracking-widest shadow-sm">
                        <BadgeCheck className="h-3 w-3" />
                        HimaVolt
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-[15px] font-bold text-[var(--text-1)] truncate">{item.name}</h3>
                    <p className="text-[11px] font-bold text-[var(--text-3)] uppercase tracking-wider mb-3 truncate">
                      by {item.sellerName}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-black text-[var(--text-1)]">
                        {formatPrice(item.price, "NPR")}
                      </span>
                      <span
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                          soldOut
                            ? "bg-[var(--surface-alt)] text-[var(--text-3)]"
                            : "bg-[var(--accent)]/10 text-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-white"
                        }`}
                      >
                        {soldOut ? "Sold out" : "Buy"}
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
