"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const defaultFaqs = [
  {
    question: "Do I need to buy specific hardware to use HimalHub?",
    answer: "No. HimalHub is entirely cloud-based and runs on any modern web browser. You can use your existing tablets, computers, and smartphones. However, we do recommend certain thermal printers and POS hardware for optimal performance."
  },
  {
    question: "How does the digital QR menu work?",
    answer: "We generate unique QR codes for each table. When customers scan the code, they view your live menu on their phones, place orders, and the KOT is instantly synced to your POS and Kitchen Display System without staff intervention."
  },
  {
    question: "Can I manage multiple locations or franchises?",
    answer: "Yes, our enterprise plan supports multi-tenant management from a single admin dashboard, allowing you to track inventory, staff, and sales across multiple locations."
  },
  {
    question: "Does it support local payment gateways like eSewa and Khalti?",
    answer: "Absolutely! We have deep integrations with eSewa, Khalti, and direct bank transfers, allowing customers to pay their split or full bills right from their phones."
  },
  {
    question: "What happens if our internet goes down?",
    answer: "HimalHub utilizes local caching strategies. While cloud syncing requires an active connection, basic POS functions and local network KOT printing can continue to operate seamlessly in offline mode."
  }
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [faqs, setFaqs] = useState(defaultFaqs);

  useEffect(() => {
    fetch("/api/admin/landing-settings")
      .then(res => res.json())
      .then(data => {
        if (data.faqs && data.faqs.length > 0) {
          setFaqs(data.faqs);
        }
      })
      .catch(console.error);
  }, []);

  return (
    <section className="py-12 md:py-24 bg-[var(--canvas)]">
      {/* Inject SEO Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: {
                "@type": "Answer",
                text: faq.answer,
              },
            })),
          })
        }}
      />
      
      <div className="max-w-3xl mx-auto px-4 md:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black text-[var(--text-1)] tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="mt-4 text-lg text-[var(--text-2)] font-medium">
            Everything you need to know about switching to HimalHub.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div 
                key={index} 
                className={`bg-white rounded-2xl border transition-colors duration-300 ${isOpen ? 'border-[var(--accent)] shadow-md shadow-[var(--accent)]/5' : 'border-[var(--border-soft)] hover:border-[var(--border)]'}`}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full flex items-center justify-between p-6 text-left focus:outline-none"
                  aria-expanded={isOpen}
                >
                  <span className={`font-bold pr-8 ${isOpen ? 'text-[var(--accent)]' : 'text-[var(--text-1)]'}`}>
                    {faq.question}
                  </span>
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-transform duration-300 ${isOpen ? 'bg-[var(--accent)] text-white rotate-180' : 'bg-[var(--canvas-sub)] text-[var(--text-3)]'}`}>
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="p-6 pt-0 text-[15px] text-[var(--text-2)] leading-relaxed border-t border-transparent">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
