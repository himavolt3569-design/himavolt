import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getEsewaPaymentUrl } from "@/lib/payments/esewa";
import { initiateKhaltiPayment } from "@/lib/payments/khalti";
import { safeHandler, notFound } from "@/lib/api-helpers";
import { initiatePaymentSchema } from "@/lib/validations";

export const POST = safeHandler(
  async (_req, { body }) => {
    const { orderId, method } = body;

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { payment: true, user: true },
    });

    if (!order) return notFound("Order not found");

    if (order.payment?.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Payment already completed" },
        { status: 400 },
      );
    }

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
      });

      return NextResponse.json({
        success: true,
        method: "ESEWA",
        paymentId: payment.id,
        gateway: esewaData,
      });
    }

    if (method === "KHALTI") {
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
          bankName: process.env.BANK_NAME || "Nepal Bank Limited",
          accountName: process.env.BANK_ACCOUNT_NAME || "HimalHub Pvt. Ltd.",
          accountNumber: process.env.BANK_ACCOUNT_NUMBER,
          branch: process.env.BANK_BRANCH || "Kathmandu",
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
