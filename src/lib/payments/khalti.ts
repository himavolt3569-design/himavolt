const KHALTI_GATEWAY_URL =
  process.env.KHALTI_GATEWAY_URL ||
  "https://a.khalti.com/api/v2/epayment/initiate/";
const KHALTI_VERIFY_URL =
  process.env.KHALTI_VERIFY_URL ||
  "https://a.khalti.com/api/v2/epayment/lookup/";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function initiateKhaltiPayment(params: {
  orderId: string;
  orderNo: string;
  amount: number; // in rupees — Khalti expects paisa
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  secretKey: string; // per-restaurant secret key
}) {
  const {
    orderId,
    orderNo,
    amount,
    customerName,
    customerEmail,
    customerPhone,
    secretKey,
  } = params;

  const payload = {
    return_url: `${APP_URL}/api/payments/khalti/callback?orderId=${orderId}`,
    website_url: APP_URL,
    amount: Math.round(amount * 100), // convert to paisa
    purchase_order_id: orderId,
    purchase_order_name: `HimaVolt Order #${orderNo}`,
    customer_info: {
      name: customerName || "Customer",
      email: customerEmail || "",
      phone: customerPhone || "",
    },
  };

  const res = await fetch(KHALTI_GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Key ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || "Khalti initiation failed");
  }

  const data = await res.json();
  return {
    paymentUrl: data.payment_url as string,
    pidx: data.pidx as string,
  };
}

export async function verifyKhaltiPayment(pidx: string, secretKey: string) {
  const res = await fetch(KHALTI_VERIFY_URL, {
    method: "POST",
    headers: {
      Authorization: `Key ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ pidx }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  if (data.status === "Completed") {
    return {
      transactionId: data.transaction_id as string,
      amount: (data.total_amount as number) / 100,
      status: "Completed" as const,
    };
  }
  return null;
}
