"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ShoppingBag,
  CreditCard,
  Wallet,
  Banknote,
  DollarSign,
  ChevronRight,
  Shield,
  Loader2,
  StickyNote,
  MapPin,
  Phone,
  Truck,
  UtensilsCrossed,
  ShoppingCart,
  QrCode,
  BedDouble,
  PlusCircle,
  Tag,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import {
  useOrder,
  type PaymentMethodType,
  type OrderType,
  type DeliveryInfo,
} from "@/context/OrderContext";
import { apiFetch } from "@/lib/api-client";
import { formatPrice } from "@/lib/currency";
import gsap from "gsap";

interface PaymentQRImage {
  id: string;
  label: string;
  imageUrl: string;
}

interface PaymentMethodsResponse {
  enabledMethods: string[];
  bankDetails: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    branch: string;
  } | null;
}

const ALL_PAYMENT_METHODS: {
  id: PaymentMethodType;
  label: string;
  sublabel: string;
  icon: typeof CreditCard;
  color: string;
  bg: string;
}[] = [
  {
    id: "ESEWA",
    label: "eSewa",
    sublabel: "Pay online via eSewa wallet",
    icon: Wallet,
    color: "text-[var(--accent-text)]",
    bg: "bg-[var(--accent-muted)] border-[var(--accent-border)]",
  },
  {
    id: "KHALTI",
    label: "Khalti",
    sublabel: "Pay online via Khalti wallet",
    icon: Wallet,
    color: "text-purple-600",
    bg: "bg-purple-50 border-purple-200",
  },
  {
    id: "BANK",
    label: "Bank",
    sublabel: "Transfer via bank or mobile banking",
    icon: Banknote,
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200",
  },
  {
    id: "CASH",
    label: "Cash",
    sublabel: "Pay cash, staff will collect",
    icon: DollarSign,
    color: "text-[var(--text-2)]",
    bg: "bg-[var(--canvas-sub)] border-[var(--border)]",
  },
  {
    id: "COUNTER",
    label: "Counter",
    sublabel: "Pay cash at the counter before food is prepared",
    icon: CreditCard,
    color: "text-[var(--accent-text)]",
    bg: "bg-[var(--accent-muted)] border-[var(--accent-border)]",
  },
  {
    id: "DIRECT",
    label: "Direct",
    sublabel: "Send payment directly to restaurant account/QR",
    icon: Banknote,
    color: "text-teal-600",
    bg: "bg-teal-50 border-teal-200",
  },
];

const ORDER_TYPES: {
  id: OrderType;
  label: string;
  icon: typeof Truck;
  description: string;
}[] = [
  {
    id: "DINE_IN",
    label: "Dine In",
    icon: UtensilsCrossed,
    description: "Eat at the restaurant",
  },
  {
    id: "TAKEAWAY",
    label: "Takeaway",
    icon: ShoppingCart,
    description: "Pick up your order",
  },
  {
    id: "DELIVERY",
    label: "Delivery",
    icon: Truck,
    description: "Delivered to your door",
  },
];

interface CheckoutSheetProps {
  open: boolean;
  onClose: () => void;
  restaurantId: string;
  restaurantSlug?: string;
  tableNo: number | null;
  roomNo?: string | null;
  tableSessionId?: string;
  onOrderPlaced: (orderId: string, trackToken?: string | null) => void;
}

