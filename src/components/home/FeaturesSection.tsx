"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { QrCode, Truck, Gift, ShieldCheck } from "lucide-react";
import Link from "next/link";

const RESONANCE_FEATURES = [
  {
    id: "scan",
    title: "Smart Dining",
    headline: "The future of service.",
    desc: "Scan the QR at your table to explore a rich, interactive menu. Order at your pace and enjoy seamless service.",
    icon: QrCode,
    img: "https://images.unsplash.com/photo-1590846406792-0adc7f938f1d?w=800&h=1200&fit=crop", 
    accent: "var(--accent)",
  },
  {
    id: "track",
    title: "Precision Tracking",
    headline: "Live every step.",
    desc: "Monitor your order in real-time. From the kitchen's first toss to your doorstep, experience absolute transparency.",
    icon: Truck,
    img: "https://images.unsplash.com/photo-1580674285054-bed31e145f59?w=800&h=1200&fit=crop",
    accent: "#0088ff",
  },
  {
    id: "earn",
    title: "Elite Rewards",
    headline: "Loyalty redefined.",
    desc: "Earn exclusive points on every scan. Unlock premium benefits and hidden menus across Kathmandu's finest.",
    icon: Gift,
    img: "https://images.unsplash.com/photo-1556742044-3c52d6e88c62?w=800&h=1200&fit=crop", 
    accent: "#a200ff",
  },
];

function FeatureCard({ feature, index }: { feature: typeof RESONANCE_FEATURES[0], index: number }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative h-[500px] md:h-[650px] rounded-[3rem] overflow-hidden bg-[var(--surface)] border border-[var(--border)] select-none"
    >
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <motion.img 
          src={feature.img} 
          alt="" 
          loading="lazy"
          decoding="async"
          initial={{ opacity: 0.35, scale: 1 }}
          whileInView={{ 
            opacity: 0.6,
            transition: { duration: 0.5, delay: index * 0.06 }
          }}
          animate={{ 
            scale: isHovered ? 1.05 : 1,
            opacity: isHovered ? 0.7 : undefined
          }}
          viewport={{ amount: 0.6 }} // Trigger when 60% of the card is in view
          className="h-full w-full object-cover transition-transform duration-700"
        />
        
        {/* Subtle Darkening Overlay */}
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Content Layer */}
      <div className="absolute inset-0 p-10 md:p-12 flex flex-col justify-end z-10">
        <motion.div
          animate={{ 
            y: isHovered ? -8 : 0,
            backgroundColor: isHovered ? feature.accent : "rgba(255,255,255,0.1)"
          }}
          className="mb-8 h-14 w-14 rounded-2xl backdrop-blur-xl border border-white/20 flex items-center justify-center text-white transition-colors duration-500 shadow-xl"
        >
          <feature.icon className="h-7 w-7" />
        </motion.div>

        <motion.div
          animate={{ y: isHovered ? -4 : 0 }}
          className="transition-transform duration-500"
        >
          <h3 className="text-3xl md:text-4xl font-black text-white tracking-tighter mb-3 leading-none">
            {feature.title}
          </h3>
          <p className="text-white/60 font-bold uppercase tracking-widest text-[10px] mb-6">
            {feature.headline}
          </p>
          
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ 
              height: isHovered ? "auto" : 0, 
              opacity: isHovered ? 1 : 0 
            }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className="text-sm text-white/80 leading-relaxed max-w-[280px] mb-8">
              {feature.desc}
            </p>
            <Link href="/menu">
              <button className="text-white font-black uppercase tracking-widest text-[11px] border-b-2 border-white/20 hover:border-white transition-colors pb-1">
                Explore More
              </button>
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {/* Premium Border Highlight on View */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ amount: 0.8 }}
        className="absolute inset-0 border-2 border-white/10 rounded-[3rem] pointer-events-none z-30"
      />
    </motion.div>
  );
}

export default function FeaturesSection() {
  return (
    <section className="relative bg-[var(--canvas)] py-24 md:py-32 overflow-hidden">
      {/* Background Ambient */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[10%] left-[5%] w-[500px] h-[500px] bg-[var(--accent)]/[0.03] rounded-full" />
        <div className="absolute bottom-[10%] right-[5%] w-[500px] h-[500px] bg-purple-500/[0.03] rounded-full" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 md:px-8 lg:px-12">
        {/* Professional Header */}
        <div className="flex flex-col items-center text-center mb-20 md:mb-28">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 mb-8"
          >
            <ShieldCheck className="h-4 w-4 text-[var(--accent)]" />
            <span className="text-xs font-black text-[var(--accent)] uppercase tracking-widest">Why Himavolt?</span>
          </motion.div>
          
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black text-[var(--text-1)] tracking-tighter leading-[0.9] mb-8"
          >
            Sophisticated Dining. <br />
            <span className="text-[var(--text-3)]">Evolved for Nepal.</span>
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg md:text-xl text-[var(--text-3)] font-medium max-w-2xl leading-relaxed mx-auto"
          >
            Discover a world where cutting-edge technology meets the rich flavors of our heritage.
          </motion.p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {RESONANCE_FEATURES.map((feature, i) => (
            <FeatureCard key={feature.id} feature={feature} index={i} />
          ))}
        </div>

        {/* Trust Footer */}
        <div className="mt-28 flex flex-col md:flex-row items-center justify-between border-t border-[var(--border)] pt-16 gap-10">
          <div className="flex items-center gap-6">
            <div className="flex -space-x-3">
              {[1,2,3,4].map(n => (
                <div key={n} className="h-12 w-12 rounded-full border-2 border-[var(--canvas)] bg-[var(--surface)] overflow-hidden shadow-lg">
                  <img src={`https://i.pravatar.cc/150?u=${n + 200}`} alt="" loading="lazy" decoding="async" />
                </div>
              ))}
            </div>
            <div>
              <p className="text-[15px] font-black text-[var(--text-1)] tracking-tight">125+ Premium Partners</p>
              <p className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider">Trusted by the Valley&apos;s finest</p>
            </div>
          </div>

          <div className="flex items-center gap-4 px-6 py-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
             <div className="h-2 w-2 rounded-full bg-[var(--accent)]" />
             <span className="text-[10px] font-black text-[var(--text-1)] uppercase tracking-widest">Live Across Kathmandu Valley</span>
          </div>
        </div>
      </div>
    </section>
  );
}
