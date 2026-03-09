import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { updatePaymentConfigSchema } from "@/lib/validations";
import { encryptIfPresent, decryptIfPresent } from "@/lib/encryption";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getOrCreateUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const restaurant = await db.restaurant.findFirst({
      where: { id, ownerId: user.id },
    });
    if (!restaurant) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const config = await db.paymentConfig.findUnique({
      where: { restaurantId: id },
    });

    if (!config) {
      return NextResponse.json({
        cashEnabled: true,
        esewaEnabled: false,
        khaltiEnabled: false,
        bankEnabled: false,
        esewaMerchantCode: "",
        esewaSecretKey: "",
        khaltiSecretKey: "",
        bankName: "",
        bankAccountName: "",
        bankAccountNumber: "",
        bankBranch: "",
      });
    }

    return NextResponse.json({
      cashEnabled: config.cashEnabled,
      esewaEnabled: config.esewaEnabled,
      khaltiEnabled: config.khaltiEnabled,
      bankEnabled: config.bankEnabled,
      esewaMerchantCode: config.esewaMerchantCode ? "••••••" : "",
      esewaSecretKey: config.esewaSecretKey ? "••••••" : "",
      khaltiSecretKey: config.khaltiSecretKey ? "••••••" : "",
      bankName: decryptIfPresent(config.bankName) || "",
      bankAccountName: decryptIfPresent(config.bankAccountName) || "",
      bankAccountNumber: decryptIfPresent(config.bankAccountNumber) || "",
      bankBranch: decryptIfPresent(config.bankBranch) || "",
    });
  } catch (err) {
    console.error("[payment-config GET]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getOrCreateUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const restaurant = await db.restaurant.findFirst({
      where: { id, ownerId: user.id },
    });
    if (!restaurant) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = updatePaymentConfigSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const data = parsed.data;

    // Build update payload — only include fields that were provided
    const updateData: Record<string, unknown> = {};

    if (data.cashEnabled !== undefined)
      updateData.cashEnabled = data.cashEnabled;
    if (data.esewaEnabled !== undefined)
      updateData.esewaEnabled = data.esewaEnabled;
    if (data.khaltiEnabled !== undefined)
      updateData.khaltiEnabled = data.khaltiEnabled;
    if (data.bankEnabled !== undefined)
      updateData.bankEnabled = data.bankEnabled;

    // Encrypt sensitive credentials (skip masked placeholder values)
    if (
      data.esewaMerchantCode !== undefined &&
      data.esewaMerchantCode !== "••••••"
    ) {
      updateData.esewaMerchantCode = encryptIfPresent(data.esewaMerchantCode);
    }
    if (data.esewaSecretKey !== undefined && data.esewaSecretKey !== "••••••") {
      updateData.esewaSecretKey = encryptIfPresent(data.esewaSecretKey);
    }
    if (
      data.khaltiSecretKey !== undefined &&
      data.khaltiSecretKey !== "••••••"
    ) {
      updateData.khaltiSecretKey = encryptIfPresent(data.khaltiSecretKey);
    }

    // Bank details — encrypt for storage
    if (data.bankName !== undefined)
      updateData.bankName = encryptIfPresent(data.bankName);
    if (data.bankAccountName !== undefined)
      updateData.bankAccountName = encryptIfPresent(data.bankAccountName);
    if (data.bankAccountNumber !== undefined)
      updateData.bankAccountNumber = encryptIfPresent(data.bankAccountNumber);
    if (data.bankBranch !== undefined)
      updateData.bankBranch = encryptIfPresent(data.bankBranch);

    const config = await db.paymentConfig.upsert({
      where: { restaurantId: id },
      update: updateData,
      create: {
        restaurantId: id,
        ...updateData,
      },
    });

    return NextResponse.json({
      cashEnabled: config.cashEnabled,
      esewaEnabled: config.esewaEnabled,
      khaltiEnabled: config.khaltiEnabled,
      bankEnabled: config.bankEnabled,
      esewaMerchantCode: config.esewaMerchantCode ? "••••••" : "",
      esewaSecretKey: config.esewaSecretKey ? "••••••" : "",
      khaltiSecretKey: config.khaltiSecretKey ? "••••••" : "",
      bankName: decryptIfPresent(config.bankName) || "",
      bankAccountName: decryptIfPresent(config.bankAccountName) || "",
      bankAccountNumber: decryptIfPresent(config.bankAccountNumber) || "",
      bankBranch: decryptIfPresent(config.bankBranch) || "",
    });
  } catch (err) {
    console.error("[payment-config PATCH]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
