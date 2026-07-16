"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Mountain, Cpu, MonitorSmartphone, Printer, Laptop } from "lucide-react";
import { formatPrice } from "@/lib/currency";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer"; // Assuming this exists or will exist

interface HardwareProduct {
  id: string;
  name: string;
  description: string;
  type: string;
  price: number;
  stock: number;
  imageUrl: string;
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

      <main className="flex-1 py-12 md:py-24 max-w-7xl mx-auto px-4 md:px-8 lg:px-12 w-full">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-black text-[var(--text-1)] tracking-tight mb-4">
            Hardware <span className="text-[var(--accent)]">Solutions</span>
          </h1>
          <p className="text-lg text-[var(--text-2)] font-medium">
            Everything you need to run your restaurant efficiently. From rugged POS terminals to high-speed kitchen printers.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-100 border-t-[var(--accent)]" />
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((item) => {
              const Icon = TYPE_ICON[item.type] || Cpu;
              return (
                <div key={item.id} className="bg-white rounded-[2rem] border border-[var(--border-soft)] overflow-hidden shadow-lg shadow-black/5 hover:shadow-xl transition-all flex flex-col group">
                  <div className="aspect-[4/3] bg-[var(--surface-alt)] p-8 flex items-center justify-center relative overflow-hidden">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <Icon className="h-16 w-16 text-[var(--text-3)]" />
                    )}
                    <div className="absolute top-4 left-4">
                      <span className="text-[10px] bg-white text-[var(--text-1)] px-3 py-1 rounded-full font-bold uppercase tracking-widest shadow-sm">
                        {item.type}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-6 md:p-8 flex-1 flex flex-col">
                    <h3 className="text-xl font-bold text-[var(--text-1)] mb-2">{item.name}</h3>
                    <p className="text-sm font-medium text-[var(--text-2)] mb-6 flex-1 line-clamp-3">
                      {item.description}
                    </p>
                    
                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider mb-1">Starting at</span>
                        <span className="text-xl font-black text-[var(--text-1)]">{formatPrice(item.price, "NPR")}</span>
                      </div>
                      <Link href="/contact" className="px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md shadow-[var(--accent)]/20">
                        Inquire
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <Cpu className="h-12 w-12 text-[var(--text-3)] mx-auto mb-4" />
            <h3 className="text-xl font-bold text-[var(--text-1)]">Catalog is empty</h3>
            <p className="text-[var(--text-2)] mt-2">Check back later for new hardware additions.</p>
          </div>
        )}
      </main>
    </div>
  );
}
