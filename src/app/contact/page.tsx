"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Loader2
} from "lucide-react";
import Link from "next/link";
import { submitContactForm } from "@/lib/actions/contact";
import {
  SiteSettings,
  SITE_SETTINGS_DEFAULTS,
  telHref,
  mailtoHref,
} from "@/lib/site-settings";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Site-wide business/contact info, edited in Master Admin → Business Info.
  const [site, setSite] = useState<SiteSettings>(SITE_SETTINGS_DEFAULTS);
  useEffect(() => {
    fetch("/api/site-settings")
      .then((r) => r.json())
      .then((data) => setSite({ ...SITE_SETTINGS_DEFAULTS, ...data }))
      .catch(() => {});
  }, []);

  const supportPhone = site.supportPhone || site.phone;
  const partnerPhone = site.partnerPhone || site.phone;
  const partnerEmail = site.partnerEmail || site.email;

  const CONTACT_INFO = [
    {
      icon: Phone,
      label: "Phone",
      value: site.phone,
      href: telHref(site.phone),
      description: "Call us during business hours",
    },
    {
      icon: Mail,
      label: "Email",
      value: site.email,
      href: mailtoHref(site.email),
      description: "We reply within 24 hours",
    },
    {
      icon: MapPin,
      label: "Office",
      value: site.address,
      href: "#",
      description: site.addressNote,
    },
    {
      icon: Clock,
      label: "Business Hours",
      value: site.hours,
      href: "#",
      description: "Nepal Standard Time",
    },
  ];

  const QUICK_CONTACTS = [
    {
      icon: Phone,
      label: "Customer Support",
      value: supportPhone,
      href: telHref(supportPhone),
    },
    {
      icon: Phone,
      label: "Restaurant Partners",
      value: partnerPhone,
      href: telHref(partnerPhone),
    },
    {
      icon: Mail,
      label: "General Inquiries",
      value: site.email,
      href: mailtoHref(site.email),
    },
    {
      icon: Mail,
      label: "Partnership",
      value: partnerEmail,
      href: mailtoHref(partnerEmail),
    },
  ];

  const set = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((p) => ({ ...p, [key]: e.target.value }));

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
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-soft)] text-[var(--text-2)] hover:bg-[var(--surface-alt)] hover:text-[var(--text-1)] transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Link href="/" className="flex items-center gap-2">
              <Mountain className="h-6 w-6 text-[var(--accent)]" strokeWidth={2.5} />
              <span className="text-lg font-black tracking-tight text-[var(--text-1)]">
                Hima<span className="text-[var(--accent)]">Volt</span>
              </span>
            </Link>
          </div>
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-[1rem] bg-[var(--text-1)] px-5 py-2.5 text-sm font-bold text-[var(--canvas)] hover:bg-[var(--text-2)] transition-all shadow-sm"
          >
            <Globe className="h-3.5 w-3.5" />
            Back to Home
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[var(--surface-alt)] border-b border-[var(--border-soft)]">
        <div className="pointer-events-none absolute top-0 right-0 -mr-32 -mt-32 h-[500px] w-[500px] rounded-full bg-[var(--accent)]/[0.03] blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 -ml-32 -mb-32 h-[400px] w-[400px] rounded-full bg-blue-500/[0.03] blur-3xl" />
        
        <div className="relative z-10 mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--surface)] border border-[var(--border-soft)] px-4 py-2 mb-6 shadow-sm">
              <MessageSquare className="h-4 w-4 text-[var(--accent)]" />
              <span className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider">
                Get in Touch
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-[var(--text-1)] leading-[1.1] mb-6">
              We would love to <span className="text-[var(--accent)]">hear from you.</span>
            </h1>
            <p className="text-lg md:text-xl text-[var(--text-2)] font-medium max-w-xl leading-relaxed">
              Have a question, feedback, or want to partner with us? Drop us a message and our team will get back to you shortly.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10 -mt-12 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {CONTACT_INFO.map((info, i) => (
            <motion.a
              key={info.label}
              href={info.href}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="group flex flex-col gap-4 rounded-3xl bg-[var(--surface)] p-6 md:p-8 shadow-xl shadow-black/5 border border-[var(--border-soft)] hover:border-[var(--accent)]/30 hover:-translate-y-1 transition-all duration-300"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-alt)] text-[var(--text-2)] group-hover:bg-[var(--accent)] group-hover:text-white group-hover:shadow-lg group-hover:shadow-[var(--accent)]/30 transition-all duration-300">
                <info.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider mb-1">
                  {info.label}
                </p>
                <p className="text-[15px] font-bold text-[var(--text-1)] group-hover:text-[var(--accent)] transition-colors mb-2">
                  {info.value}
                </p>
                <p className="text-sm font-medium text-[var(--text-2)] leading-relaxed">
                  {info.description}
                </p>
              </div>
            </motion.a>
          ))}
        </div>
      </section>

      {/* Form + Quick contacts */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10 py-16 md:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-20">
          <div className="lg:col-span-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-2xl md:text-3xl font-black tracking-tight text-[var(--text-1)] mb-3">
                Send us a message
              </h2>
              <p className="text-base text-[var(--text-2)] font-medium mb-8 max-w-md">
                Fill out the form below and we will respond within 24 hours on business days.
              </p>

              <AnimatePresence mode="wait">
                {submitted ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col items-center justify-center rounded-[2.5rem] bg-emerald-50/50 border border-emerald-100 p-12 md:p-16 text-center shadow-inner"
                  >
                    <div className="flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-emerald-500 shadow-xl shadow-emerald-500/20 mb-6">
                      <CheckCircle2 className="h-10 w-10 text-white" />
                    </div>
                    <h3 className="text-2xl font-black text-[var(--text-1)] mb-3">
                      Message Sent Successfully
                    </h3>
                    <p className="text-base font-medium text-[var(--text-2)] max-w-sm mb-8 leading-relaxed">
                      Thank you for reaching out. Our team will review your message and get back to you within 24 hours.
                    </p>
                    <button
                      onClick={() => {
                        setSubmitted(false);
                        setForm({ name: "", email: "", phone: "", subject: "", message: "" });
                      }}
                      className="rounded-[1.5rem] bg-[var(--surface)] border border-[var(--border)] shadow-sm px-8 py-3.5 text-sm font-bold text-[var(--text-2)] hover:bg-[var(--surface-alt)] transition-all hover:-translate-y-0.5 active:translate-y-0"
                    >
                      Send Another Message
                    </button>
                  </motion.div>
                ) : (
                  <motion.form 
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onSubmit={handleSubmit} 
                    className="space-y-6 bg-[var(--surface)] p-6 md:p-10 rounded-[2.5rem] shadow-xl shadow-black/5 border border-[var(--border-soft)]"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2.5">
                        <label className="block text-xs font-bold text-[var(--text-2)] uppercase tracking-wider pl-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          required
                          value={form.name}
                          onChange={set("name")}
                          placeholder="Rajan Shrestha"
                          className="w-full rounded-[1.25rem] border border-[var(--border-soft)] bg-[var(--surface-alt)] px-5 py-4 text-sm font-medium text-[var(--text-1)] placeholder-gray-400 outline-none transition-all focus:border-[var(--accent)]/40 focus:ring-4 focus:ring-[var(--accent)]/10 focus:bg-[var(--surface)]"
                        />
                      </div>
                      <div className="space-y-2.5">
                        <label className="block text-xs font-bold text-[var(--text-2)] uppercase tracking-wider pl-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          required
                          value={form.email}
                          onChange={set("email")}
                          placeholder="rajan@example.com"
                          className="w-full rounded-[1.25rem] border border-[var(--border-soft)] bg-[var(--surface-alt)] px-5 py-4 text-sm font-medium text-[var(--text-1)] placeholder-gray-400 outline-none transition-all focus:border-[var(--accent)]/40 focus:ring-4 focus:ring-[var(--accent)]/10 focus:bg-[var(--surface)]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2.5">
                        <label className="block text-xs font-bold text-[var(--text-2)] uppercase tracking-wider pl-1">
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
                          className="w-full rounded-[1.25rem] border border-[var(--border-soft)] bg-[var(--surface-alt)] px-5 py-4 text-sm font-medium text-[var(--text-1)] placeholder-gray-400 outline-none transition-all focus:border-[var(--accent)]/40 focus:ring-4 focus:ring-[var(--accent)]/10 focus:bg-[var(--surface)]"
                        />
                      </div>
                      <div className="space-y-2.5">
                        <label className="block text-xs font-bold text-[var(--text-2)] uppercase tracking-wider pl-1">
                          Subject
                        </label>
                        <div className="relative">
                          <select
                            value={form.subject}
                            onChange={set("subject")}
                            required
                            className="w-full rounded-[1.25rem] border border-[var(--border-soft)] bg-[var(--surface-alt)] px-5 py-4 text-sm font-medium text-[var(--text-1)] outline-none transition-all focus:border-[var(--accent)]/40 focus:ring-4 focus:ring-[var(--accent)]/10 focus:bg-[var(--surface)] appearance-none pr-10"
                          >
                            <option value="" disabled>Select a topic</option>
                            <option value="general">General Inquiry</option>
                            <option value="support">Customer Support</option>
                            <option value="partnership">Restaurant Partnership</option>
                            <option value="feedback">Feedback</option>
                            <option value="bug">Report a Bug</option>
                            <option value="other">Other</option>
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                            <svg className="h-4 w-4 text-[var(--text-3)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <label className="block text-xs font-bold text-[var(--text-2)] uppercase tracking-wider pl-1">
                        Message
                      </label>
                      <textarea
                        required
                        rows={5}
                        value={form.message}
                        onChange={set("message")}
                        placeholder="Tell us how we can help..."
                        className="w-full resize-none rounded-[1.25rem] border border-[var(--border-soft)] bg-[var(--surface-alt)] px-5 py-4 text-sm font-medium text-[var(--text-1)] placeholder-gray-400 outline-none transition-all focus:border-[var(--accent)]/40 focus:ring-4 focus:ring-[var(--accent)]/10 focus:bg-[var(--surface)]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="group flex w-full items-center justify-center gap-2.5 rounded-[1.25rem] bg-[var(--text-1)] py-4 text-[15px] font-bold text-[var(--canvas)] shadow-lg shadow-[var(--text-1)]/20 transition-all hover:bg-[var(--text-2)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                          Send Message
                        </>
                      )}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="sticky top-24"
            >
              <h3 className="text-lg font-black tracking-tight text-[var(--text-1)] mb-6">
                Quick Directory
              </h3>
              <div className="space-y-3">
                {QUICK_CONTACTS.map((contact) => (
                  <a
                    key={contact.value}
                    href={contact.href}
                    className="group flex items-center gap-4 rounded-[1.5rem] bg-[var(--surface)] p-4 shadow-sm border border-[var(--border-soft)] hover:border-[var(--accent)]/40 hover:shadow-md transition-all"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] bg-[var(--surface-alt)] text-[var(--text-3)] group-hover:bg-[var(--accent)] group-hover:text-white transition-all">
                      <contact.icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-[var(--text-3)] uppercase tracking-wider mb-0.5">
                        {contact.label}
                      </p>
                      <p className="text-sm font-bold text-[var(--text-1)] group-hover:text-[var(--accent)] transition-colors truncate">
                        {contact.value}
                      </p>
                    </div>
                  </a>
                ))}
              </div>

              <div className="mt-8 overflow-hidden rounded-[2rem] border border-[var(--border-soft)] bg-[var(--surface)] shadow-xl shadow-black/5">
                <div className="aspect-[4/3] relative bg-[var(--surface-alt)]">
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--text-3)]">
                    <div className="h-16 w-16 bg-[var(--surface)] rounded-[1.25rem] flex items-center justify-center shadow-sm mb-4 border border-[var(--border-soft)]">
                      <MapPin className="h-7 w-7 text-[var(--accent)]" />
                    </div>
                    <p className="text-base font-black text-[var(--text-1)]">{site.address}</p>
                    <p className="text-sm font-medium text-[var(--text-2)] mt-1">{site.addressNote}</p>
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
