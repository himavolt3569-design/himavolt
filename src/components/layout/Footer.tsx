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
    "Nepal's smartest food platform. Scan QR, browse the menu, order instantly, or get it delivered to your door.",
};

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="relative inline-flex items-center gap-1.5 text-[13px] text-white/40 hover:text-[#eaa94d] transition-colors duration-300 group py-0.5"
      >
        <span className="h-px w-0 bg-[#eaa94d]/60 transition-all duration-300 group-hover:w-3 shrink-0" />
        {children}
      </Link>
    </li>
  );
}

function SocialIcon({ label, path }: { label: string; path: string }) {
  return (
    <motion.a
      href="#"
      whileHover={{ scale: 1.15, y: -2 }}
      whileTap={{ scale: 0.9 }}
      className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/4 text-white/30 hover:text-[#eaa94d] hover:bg-[#eaa94d]/10 border border-white/4 hover:border-[#eaa94d]/20 transition-colors duration-300"
      aria-label={label}
    >
      <svg
        className="h-3.5 w-3.5"
        fill="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
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
  },
  {
    label: "TikTok",
    path: "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z",
  },
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
    <footer className="relative bg-[#111111]">
      {/* Top accent line */}
      <div className="h-0.5 bg-linear-to-r from-transparent via-[#eaa94d]/30 to-transparent" />

      {/* Main footer grid */}
      <div className="mx-auto max-w-7xl px-4 md:px-8 lg:px-12 pt-16 md:pt-20 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-12 lg:gap-16">
          {/* Left: Logo + description + contact */}
          <div>
            <Link href="/" className="inline-flex items-center gap-2 group">
              <motion.div
                whileHover={{ rotate: -12 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
              >
                <Mountain
                  className="h-6 w-6 text-[#eaa94d]"
                  strokeWidth={2.5}
                />
              </motion.div>
              <span className="text-lg font-extrabold text-white tracking-tight">
                Hima<span className="text-[#eaa94d]">Volt</span>
              </span>
            </Link>
            <p className="mt-4 text-[13px] leading-relaxed text-white/30 max-w-xs">
              {settings.description}
            </p>

            <div className="mt-6 space-y-3">
              <a
                href={`tel:${settings.phone.replace(/\s+/g, "")}`}
                className="group flex items-center gap-3 text-[13px] text-white/30 hover:text-[#eaa94d] transition-colors duration-300"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/4 group-hover:bg-[#eaa94d]/10 transition-colors duration-300">
                  <Phone className="h-3.5 w-3.5" />
                </span>
                {settings.phone}
              </a>
              <a
                href={`mailto:${settings.email}`}
                className="group flex items-center gap-3 text-[13px] text-white/30 hover:text-[#eaa94d] transition-colors duration-300"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/4 group-hover:bg-[#eaa94d]/10 transition-colors duration-300">
                  <Mail className="h-3.5 w-3.5" />
                </span>
                {settings.email}
              </a>
              <span className="flex items-center gap-3 text-[13px] text-white/30">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/4">
                  <MapPin className="h-3.5 w-3.5" />
                </span>
                {settings.address}
              </span>
            </div>
          </div>

          {/* Right: 3 link columns */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
            <div>
              <h4 className="text-[11px] font-bold text-[#eaa94d]/50 mb-5 uppercase tracking-[0.18em]">
                Company
              </h4>
              <ul className="space-y-3">
                <FooterLink href="#">About Us</FooterLink>
                <FooterLink href="#">Careers</FooterLink>
                <FooterLink href="/contact">Contact</FooterLink>
                <FooterLink href="#">Blog</FooterLink>
              </ul>
            </div>

            <div>
              <h4 className="text-[11px] font-bold text-[#eaa94d]/50 mb-5 uppercase tracking-[0.18em]">
                Product
              </h4>
              <ul className="space-y-3">
                <FooterLink href="/menu">Browse Menu</FooterLink>
                <FooterLink href="/scan">Scan QR</FooterLink>
                <FooterLink href="/contact">Partner with Us</FooterLink>
                <FooterLink href="/contact">For Restaurants</FooterLink>
              </ul>
            </div>

            <div>
              <h4 className="text-[11px] font-bold text-[#eaa94d]/50 mb-5 uppercase tracking-[0.18em]">
                Legal
              </h4>
              <ul className="space-y-3">
                <FooterLink href="/legal/terms">Terms</FooterLink>
                <FooterLink href="/legal/privacy">Privacy</FooterLink>
                <FooterLink href="/legal/refund">Refund Policy</FooterLink>
                <FooterLink href="/contact">Help Center</FooterLink>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-auto max-w-7xl px-4 md:px-8 lg:px-12">
        <div className="h-px bg-linear-to-r from-transparent via-white/6 to-transparent" />
      </div>

      {/* Bottom bar */}
      <div className="mx-auto max-w-7xl px-4 md:px-8 lg:px-12 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Copyright */}
          <div className="flex items-center gap-3">
            <p className="text-xs text-white/25">
              &copy; {new Date().getFullYear()} HimaVolt
            </p>
            <span className="h-3 w-px bg-white/10" />
            <p className="text-xs text-[#eaa94d]/40 font-medium">
              Made for Nepal.
            </p>
          </div>

          {/* Social icons */}
          <div className="flex items-center gap-2">
            {socials.map((s) => (
              <SocialIcon key={s.label} label={s.label} path={s.path} />
            ))}
          </div>

          {/* Back to top */}
          <motion.button
            whileHover={{ scale: 1.1, y: -2 }}
            whileTap={{ scale: 0.9 }}
            onClick={scrollToTop}
            className="group flex items-center gap-2 text-xs text-white/25 hover:text-[#eaa94d] transition-colors duration-300"
          >
            Back to top
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/4 group-hover:bg-[#eaa94d]/10 border border-white/4 group-hover:border-[#eaa94d]/20 transition-all duration-300">
              <ArrowUp className="h-3.5 w-3.5" />
            </span>
          </motion.button>
        </div>
      </div>
    </footer>
  );
}
