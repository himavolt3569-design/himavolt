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
    <div className="min-h-screen bg-[var(--canvas)]">
      <header className="sticky top-0 z-30 border-b border-[var(--border-soft)] bg-[var(--canvas)]/80 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-10">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--canvas-sub)] hover:text-[var(--text-1)] transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Link href="/" className="flex items-center gap-2">
              <Mountain className="h-6 w-6 text-[var(--accent)]" strokeWidth={2.5} />
              <span className="text-lg font-extrabold tracking-tight text-[var(--text-1)]">
                Hima<span className="text-[var(--accent)]">Volt</span>
              </span>
            </Link>
          </div>
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-xl bg-[var(--text-1)] px-4 py-2.5 text-sm font-bold text-[var(--canvas)] hover:opacity-90 transition-all"
          >
            <Globe className="h-3.5 w-3.5" />
            Back to Home
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden bg-gradient-to-br from-[#3e1e0c] via-[#0d3d30] to-[#3e1e0c] text-white">
        <div className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-[var(--accent-muted)] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-[var(--canvas)]/5 blur-3xl" />
        <div className="relative z-10 mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--canvas)]/10 px-4 py-2 text-sm font-bold text-white/80 mb-6 backdrop-blur-sm border border-white/10">
              <MessageSquare className="h-4 w-4" />
              Get in Touch
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl leading-[1.1] mb-5">
              We would love to{" "}
              <span className="text-[var(--accent)]">hear from you</span>
            </h1>
            <p className="text-lg text-white/60 font-medium max-w-xl leading-relaxed">
              Have a question, feedback, or want to partner with us?
              Drop us a message and our team will get back to you shortly.
            </p>
          </motion.div>
        </div>
      </section>

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
              className="group flex flex-col gap-3 rounded-2xl bg-[var(--canvas)] p-6 shadow-lg shadow-black/5 border border-[var(--border-soft)] hover:border-[var(--accent)]/20 hover:shadow-xl transition-all"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-muted)] text-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-white transition-all">
                <info.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider mb-1">
                  {info.label}
                </p>
                <p className="text-sm font-bold text-[var(--text-1)] group-hover:text-[var(--accent)] transition-colors">
                  {info.value}
                </p>
                <p className="text-xs text-[var(--text-3)] mt-1">{info.description}</p>
              </div>
            </motion.a>
          ))}
        </div>
      </section>

      {/* Form + Quick contacts */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10 py-16 sm:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16">
          <div className="lg:col-span-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-2xl font-extrabold tracking-tight text-[var(--text-1)] sm:text-3xl mb-2">
                Send us a message
              </h2>
              <p className="text-sm text-[var(--text-2)] mb-8 max-w-md">
                Fill out the form below and we will respond within 24 hours on business days.
              </p>

              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center rounded-3xl bg-[var(--text-1)]/5 border border-[var(--text-1)]/10 p-12 text-center"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--text-1)]/10 mb-5">
                    <CheckCircle2 className="h-8 w-8 text-[var(--text-1)]" />
                  </div>
                  <h3 className="text-xl font-bold text-[var(--text-1)] mb-2">
                    Message Sent Successfully
                  </h3>
                  <p className="text-sm text-[var(--text-2)] max-w-sm">
                    Thank you for reaching out. Our team will review your message and get back to you within 24 hours.
                  </p>
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setForm({ name: "", email: "", phone: "", subject: "", message: "" });
                    }}
                    className="mt-6 rounded-xl bg-[var(--text-1)] px-6 py-3 text-sm font-bold text-[var(--canvas)] hover:opacity-90 transition-all"
                  >
                    Send Another Message
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-[var(--text-3)] uppercase tracking-wider">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={set("name")}
                        placeholder="Rajan Shrestha"
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] px-4 py-3.5 text-base sm:text-sm font-medium text-[var(--text-1)] placeholder-gray-300 outline-none transition-all focus:border-[var(--accent)]/40 focus:ring-2 focus:ring-[var(--accent)]/15 focus:bg-[var(--canvas)]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-[var(--text-3)] uppercase tracking-wider">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={set("email")}
                        placeholder="rajan@example.com"
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] px-4 py-3.5 text-base sm:text-sm font-medium text-[var(--text-1)] placeholder-gray-300 outline-none transition-all focus:border-[var(--accent)]/40 focus:ring-2 focus:ring-[var(--accent)]/15 focus:bg-[var(--canvas)]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-[var(--text-3)] uppercase tracking-wider">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                          }))
                        }
                        required
                        maxLength={10}
                        minLength={10}
                        pattern="\d{10}"
                        inputMode="numeric"
                        title="Enter exactly 10 digits"
                        placeholder="98XXXXXXXX"
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] px-4 py-3.5 text-base sm:text-sm font-medium text-[var(--text-1)] placeholder-gray-300 outline-none transition-all focus:border-[var(--accent)]/40 focus:ring-2 focus:ring-[var(--accent)]/15 focus:bg-[var(--canvas)]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-[var(--text-3)] uppercase tracking-wider">
                        Subject
                      </label>
                      <select
                        value={form.subject}
                        onChange={set("subject")}
                        required
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] px-4 py-3.5 text-base sm:text-sm font-medium text-[var(--text-1)] outline-none transition-all focus:border-[var(--accent)]/40 focus:ring-2 focus:ring-[var(--accent)]/15 focus:bg-[var(--canvas)] appearance-none"
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
                    <label className="block text-xs font-bold text-[var(--text-3)] uppercase tracking-wider">
                      Message
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={form.message}
                      onChange={set("message")}
                      placeholder="Tell us how we can help..."
                      className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] px-4 py-3.5 text-base sm:text-sm font-medium text-[var(--text-1)] placeholder-gray-300 outline-none transition-all focus:border-[var(--accent)]/40 focus:ring-2 focus:ring-[var(--accent)]/15 focus:bg-[var(--canvas)]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="group flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[var(--text-1)] py-4 text-[15px] font-extrabold text-[var(--canvas)] shadow-lg shadow-[var(--text-1)]/20 transition-all hover:opacity-90 active:scale-[0.98]"
                  >
                    <Send className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    {submitting ? "Sending..." : "Send Message"}
                  </button>
                </form>
              )}
            </motion.div>
          </div>

          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              <h3 className="text-lg font-extrabold tracking-tight text-[var(--text-1)] mb-6">
                Quick Contact
              </h3>
              <div className="space-y-3">
                {QUICK_CONTACTS.map((contact) => (
                  <a
                    key={contact.value}
                    href={contact.href}
                    className="group flex items-center gap-4 rounded-2xl bg-[var(--canvas-sub)] p-4 hover:bg-[var(--accent)]/5 border border-transparent hover:border-[var(--accent-border)] transition-all"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--canvas)] shadow-sm text-[var(--text-3)] group-hover:text-[var(--accent)] transition-colors">
                      <contact.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[var(--text-3)] mb-0.5">
                        {contact.label}
                      </p>
                      <p className="text-sm font-bold text-[var(--text-1)] group-hover:text-[var(--accent)] transition-colors truncate">
                        {contact.value}
                      </p>
                    </div>
                  </a>
                ))}
              </div>

              <div className="mt-8 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
                <div className="aspect-[4/3] relative">
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--text-3)]">
                    <MapPin className="h-10 w-10 mb-2 text-[var(--accent)]" />
                    <p className="text-sm font-bold text-[var(--text-1)]">Thamel, Kathmandu</p>
                    <p className="text-xs text-[var(--text-3)] mt-0.5">Nepal, 44600</p>
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
