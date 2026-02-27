"use client";

import { motion } from "framer-motion";
import { QrCode, UtensilsCrossed, Bell, CreditCard } from "lucide-react";

const steps = [
  {
    icon: <QrCode className="h-7 w-7 text-[#0A4D3C]" />,
    title: "Scan & Browse",
    desc: "Scan the QR code at your table or browse restaurants near you!",
  },
  {
    icon: <UtensilsCrossed className="h-7 w-7 text-[#0A4D3C]" />,
    title: "Pick & Order",
    desc: "Choose from digital menus and customize your order effortlessly.",
  },
  {
    icon: <Bell className="h-7 w-7 text-[#0A4D3C]" />,
    title: "Live Tracking",
    desc: "Get real-time updates while we prepare and deliver your order.",
  },
  {
    icon: <CreditCard className="h-7 w-7 text-[#0A4D3C]" />,
    title: "Pay & Enjoy",
    desc: "Pay securely via your phone and savor the premium experience.",
  },
];

export default function HowItWorks() {
  return (
    <section className="bg-[#1F2A2A] text-white py-14 md:py-20">
      <div className="mx-auto max-w-[1440px] px-4 md:px-6 lg:px-10">
        <div className="text-center mb-10 md:mb-14">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-2xl md:text-3xl font-extrabold tracking-tight mb-3"
          >
            How <span className="text-[#FF9933]">HimalHub</span> Works
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-gray-400 font-medium max-w-lg mx-auto text-sm md:text-base"
          >
            Food ordering reimagined for the modern diner.
          </motion.p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-4 relative">
          <div className="hidden md:block absolute top-[42px] left-[12%] right-[12%] h-px bg-gradient-to-r from-transparent via-[#FF9933]/30 to-transparent" />

          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: idx * 0.08 }}
              className="relative flex flex-col items-center text-center group"
            >
              <div className="relative z-10 flex h-[84px] w-[84px] items-center justify-center rounded-full bg-white shadow-xl shadow-black/40 transition-transform group-hover:-translate-y-1 group-hover:scale-105 duration-300">
                <div className="absolute inset-0 rounded-full border-2 border-[#FF9933] scale-110 opacity-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300" />
                {step.icon}
              </div>

              <div className="mt-5 flex flex-col items-center">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FF9933] text-[10px] font-bold text-white mb-2">
                  {idx + 1}
                </span>
                <h3 className="text-base font-bold mb-1.5">{step.title}</h3>
                <p className="text-gray-400 text-xs md:text-sm max-w-[220px] leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
