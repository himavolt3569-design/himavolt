"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  ChefHat,
  Shield,
  CreditCard,
  Leaf,
  Flame,
  Star,
  Eye,
  EyeOff,
  AlertTriangle,
  MessageCircle,
  Receipt,
  User,
  Package,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

const ORDER_STATUSES = [
  { label: "Pending", color: "bg-orange-100 text-orange-700 border-orange-200", desc: "Order placed, waiting for restaurant to accept" },
  { label: "Accepted", color: "bg-blue-100 text-blue-700 border-blue-200", desc: "Restaurant has acknowledged the order" },
  { label: "Preparing", color: "bg-amber-100 text-amber-700 border-amber-200", desc: "Your food is being cooked" },
  { label: "Ready", color: "bg-green-100 text-green-700 border-green-200", desc: "Food is ready for pickup or serving" },
  { label: "Delivered", color: "bg-emerald-100 text-emerald-700 border-emerald-200", desc: "Order has been served or delivered" },
  { label: "Cancelled", color: "bg-red-100 text-red-700 border-red-200", desc: "Order was cancelled" },
  { label: "Rejected", color: "bg-rose-100 text-rose-700 border-rose-200", desc: "Restaurant could not fulfill the order" },
];

const STAFF_ROLES = [
  { label: "Super Admin", color: "bg-purple-100 text-purple-700 border-purple-200", icon: Shield, desc: "Full access to all features and settings" },
  { label: "Manager", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Shield, desc: "Management functions, staff oversight, reports" },
  { label: "Chef", color: "bg-orange-100 text-orange-700 border-orange-200", icon: ChefHat, desc: "Kitchen operations, order preparation, menu availability" },
  { label: "Waiter", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: User, desc: "Take orders, serve tables, customer interaction" },
  { label: "Cashier", color: "bg-amber-100 text-amber-700 border-amber-200", icon: CreditCard, desc: "Billing, payments, and cash management" },
];

const PAYMENT_METHODS = [
  { label: "Cash", color: "bg-gray-100 text-gray-700", desc: "Pay at counter" },
  { label: "eSewa", color: "bg-green-100 text-green-700", desc: "Digital wallet payment" },
  { label: "Khalti", color: "bg-purple-100 text-purple-700", desc: "Digital wallet payment" },
  { label: "Bank Transfer", color: "bg-blue-100 text-blue-700", desc: "Direct bank transfer via QR" },
];

