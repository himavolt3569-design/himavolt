import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getEsewaPaymentUrl } from "@/lib/payments/esewa";
import { initiateKhaltiPayment } from "@/lib/payments/khalti";
import { safeHandler, notFound } from "@/lib/api-helpers";
import { initiatePaymentSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";
import { getCurrencySymbol } from "@/lib/currency";
import { decryptIfPresent } from "@/lib/encryption";

export const POST = safeHandler(
  async (_req, { body }) => {
    const { orderId, method } = body;

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { payment: true, user: true },
    });

    if (!order) return notFound("Order not found");

    const restaurant = await db.restaurant.findUnique({
      where: { id: order.restaurantId },
      select: { currency: true },
    });
    const currSym = getCurrencySymbol(restaurant?.currency ?? "NPR");

    if (order.payment?.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Payment already completed" },
        { status: 400 },
      );
    }

    // Fetch per-restaurant payment config
    const paymentConfig = await db.paymentConfig.findUnique({
      where: { restaurantId: order.restaurantId },
    });

    logAudit({
      action: "PAYMENT_INITIATED",
      entity: "Payment",
      entityId: orderId,
      detail: `Payment initiated via ${method} for order ${order.orderNo} (${currSym}${order.total})`,
      metadata: { method, orderNo: order.orderNo, amount: order.total },
      userId: order.userId ?? undefined,
      restaurantId: order.restaurantId,
    });

    if (method === "CASH") {
      const payment = await db.payment.upsert({
        where: { orderId },
        update: { method: "CASH", status: "PENDING" },
        create: {
          orderId,
          method: "CASH",
          status: "PENDING",
          amount: order.total,
        },
      });
      return NextResponse.json({
        success: true,
        method: "CASH",
        paymentId: payment.id,
      });
    }

    if (method === "ESEWA") {
      const merchantCode = decryptIfPresent(paymentConfig?.esewaMerchantCode);
      const secretKey = decryptIfPresent(paymentConfig?.esewaSecretKey);

      if (!merchantCode || !secretKey || !paymentConfig?.esewaEnabled) {
        return NextResponse.json(
          { error: "eSewa is not configured for this restaurant" },
          { status: 400 },
        );
      }

      const payment = await db.payment.upsert({
        where: { orderId },
        update: { method: "ESEWA", status: "PENDING" },
        create: {
          orderId,
          method: "ESEWA",
          status: "PENDING",
          amount: order.total,
        },
      });

      const esewaData = getEsewaPaymentUrl({
        orderId: order.id,
        amount: order.subtotal,
        taxAmount: order.tax,
        totalAmount: order.total,
        merchantCode,
        secretKey,
      });

      return NextResponse.json({
        success: true,
        method: "ESEWA",
        paymentId: payment.id,
        gateway: esewaData,
      });
    }

    if (method === "KHALTI") {
      const secretKey = decryptIfPresent(paymentConfig?.khaltiSecretKey);

      if (!secretKey || !paymentConfig?.khaltiEnabled) {
        return NextResponse.json(
          { error: "Khalti is not configured for this restaurant" },
          { status: 400 },
        );
      }

      const payment = await db.payment.upsert({
        where: { orderId },
        update: { method: "KHALTI", status: "PENDING" },
        create: {
          orderId,
          method: "KHALTI",
          status: "PENDING",
          amount: order.total,
        },
      });

      const khaltiData = await initiateKhaltiPayment({
        orderId: order.id,
        orderNo: order.orderNo,
        amount: order.total,
        customerName: order.user?.name,
        customerEmail: order.user?.email,
        customerPhone: order.user?.phone || undefined,
        secretKey,
      });

      await db.payment.update({
        where: { id: payment.id },
        data: { pidx: khaltiData.pidx },
      });

      return NextResponse.json({
        success: true,
        method: "KHALTI",
        paymentId: payment.id,
        paymentUrl: khaltiData.paymentUrl,
      });
    }

    if (method === "BANK") {
      if (!paymentConfig?.bankEnabled) {
        return NextResponse.json(
          { error: "Bank transfer is not configured for this restaurant" },
          { status: 400 },
        );
      }

      const payment = await db.payment.upsert({
        where: { orderId },
        update: { method: "BANK", status: "PENDING" },
        create: {
          orderId,
          method: "BANK",
          status: "PENDING",
          amount: order.total,
        },
      });

      return NextResponse.json({
        success: true,
        method: "BANK",
        paymentId: payment.id,
        bankDetails: {
          bankName: decryptIfPresent(paymentConfig.bankName) || "",
          accountName: decryptIfPresent(paymentConfig.bankAccountName) || "",
          accountNumber:
            decryptIfPresent(paymentConfig.bankAccountNumber) || "",
          branch: decryptIfPresent(paymentConfig.bankBranch) || "",
          note: `Please include Order #${order.orderNo} in transfer remarks`,
        },
      });
    }

    return NextResponse.json(
      { error: "Invalid payment method" },
      { status: 400 },
    );
  },
  { schema: initiatePaymentSchema },
);
