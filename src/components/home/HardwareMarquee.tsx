"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Cpu } from "lucide-react";

interface HardwareProduct {
  id: string;
  name: string;
  imageUrl: string;
  type: string;
}

export default function HardwareMarquee() {
  const [dbItems, setDbItems] = useState<HardwareProduct[]>([]);
  
  useEffect(() => {
    fetch("/api/public/hardware")
      .then(res => res.json())
      .then(data => {
        if (data.products && Array.isArray(data.products)) {
          setDbItems(data.products.filter((p: HardwareProduct) => p.imageUrl));
        }
      })
      .catch(console.error);
  }, []);

  // Duplicate items for infinite scroll
  const items = dbItems.length > 0 ? [...dbItems, ...dbItems, ...dbItems, ...dbItems] : [];

  if (items.length === 0) return null;

  return (
    <div 
      className="mt-12 w-full max-w-xl overflow-hidden relative group"
      style={{
        maskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)'
      }}
    >
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.33%); }
        }
        .animate-scroll {
          animation: scroll 30s linear infinite;
          width: max-content;
        }
      `}} />
      
      <div className="flex items-center gap-6 animate-scroll hover:[animation-play-state:paused] py-2 px-8">
        {items.map((item, idx) => (
          <Link 
            href={`/hardware/checkout/${item.id}`}
            key={idx} 
            className="flex flex-col items-center justify-center shrink-0 cursor-pointer transition-transform hover:scale-110"
            title={item.name}
          >
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full border-2 border-white/20 overflow-hidden shadow-lg relative group-hover:border-[var(--accent)] transition-colors">
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={item.imageUrl} 
                  alt={item.name} 
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <Cpu className="h-8 w-8 text-white/50" />
              )}
              <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
