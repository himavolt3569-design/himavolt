import crypto from "crypto";

const ESEWA_MERCHANT_CODE = process.env.ESEWA_MERCHANT_CODE || "";
const ESEWA_SECRET_KEY = process.env.ESEWA_SECRET_KEY || "";
const ESEWA_GATEWAY_URL =
  process.env.ESEWA_GATEWAY_URL || "https://rc-epay.esewa.com.np/api/epay/main/v2/form";
const ESEWA_VERIFY_URL =
  process.env.ESEWA_VERIFY_URL || "https://uat.esewa.com.np/api/epay/transaction/status/";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function generateSignature(message: string): string {
  return crypto
    .createHmac("sha256", ESEWA_SECRET_KEY)
    .update(message)
    .digest("base64");
}

export function getEsewaPaymentUrl(params: {
  orderId: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
}) {
  const { orderId, amount, taxAmount, totalAmount } = params;
  const transactionUuid = `${orderId}-${Date.now()}`;

  const signatureString = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${ESEWA_MERCHANT_CODE}`;
  const signature = generateSignature(signatureString);

  return {
    url: ESEWA_GATEWAY_URL,
    formData: {
      amount: amount.toString(),
      tax_amount: taxAmount.toString(),
      total_amount: totalAmount.toString(),
      transaction_uuid: transactionUuid,
      product_code: ESEWA_MERCHANT_CODE,
      product_service_charge: "0",
      product_delivery_charge: "0",
      success_url: `${APP_URL}/api/payments/esewa/callback?orderId=${orderId}`,
      failure_url: `${APP_URL}/api/payments/esewa/callback?orderId=${orderId}&status=failed`,
      signed_field_names: "total_amount,transaction_uuid,product_code",
      signature,
    },
  };
}

export async function verifyEsewaPayment(transactionUuid: string, totalAmount: number) {
  try {
    const url = new URL(ESEWA_VERIFY_URL);
    url.searchParams.set("product_code", ESEWA_MERCHANT_CODE);
    url.searchParams.set("total_amount", totalAmount.toString());
    url.searchParams.set("transaction_uuid", transactionUuid);

    const res = await fetch(url.toString());
    if (!res.ok) return null;

    const data = await res.json();
    if (data.status === "COMPLETE") {
      return {
        transactionId: data.ref_id || transactionUuid,
        status: "COMPLETE" as const,
      };
    }
    return null;
  } catch {
    return null;
  }
}
