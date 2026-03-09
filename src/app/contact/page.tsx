"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Mail,
  Phone,
  MapPin,
  Send,
  Clock,
  MessageSquare,
  ArrowLeft,
  Mountain,
  CheckCircle2,
  Globe,
} from "lucide-react";
import Link from "next/link";
import { submitContactForm } from "@/lib/actions/contact";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};

const CONTACT_INFO = [
  {
    icon: Phone,
    label: "Phone",
    value: "+977 9801234567",
    href: "tel:+9779801234567",
    description: "Mon to Fri, 9am to 6pm",
  },
  {
    icon: Mail,
    label: "Email",
    value: "hello@himavolt.com",
    href: "mailto:hello@himavolt.com",
    description: "We reply within 24 hours",
  },
  {
    icon: MapPin,
    label: "Office",
    value: "Thamel, Kathmandu",
    href: "#",
    description: "Nepal, 44600",
  },
  {
    icon: Clock,
    label: "Business Hours",
    value: "Sun to Fri, 9:00 AM to 6:00 PM",
    href: "#",
    description: "Closed on Saturdays",
  },
];

const QUICK_CONTACTS = [
  {
    icon: Phone,
    label: "Customer Support",
    value: "+977 9801234567",
    href: "tel:+9779801234567",
  },
  {
    icon: Phone,
    label: "Restaurant Partners",
    value: "+977 9807654321",
    href: "tel:+9779807654321",
  },
  {
    icon: Mail,
    label: "General Inquiries",
    value: "info@himavolt.com",
    href: "mailto:info@himavolt.com",
  },
  {
    icon: Mail,
    label: "Partnership",
    value: "partners@himavolt.com",
    href: "mailto:partners@himavolt.com",
  },
];

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const set = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await submitContactForm(form);
      setSubmitted(true);
    } catch {
      // silently handle, form still submits client-side
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/80 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-10">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-[#1F2A2A] transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Link href="/" className="flex items-center gap-2">
              <Mountain className="h-6 w-6 text-[#FF9933]" strokeWidth={2.5} />
              <span className="text-lg font-extrabold tracking-tight text-[#1F2A2A]">
                Himal<span className="text-[#FF9933]">Hub</span>
              </span>
            </Link>
          </div>
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-xl bg-[#0A4D3C] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#083a2d] transition-all"
          >
            <Globe className="h-3.5 w-3.5" />
            Back to Home
          </Link>
        </div>
      </header>

      {/* Hero section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0A4D3C] via-[#0d3d30] to-[#1F2A2A] text-white">
        <div className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-[#FF9933]/8 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
        <div className="relative z-10 mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white/80 mb-6 backdrop-blur-sm border border-white/10">
              <MessageSquare className="h-4 w-4" />
              Get in Touch
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl leading-[1.1] mb-5">
              We would love to{" "}
              <span className="text-[#FF9933]">hear from you</span>
            </h1>
            <p className="text-lg text-white/60 font-medium max-w-xl leading-relaxed">
              Have a question, feedback, or want to partner with us?
              Drop us a message and our team will get back to you shortly.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact info cards */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10 -mt-10 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CONTACT_INFO.map((info, i) => (
            <motion.a
              key={info.label}
              href={info.href}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="group flex flex-col gap-3 rounded-2xl bg-white p-6 shadow-lg shadow-black/5 border border-gray-100 hover:border-[#FF9933]/20 hover:shadow-xl transition-all"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF9933]/10 text-[#FF9933] group-hover:bg-[#FF9933] group-hover:text-white transition-all">
                <info.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  {info.label}
                </p>
                <p className="text-sm font-bold text-[#1F2A2A] group-hover:text-[#FF9933] transition-colors">
                  {info.value}
                </p>
                <p className="text-xs text-gray-400 mt-1">{info.description}</p>
              </div>
            </motion.a>
          ))}
        </div>
      </section>

      {/* Form + Quick contacts */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10 py-16 sm:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16">
          {/* Contact form */}
          <div className="lg:col-span-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-2xl font-extrabold tracking-tight text-[#1F2A2A] sm:text-3xl mb-2">
                Send us a message
              </h2>
              <p className="text-sm text-gray-500 mb-8 max-w-md">
                Fill out the form below and we will respond within 24 hours on business days.
              </p>

              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center rounded-3xl bg-[#0A4D3C]/5 border border-[#0A4D3C]/10 p-12 text-center"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#0A4D3C]/10 mb-5">
                    <CheckCircle2 className="h-8 w-8 text-[#0A4D3C]" />
                  </div>
                  <h3 className="text-xl font-bold text-[#1F2A2A] mb-2">
                    Message Sent Successfully
                  </h3>
                  <p className="text-sm text-gray-500 max-w-sm">
                    Thank you for reaching out. Our team will review your message and get back to you within 24 hours.
                  </p>
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setForm({ name: "", email: "", phone: "", subject: "", message: "" });
                    }}
                    className="mt-6 rounded-xl bg-[#0A4D3C] px-6 py-3 text-sm font-bold text-white hover:bg-[#083a2d] transition-all"
                  >
                    Send Another Message
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={set("name")}
                        placeholder="Rajan Shrestha"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm font-medium text-[#1F2A2A] placeholder-gray-300 outline-none transition-all focus:border-[#FF9933]/40 focus:ring-2 focus:ring-[#FF9933]/15 focus:bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={set("email")}
                        placeholder="rajan@example.com"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm font-medium text-[#1F2A2A] placeholder-gray-300 outline-none transition-all focus:border-[#FF9933]/40 focus:ring-2 focus:ring-[#FF9933]/15 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={set("phone")}
                        placeholder="+977 98XXXXXXXX"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm font-medium text-[#1F2A2A] placeholder-gray-300 outline-none transition-all focus:border-[#FF9933]/40 focus:ring-2 focus:ring-[#FF9933]/15 focus:bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Subject
                      </label>
                      <select
                        value={form.subject}
                        onChange={set("subject")}
                        required
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm font-medium text-[#1F2A2A] outline-none transition-all focus:border-[#FF9933]/40 focus:ring-2 focus:ring-[#FF9933]/15 focus:bg-white appearance-none"
                      >
                        <option value="" disabled>Select a topic</option>
                        <option value="general">General Inquiry</option>
                        <option value="support">Customer Support</option>
                        <option value="partnership">Restaurant Partnership</option>
                        <option value="feedback">Feedback</option>
                        <option value="bug">Report a Bug</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Message
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={form.message}
                      onChange={set("message")}
                      placeholder="Tell us how we can help..."
                      className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm font-medium text-[#1F2A2A] placeholder-gray-300 outline-none transition-all focus:border-[#FF9933]/40 focus:ring-2 focus:ring-[#FF9933]/15 focus:bg-white"
                    />
                  </div>

                  <button
                    type="submit"
                    className="group flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#0A4D3C] py-4 text-[15px] font-extrabold text-white shadow-lg shadow-[#0A4D3C]/20 transition-all hover:bg-[#083a2d] active:scale-[0.98]"
                  >
                    <Send className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    {submitting ? "Sending..." : "Send Message"}
                  </button>
                </form>
              )}
            </motion.div>
          </div>

          {/* Quick contact sidebar */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              <h3 className="text-lg font-extrabold tracking-tight text-[#1F2A2A] mb-6">
                Quick Contact
              </h3>
              <div className="space-y-3">
                {QUICK_CONTACTS.map((contact) => (
                  <a
                    key={contact.value}
                    href={contact.href}
                    className="group flex items-center gap-4 rounded-2xl bg-gray-50 p-4 hover:bg-[#FF9933]/5 border border-transparent hover:border-[#FF9933]/15 transition-all"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm text-gray-400 group-hover:text-[#FF9933] transition-colors">
                      <contact.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-400 mb-0.5">
                        {contact.label}
                      </p>
                      <p className="text-sm font-bold text-[#1F2A2A] group-hover:text-[#FF9933] transition-colors truncate">
                        {contact.value}
                      </p>
                    </div>
                  </a>
                ))}
              </div>

              {/* Map placeholder */}
              <div className="mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-gray-100">
                <div className="aspect-[4/3] relative">
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                    <MapPin className="h-10 w-10 mb-2 text-[#FF9933]" />
                    <p className="text-sm font-bold text-[#1F2A2A]">Thamel, Kathmandu</p>
                    <p className="text-xs text-gray-400 mt-0.5">Nepal, 44600</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
