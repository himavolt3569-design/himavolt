"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";

const reviews = [
  {
    name: "Aarav Shrestha",
    role: "Food Blogger",
    avatar: "AS",
    rating: 5,
    text: "Scanned the QR at Bota Momo and had my order in 8 minutes. This is how dining should work everywhere in Nepal.",
    color: "#eaa94d",
  },
  {
    name: "Priya Maharjan",
    role: "Regular Customer",
    avatar: "PM",
    rating: 5,
    text: "I order lunch through HimaVolt every single day. The live tracking is addictive. I know exactly when my dal bhat is arriving.",
    color: "#e58f2a",
  },
  {
    name: "Bikash Tamang",
    role: "Restaurant Owner",
    avatar: "BT",
    rating: 5,
    text: "Our dine-in orders increased 40% after joining. The QR menu system reduced wait times and our customers love it.",
    color: "#d67620",
  },
  {
    name: "Sita Gurung",
    role: "Student, TU",
    avatar: "SG",
    rating: 4,
    text: "Best delivery app in Kathmandu. The weekend free delivery deals save me so much money. Momo cravings sorted!",
    color: "#b25c1c",
  },
  {
    name: "Rohan KC",
    role: "Software Engineer",
    avatar: "RK",
    rating: 5,
    text: "Split bill feature is genius. No more awkward calculations after team lunches. Everyone just pays their share on the app.",
    color: "#eaa94d",
  },
  {
    name: "Anisha Poudel",
    role: "Foodie",
    avatar: "AP",
    rating: 5,
    text: "The loyalty points actually add up fast. Got a free thali set after just two weeks of ordering. Absolutely recommend.",
    color: "#e58f2a",
  },
];

/* Featured review (restaurant owner — strongest social proof) */
const featured = reviews[2];

/* Row 2 uses an offset starting order */
const row2Reviews = [...reviews.slice(3), ...reviews.slice(0, 3)];

function TestimonialCard({ review }: { review: (typeof reviews)[0] }) {
  return (
    <div className="w-[280px] md:w-[320px] shrink-0 rounded-2xl bg-white/70 backdrop-blur-sm border border-[#f4d69a]/15 p-5 mx-2">
      <div className="flex items-center gap-0.5 mb-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-3 w-3 ${
              i < review.rating
                ? "fill-[#eaa94d] text-[#eaa94d]"
                : "fill-none text-[#eaa94d]/20"
            }`}
            strokeWidth={1.5}
          />
        ))}
      </div>
      <p className="text-sm text-[#3e1e0c]/60 leading-relaxed line-clamp-3">
        {review.text}
      </p>
      <div className="mt-4 flex items-center gap-2.5">
        <Avatar fallback={review.avatar} color={review.color} size="sm" />
        <div>
          <p className="text-xs font-bold text-[#3e1e0c]">{review.name}</p>
          <p className="text-[10px] text-[#8e491e]/40">{review.role}</p>
        </div>
      </div>
    </div>
  );
}

export default function Testimonials() {
  return (
    <section className="relative bg-[#fdf9ef] py-24 md:py-32 overflow-hidden">
      <div className="relative mx-auto max-w-7xl px-4 md:px-8 lg:px-12">
        {/* ── Aggregate rating row ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
        >
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="relative">
                <Star
                  className="h-6 w-6 fill-none text-[#eaa94d]/20"
                  strokeWidth={1.5}
                />
                <motion.div
                  className="absolute inset-0"
                  initial={{ clipPath: "inset(0 100% 0 0)" }}
                  whileInView={{ clipPath: "inset(0 0% 0 0)" }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.4,
                    delay: 0.3 + i * 0.15,
                    ease: "easeOut",
                  }}
                >
                  <Star
                    className="h-6 w-6 fill-[#eaa94d] text-[#eaa94d]"
                    strokeWidth={1.5}
                  />
                </motion.div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-extrabold text-[#3e1e0c]">4.9</span>
            <span className="text-sm text-[#8e491e]/40">/ 5</span>
            <span className="hidden sm:block h-4 w-px bg-[#3e1e0c]/10 mx-1" />
            <span className="text-sm text-[#8e491e]/40">
              from 12,000+ customers
            </span>
          </div>
        </motion.div>

        {/* ── Featured quote card ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{
            duration: 0.7,
            delay: 0.15,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="relative max-w-2xl mx-auto mt-12 mb-16 p-8 md:p-10 rounded-2xl border border-[#f4d69a]/20 bg-white shadow-sm"
        >
          <span className="absolute top-4 left-6 text-[96px] font-serif leading-none text-[#3e1e0c] opacity-[0.08] select-none pointer-events-none">
            &ldquo;
          </span>
          <p className="relative text-lg md:text-xl italic text-[#3e1e0c]/70 leading-relaxed mt-8">
            {featured.text}
          </p>
          <div className="mt-6 flex items-center gap-3">
            <Avatar fallback={featured.avatar} color={featured.color} />
            <div>
              <p className="text-sm font-bold text-[#3e1e0c]">
                {featured.name}
              </p>
              <p className="text-[11px] text-[#8e491e]/40">{featured.role}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Marquee Row 1: scrolls left ── */}
      <div className="relative mb-4">
        <div className="absolute left-0 top-0 bottom-0 w-20 bg-linear-to-r from-[#fdf9ef] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-linear-to-l from-[#fdf9ef] to-transparent z-10 pointer-events-none" />
        <div className="flex animate-marquee-left w-max">
          {[...reviews, ...reviews].map((review, i) => (
            <TestimonialCard key={`r1-${i}`} review={review} />
          ))}
        </div>
      </div>

      {/* ── Marquee Row 2: scrolls right ── */}
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-20 bg-linear-to-r from-[#fdf9ef] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-linear-to-l from-[#fdf9ef] to-transparent z-10 pointer-events-none" />
        <div className="flex animate-marquee-right w-max">
          {[...row2Reviews, ...row2Reviews].map((review, i) => (
            <TestimonialCard key={`r2-${i}`} review={review} />
          ))}
        </div>
      </div>
    </section>
  );
}
