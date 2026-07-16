"use client";

import { Mountain, Phone, Mail, MapPin, ArrowUp } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useState, useEffect } from "react";

interface FooterSettings {
  phone: string;
  email: string;
  address: string;
  description: string;
}

const FOOTER_DEFAULTS: FooterSettings = {
  phone: "+977 980-123-4567",
  email: "hello@himavolt.com",
  address: "Thamel, Kathmandu",
  description:
    "Nepal's premier enterprise hardware solutions. Reliable POS, networking, and enterprise equipment for modern businesses.",
};

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="text-[13px] text-[var(--text-2)] hover:text-[var(--accent)] transition-colors duration-300 font-medium"
      >
        {children}
      </Link>
    </li>
  );
}

function SocialIcon({ label, path }: { label: string; path: string }) {
  return (
    <motion.a
      href="#"
      whileHover={{ scale: 1.1, y: -2 }}
      whileTap={{ scale: 0.95 }}
      className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--canvas)] text-[var(--text-3)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 border border-[var(--border-soft)] hover:border-[var(--accent)]/20 transition-all duration-300 shadow-sm"
      aria-label={label}
    >
      <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
        <path fillRule="evenodd" d={path} clipRule="evenodd" />
      </svg>
    </motion.a>
  );
}

const socials = [
  {
    label: "Facebook",
    path: "M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z",
  },
  {
    label: "Instagram",
    path: "M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z",
  },
  {
    label: "X",
    path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  }
];

export default function Footer() {
  const [settings, setSettings] = useState<FooterSettings>(FOOTER_DEFAULTS);

  useEffect(() => {
    fetch("/api/admin/footer-settings")
      .then((r) => r.json())
      .then((data) => setSettings({ ...FOOTER_DEFAULTS, ...data }))
      .catch(() => {});
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="bg-[var(--surface-alt)] font-poppins pt-20 border-t border-[var(--border-soft)]">
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-12 lg:gap-16">
          
          {/* Left: Brand & Contact */}
          <div>
            <Link href="/" className="inline-flex items-center gap-2 group">
              <motion.div whileHover={{ rotate: -12 }} transition={{ type: "spring", stiffness: 300, damping: 15 }}>
                <Mountain className="h-6 w-6 text-[var(--accent)]" strokeWidth={2.5} />
              </motion.div>
              <span className="text-xl font-black text-[var(--text-1)] tracking-tight">
                Hima<span className="text-[var(--accent)]">Volt</span>
              </span>
            </Link>
            
            <p className="mt-4 text-[14px] leading-relaxed text-[var(--text-2)] max-w-sm">
              {settings.description}
            </p>

            <div className="mt-8 space-y-4">
              <a href={`tel:${settings.phone.replace(/\s+/g, "")}`} className="group flex items-center gap-3 text-[13px] text-[var(--text-2)] hover:text-[var(--accent)] transition-colors font-medium">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--canvas)] border border-[var(--border-soft)] group-hover:border-[var(--accent)]/30 group-hover:bg-[var(--accent)]/10 transition-colors shadow-sm">
                  <Phone className="h-3.5 w-3.5" />
                </span>
                {settings.phone}
              </a>
              <a href={`mailto:${settings.email}`} className="group flex items-center gap-3 text-[13px] text-[var(--text-2)] hover:text-[var(--accent)] transition-colors font-medium">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--canvas)] border border-[var(--border-soft)] group-hover:border-[var(--accent)]/30 group-hover:bg-[var(--accent)]/10 transition-colors shadow-sm">
                  <Mail className="h-3.5 w-3.5" />
                </span>
                {settings.email}
              </a>
              <span className="flex items-center gap-3 text-[13px] text-[var(--text-2)] font-medium">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--canvas)] border border-[var(--border-soft)] shadow-sm">
                  <MapPin className="h-3.5 w-3.5" />
                </span>
                {settings.address}
              </span>
            </div>
          </div>

          {/* Right: Links Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
            <div>
              <h4 className="text-[11px] font-black text-[var(--text-1)] mb-6 uppercase tracking-widest">
                Products
              </h4>
              <ul className="space-y-4">
                <FooterLink href="/category/pos">POS Systems</FooterLink>
                <FooterLink href="/category/printers">Printers</FooterLink>
                <FooterLink href="/category/barcode">Barcode Scanners</FooterLink>
                <FooterLink href="/category/networking">Networking</FooterLink>
                <FooterLink href="/category/accessories">Accessories</FooterLink>
              </ul>
            </div>

            <div>
              <h4 className="text-[11px] font-black text-[var(--text-1)] mb-6 uppercase tracking-widest">
                Company
              </h4>
              <ul className="space-y-4">
                <FooterLink href="/about">About Us</FooterLink>
                <FooterLink href="/contact">Contact Sales</FooterLink>
                <FooterLink href="/careers">Careers</FooterLink>
                <FooterLink href="/blog">Blog</FooterLink>
                <FooterLink href="/partners">Partner Program</FooterLink>
              </ul>
            </div>

            <div>
              <h4 className="text-[11px] font-black text-[var(--text-1)] mb-6 uppercase tracking-widest">
                Support
              </h4>
              <ul className="space-y-4">
                <FooterLink href="/help">Help Center</FooterLink>
                <FooterLink href="/warranty">Warranty Info</FooterLink>
                <FooterLink href="/returns">Returns</FooterLink>
                <FooterLink href="/legal/terms">Terms of Service</FooterLink>
                <FooterLink href="/legal/privacy">Privacy Policy</FooterLink>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-[var(--border-soft)] w-full" />

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <p className="text-xs text-[var(--text-3)] font-medium">
              &copy; {new Date().getFullYear()} HimaVolt. All rights reserved.
            </p>
            <span className="h-3 w-px bg-[var(--border-soft)] hidden sm:block" />
            <p className="text-xs font-bold text-[var(--accent)] hidden sm:block">
              Made for Nepal
            </p>
          </div>

          <div className="flex items-center gap-3">
            {socials.map((s) => (
              <SocialIcon key={s.label} label={s.label} path={s.path} />
            ))}
          </div>

          <button
            onClick={scrollToTop}
            className="group flex items-center gap-2 text-xs font-semibold text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors"
          >
            Back to top
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--canvas)] border border-[var(--border-soft)] group-hover:border-[var(--text-1)] transition-colors shadow-sm">
              <ArrowUp className="h-3 w-3" />
            </span>
          </button>
        </div>
      </div>
    </footer>
  );
}
