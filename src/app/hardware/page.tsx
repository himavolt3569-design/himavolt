"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Cpu, MonitorSmartphone, Printer, Laptop, Store, ArrowRight, BadgeCheck } from "lucide-react";
import { formatPrice } from "@/lib/currency";
import Navbar from "@/components/layout/Navbar";

interface HardwareProduct {
  id: string;
  name: string;
  description: string;
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

export default function HardwareCatalogPage() {
  const [products, setProducts] = useState<HardwareProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/public/hardware")
      .then((res) => res.json())
      .then((data) => {
        setProducts(Array.isArray(data.products) ? data.products : []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[var(--canvas)] flex flex-col">
      <Navbar />

      <main className="flex-1 py-12 md:py-20 max-w-7xl mx-auto px-4 md:px-8 lg:px-12 w-full">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <h1 className="text-4xl md:text-5xl font-black text-[var(--text-1)] tracking-tight mb-4">
            Hardware <span className="text-[var(--accent)]">Marketplace</span>
          </h1>
          <p className="text-lg text-[var(--text-2)] font-medium">
            POS terminals, kitchen displays and printers — from HimaVolt and trusted
            sellers across Nepal. Anyone can list their own hardware here.
          </p>
        </div>

        {/* Sell CTA banner */}
        <div className="mb-12 rounded-3xl bg-linear-to-br from-[var(--accent)] to-[#d67620] p-6 md:p-8 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20">
              <Store className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Have hardware to sell?</h2>
              <p className="text-sm font-medium text-white/90">
                List your product in minutes — no HimaVolt account required.
              </p>
            </div>
          </div>
          <Link
            href="/hardware/sell"
            className="w-full sm:w-auto shrink-0 px-6 py-3.5 rounded-xl bg-white text-[var(--accent)] font-black text-sm hover:scale-[1.03] active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            Sell on HimaVolt
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-100 border-t-[var(--accent)]" />
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((item) => {
              const Icon = TYPE_ICON[item.type] || Cpu;
              const soldOut = item.stock <= 0;
              return (
                <div
                  key={item.id}
                  className="bg-[var(--surface)] rounded-[2rem] border border-[var(--border-soft)] overflow-hidden shadow-lg shadow-black/5 hover:shadow-xl transition-all flex flex-col group"
                >
                  <div className="aspect-[4/3] bg-[var(--surface-alt)] p-8 flex items-center justify-center relative overflow-hidden">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <Icon className="h-16 w-16 text-[var(--text-3)]" />
                    )}
                    <div className="absolute top-4 left-4">
                      <span className="text-[10px] bg-[var(--surface)] text-[var(--text-1)] px-3 py-1 rounded-full font-bold uppercase tracking-widest shadow-sm">
                        {item.type}
                      </span>
                    </div>
                    {item.isPlatformListing && (
                      <div className="absolute top-4 right-4">
                        <span className="flex items-center gap-1 text-[10px] bg-[var(--accent)] text-white px-2.5 py-1 rounded-full font-bold uppercase tracking-widest shadow-sm">
                          <BadgeCheck className="h-3 w-3" />
                          HimaVolt
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-6 md:p-8 flex-1 flex flex-col">
                    <h3 className="text-xl font-bold text-[var(--text-1)] mb-1">{item.name}</h3>
                    <p className="text-[11px] font-bold text-[var(--text-3)] uppercase tracking-wider mb-3">
                      Sold by {item.sellerName}
                    </p>
                    <p className="text-sm font-medium text-[var(--text-2)] mb-6 flex-1 line-clamp-3">
                      {item.description}
                    </p>

                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider mb-1">
                          {soldOut ? "Out of stock" : "Price"}
                        </span>
                        <span className="text-xl font-black text-[var(--text-1)]">
                          {formatPrice(item.price, "NPR")}
                        </span>
                      </div>
                      {soldOut ? (
                        <span className="px-5 py-2.5 rounded-xl bg-[var(--surface-alt)] text-[var(--text-3)] font-bold text-sm cursor-not-allowed">
                          Sold out
                        </span>
                      ) : (
                        <Link
                          href={`/hardware/checkout/${item.id}`}
                          className="px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md shadow-[var(--accent)]/20"
                        >
                          Buy now
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <Cpu className="h-12 w-12 text-[var(--text-3)] mx-auto mb-4" />
            <h3 className="text-xl font-bold text-[var(--text-1)]">No hardware listed yet</h3>
            <p className="text-[var(--text-2)] mt-2">
              Be the first —{" "}
              <Link href="/hardware/sell" className="text-[var(--accent)] font-bold underline">
                list your product
              </Link>
              .
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
