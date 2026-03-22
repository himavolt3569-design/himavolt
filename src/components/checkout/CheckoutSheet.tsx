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
    sublabel: "Pay with eSewa wallet",
    icon: Wallet,
    color: "text-green-600",
    bg: "bg-green-50 border-green-200",
  },
  {
    id: "KHALTI",
    label: "Khalti",
    sublabel: "Pay with Khalti digital wallet",
    icon: Wallet,
    color: "text-purple-600",
    bg: "bg-purple-50 border-purple-200",
  },
  {
    id: "BANK",
    label: "Bank Transfer",
    sublabel: "Pay via bank / mobile banking",
    icon: Banknote,
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200",
  },
  {
    id: "CASH",
    label: "Cash",
    sublabel: "Pay cash when order is ready",
    icon: DollarSign,
    color: "text-gray-600",
    bg: "bg-gray-50 border-gray-200",
  },
  {
    id: "COUNTER",
    label: "Counter Pay",
    sublabel: "Pay at the counter directly",
    icon: CreditCard,
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-200",
  },
  {
    id: "DIRECT",
    label: "Direct Pay",
    sublabel: "Direct bank/wallet transfer",
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
  onOrderPlaced: (orderId: string) => void;
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
    "review" | "payment" | "scan-qr" | "waiting"
  >("review");
  const totalRef = useRef<HTMLSpanElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const paymentWindowRef = useRef<Window | null>(null);
  const [waitingOrderId, setWaitingOrderId] = useState<string | null>(null);

  // Payment QR images
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

  // Order type & delivery state
  const [orderType, setOrderType] = useState<OrderType>(
    tableNo ? "DINE_IN" : "TAKEAWAY",
  );
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [deliveryNote, setDeliveryNote] = useState("");

  // Coupon
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponLoading, setCouponLoading] = useState(false);

  const slug = restaurantSlug || cartSlug;

  const DELIVERY_FEE = 50;
  const deliveryFee = orderType === "DELIVERY" ? DELIVERY_FEE : 0;
  const tax = taxEnabled
    ? Math.round(subtotal * (taxRate / 100) * 100) / 100
    : 0;
  const serviceCharge = serviceChargeEnabled
    ? Math.round(subtotal * (serviceChargeRate / 100) * 100) / 100
    : 0;
  const total = subtotal + tax + serviceCharge + deliveryFee - couponDiscount;

  const isOnlinePayment = selectedPayment !== "CASH" && selectedPayment !== "COUNTER";

  // Validate coupon code
  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !slug) return;
    setCouponLoading(true);
    setCouponError("");
    try {
      const res = await apiFetch<{ discount: number; message?: string }>(
        `/api/public/restaurants/${slug}/coupons/validate`,
        { method: "POST", body: { code: couponCode.trim(), orderTotal: subtotal } },
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

  // Check if there's an active cash order we can add to
  const canAddToExisting =
    selectedPayment === "CASH" &&
    activeOrder &&
    activeOrder.restaurantId === restaurantId &&
    activeOrder.payment?.method === "CASH" &&
    ["PENDING", "ACCEPTED", "PREPARING"].includes(activeOrder.status);

  // Fetch payment QR images and enabled payment methods
  useEffect(() => {
    if (!open || !slug) return;
    apiFetch<PaymentQRImage[]>(`/api/public/restaurants/${slug}/payment-qrs`)
      .then(setPaymentQRs)
      .catch(() => setPaymentQRs([]));

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
      })
      .catch(() => {});
  }, [open, slug]);

  // Filter payment methods to only show enabled ones
  const PAYMENT_METHODS = ALL_PAYMENT_METHODS.filter((m) =>
    enabledMethods.includes(m.id),
  );

  // Reset order type when tableNo changes
  useEffect(() => {
    if (tableNo) setOrderType("DINE_IN");
  }, [tableNo]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (totalRef.current && open) {
      gsap.fromTo(
        totalRef.current,
        { scale: 1.1, color: "#eaa94d" },
        { scale: 1, color: "#3e1e0c", duration: 0.4, ease: "back.out(2)" },
      );
    }
  }, [total, open]);

  const canProceed =
    orderType !== "DELIVERY" ||
    (deliveryAddress.trim() !== "" && deliveryPhone.trim() !== "");

  const startPaymentPolling = (orderId: string) => {
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
    if (items.length === 0 || !restaurantId) return;
    if (
      orderType === "DELIVERY" &&
      (!deliveryAddress.trim() || !deliveryPhone.trim())
    )
      return;
    setLoading(true);

    try {
      // For cash: add to existing active order if available
      if (canAddToExisting && activeOrder) {
        const order = await addToOrder(
          restaurantId,
          activeOrder.id,
          items.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            price: i.price,
            menuItemId: i.id,
          })),
          note || undefined,
        );
        clearCart();
        onClose();
        onOrderPlaced(order.id);
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

      const order = await placeOrder(
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
      );

      if (selectedPayment === "ESEWA") {
        const paymentRes = await apiFetch<{
          gateway: { url: string; formData: Record<string, string> };
        }>("/api/payments/initiate", {
          method: "POST",
          body: { orderId: order.id, method: "ESEWA" },
        });

        // Build a temporary form in a new window to submit to eSewa
        const w = window.open("about:blank", "_blank");
        if (w) {
          paymentWindowRef.current = w;
          const doc = w.document;
          doc.open();
          doc.write(
            "<html><body><form id='f' method='POST' action='" +
              paymentRes.gateway.url +
              "'>",
          );
          Object.entries(paymentRes.gateway.formData).forEach(
            ([key, value]) => {
              doc.write(
                "<input type='hidden' name='" +
                  key +
                  "' value='" +
                  value +
                  "' />",
              );
            },
          );
          doc.write(
            "</form><p style='font-family:sans-serif;text-align:center;margin-top:40px'>Redirecting to eSewa...</p>",
          );
          doc.write(
            "<script>document.getElementById('f').submit();<\/script></body></html>",
          );
          doc.close();
        } else {
          // Fallback: submit form in same window if popup blocked
          const form = document.createElement("form");
          form.method = "POST";
          form.action = paymentRes.gateway.url;
          Object.entries(paymentRes.gateway.formData).forEach(
            ([key, value]) => {
              const input = document.createElement("input");
              input.type = "hidden";
              input.name = key;
              input.value = value;
              form.appendChild(input);
            },
          );
          document.body.appendChild(form);
          form.submit();
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
        await apiFetch("/api/payments/initiate", {
          method: "POST",
          body: { orderId: order.id, method: "BANK" },
        });
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

      clearCart();
      onClose();
      onOrderPlaced(order.id);
    } catch {
      setLoading(false);
    }
  };

  const handleContinueToPayment = () => {
    // If restaurant has QR codes, show them before placing order
    if (paymentQRs.length > 0) {
      setStep("scan-qr");
    } else {
      setStep("payment");
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
            className="fixed bottom-0 left-0 right-0 z-95 max-h-[92vh] bg-white rounded-t-3xl shadow-2xl overflow-hidden flex flex-col md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:max-w-[520px] md:w-[90%] md:max-h-[85vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-[#eaa94d]" />
                <h2 className="text-lg font-bold text-[#3e1e0c]">
                  {step === "review"
                    ? "Review Order"
                    : step === "scan-qr"
                      ? "Scan & Pay"
                      : step === "waiting"
                        ? "Completing Payment"
                        : "Payment"}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {step === "review" ? (
                <div className="px-6 py-5 space-y-5">
                  {/* Add to existing order banner */}
                  {canAddToExisting && activeOrder && (
                    <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                      <PlusCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-amber-800">
                          Adding to order #{activeOrder.orderNo}
                        </p>
                        <p className="text-[11px] text-amber-600 mt-0.5">
                          These items will be added to your active cash order
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Prepaid notice */}
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

                  {/* Order Type Selector */}
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                      Order Type
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {ORDER_TYPES.map((ot) => {
                        const Icon = ot.icon;
                        const isActive = orderType === ot.id;
                        const isDisabled = ot.id === "DINE_IN" && !tableNo;
                        return (
                          <button
                            key={ot.id}
                            onClick={() => !isDisabled && setOrderType(ot.id)}
                            disabled={isDisabled}
                            className={`relative flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3 text-center transition-all ${
                              isDisabled
                                ? "opacity-40 cursor-not-allowed border-gray-100"
                                : isActive
                                  ? "border-[#eaa94d] bg-[#eaa94d]/5 shadow-sm"
                                  : "border-gray-100 hover:border-gray-200"
                            }`}
                          >
                            <Icon
                              className={`h-5 w-5 ${
                                isActive ? "text-[#eaa94d]" : "text-gray-400"
                              }`}
                            />
                            <span
                              className={`text-xs font-bold ${
                                isActive ? "text-[#eaa94d]" : "text-gray-600"
                              }`}
                            >
                              {ot.label}
                            </span>
                            {isActive && (
                              <motion.div
                                layoutId="orderTypeIndicator"
                                className="absolute -top-px -right-px h-3 w-3 rounded-full bg-[#eaa94d] border-2 border-white"
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Delivery Address Form */}
                  <AnimatePresence>
                    {orderType === "DELIVERY" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3 overflow-hidden"
                      >
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                          Delivery Details
                        </h3>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                          <input
                            type="text"
                            value={deliveryAddress}
                            onChange={(e) => setDeliveryAddress(e.target.value)}
                            placeholder="Delivery address (e.g. Thamel, Kathmandu)"
                            className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm text-[#3e1e0c] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#eaa94d]/30 focus:border-[#eaa94d]/30"
                          />
                        </div>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                          <input
                            type="tel"
                            value={deliveryPhone}
                            onChange={(e) => setDeliveryPhone(e.target.value)}
                            placeholder="Phone number (e.g. 9800000000)"
                            className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm text-[#3e1e0c] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#eaa94d]/30 focus:border-[#eaa94d]/30"
                          />
                        </div>
                        <textarea
                          value={deliveryNote}
                          onChange={(e) => setDeliveryNote(e.target.value)}
                          placeholder="Delivery instructions (optional)"
                          rows={2}
                          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-[#3e1e0c] placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#eaa94d]/30 focus:border-[#eaa94d]/30"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Items */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      {totalItems} {totalItems === 1 ? "Item" : "Items"}
                    </h3>
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl overflow-hidden shrink-0 bg-gray-100">
                          <img
                            src={item.image}
                            alt={item.name}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-[#3e1e0c] truncate">
                            {item.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {item.quantity} x {formatPrice(item.price, currency)}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-[#3e1e0c]">
                          {formatPrice(item.price * item.quantity, currency)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Note */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                      <StickyNote className="h-3 w-3" />
                      Special Instructions
                    </label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="e.g., No spice, extra cheese..."
                      rows={2}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-[#3e1e0c] placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#eaa94d]/30 focus:border-[#eaa94d]/30"
                    />
                  </div>

                  {/* Price breakdown */}
                  <div className="rounded-xl bg-gray-50 p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Subtotal</span>
                      <span className="font-semibold text-[#3e1e0c]">
                        {formatPrice(subtotal, currency)}
                      </span>
                    </div>
                    {taxEnabled && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Tax ({taxRate}%)</span>
                        <span className="font-semibold text-[#3e1e0c]">
                          {formatPrice(tax, currency)}
                        </span>
                      </div>
                    )}
                    {serviceChargeEnabled && serviceCharge > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Service Charge ({serviceChargeRate}%)</span>
                        <span className="font-semibold text-[#3e1e0c]">
                          {formatPrice(serviceCharge, currency)}
                        </span>
                      </div>
                    )}
                    {orderType === "DELIVERY" && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 flex items-center gap-1">
                          <Truck className="h-3 w-3" /> Delivery Fee
                        </span>
                        <span className="font-semibold text-[#3e1e0c]">
                          {deliveryFee > 0 ? formatPrice(deliveryFee, currency) : "FREE"}
                        </span>
                      </div>
                    )}
                    {couponDiscount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-green-600 font-medium">Coupon Discount</span>
                        <span className="font-semibold text-green-600">
                          -{formatPrice(couponDiscount, currency)}
                        </span>
                      </div>
                    )}
                    <div className="border-t border-gray-200 pt-2 flex justify-between">
                      <span className="text-base font-bold text-[#3e1e0c]">
                        Total
                      </span>
                      <span
                        ref={totalRef}
                        className="text-lg font-extrabold text-[#eaa94d]"
                      >
                        {formatPrice(total, currency)}
                      </span>
                    </div>
                  </div>

                  {/* Table / Room info */}
                  {(tableNo || roomNo) && orderType === "DINE_IN" && (
                    <div className="flex items-center gap-2 rounded-xl bg-[#3e1e0c]/5 px-4 py-3">
                      {tableNo && (
                        <>
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3e1e0c]/10 text-sm font-bold text-[#3e1e0c]">
                            {tableNo}
                          </span>
                          <span className="text-sm font-medium text-[#3e1e0c]">
                            Table {tableNo}
                          </span>
                        </>
                      )}
                      {roomNo && (
                        <>
                          <BedDouble className="h-4 w-4 text-[#3e1e0c] ml-1" />
                          <span className="text-sm font-medium text-[#3e1e0c]">
                            Room {roomNo}
                          </span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Coupon code input */}
                  <div className="rounded-xl border border-gray-200 p-3">
                    {couponApplied ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-semibold text-green-600">
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
                            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#eaa94d]/30"
                          />
                          <button
                            onClick={handleApplyCoupon}
                            disabled={!couponCode.trim() || couponLoading}
                            className="rounded-lg bg-[#eaa94d] px-4 py-2 text-xs font-bold text-white hover:bg-[#d67620] disabled:opacity-40 transition-colors"
                          >
                            {couponLoading ? "..." : "Apply"}
                          </button>
                        </div>
                        {couponError && (
                          <p className="mt-1.5 text-xs text-red-500">{couponError}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : step === "scan-qr" ? (
                /* ── Scan & Pay step: show restaurant payment QR images ── */
                <div className="px-6 py-5 space-y-4">
                  <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                    <QrCode className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-amber-800">
                        {selectedPayment === "CASH"
                          ? "Optional: Pay via QR before ordering"
                          : "Pay first, then your order will be placed"}
                      </p>
                      <p className="text-[11px] text-amber-600 mt-0.5">
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
                            ? "border-[#eaa94d] bg-[#eaa94d]/5 shadow-sm"
                            : "border-gray-100 hover:border-gray-200"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                            <QrCode className="h-5 w-5 text-gray-500" />
                          </div>
                          <span className="text-sm font-bold text-[#3e1e0c]">
                            {qr.label}
                          </span>
                          <ChevronRight
                            className={`ml-auto h-4 w-4 text-gray-400 transition-transform ${
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
                                className="w-full max-h-72 object-contain rounded-xl bg-white border border-gray-100 p-2"
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </button>
                    ))}
                  </div>

                  <div className="rounded-xl bg-gray-50 p-4">
                    <div className="flex justify-between">
                      <span className="text-sm font-bold text-[#3e1e0c]">
                        Amount to Pay
                      </span>
                      <span className="text-lg font-extrabold text-[#eaa94d]">
                        {formatPrice(total, currency)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="px-6 py-5 space-y-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Choose Payment Method
                  </h3>
                  <div className="space-y-3">
                    {PAYMENT_METHODS.map((method) => {
                      const Icon = method.icon;
                      const isSelected = selectedPayment === method.id;
                      return (
                        <button
                          key={method.id}
                          onClick={() => setSelectedPayment(method.id)}
                          className={`w-full flex items-center gap-4 rounded-xl border-2 px-4 py-4 text-left transition-all ${
                            isSelected
                              ? `${method.bg} shadow-sm`
                              : "border-gray-100 bg-white hover:border-gray-200"
                          }`}
                        >
                          <div
                            className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                              isSelected ? method.bg : "bg-gray-100"
                            }`}
                          >
                            <Icon
                              className={`h-5 w-5 ${
                                isSelected ? method.color : "text-gray-400"
                              }`}
                            />
                          </div>
                          <div className="flex-1">
                            <p
                              className={`text-sm font-bold ${
                                isSelected ? "text-[#3e1e0c]" : "text-gray-600"
                              }`}
                            >
                              {method.label}
                            </p>
                            <p className="text-[11px] text-gray-400">
                              {method.sublabel}
                            </p>
                          </div>
                          <div
                            className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                              isSelected
                                ? "border-[#eaa94d] bg-[#eaa94d]"
                                : "border-gray-300"
                            }`}
                          >
                            {isSelected && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="h-2 w-2 rounded-full bg-white"
                              />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Show QR hint if restaurant has payment QRs */}
                  {paymentQRs.length > 0 && (
                    <div className="flex items-start gap-2 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3">
                      <QrCode className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                      <p className="text-[11px] text-blue-700">
                        You&apos;ll be shown the restaurant&apos;s payment QR
                        code to scan before your order is placed.
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-3">
                    <Shield className="h-4 w-4 text-gray-400" />
                    <p className="text-[11px] text-gray-500">
                      Your payment info is secure and encrypted
                    </p>
                  </div>
                </div>
              )}

              {/* ── Waiting for payment step ── */}
              {step === "waiting" && (
                <div className="px-6 py-10 space-y-6 text-center">
                  <div className="flex justify-center">
                    <div className="relative">
                      <div className="h-20 w-20 rounded-full bg-[#eaa94d]/10 flex items-center justify-center">
                        <Loader2 className="h-10 w-10 animate-spin text-[#eaa94d]" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-white shadow flex items-center justify-center">
                        {selectedPayment === "ESEWA" ? (
                          <Wallet className="h-4 w-4 text-green-600" />
                        ) : selectedPayment === "KHALTI" ? (
                          <Wallet className="h-4 w-4 text-purple-600" />
                        ) : (
                          <CreditCard className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#3e1e0c]">
                      Waiting for Payment
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Complete your payment in the{" "}
                      {selectedPayment === "ESEWA"
                        ? "eSewa"
                        : selectedPayment === "KHALTI"
                          ? "Khalti"
                          : "payment"}{" "}
                      window. This page will update automatically.
                    </p>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-4">
                    <div className="flex justify-between">
                      <span className="text-sm font-bold text-[#3e1e0c]">
                        Amount
                      </span>
                      <span className="text-lg font-extrabold text-[#eaa94d]">
                        {formatPrice(total, currency)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-left">
                    <Shield className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-amber-700">
                      Don&apos;t close this page. If the payment window was
                      blocked, try allowing pop-ups for this site.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 px-6 py-4 shrink-0 space-y-3">
              {step === "review" ? (
                <button
                  onClick={() => setStep("payment")}
                  disabled={items.length === 0 || !canProceed}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#eaa94d] py-4 text-base font-bold text-white transition-all hover:bg-[#d67620] active:scale-[0.98] shadow-lg shadow-[#eaa94d]/25 disabled:opacity-50"
                >
                  Continue to Payment
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : step === "scan-qr" ? (
                <div className="space-y-2">
                  <button
                    onClick={handlePlaceOrder}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#3e1e0c] py-4 text-base font-bold text-white transition-all hover:bg-[#2d1508] active:scale-[0.98] shadow-lg shadow-[#3e1e0c]/25 disabled:opacity-60"
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
                    className="w-full rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Back to Payment Methods
                  </button>
                </div>
              ) : step === "waiting" ? (
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      if (pollRef.current) clearInterval(pollRef.current);
                      pollRef.current = null;
                      setStep("payment");
                      setWaitingOrderId(null);
                      setLoading(false);
                    }}
                    className="w-full rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Cancel &amp; Choose Another Method
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={
                      paymentQRs.length > 0
                        ? handleContinueToPayment
                        : handlePlaceOrder
                    }
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#3e1e0c] py-4 text-base font-bold text-white transition-all hover:bg-[#2d1508] active:scale-[0.98] shadow-lg shadow-[#3e1e0c]/25 disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : paymentQRs.length > 0 ? (
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
                    className="w-full rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
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
