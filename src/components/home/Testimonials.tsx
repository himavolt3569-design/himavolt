"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Star, Quote } from "lucide-react";

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
    text: "I order lunch through HimaVolt every single day. The live tracking is addictive — I know exactly when my dal bhat is arriving.",
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

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${
            i < count
              ? "fill-[#eaa94d] text-[#eaa94d]"
              : "fill-none text-[#eaa94d]/20"
          }`}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}

export default function Testimonials() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const bgY = useTransform(scrollYProgress, [0, 1], ["-5%", "5%"]);

  return (
    <section ref={sectionRef} className="relative py-20 md:py-28 overflow-hidden">
      {/* Parallax background */}
      <motion.div
        style={{ y: bgY }}
        className="absolute inset-0 bg-linear-to-b from-white via-[#fdf9ef]/50 to-white"
      />
      <div className="absolute top-20 -left-32 w-80 h-80 rounded-full bg-[#eaa94d]/[0.04] blur-[100px] pointer-events-none" />
      <div className="absolute bottom-20 -right-32 w-80 h-80 rounded-full bg-[#d67620]/[0.04] blur-[100px] pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 md:px-8 lg:px-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{
            duration: 0.7,
            ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
          }}
          className="text-center mb-14 md:mb-16"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eaa94d]/[0.08] px-3.5 py-1 text-[11px] font-bold text-[#b25c1c] uppercase tracking-wider border border-[#eaa94d]/15 mb-4">
            <Quote className="h-3 w-3" />
            What people say
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#3e1e0c] leading-[1.1]">
            Loved by thousands
            <br />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-[#eaa94d] to-[#d67620]">
              across Kathmandu.
            </span>
          </h2>
        </motion.div>

        {/* Cards grid */}
        <div
          ref={scrollContainerRef}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6"
        >
          {reviews.map((review, i) => (
            <motion.div
              key={review.name}
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -6, transition: { type: "spring", stiffness: 300, damping: 20 } }}
              className="group relative rounded-2xl bg-white p-6 md:p-7 shadow-[0_1px_3px_rgba(62,30,12,0.04)] hover:shadow-[0_12px_40px_rgba(234,169,77,0.1)] border border-[#f4d69a]/20 hover:border-[#eaa94d]/25 transition-all duration-500"
              style={{ perspective: "800px" }}
            >
              {/* Quote accent */}
              <div
                className="absolute top-5 right-5 text-[48px] font-serif leading-none select-none transition-opacity duration-300 opacity-[0.04] group-hover:opacity-[0.08]"
                style={{ color: review.color }}
              >
                &ldquo;
              </div>

              {/* Stars */}
              <StarRating count={review.rating} />

              {/* Review text */}
              <p className="mt-4 text-sm leading-relaxed text-[#3e1e0c]/60 line-clamp-4">
                {review.text}
              </p>

              {/* Author */}
              <div className="mt-5 flex items-center gap-3 pt-4 border-t border-[#f4d69a]/15">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white shrink-0 transition-transform duration-300 group-hover:scale-110"
                  style={{ backgroundColor: review.color }}
                >
                  {review.avatar}
                </div>
                <div>
                  <p className="text-sm font-bold text-[#3e1e0c] tracking-tight">
                    {review.name}
                  </p>
                  <p className="text-[11px] text-[#8e491e]/40">{review.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
