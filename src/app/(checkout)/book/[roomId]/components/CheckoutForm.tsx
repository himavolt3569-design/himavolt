"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Typography } from "@/components/design-system/primitives/Typography";
import { Button } from "@/components/design-system/primitives/Button";
import { CreditCard, Wallet, Banknote, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { createHotelBooking } from "../actions";
import { z } from "zod";

const formSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters").regex(/^[A-Za-z\s]+$/, "Only letters allowed"),
  lastName: z.string().min(2, "Last name must be at least 2 characters").regex(/^[A-Za-z\s]+$/, "Only letters allowed"),
  email: z.string().email("Please enter a valid email address").optional().or(z.literal("")),
  phone: z.string()
    .regex(/^[0-9+\-\s()]+$/, "Phone number cannot contain letters")
    .refine((val) => {
      const digitsOnly = val.replace(/\D/g, "");
      if (val.trim().startsWith("+")) {
        return digitsOnly.length >= 7 && digitsOnly.length <= 15;
      }
      return digitsOnly.length === 10;
    }, "Must be exactly 10 digits (or include country code like +977)"),
});

export function CheckoutForm({
  roomId,
  restaurantId,
  checkIn,
  checkOut,
  guests,
  totalPrice,
}: {
  roomId: string;
  restaurantId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;
}) {
  const router = useRouter();
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Controlled guest fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setIsSubmitting(true);

    const parsed = formSchema.safeParse({ firstName, lastName, email, phone });
    if (!parsed.success) {
      const formattedErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          formattedErrors[String(issue.path[0])] = issue.message;
        }
      });
      setFieldErrors(formattedErrors);
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await createHotelBooking({
        roomId,
        restaurantId,
        checkIn,
        checkOut,
        adults: guests,
        guestFirstName: firstName,
        guestLastName: lastName,
        guestEmail: email,
        guestPhone: phone,
        notes,
        paymentMethod,
        totalPrice,
      });

      if ("error" in result) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }

      const { bookingId, method } = result;

      // No gateway needed — route directly to the confirmation page
      if (method === "CASH" || method === "BANK") {
        router.push(`/hotel/booking/${bookingId}`);
        return;
      }

      // Online gateway: ask the server to build the payment URL
      const initiateRes = await fetch("/api/payments/room-booking/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, method }),
      });

      const initiateData = await initiateRes.json();

      if (!initiateRes.ok) {
        setError(initiateData.error ?? "Failed to initiate payment. Please try again.");
        setIsSubmitting(false);
        return;
      }

      if (method === "ESEWA") {
        // eSewa requires a form POST to the gateway URL
        const { gateway } = initiateData;
        const form = document.createElement("form");
        form.method = "POST";
        form.action = gateway.url;
        Object.entries(gateway.formData).forEach(([key, value]) => {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = key;
          input.value = String(value);
          form.appendChild(input);
        });
        document.body.appendChild(form);
        form.submit();
        return;
      }

      if (method === "KHALTI") {
        window.location.href = initiateData.paymentUrl;
        return;
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  const inputClass =
    "w-full h-12 px-4 rounded-xl border border-[var(--border)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] outline-none transition-all font-poppins bg-white";

  return (
    <form onSubmit={handleSubmit} className="space-y-10">

      {/* Error Banner */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <Typography variant="p" className="text-red-700 font-medium">
            {error}
          </Typography>
        </div>
      )}

      {/* Guest Details */}
      <section>
        <Typography variant="h3" className="mb-6">Guest details</Typography>
        <div className="bg-white p-6 rounded-3xl border border-[var(--border)] shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[var(--text-1)]">First name</label>
              <input
                required
                type="text"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  if (fieldErrors.firstName) setFieldErrors((p) => ({ ...p, firstName: "" }));
                }}
                className={cn(inputClass, fieldErrors.firstName && "border-red-500 focus:border-red-500 focus:ring-red-500")}
                placeholder="John"
              />
              {fieldErrors.firstName && <p className="text-xs text-red-500 font-medium">{fieldErrors.firstName}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[var(--text-1)]">Last name</label>
              <input
                required
                type="text"
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  if (fieldErrors.lastName) setFieldErrors((p) => ({ ...p, lastName: "" }));
                }}
                className={cn(inputClass, fieldErrors.lastName && "border-red-500 focus:border-red-500 focus:ring-red-500")}
                placeholder="Doe"
              />
              {fieldErrors.lastName && <p className="text-xs text-red-500 font-medium">{fieldErrors.lastName}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-[var(--text-1)]">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: "" }));
              }}
              className={cn(inputClass, fieldErrors.email && "border-red-500 focus:border-red-500 focus:ring-red-500")}
              placeholder="john.doe@example.com"
            />
            {fieldErrors.email && <p className="text-xs text-red-500 font-medium">{fieldErrors.email}</p>}
            {!fieldErrors.email && (
              <Typography variant="small" className="text-[var(--text-3)]">
                We&apos;ll send your booking confirmation here.
              </Typography>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-[var(--text-1)]">
              Phone number <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (fieldErrors.phone) setFieldErrors((p) => ({ ...p, phone: "" }));
              }}
              className={cn(inputClass, fieldErrors.phone && "border-red-500 focus:border-red-500 focus:ring-red-500")}
              placeholder="+977 9800000000"
            />
            {fieldErrors.phone && <p className="text-xs text-red-500 font-medium">{fieldErrors.phone}</p>}
          </div>
        </div>
      </section>

      {/* Special Requests */}
      <section>
        <Typography variant="h3" className="mb-6">Special requests</Typography>
        <div className="bg-white p-6 rounded-3xl border border-[var(--border)] shadow-sm">
          <Typography variant="p" className="text-[var(--text-2)] mb-4">
            Special requests cannot be guaranteed – but the property will do its best to meet your needs.
          </Typography>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full p-4 rounded-xl border border-[var(--border)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] outline-none transition-all min-h-[120px] resize-y font-poppins bg-white"
            placeholder="E.g. I would like a quiet room, early check-in, etc."
          />
        </div>
      </section>

      {/* Payment Method */}
      <section>
        <Typography variant="h3" className="mb-6">Pay with</Typography>
        <div className="bg-white p-2 rounded-3xl border border-[var(--border)] shadow-sm flex flex-col gap-2">
          <PaymentOption
            id="KHALTI"
            title="Khalti Wallet"
            subtitle="Pay instantly via Khalti"
            icon={<Wallet className="h-6 w-6 text-purple-600" />}
            selected={paymentMethod === "KHALTI"}
            onClick={() => setPaymentMethod("KHALTI")}
          />
          <PaymentOption
            id="ESEWA"
            title="eSewa"
            subtitle="Pay securely with eSewa"
            icon={<Wallet className="h-6 w-6 text-green-600" />}
            selected={paymentMethod === "ESEWA"}
            onClick={() => setPaymentMethod("ESEWA")}
          />
          <PaymentOption
            id="BANK"
            title="Bank Transfer"
            subtitle="Upload screenshot after booking"
            icon={<CreditCard className="h-6 w-6 text-blue-600" />}
            selected={paymentMethod === "BANK"}
            onClick={() => setPaymentMethod("BANK")}
          />
          <PaymentOption
            id="CASH"
            title="Pay at Hotel"
            subtitle="Pay when you arrive, confirmed instantly"
            icon={<Banknote className="h-6 w-6 text-gray-700" />}
            selected={paymentMethod === "CASH"}
            onClick={() => setPaymentMethod("CASH")}
          />
        </div>
      </section>

      <hr className="border-[var(--border)]" />

      {/* Policies */}
      <section className="space-y-4">
        <Typography variant="h3">Ground rules</Typography>
        <Typography variant="p" className="text-[var(--text-2)]">
          We ask every guest to remember a few simple things about what makes a great guest.
        </Typography>
        <ul className="list-disc pl-5 text-[var(--text-2)] space-y-2">
          <li>Follow the house rules</li>
          <li>Treat your Host&apos;s home like your own</li>
        </ul>
      </section>

      <section>
        <Typography variant="small" className="text-[var(--text-3)] leading-relaxed">
          By selecting the button below, I agree to the House Rules, Ground rules for guests, HimaVolt&apos;s
          Rebooking and Refund Policy, and that HimaVolt can charge my payment method if I&apos;m responsible
          for damage.
        </Typography>
      </section>

      <Button
        size="lg"
        type="submit"
        className="w-full sm:w-auto text-lg px-12 py-7 rounded-2xl"
        disabled={isSubmitting}
      >
        {isSubmitting
          ? "Processing..."
          : paymentMethod === "CASH"
          ? "Confirm Reservation"
          : paymentMethod === "BANK"
          ? "Reserve & Pay Later"
          : "Pay & Book"}
      </Button>
    </form>
  );
}

function PaymentOption({
  title,
  subtitle,
  icon,
  selected,
  onClick,
}: {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 p-4 rounded-2xl cursor-pointer border-2 transition-all",
        selected
          ? "border-[var(--accent)] bg-[var(--accent)]/5"
          : "border-transparent hover:bg-[var(--surface-alt)]",
      )}
    >
      <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-[var(--border-soft)] flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1">
        <Typography variant="p" className="font-semibold block">
          {title}
        </Typography>
        <Typography variant="small" className="text-[var(--text-3)]">
          {subtitle}
        </Typography>
      </div>
      <div className="shrink-0 pl-4">
        <div
          className={cn(
            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
            selected ? "border-[var(--accent)]" : "border-[var(--border)]",
          )}
        >
          {selected && <div className="w-3 h-3 rounded-full bg-[var(--accent)]" />}
        </div>
      </div>
    </div>
  );
}
