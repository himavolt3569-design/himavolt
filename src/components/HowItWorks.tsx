"use client";

import { motion } from "framer-motion";
import { QrCode, UtensilsCrossed, Bell, CreditCard } from "lucide-react";

export default function HowItWorks() {
  const steps = [
    {
      icon: <QrCode className="h-8 w-8 text-[#0A4D3C]" />,
      title: "Scan & Browse",
      desc: "Scan the QR code at your table or browse hotels near you.",
    },
    {
      icon: <UtensilsCrossed className="h-8 w-8 text-[#0A4D3C]" />,
      title: "Pick & Order",
      desc: "Choose from digital menus or room service options effortlessly.",
    },
    {
      icon: <Bell className="h-8 w-8 text-[#0A4D3C]" />,
      title: "Live Tracking",
      desc: "Get real-time updates while we prepare your order or room.",
    },
    {
      icon: <CreditCard className="h-8 w-8 text-[#0A4D3C]" />,
      title: "Pay & Enjoy",
      desc: "Pay securely via your phone and savor the premium experience.",
    },
  ];

  return (
    <section className="bg-[#1F2A2A] text-white py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            How <span className="text-[#FF9933]">HimalHub</span> Works
          </h2>
          <p className="text-gray-400 font-medium max-w-2xl mx-auto">
            Experience hospitality reimagined for the modern guest. Order food
            and book stays seamlessly from your phone.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4 relative">
          {/* Connector Line (Desktop) */}
          <div className="hidden lg:block absolute top-[45px] left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-transparent via-[#FF9933]/50 to-transparent" />

          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="relative flex flex-col items-center text-center group"
            >
              <div className="relative z-10 flex h-[90px] w-[90px] items-center justify-center rounded-full bg-white shadow-xl shadow-black/50 transition-transform group-hover:-translate-y-2 group-hover:scale-110 duration-300">
                <div className="absolute inset-0 rounded-full border-2 border-[#FF9933] scale-110 opacity-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300" />
                {step.icon}
              </div>

              <div className="mt-6 flex flex-col items-center">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FF9933] text-xs font-bold text-white mb-3">
                  {idx + 1}
                </span>
                <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                <p className="text-gray-400 text-sm max-w-[250px] leading-relaxed">
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
