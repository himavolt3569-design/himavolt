import Link from "next/link";
import {
  Mountain,
  Phone,
  Mail,
  MapPin,
  ArrowRight,
  Utensils,
} from "lucide-react";

export default function Footer() {
  return (
    <footer>
      {/* CTA Banner — appetizing gateway */}
      <div className="bg-white">
        <div className="mx-auto max-w-[1440px] px-4 md:px-8 lg:px-12 py-12 md:py-16">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#E23744] via-[#C62828] to-[#B71C1C] p-8 md:p-12 lg:p-16">
            {/* Decorative food images - asymmetric, overlapping */}
            <div className="absolute right-0 top-0 bottom-0 w-[45%] hidden md:block pointer-events-none">
              <div className="absolute top-6 right-8 h-28 w-28 lg:h-36 lg:w-36 overflow-hidden rounded-2xl rotate-6 shadow-2xl shadow-black/30">
                <img
                  src="https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=300&h=300&fit=crop"
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="absolute bottom-8 right-20 lg:right-28 h-24 w-24 lg:h-32 lg:w-32 overflow-hidden rounded-2xl -rotate-3 shadow-2xl shadow-black/30">
                <img
                  src="https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=300&h=300&fit=crop"
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="absolute top-1/2 -translate-y-1/2 right-44 lg:right-56 h-20 w-20 lg:h-28 lg:w-28 overflow-hidden rounded-2xl rotate-12 shadow-2xl shadow-black/30">
                <img
                  src="https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=300&h=300&fit=crop"
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            </div>

            {/* Subtle noise texture */}
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='1'%3E%3Ccircle cx='1' cy='1' r='0.5'/%3E%3C/g%3E%3C/svg%3E\")",
              }}
            />

            <div className="relative z-10 max-w-lg">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-sm px-4 py-2 text-[11px] font-bold text-white/90 uppercase tracking-wider border border-white/10 mb-5">
                <Utensils className="h-3.5 w-3.5" />
                Order your favourites
              </div>
              <h3 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-[1.1] mb-3">
                Still hungry?
                <br />
                <span className="text-white/70">
                  Your next meal is a tap away.
                </span>
              </h3>
              <p className="text-sm text-white/50 font-medium mb-6 max-w-md">
                Explore 100+ dishes from the best restaurants in Kathmandu. Free
                delivery on your first order.
              </p>
              <Link
                href="/menu"
                className="group inline-flex items-center gap-2.5 rounded-full bg-white px-6 py-3 text-sm font-bold text-[#E23744] shadow-lg shadow-black/20 transition-all hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
              >
                Browse Full Menu
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="bg-[#0F1219] text-gray-400">
        <div className="mx-auto max-w-[1440px] px-4 md:px-6 lg:px-10 pt-16 pb-10 md:pt-20 md:pb-12">
          <div className="grid grid-cols-2 md:grid-cols-12 gap-10 lg:gap-8 mb-14">
            {/* Brand — takes 4 cols on desktop */}
            <div className="col-span-2 md:col-span-4 lg:col-span-4">
              <div className="flex items-center gap-2.5 mb-5">
                <Mountain
                  className="h-6 w-6 text-[#FF9933]"
                  strokeWidth={2.5}
                />
                <span className="text-xl font-extrabold text-white tracking-tight">
                  Hima<span className="text-[#FF9933]">Volt</span>
                </span>
              </div>
              <p className="text-sm leading-relaxed text-gray-500 max-w-[300px] mb-7">
                Nepal&apos;s smartest food delivery platform. Scan QR at your
                table, browse the menu, and order instantly — or get it
                delivered to your door.
              </p>
              <div className="space-y-3">
                <a
                  href="tel:+9779801234567"
                  className="group flex items-center gap-3 text-sm text-gray-500 hover:text-[#FF9933] transition-colors"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] group-hover:bg-[#FF9933]/10 transition-colors">
                    <Phone className="h-3.5 w-3.5" />
                  </div>
                  +977 9801234567
                </a>
                <a
                  href="mailto:hello@himavolt.com"
                  className="group flex items-center gap-3 text-sm text-gray-500 hover:text-[#FF9933] transition-colors"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] group-hover:bg-[#FF9933]/10 transition-colors">
                    <Mail className="h-3.5 w-3.5" />
                  </div>
                  hello@himavolt.com
                </a>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.05]">
                    <MapPin className="h-3.5 w-3.5" />
                  </div>
                  Thamel, Kathmandu, Nepal
                </div>
              </div>
            </div>

            {/* Spacer on large screens */}
            <div className="hidden lg:block lg:col-span-1" />

            {/* Company */}
            <div className="col-span-1 md:col-span-2 lg:col-span-2">
              <h4 className="text-[11px] font-bold text-white/60 mb-5 uppercase tracking-[0.15em]">
                Company
              </h4>
              <ul className="space-y-3.5 text-sm">
                <li>
                  <Link
                    href="#"
                    className="text-gray-500 hover:text-white transition-colors"
                  >
                    About Us
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-gray-500 hover:text-white transition-colors"
                  >
                    Careers
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-gray-500 hover:text-white transition-colors"
                  >
                    Team
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="text-gray-500 hover:text-white transition-colors"
                  >
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div className="col-span-1 md:col-span-2 lg:col-span-2">
              <h4 className="text-[11px] font-bold text-white/60 mb-5 uppercase tracking-[0.15em]">
                Support
              </h4>
              <ul className="space-y-3.5 text-sm">
                <li>
                  <Link
                    href="/contact"
                    className="text-gray-500 hover:text-white transition-colors"
                  >
                    Help & Support
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="text-gray-500 hover:text-white transition-colors"
                  >
                    Partner with Us
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="text-gray-500 hover:text-white transition-colors"
                  >
                    Ride with Us
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div className="col-span-1 md:col-span-2 lg:col-span-2">
              <h4 className="text-[11px] font-bold text-white/60 mb-5 uppercase tracking-[0.15em]">
                Legal
              </h4>
              <ul className="space-y-3.5 text-sm">
                <li>
                  <Link
                    href="/legal/terms"
                    className="text-gray-500 hover:text-white transition-colors"
                  >
                    Terms & Conditions
                  </Link>
                </li>
                <li>
                  <Link
                    href="/legal/refund"
                    className="text-gray-500 hover:text-white transition-colors"
                  >
                    Refund & Cancellation
                  </Link>
                </li>
                <li>
                  <Link
                    href="/legal/privacy"
                    className="text-gray-500 hover:text-white transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          {/* Bottom bar */}
          <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs font-medium text-gray-600">
              &copy; {new Date().getFullYear()} HimaVolt.{" "}
              <span className="text-[#FF9933]">Made for Nepal.</span>
            </p>
            <div className="flex items-center gap-4">
              <a
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.05] text-gray-500 hover:bg-white/10 hover:text-white transition-all"
                aria-label="Facebook"
              >
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>
              <a
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.05] text-gray-500 hover:bg-white/10 hover:text-white transition-all"
                aria-label="Instagram"
              >
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>
              <a
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.05] text-gray-500 hover:bg-white/10 hover:text-white transition-all"
                aria-label="Twitter/X"
              >
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