export default function CheckoutSheet({
  open,
  onClose,
  restaurantId,
  restaurantSlug,
  tableNo,
  roomNo,
  tableSessionId,
  onOrderPlaced,
}: CheckoutSheetProps) {
  const {
    items,
    subtotal,
    totalItems,
    clearCart,
    restaurantSlug: cartSlug,
    currency,
  } = useCart();
  const { placeOrder, addToOrder, activeOrder } = useOrder();
  const [selectedPayment, setSelectedPayment] =
    useState<PaymentMethodType>("CASH");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<
    "review" | "payment" | "scan-qr" | "waiting" | "bank-details" | "proof-upload" | "success"
  >("review");
  const [proofOrderId, setProofOrderId] = useState<string | null>(null);
  const [proofUploading, setProofUploading] = useState(false);
  const [bankDetails, setBankDetails] = useState<{
    bankName: string;
    accountName: string;
    accountNumber: string;
    branch: string;
    note: string;
  } | null>(null);
  const [bankOrderId, setBankOrderId] = useState<string | null>(null);
  const [bankTotal, setBankTotal] = useState(0);
  const [bankProofUploading, setBankProofUploading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const totalRef = useRef<HTMLSpanElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const paymentWindowRef = useRef<Window | null>(null);
  // Hard re-entry guard against double-clicks before `loading` re-renders.
  const submitLockRef = useRef(false);
  // Stable idempotency key for the current logical submit. Kept across retries
  // (so a retried request dedupes server-side) and cleared once an order is
  // actually created, so a later distinct order gets a fresh key.
  const idempotencyKeyRef = useRef<string | null>(null);
  const [waitingOrderId, setWaitingOrderId] = useState<string | null>(null);
  // "gateway" = waiting for eSewa/Khalti window; "staff-confirm" = waiting for staff to mark paid
  const [waitingReason, setWaitingReason] = useState<"gateway" | "staff-confirm">("gateway");

  const [paymentQRs, setPaymentQRs] = useState<PaymentQRImage[]>([]);
  const [selectedQR, setSelectedQR] = useState<PaymentQRImage | null>(null);

  // Enabled payment methods for this restaurant
  const [enabledMethods, setEnabledMethods] = useState<string[]>(["CASH"]);
  const [restaurantBankDetails, setRestaurantBankDetails] =
    useState<PaymentMethodsResponse["bankDetails"]>(null);

  // Tax & service charge config
  const [taxRate, setTaxRate] = useState(13);
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [serviceChargeRate, setServiceChargeRate] = useState(0);
  const [serviceChargeEnabled, setServiceChargeEnabled] = useState(false);
  const [prepaidEnabled, setPrepaidEnabled] = useState(false);
  const [deliveryEnabled, setDeliveryEnabled] = useState(false);

  // Order type & delivery state
  const [orderType, setOrderType] = useState<OrderType>(
    tableNo ? "DINE_IN" : "TAKEAWAY",
  );
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [deliveryNote, setDeliveryNote] = useState("");

  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponLoading, setCouponLoading] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<
    Array<{
      id: string;
      code: string;
      description: string | null;
      type: string;
      value: number;
      minOrder: number;
    }>
  >([]);

  const [deliveryZones, setDeliveryZones] = useState<
    Array<{
      id: string;
      name: string;
      baseFee: number;
      perKmFee: number;
      freeAbove: number | null;
      maxRadiusKm: number;
    }>
  >([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  const slug = restaurantSlug || cartSlug;

  const DELIVERY_FEE = 50;
  const selectedZone = deliveryZones.find((z) => z.id === selectedZoneId) ??
    (deliveryZones.length === 1 ? deliveryZones[0] : null);
  const zoneFee = selectedZone
    ? selectedZone.freeAbove !== null && subtotal >= selectedZone.freeAbove
      ? 0
      : selectedZone.baseFee
    : DELIVERY_FEE;
  const deliveryFee = orderType === "DELIVERY" ? zoneFee : 0;
  const deliveryBlocked =
    orderType === "DELIVERY" &&
    deliveryEnabled &&
    deliveryZones.length > 0 &&
    !selectedZone;
  const tax = taxEnabled
    ? Math.round(subtotal * (taxRate / 100) * 100) / 100
    : 0;
  const serviceCharge = serviceChargeEnabled
    ? Math.round(subtotal * (serviceChargeRate / 100) * 100) / 100
    : 0;
  const total = subtotal + tax + serviceCharge + deliveryFee - couponDiscount;

  const isOnlinePayment = selectedPayment !== "CASH" && selectedPayment !== "COUNTER";

  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !slug) return;
    setCouponLoading(true);
    setCouponError("");
    try {
      const res = await apiFetch<{ discount: number; subtotal: number; message?: string }>(
        `/api/public/restaurants/${slug}/coupons/validate`,
        {
          method: "POST",
          // Send the cart so the server can recompute the subtotal authoritatively.
          body: {
            code: couponCode.trim(),
            items: items.map((i) => ({ menuItemId: i.id, quantity: i.quantity })),
          },
        },
      );
      setCouponDiscount(res.discount);
      setCouponApplied(true);
    } catch (err) {
      setCouponError(err instanceof Error ? err.message : "Invalid coupon");
      setCouponDiscount(0);
      setCouponApplied(false);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode("");
    setCouponDiscount(0);
    setCouponApplied(false);
    setCouponError("");
  };

  // One running bill: add to the active order whenever it's still open and not
  // yet fully paid, regardless of payment method. (Pay-at-end means repeat
  // rounds roll into the same unpaid order instead of opening a second ticket.)
  const canAddToExisting =
    !!activeOrder &&
    activeOrder.restaurantId === restaurantId &&
    activeOrder.payment?.status !== "COMPLETED" &&
    ["PENDING", "ACCEPTED", "PREPARING"].includes(activeOrder.status);

  // Fetch payment QR images and enabled payment methods
  useEffect(() => {
    if (!open || !slug) return;
    apiFetch<PaymentQRImage[]>(`/api/public/restaurants/${slug}/payment-qrs`)
      .then(setPaymentQRs)
      .catch(() => setPaymentQRs([]));

    apiFetch<{ coupons: typeof availableCoupons }>(
      `/api/public/restaurants/${slug}/coupons`,
    )
      .then((data) => setAvailableCoupons(data.coupons ?? []))
      .catch(() => setAvailableCoupons([]));

    apiFetch<{ zones: typeof deliveryZones; deliveryEnabled: boolean }>(
      `/api/public/restaurants/${slug}/delivery-zones`,
    )
      .then((data) => {
        setDeliveryZones(data.zones ?? []);
        if (data.zones && data.zones.length === 1) {
          setSelectedZoneId(data.zones[0].id);
        }
      })
      .catch(() => setDeliveryZones([]));

    apiFetch<PaymentMethodsResponse>(
      `/api/public/restaurants/${slug}/payment-methods`,
    )
      .then((data) => {
        setEnabledMethods(data.enabledMethods);
        setRestaurantBankDetails(data.bankDetails);
        if (data.enabledMethods.length > 0) {
          setSelectedPayment(data.enabledMethods[0] as PaymentMethodType);
        }
      })
      .catch(() => {
        setEnabledMethods(["CASH"]);
        setSelectedPayment("CASH");
      });

    // Fetch tax + service charge + prepaid config
    apiFetch<{
      taxRate: number;
      taxEnabled: boolean;
      serviceChargeRate: number;
      serviceChargeEnabled: boolean;
      prepaidEnabled: boolean;
      deliveryEnabled: boolean;
    }>(`/api/public/restaurants/${slug}`)
      .then((data) => {
        if (typeof data.taxRate === "number") setTaxRate(data.taxRate);
        if (typeof data.taxEnabled === "boolean")
          setTaxEnabled(data.taxEnabled);
        if (typeof data.serviceChargeRate === "number")
          setServiceChargeRate(data.serviceChargeRate);
        if (typeof data.serviceChargeEnabled === "boolean")
          setServiceChargeEnabled(data.serviceChargeEnabled);
        if (typeof data.prepaidEnabled === "boolean")
          setPrepaidEnabled(data.prepaidEnabled);
        if (typeof data.deliveryEnabled === "boolean")
          setDeliveryEnabled(data.deliveryEnabled);
      })
      .catch(() => {});
  }, [open, slug]);

  // Filter payment methods to only show enabled ones
  const PAYMENT_METHODS = ALL_PAYMENT_METHODS.filter((m) =>
    enabledMethods.includes(m.id),
  );

  // Hide delivery option if restaurant has it disabled
  const AVAILABLE_ORDER_TYPES = ORDER_TYPES.filter(
    (ot) => ot.id !== "DELIVERY" || deliveryEnabled,
  );

  // Reset all modal state whenever the sheet opens
  useEffect(() => {
    if (!open) return;
    setStep("review");
    setOrderType(tableNo ? "DINE_IN" : "TAKEAWAY");
    setNote("");
    setCouponCode("");
    setCouponDiscount(0);
    setCouponApplied(false);
    setCouponError("");
    submitLockRef.current = false;
    idempotencyKeyRef.current = null;
    setLoading(false);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (totalRef.current && open) {
      gsap.fromTo(
        totalRef.current,
        { scale: 1.1, color: "var(--accent)" },
        { scale: 1, color: "var(--text-1)", duration: 0.4, ease: "back.out(2)" },
      );
    }
  }, [total, open]);

  const canProceed =
    (orderType !== "DELIVERY" ||
      (deliveryAddress.trim() !== "" && deliveryPhone.trim() !== "")) &&
    !deliveryBlocked;

  const startPaymentPolling = (orderId: string, reason: "gateway" | "staff-confirm" = "gateway") => {
    setWaitingReason(reason);
    setWaitingOrderId(orderId);
    setStep("waiting");
    setLoading(false);

    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/${orderId}/status`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === "COMPLETED") {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          clearCart();
          onClose();
          onOrderPlaced(orderId);
        } else if (data.status === "FAILED") {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          setStep("payment");
          setWaitingOrderId(null);
        }
      } catch {
        /* ignore poll errors */
      }
    }, 3000);
  };

  const handlePlaceOrder = async () => {
    // Hard duplicate-submit guard: ignore re-entry while a submit is in flight.
    if (loading || submitLockRef.current) return;
    if (items.length === 0 || !restaurantId) return;
    if (
      orderType === "DELIVERY" &&
      (!deliveryAddress.trim() || !deliveryPhone.trim())
    )
      return;
    submitLockRef.current = true;
    setLoading(true);

    // One stable idempotency key per logical submit (reused on retry).
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
    const idemKey = idempotencyKeyRef.current;

    try {
      // For cash: add to existing active order if available
      if (canAddToExisting && activeOrder) {
        // Optimistic UI for add-to-existing-order
        setStep("success");
        addToOrder(
          restaurantId,
          activeOrder.id,
          items.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            price: i.price,
            menuItemId: i.id,
          })),
          note || undefined,
          idemKey,
          tableSessionId,
        ).then((order) => {
          idempotencyKeyRef.current = null;
          clearCart();
          setTimeout(() => {
            onClose();
            onOrderPlaced(order.id, order.trackToken);
            setLoading(false);
          }, 1500);
        }).catch((err) => {
          setLoading(false);
          setStep("review");
          alert("Failed to add items to order. Please try again.");
        });
        return;
      }

      const deliveryInfo: DeliveryInfo | undefined =
        orderType === "DELIVERY"
          ? {
              address: deliveryAddress.trim(),
              phone: deliveryPhone.trim(),
              note: deliveryNote.trim() || undefined,
            }
          : undefined;

      const placeOrderArgs = [
        restaurantId,
        items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          price: i.price,
          menuItemId: i.id,
        })),
        orderType,
        tableNo || undefined,
        note || undefined,
        selectedPayment,
        deliveryInfo,
        roomNo || undefined,
        tableSessionId,
        couponApplied ? couponCode : undefined,
        idemKey,
      ] as const;

      if (
        (selectedPayment === "CASH" ||
         selectedPayment === "COUNTER" ||
         selectedPayment === "DIRECT") &&
        !prepaidEnabled
      ) {
        setStep("success");
        placeOrder(...placeOrderArgs).then(async (order) => {
          idempotencyKeyRef.current = null;
          try {
            if (selectedPayment === "COUNTER") {
              await apiFetch("/api/payments/initiate", { method: "POST", body: { orderId: order.id, method: "COUNTER" }});
            }
            if (selectedPayment === "DIRECT") {
              await apiFetch("/api/payments/initiate", { method: "POST", body: { orderId: order.id, method: "DIRECT" }});
            }
          } catch (e) {
            console.error("Failed to initiate payment", e);
          }
          clearCart();
          setTimeout(() => {
            onClose();
            onOrderPlaced(order.id, order.trackToken);
            setLoading(false);
          }, 1500);
        }).catch((err) => {
          setLoading(false);
          setStep("review");
          alert("Failed to place order. Please try again.");
        });
        return;
      }

      const order = await placeOrder(...placeOrderArgs);
      // Order is committed — a later distinct order should get a fresh key.
      idempotencyKeyRef.current = null;

      if (selectedPayment === "ESEWA") {
        const paymentRes = await apiFetch<{
          gateway: { url: string; formData: Record<string, string> };
        }>("/api/payments/initiate", {
          method: "POST",
          body: { orderId: order.id, method: "ESEWA" },
        });

        // Build the form in a new window using DOM construction (createElement
        // + setAttribute) instead of `doc.write` string concatenation. Any
        // `'`, `<`, or `</script>` in the gateway formData is treated as text,
        // not HTML — closing the XSS hole the previous implementation had.
        const w = window.open("about:blank", "_blank");
        if (w) {
          paymentWindowRef.current = w;
          const doc = w.document;
          // Reset the about:blank document to a known empty body.
          doc.open();
          doc.close();
          const form = doc.createElement("form");
          form.method = "POST";
          form.action = paymentRes.gateway.url;
          Object.entries(paymentRes.gateway.formData).forEach(
            ([key, value]) => {
              const input = doc.createElement("input");
              input.type = "hidden";
              input.name = String(key);
              input.value = String(value);
              form.appendChild(input);
            },
          );
          const status = doc.createElement("p");
          status.style.fontFamily = "sans-serif";
          status.style.textAlign = "center";
          status.style.marginTop = "40px";
          status.textContent = "Redirecting to eSewa…";
          doc.body.appendChild(status);
          doc.body.appendChild(form);
          form.submit();
        } else {
          // Popup blocked — we can't poll a same-window submit, so surface a
          // clear inline error rather than silently dropping the order into
          // a half-paid state.
          setLoading(false);
          setPaymentError(
            "Please allow pop-ups for eSewa to complete payment, then try again.",
          );
          return;
        }

        startPaymentPolling(order.id);
        return;
      }

      if (selectedPayment === "KHALTI") {
        const paymentRes = await apiFetch<{ paymentUrl: string }>(
          "/api/payments/initiate",
          {
            method: "POST",
            body: { orderId: order.id, method: "KHALTI" },
          },
        );

        // Open Khalti in a new window/tab
        const w = window.open(paymentRes.paymentUrl, "_blank");
        if (w) {
          paymentWindowRef.current = w;
        } else {
          // Fallback: redirect in same window if popup blocked
          window.location.href = paymentRes.paymentUrl;
          return;
        }

        startPaymentPolling(order.id);
        return;
      }

      if (selectedPayment === "BANK") {
        const bankRes = await apiFetch<{
          bankDetails: { bankName: string; accountName: string; accountNumber: string; branch: string; note: string };
        }>("/api/payments/initiate", {
          method: "POST",
          body: { orderId: order.id, method: "BANK" },
        });
        setBankTotal(total);
        clearCart();
        setBankDetails(bankRes.bankDetails);
        setBankOrderId(order.id);
        setStep("bank-details");
        setLoading(false);
        return;
      }

      if (selectedPayment === "COUNTER") {
        await apiFetch("/api/payments/initiate", {
          method: "POST",
          body: { orderId: order.id, method: "COUNTER" },
        });
      }

      if (selectedPayment === "DIRECT") {
        await apiFetch("/api/payments/initiate", {
          method: "POST",
          body: { orderId: order.id, method: "DIRECT" },
        });
      }

      // Prepaid restaurants: hold the screen until staff confirms payment received.
      // (eSewa/Khalti already returned above via startPaymentPolling)
      if (prepaidEnabled) {
        clearCart(); // order is placed — cart can be cleared
        startPaymentPolling(order.id, "staff-confirm");
        return;
      }

      // Physical methods (non-prepaid): order is live in kitchen immediately.
      // Show optional proof upload — customer can skip and pay at counter.
      if (selectedPayment === "COUNTER" || selectedPayment === "DIRECT") {
        setBankTotal(total);
        clearCart();
        setProofOrderId(order.id);
        setStep("proof-upload");
        setLoading(false);
        return;
      }

      clearCart();
      onClose();
      onOrderPlaced(order.id, order.trackToken);
    } catch (err) {
      // Failure: keep the cart intact, surface a retry message. The idempotency
      // key is intentionally NOT cleared, so a retry dedupes if the order had in
      // fact been committed server-side.
      setLoading(false);
      setPaymentError(
        err instanceof Error
          ? err.message
          : "Couldn't place your order. Please try again.",
      );
    } finally {
      // Release the synchronous re-entry guard; `loading` still gates the UI.
      submitLockRef.current = false;
    }
  };

  const handleContinueToPayment = () => {
    // These methods either use their own gateway or pay physically — skip the QR scan step
    if (
      selectedPayment === "ESEWA" ||
      selectedPayment === "KHALTI" ||
      selectedPayment === "COUNTER"
    ) {
      handlePlaceOrder();
      return;
    }
    // For cash/direct/bank: show restaurant QR images so customer can pay before ordering
    if (paymentQRs.length > 0) {
      setStep("scan-qr");
    } else {
      handlePlaceOrder();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-90 bg-black/50 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-95 max-h-[92vh] bg-[var(--canvas)] rounded-t-3xl shadow-2xl overflow-hidden flex flex-col md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:max-w-[520px] md:w-[90%] md:max-h-[85vh]"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-soft)] shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-[var(--accent)]" />
                <h2 className="text-lg font-bold text-[var(--text-1)]">
                  {step === "review"
                    ? "Review Order"
                    : step === "scan-qr"
                      ? "Scan & Pay"
                      : step === "waiting"
                        ? "Completing Payment"
                        : step === "bank-details"
                          ? "Bank Transfer"
                          : step === "proof-upload"
                            ? "Payment Proof"
                            : "Payment"}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-[var(--text-3)] hover:bg-[var(--surface)] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {step === "review" ? (
                <div className="px-6 py-5 space-y-5">
                  {canAddToExisting && activeOrder && (
                    <div className="flex items-start gap-3 rounded-xl bg-[var(--accent-muted)] border border-[var(--accent-border)] px-4 py-3">
                      <PlusCircle className="h-5 w-5 text-[var(--accent-text)] mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-[var(--accent-text)]">
                          Adding to order #{activeOrder.orderNo}
                        </p>
                        <p className="text-[11px] text-[var(--accent-text)] mt-0.5">
                          These items will be added to your active cash order
                        </p>
                      </div>
                    </div>
                  )}

                  {prepaidEnabled && (
                    <div className="flex items-start gap-3 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3">
                      <Shield className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-blue-800">
                          Prepaid Restaurant
                        </p>
                        <p className="text-[11px] text-blue-600 mt-0.5">
                          Pay before your food is prepared. You will receive a token/receipt after payment.
                        </p>
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider mb-3">
                      Order Type
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {AVAILABLE_ORDER_TYPES.map((ot) => {
                        const Icon = ot.icon;
                        const isActive = orderType === ot.id;
                        // Dine In is always selectable — a guest can choose to
                        // dine in even without scanning a specific table QR (they
                        // give staff the table, or it's a room/resort). Gating it
                        // on tableNo wrongly grayed it out on the plain menu URL.
                        const isDisabled = false;
                        return (
                          <button
                            key={ot.id}
                            onClick={() => !isDisabled && setOrderType(ot.id)}
                            disabled={isDisabled}
                            className={`relative flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3 text-center transition-all ${
                              isDisabled
                                ? "opacity-40 cursor-not-allowed border-[var(--border-soft)]"
                                : isActive
                                  ? "border-[var(--accent)] bg-[var(--accent)]/5 shadow-sm"
                                  : "border-[var(--border-soft)] hover:border-[var(--border)]"
                            }`}
                          >
                            <Icon
                              className={`h-5 w-5 ${
                                isActive ? "text-[var(--accent)]" : "text-[var(--text-3)]"
                              }`}
                            />
                            <span
                              className={`text-xs font-bold ${
                                isActive ? "text-[var(--accent)]" : "text-[var(--text-2)]"
                              }`}
                            >
                              {ot.label}
                            </span>
                            {isActive && (
                              <motion.div
                                layoutId="orderTypeIndicator"
                                className="absolute -top-px -right-px h-3 w-3 rounded-full bg-[var(--accent)] border-2 border-white"
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <AnimatePresence>
                    {orderType === "DELIVERY" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3 overflow-hidden"
                      >
                        <h3 className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider">
                          Delivery Details
                        </h3>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-[var(--text-3)]" />
                          <input
                            type="text"
                            value={deliveryAddress}
                            onChange={(e) => setDeliveryAddress(e.target.value)}
                            placeholder="Delivery address (e.g. Thamel, Kathmandu)"
                            className="w-full rounded-xl border border-[var(--border)] py-3 pl-10 pr-4 text-sm text-[var(--text-1)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)] focus:border-[var(--accent-border)]"
                          />
                        </div>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3.5 h-4 w-4 text-[var(--text-3)]" />
                          <input
                            type="tel"
                            value={deliveryPhone}
                            onChange={(e) =>
                              setDeliveryPhone(
                                e.target.value.replace(/\D/g, "").slice(0, 10),
                              )
                            }
                            required
                            maxLength={10}
                            minLength={10}
                            pattern="\d{10}"
                            inputMode="numeric"
                            title="Enter exactly 10 digits"
                            placeholder="9800000000"
                            className="w-full rounded-xl border border-[var(--border)] py-3 pl-10 pr-4 text-sm text-[var(--text-1)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)] focus:border-[var(--accent-border)]"
                          />
                        </div>
                        {deliveryEnabled && deliveryZones.length > 0 && (
                          <div>
                            <p className="text-[11px] font-bold text-[var(--text-3)] uppercase tracking-wider mb-1.5">
                              Select your zone
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {deliveryZones.map((z) => {
                                const active = z.id === selectedZoneId;
                                const free =
                                  z.freeAbove !== null && subtotal >= z.freeAbove;
                                return (
                                  <button
                                    key={z.id}
                                    type="button"
                                    onClick={() => setSelectedZoneId(z.id)}
                                    className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                                      active
                                        ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] hover:border-[var(--accent-border)]"
                                    }`}
                                  >
                                    {z.name} · {free ? "Free" : `Rs. ${z.baseFee}`}
                                    <span className="opacity-60 ml-1">
                                      (≤ {z.maxRadiusKm}km)
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {deliveryEnabled && deliveryZones.length === 0 && (
                          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                            Delivery zones not configured — delivery fee may be
                            confirmed by the restaurant after placing the order.
                          </div>
                        )}
                        <textarea
                          value={deliveryNote}
                          onChange={(e) => setDeliveryNote(e.target.value)}
                          placeholder="Delivery instructions (optional)"
                          rows={2}
                          className="w-full rounded-xl border border-[var(--border)] px-4 py-3 text-sm text-[var(--text-1)] placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)] focus:border-[var(--accent-border)]"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider">
                      {totalItems} {totalItems === 1 ? "Item" : "Items"}
                    </h3>
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl overflow-hidden shrink-0 bg-[var(--surface)]">
                          <img
                            src={item.image}
                            alt={item.name}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-[var(--text-1)] truncate">
                            {item.name}
                          </p>
                          <p className="text-xs text-[var(--text-3)]">
                            {item.quantity} x {formatPrice(item.price, currency)}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-[var(--text-1)]">
                          {formatPrice(item.price * item.quantity, currency)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-3)] uppercase tracking-wider mb-2">
                      <StickyNote className="h-3 w-3" />
                      Special Instructions
                    </label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="e.g., No spice, extra cheese..."
                      rows={2}
                      className="w-full rounded-xl border border-[var(--border)] px-4 py-3 text-sm text-[var(--text-1)] placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)] focus:border-[var(--accent-border)]"
                    />
                  </div>

                  <div className="rounded-xl bg-[var(--canvas-sub)] p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--text-2)]">Subtotal</span>
                      <span className="font-semibold text-[var(--text-1)]">
                        {formatPrice(subtotal, currency)}
                      </span>
                    </div>
                    {taxEnabled && (
                      <div className="flex justify-between text-sm">
                        <span className="text-[var(--text-2)]">Tax ({taxRate}%)</span>
                        <span className="font-semibold text-[var(--text-1)]">
                          {formatPrice(tax, currency)}
                        </span>
                      </div>
                    )}
                    {serviceChargeEnabled && serviceCharge > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-[var(--text-2)]">Service Charge ({serviceChargeRate}%)</span>
                        <span className="font-semibold text-[var(--text-1)]">
                          {formatPrice(serviceCharge, currency)}
                        </span>
                      </div>
                    )}
                    {orderType === "DELIVERY" && (
                      <div className="flex justify-between text-sm">
                        <span className="text-[var(--text-2)] flex items-center gap-1">
                          <Truck className="h-3 w-3" /> Delivery Fee
                        </span>
                        <span className="font-semibold text-[var(--text-1)]">
                          {deliveryFee > 0 ? formatPrice(deliveryFee, currency) : "FREE"}
                        </span>
                      </div>
                    )}
                    {couponDiscount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-[var(--accent-text)] font-medium">Coupon Discount</span>
                        <span className="font-semibold text-[var(--accent-text)]">
                          -{formatPrice(couponDiscount, currency)}
                        </span>
                      </div>
                    )}
                    <div className="border-t border-[var(--border)] pt-2 flex justify-between">
                      <span className="text-base font-bold text-[var(--text-1)]">
                        Total
                      </span>
                      <span
                        ref={totalRef}
                        className="text-lg font-extrabold text-[var(--accent)]"
                      >
                        {formatPrice(total, currency)}
                      </span>
                    </div>
                  </div>

                  {/* Table / Room info */}
                  {(tableNo || roomNo) && orderType === "DINE_IN" && (
                    <div className="flex items-center gap-2 rounded-xl bg-[var(--text-1)]/5 px-4 py-3">
                      {tableNo && (
                        <>
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--text-1)]/10 text-sm font-bold text-[var(--text-1)]">
                            {tableNo}
                          </span>
                          <span className="text-sm font-medium text-[var(--text-1)]">
                            Table {tableNo}
                          </span>
                        </>
                      )}
                      {roomNo && (
                        <>
                          <BedDouble className="h-4 w-4 text-[var(--text-1)] ml-1" />
                          <span className="text-sm font-medium text-[var(--text-1)]">
                            Room {roomNo}
                          </span>
                        </>
                      )}
                    </div>
                  )}

                  <div className="rounded-xl border border-[var(--border)] p-3">
                    {couponApplied ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-[var(--accent-text)]" />
                          <span className="text-sm font-semibold text-[var(--accent-text)]">
                            {couponCode.toUpperCase()} applied
                          </span>
                        </div>
                        <button
                          onClick={handleRemoveCoupon}
                          className="text-xs font-semibold text-red-500 hover:text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Coupon code"
                            value={couponCode}
                            onChange={(e) => { setCouponCode(e.target.value); setCouponError(""); }}
                            className="flex-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent-border)]"
                          />
                          <button
                            onClick={handleApplyCoupon}
                            disabled={!couponCode.trim() || couponLoading}
                            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--accent-hover)] disabled:opacity-40 transition-colors"
                          >
                            {couponLoading ? "..." : "Apply"}
                          </button>
                        </div>
                        {couponError && (
                          <p className="mt-1.5 text-xs text-red-500">{couponError}</p>
                        )}
                        {availableCoupons.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {availableCoupons
                              .filter((c) => subtotal >= c.minOrder)
                              .slice(0, 6)
                              .map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => {
                                    setCouponCode(c.code);
                                    setCouponError("");
                                  }}
                                  className="rounded-full border border-dashed border-[var(--accent-border)] bg-[var(--accent-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--accent-text)] hover:bg-[var(--accent)] hover:text-white transition-colors"
                                  title={c.description ?? undefined}
                                >
                                  {c.code}
                                  {c.type === "PERCENTAGE"
                                    ? ` · ${c.value}% off`
                                    : ` · -${c.value}`}
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : step === "bank-details" ? (
                /* ── Bank Transfer Details step ── */
                bankDetails ? (
                  <div className="px-6 py-6 space-y-5">
                    <div className="text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 mb-3">
                        <Banknote className="h-7 w-7 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-bold text-[var(--text-1)]">Bank Transfer Details</h3>
                      <p className="text-sm text-[var(--text-2)] mt-1">Transfer the amount below and upload proof</p>
                    </div>

                    <div className="rounded-xl bg-[var(--canvas-sub)] p-4 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-xs text-[var(--text-2)]">Amount</span>
                        <span className="text-lg font-extrabold text-[var(--accent)]">{formatPrice(bankTotal, currency)}</span>
                      </div>
                      <div className="border-t border-[var(--border)] pt-3 space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-[var(--text-2)]">Bank</span>
                          <span className="font-bold text-[var(--text-1)]">{bankDetails.bankName}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-[var(--text-2)]">Account Name</span>
                          <span className="font-bold text-[var(--text-1)]">{bankDetails.accountName}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-[var(--text-2)]">Account No.</span>
                          <span className="font-bold text-[var(--text-1)] font-mono">{bankDetails.accountNumber}</span>
                        </div>
                        {bankDetails.branch && (
                          <div className="flex justify-between text-xs">
                            <span className="text-[var(--text-2)]">Branch</span>
                            <span className="font-bold text-[var(--text-1)]">{bankDetails.branch}</span>
                          </div>
                        )}
                      </div>
                      {bankDetails.note && (
                        <p className="text-[10px] text-[var(--accent-text)] bg-[var(--accent-muted)] rounded-lg p-2 mt-2">{bankDetails.note}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-[var(--text-1)]">Upload Transfer Proof</label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file || !bankOrderId) return;
                          setBankProofUploading(true);
                          try {
                            const { uploadFile } = await import("@/lib/upload");
                            const proofUrl = await uploadFile(file, "bank-proofs");
                            await apiFetch("/api/payments/bank-proof", {
                              method: "POST",
                              body: { orderId: bankOrderId, proofUrl },
                            });
                            onOrderPlaced(bankOrderId);
                            onClose();
                          } catch {
                            // Upload failed — user can retry
                          }
                          setBankProofUploading(false);
                        }}
                        disabled={bankProofUploading}
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-4 py-3 text-sm text-[var(--text-2)] file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {bankProofUploading && (
                        <div className="flex items-center gap-2 text-xs text-blue-600">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Uploading proof...
                        </div>
                      )}
                    </div>

                    <div className="flex items-start gap-2 rounded-xl bg-[var(--accent-muted)] border border-[var(--accent-border)] px-4 py-3">
                      <Shield className="h-4 w-4 text-[var(--accent)] mt-0.5 shrink-0" />
                      <p className="text-[10px] text-[var(--accent-text)]">
                        Your order is awaiting payment verification by our team. Upload proof now or show it at the counter.
                      </p>
                    </div>
                  </div>
                ) : null
              ) : step === "proof-upload" ? (
                /* ── Proof Upload step: order already live, proof optional ── */
                <div className="px-6 py-6 space-y-5">
                  <div className="text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 mb-3">
                      <UtensilsCrossed className="h-7 w-7 text-green-600" />
                    </div>
                    <h3 className="text-lg font-bold text-[var(--text-1)]">Order is Live!</h3>
                    <p className="text-sm text-[var(--text-2)] mt-1">Kitchen has your order. Upload payment proof now or at the counter.</p>
                  </div>

                  <div className="rounded-xl bg-[var(--canvas-sub)] p-4">
                    <div className="flex justify-between">
                      <span className="text-xs text-[var(--text-2)]">Amount to Pay</span>
                      <span className="text-lg font-extrabold text-[var(--accent)]">{formatPrice(bankTotal, currency)}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-[var(--text-1)]">
                      Upload Payment Proof <span className="text-[var(--text-3)] font-normal">(optional)</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !proofOrderId) return;
                        setProofUploading(true);
                        try {
                          const { uploadFile } = await import("@/lib/upload");
                          const proofUrl = await uploadFile(file, "payment-proofs");
                          await apiFetch("/api/payments/bank-proof", {
                            method: "POST",
                            body: { orderId: proofOrderId, proofUrl },
                          });
                          onOrderPlaced(proofOrderId);
                          onClose();
                        } catch {
                          // Upload failed — user can skip instead
                        }
                        setProofUploading(false);
                      }}
                      disabled={proofUploading}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-4 py-3 text-sm text-[var(--text-2)] file:mr-3 file:rounded-lg file:border-0 file:bg-green-50 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-green-700 hover:file:bg-green-100"
                    />
                    {proofUploading && (
                      <div className="flex items-center gap-2 text-xs text-green-600">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Uploading proof...
                      </div>
                    )}
                  </div>

                  <div className="flex items-start gap-2 rounded-xl bg-[var(--accent-muted)] border border-[var(--accent-border)] px-4 py-3">
                    <Shield className="h-4 w-4 text-[var(--accent)] mt-0.5 shrink-0" />
                    <p className="text-[10px] text-[var(--accent-text)]">
                      Your order is already with the kitchen. Uploading proof helps billing verify your payment faster.
                    </p>
                  </div>
                </div>
              ) : step === "waiting" ? (
                /* ── Waiting for payment step ── */
                <div className="px-6 py-10 space-y-6 text-center">
                  <div className="flex justify-center">
                    <div className="relative">
                      <div className="h-20 w-20 rounded-full bg-[var(--accent-muted)] flex items-center justify-center">
                        <Loader2 className="h-10 w-10 animate-spin text-[var(--accent)]" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-[var(--canvas)] shadow flex items-center justify-center">
                        {selectedPayment === "ESEWA" ? (
                          <Wallet className="h-4 w-4 text-[var(--accent-text)]" />
                        ) : selectedPayment === "KHALTI" ? (
                          <Wallet className="h-4 w-4 text-purple-600" />
                        ) : (
                          <CreditCard className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[var(--text-1)]">
                      {waitingReason === "staff-confirm"
                        ? "Order Placed: Awaiting Payment"
                        : "Waiting for Payment"}
                    </h3>
                    <p className="text-sm text-[var(--text-2)] mt-1">
                      {waitingReason === "staff-confirm"
                        ? "Your order has been placed. Show your payment to the staff. This screen will update once payment is confirmed."
                        : `Complete your payment in the ${selectedPayment === "ESEWA" ? "eSewa" : "Khalti"} window. This page will update automatically.`}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[var(--canvas-sub)] p-4">
                    <div className="flex justify-between">
                      <span className="text-sm font-bold text-[var(--text-1)]">Total</span>
                      <span className="text-lg font-extrabold text-[var(--accent)]">{formatPrice(total, currency)}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 rounded-xl bg-[var(--accent-muted)] border border-[var(--accent-border)] px-4 py-3 text-left">
                    <Shield className="h-4 w-4 text-[var(--accent)] mt-0.5 shrink-0" />
                    <p className="text-[11px] text-[var(--accent-text)]">
                      {waitingReason === "staff-confirm"
                        ? "Do not close this page. Staff will confirm your payment and your order will proceed automatically."
                        : "Don't close this page. If the payment window was blocked, try allowing pop-ups for this site."}
                    </p>
                  </div>
                </div>
              ) : step === "scan-qr" ? (
                /* ── Scan & Pay step: show restaurant payment QR images ── */
                <div className="px-6 py-5 space-y-4">
                  <div className="flex items-start gap-3 rounded-xl bg-[var(--accent-muted)] border border-[var(--accent-border)] px-4 py-3">
                    <QrCode className="h-5 w-5 text-[var(--accent-text)] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-[var(--accent-text)]">
                        {selectedPayment === "CASH"
                          ? "Optional: Pay via QR before ordering"
                          : "Pay first, then your order will be placed"}
                      </p>
                      <p className="text-[11px] text-[var(--accent-text)] mt-0.5">
                        Scan one of the QR codes below to pay {formatPrice(total, currency)}. After
                        payment, tap &ldquo;I&apos;ve Paid&rdquo; to confirm
                        your order.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {paymentQRs.map((qr) => (
                      <button
                        key={qr.id}
                        onClick={() =>
                          setSelectedQR(selectedQR?.id === qr.id ? null : qr)
                        }
                        className={`w-full rounded-xl border-2 p-3 text-left transition-all ${
                          selectedQR?.id === qr.id
                            ? "border-[var(--accent)] bg-[var(--accent)]/5 shadow-sm"
                            : "border-[var(--border-soft)] hover:border-[var(--border)]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--surface)]">
                            <QrCode className="h-5 w-5 text-[var(--text-2)]" />
                          </div>
                          <span className="text-sm font-bold text-[var(--text-1)]">
                            {qr.label}
                          </span>
                          <ChevronRight
                            className={`ml-auto h-4 w-4 text-[var(--text-3)] transition-transform ${
                              selectedQR?.id === qr.id ? "rotate-90" : ""
                            }`}
                          />
                        </div>
                        <AnimatePresence>
                          {selectedQR?.id === qr.id && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-3 overflow-hidden"
                            >
                              <img
                                src={qr.imageUrl}
                                alt={qr.label}
                                className="w-full max-h-72 object-contain rounded-xl bg-[var(--canvas)] border border-[var(--border-soft)] p-2"
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </button>
                    ))}
                  </div>

                  <div className="rounded-xl bg-[var(--canvas-sub)] p-4">
                    <div className="flex justify-between">
                      <span className="text-sm font-bold text-[var(--text-1)]">
                        Amount to Pay
                      </span>
                      <span className="text-lg font-extrabold text-[var(--accent)]">
                        {formatPrice(total, currency)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="px-6 py-5 space-y-4">
                  <h3 className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider">
                    Choose Payment Method
                  </h3>
                  <div className="space-y-3">
                    {PAYMENT_METHODS.map((method) => {
                      const Icon = method.icon;
                      const isSelected = selectedPayment === method.id;
                      return (
                        <button
                          key={method.id}
                          onClick={() => { setSelectedPayment(method.id); setPaymentError(null); }}
                          className={`w-full flex items-center gap-4 rounded-xl border-2 px-4 py-4 text-left transition-all ${
                            isSelected
                              ? `${method.bg} shadow-sm`
                              : "border-[var(--border-soft)] bg-[var(--canvas)] hover:border-[var(--border)]"
                          }`}
                        >
                          <div
                            className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                              isSelected ? method.bg : "bg-[var(--surface)]"
                            }`}
                          >
                            <Icon
                              className={`h-5 w-5 ${
                                isSelected ? method.color : "text-[var(--text-3)]"
                              }`}
                            />
                          </div>
                          <div className="flex-1">
                            <p
                              className={`text-sm font-bold ${
                                isSelected ? "text-[var(--text-1)]" : "text-[var(--text-2)]"
                              }`}
                            >
                              {method.label}
                            </p>
                            <p className="text-[11px] text-[var(--text-3)]">
                              {method.sublabel}
                            </p>
                          </div>
                          <div
                            className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                              isSelected
                                ? "border-[var(--accent)] bg-[var(--accent)]"
                                : "border-[var(--border)]"
                            }`}
                          >
                            {isSelected && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="h-2 w-2 rounded-full bg-[var(--canvas)]"
                              />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {paymentQRs.length > 0 && selectedPayment !== "DIRECT" && selectedPayment !== "COUNTER" && (
                    <div className="flex items-start gap-2 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3">
                      <QrCode className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                      <p className="text-[11px] text-blue-700">
                        You&apos;ll be shown the restaurant&apos;s payment QR
                        code to scan before your order is placed.
                      </p>
                    </div>
                  )}

                  {/* Direct Pay info — show bank details + QR codes inline */}
                  {selectedPayment === "DIRECT" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="rounded-2xl border border-teal-100 bg-teal-50/60 p-4 space-y-3"
                    >
                      <div className="flex items-center gap-2">
                        <Banknote className="h-4 w-4 text-teal-600 shrink-0" />
                        <p className="text-xs font-bold text-teal-800">Direct Bank / Wallet Transfer</p>
                      </div>
                      <p className="text-[11px] text-teal-700">
                        Transfer the exact amount to the account below, then place your order. Staff will verify your payment.
                      </p>

                      {restaurantBankDetails && (
                        <div className="rounded-xl bg-[var(--canvas)] border border-teal-100 p-3 space-y-1.5">
                          {restaurantBankDetails.bankName && (
                            <div className="flex justify-between text-xs">
                              <span className="text-[var(--text-3)]">Bank</span>
                              <span className="font-bold text-[var(--text-2)]">{restaurantBankDetails.bankName}</span>
                            </div>
                          )}
                          {restaurantBankDetails.accountName && (
                            <div className="flex justify-between text-xs">
                              <span className="text-[var(--text-3)]">Account Name</span>
                              <span className="font-bold text-[var(--text-2)]">{restaurantBankDetails.accountName}</span>
                            </div>
                          )}
                          {restaurantBankDetails.accountNumber && (
                            <div className="flex justify-between text-xs">
                              <span className="text-[var(--text-3)]">Account No.</span>
                              <span className="font-bold font-mono text-teal-700 select-all">{restaurantBankDetails.accountNumber}</span>
                            </div>
                          )}
                          {restaurantBankDetails.branch && (
                            <div className="flex justify-between text-xs">
                              <span className="text-[var(--text-3)]">Branch</span>
                              <span className="font-bold text-[var(--text-2)]">{restaurantBankDetails.branch}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Payment QR codes (eSewa, Khalti, FonePay, etc.) */}
                      {paymentQRs.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-teal-600 uppercase tracking-wider">Scan to Pay</p>
                          <div className="flex gap-2 flex-wrap">
                            {paymentQRs.map((qr) => (
                              <button
                                key={qr.id}
                                onClick={() => setSelectedQR(selectedQR?.id === qr.id ? null : qr)}
                                className={`flex flex-col items-center gap-1 rounded-xl border-2 p-2 transition-all ${selectedQR?.id === qr.id ? "border-teal-400 bg-teal-50" : "border-[var(--border-soft)] bg-[var(--canvas)] hover:border-teal-200"}`}
                              >
                                <QrCode className="h-4 w-4 text-teal-600" />
                                <span className="text-[9px] font-bold text-[var(--text-2)]">{qr.label}</span>
                              </button>
                            ))}
                          </div>
                          {selectedQR && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center">
                              <div className="rounded-xl bg-[var(--canvas)] border border-teal-100 p-3 shadow-sm">
                                <p className="text-[10px] font-bold text-center text-[var(--text-2)] mb-2">{selectedQR.label}</p>
                                <img src={selectedQR.imageUrl} alt={selectedQR.label} className="w-36 h-36 object-contain" />
                              </div>
                            </motion.div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-2 rounded-xl bg-[var(--accent-muted)] border border-[var(--accent-border)] px-3 py-2">
                        <Shield className="h-3.5 w-3.5 text-[var(--accent)] shrink-0" />
                        <p className="text-[10px] text-[var(--accent-text)]">After placing your order, show your payment screenshot to the staff at the counter.</p>
                      </div>
                    </motion.div>
                  )}

                  <div className="flex items-center gap-2 rounded-xl bg-[var(--canvas-sub)] px-4 py-3">
                    <Shield className="h-4 w-4 text-[var(--text-3)]" />
                    <p className="text-[11px] text-[var(--text-2)]">
                      Your payment info is secure and encrypted
                    </p>
                  </div>
                </div>
              )}

            </div>

            <div className="border-t border-[var(--border-soft)] px-6 py-4 shrink-0 space-y-3">
              {step === "review" ? (
                <button
                  onClick={() => setStep("payment")}
                  disabled={items.length === 0 || !canProceed}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-4 text-base font-bold text-white transition-all hover:bg-[var(--accent-hover)] active:scale-[0.98] shadow-lg shadow-[var(--accent)]/25 disabled:opacity-50"
                >
                  Continue to Payment
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : step === "scan-qr" ? (
                <div className="space-y-2">
                  <button
                    onClick={handlePlaceOrder}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--text-1)] py-4 text-base font-bold text-white transition-all hover:bg-[#2d1508] active:scale-[0.98] shadow-lg shadow-[var(--text-1)]/25 disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Confirming...
                      </>
                    ) : (
                      <>I&apos;ve Paid &middot; Place Order</>
                    )}
                  </button>
                  <button
                    onClick={() => setStep("payment")}
                    className="w-full rounded-xl border border-[var(--border)] py-3 text-sm font-bold text-[var(--text-2)] hover:bg-[var(--canvas-sub)] transition-colors"
                  >
                    Back to Payment Methods
                  </button>
                </div>
              ) : step === "bank-details" ? (
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      if (bankOrderId) onOrderPlaced(bankOrderId);
                      onClose();
                    }}
                    className="w-full rounded-xl border border-[var(--border)] py-3 text-sm font-bold text-[var(--text-2)] hover:bg-[var(--canvas-sub)] transition-colors"
                  >
                    Skip &amp; Show Proof at Counter
                  </button>
                </div>
              ) : step === "proof-upload" ? (
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      if (proofOrderId) onOrderPlaced(proofOrderId);
                      onClose();
                    }}
                    disabled={proofUploading}
                    className="w-full rounded-xl border border-[var(--border)] py-3 text-sm font-bold text-[var(--text-2)] hover:bg-[var(--canvas-sub)] transition-colors disabled:opacity-50"
                  >
                    Skip — Pay at Counter
                  </button>
                </div>
              ) : step === "waiting" ? (
                <div className="space-y-2">
                  {waitingReason === "staff-confirm" ? (
                    // Order already placed — can't go back. Let them close and track.
                    <button
                      onClick={() => {
                        if (pollRef.current) clearInterval(pollRef.current);
                        pollRef.current = null;
                        if (waitingOrderId) onOrderPlaced(waitingOrderId);
                        onClose();
                      }}
                      className="w-full rounded-xl border border-[var(--border)] py-3 text-sm font-bold text-[var(--text-2)] hover:bg-[var(--canvas-sub)] transition-colors"
                    >
                      Close &amp; Track Order
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (pollRef.current) clearInterval(pollRef.current);
                        pollRef.current = null;
                        setStep("payment");
                        setWaitingOrderId(null);
                        setLoading(false);
                      }}
                      className="w-full rounded-xl border border-[var(--border)] py-3 text-sm font-bold text-[var(--text-2)] hover:bg-[var(--canvas-sub)] transition-colors"
                    >
                      Cancel &amp; Choose Another Method
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {paymentError && (
                    <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700 font-medium">
                      {paymentError}
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setPaymentError(null);
                      (paymentQRs.length > 0 ? handleContinueToPayment : handlePlaceOrder)();
                    }}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--text-1)] py-4 text-base font-bold text-white transition-all hover:bg-[#2d1508] active:scale-[0.98] shadow-lg shadow-[var(--text-1)]/25 disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : paymentQRs.length > 0 && selectedPayment !== "ESEWA" && selectedPayment !== "KHALTI" && selectedPayment !== "COUNTER" ? (
                      <>
                        Scan & Pay &middot; {formatPrice(total, currency)}
                        <ChevronRight className="h-4 w-4" />
                      </>
                    ) : canAddToExisting ? (
                      <>
                        <PlusCircle className="h-4 w-4" />
                        Add to Order &middot; {formatPrice(total, currency)}
                      </>
                    ) : (
                      <>Place Order &middot; {formatPrice(total, currency)}</>
                    )}
                  </button>
                  <button
                    onClick={() => setStep("review")}
                    className="w-full rounded-xl border border-[var(--border)] py-3 text-sm font-bold text-[var(--text-2)] hover:bg-[var(--canvas-sub)] transition-colors"
                  >
                    Back to Review
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