const CHAT_SENDERS = [
  { label: "Customer", color: "bg-[#eaa94d]", icon: User, desc: "Messages from the customer" },
  { label: "Kitchen", color: "bg-[#3e1e0c]", icon: ChefHat, desc: "Messages from kitchen staff" },
  { label: "Billing", color: "bg-blue-500", icon: Receipt, desc: "Messages from billing/cashier" },
];

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-gray-50/50 py-8 px-4">
      <div className="mx-auto max-w-3xl space-y-8">
        {/* Header */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-[#eaa94d] transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <h1 className="text-2xl font-extrabold text-[#3e1e0c]">
            Site Guide
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Reference for all signs, symbols, and indicators used throughout HimaVolt.
          </p>
        </div>

        {/* Order Statuses */}
        <Section title="Order Statuses" icon={<Clock className="h-4 w-4" />}>
          <div className="space-y-2">
            {ORDER_STATUSES.map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                <span className={`shrink-0 rounded-md border px-2.5 py-1 text-xs font-bold ${s.color}`}>
                  {s.label}
                </span>
                <span className="text-sm text-gray-600">{s.desc}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Staff Roles */}
        <Section title="Staff Roles" icon={<Shield className="h-4 w-4" />}>
          <div className="space-y-2">
            {STAFF_ROLES.map((r) => (
              <div key={r.label} className="flex items-center gap-3">
                <span className={`shrink-0 flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-bold ${r.color}`}>
                  <r.icon className="h-3 w-3" />
                  {r.label}
                </span>
                <span className="text-sm text-gray-600">{r.desc}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Payment Methods */}
        <Section title="Payment Methods" icon={<CreditCard className="h-4 w-4" />}>
          <div className="space-y-2">
            {PAYMENT_METHODS.map((p) => (
              <div key={p.label} className="flex items-center gap-3">
                <span className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-bold ${p.color}`}>
                  {p.label}
                </span>
                <span className="text-sm text-gray-600">{p.desc}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Menu Indicators */}
        <Section title="Menu Indicators" icon={<Leaf className="h-4 w-4" />}>
          <div className="space-y-3">
            <Indicator
              badge={<span className="flex h-4 w-4 items-center justify-center rounded-full bg-green-500"><Leaf className="h-2.5 w-2.5 text-white" /></span>}
              label="Vegetarian item"
            />
            <Indicator
              badge={<span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white">N</span>}
              label="Non-vegetarian item"
            />
            <Indicator
              badge={<span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[8px] font-bold text-white">E</span>}
              label="Contains egg"
            />
            <div className="flex items-center gap-3">
              <div className="flex gap-0.5">
                {[1, 2, 3].map((i) => (
                  <Flame key={i} className="h-3.5 w-3.5 text-red-500" />
                ))}
                <Flame className="h-3.5 w-3.5 text-gray-300" />
              </div>
              <span className="text-sm text-gray-600">Spice level (1-4, more flames = spicier)</span>
            </div>
            <Indicator
              badge={<Star className="h-4 w-4 text-amber-400 fill-amber-400" />}
              label="Featured / recommended item"
            />
            <Indicator
              badge={<span className="rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600">20% OFF</span>}
              label="Discount badge showing percentage off"
            />
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Eye className="h-4 w-4 text-green-600" />
                <span className="text-xs font-bold text-green-600">Available</span>
              </div>
              <span className="text-sm text-gray-600">Item is visible and can be ordered</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <EyeOff className="h-4 w-4 text-gray-400" />
                <span className="text-xs font-bold text-gray-400">Unavailable</span>
              </div>
              <span className="text-sm text-gray-600">Item is hidden from the menu or out of stock</span>
            </div>
          </div>
        </Section>

        {/* Stock Indicators */}
        <Section title="Stock & Inventory" icon={<Package className="h-4 w-4" />}>
          <div className="space-y-3">
            <Indicator
              badge={<AlertTriangle className="h-4 w-4 text-red-500" />}
              label="Low stock - quantity below minimum threshold"
            />
            <Indicator
              badge={<span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">OK</span>}
              label="Stock level is healthy (above minimum threshold)"
            />
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <ToggleRight className="h-5 w-5 text-green-600" />
              </div>
              <span className="text-sm text-gray-600">Item is shown in customer menu</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <ToggleLeft className="h-5 w-5 text-gray-400" />
              </div>
              <span className="text-sm text-gray-600">Item is hidden from customer menu</span>
            </div>
          </div>
        </Section>

        {/* Chat Senders */}
        <Section title="Chat Messages" icon={<MessageCircle className="h-4 w-4" />}>
          <div className="space-y-2">
            {CHAT_SENDERS.map((c) => (
              <div key={c.label} className="flex items-center gap-3">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${c.color}`}>
                  <c.icon className="h-3.5 w-3.5 text-white" />
                </span>
                <div>
                  <span className="text-sm font-bold text-[#3e1e0c]">{c.label}</span>
                  <span className="text-sm text-gray-500 ml-2">{c.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Live Indicators */}
        <Section title="Live Indicators" icon={<span className="relative flex h-4 w-4 items-center justify-center"><span className="animate-ping absolute h-3 w-3 rounded-full bg-green-400 opacity-75" /><span className="relative h-2 w-2 rounded-full bg-green-500" /></span>}>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-semibold text-emerald-700">Live</span>
              </span>
              <span className="text-sm text-gray-600">Real-time connection active - orders update automatically</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
              </span>
              <span className="text-sm text-gray-600">Chat connection active</span>
            </div>
          </div>
        </Section>

        {/* General Navigation */}
        <Section title="Quick Navigation" icon={<ArrowLeft className="h-4 w-4" />}>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              { label: "Menu", href: "/menu", desc: "Browse restaurant menus" },
              { label: "Track Order", href: "/track", desc: "Track your active order" },
              { label: "Scan QR", href: "/scan", desc: "Scan table QR to dine in" },
              { label: "Contact", href: "/contact", desc: "Get in touch" },
            ].map((nav) => (
              <Link
                key={nav.label}
                href={nav.href}
                className="rounded-xl border border-gray-200 p-3 hover:border-[#eaa94d]/30 hover:bg-[#eaa94d]/5 transition-all"
              >
                <p className="font-bold text-[#3e1e0c]">{nav.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{nav.desc}</p>
              </Link>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[#eaa94d]">{icon}</span>
        <h2 className="text-base font-extrabold text-[#3e1e0c]">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Indicator({
  badge,
  label,
}: {
  badge: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {badge}
      <span className="text-sm text-gray-600">{label}</span>
    </div>
  );
}
