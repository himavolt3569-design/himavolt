import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decryptIfPresent } from "@/lib/encryption";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const restaurant = await db.restaurant.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const config = await db.paymentConfig.findUnique({
    where: { restaurantId: restaurant.id },
  });

  if (!config) {
    // Default: only cash enabled if no config exists
    return NextResponse.json({
      enabledMethods: ["CASH"],
      bankDetails: null,
    });
  }

  const enabledMethods: string[] = [];
  if (config.cashEnabled) enabledMethods.push("CASH");
  if (config.esewaEnabled && config.esewaMerchantCode && config.esewaSecretKey)
    enabledMethods.push("ESEWA");
  if (config.khaltiEnabled && config.khaltiSecretKey)
    enabledMethods.push("KHALTI");
  if (config.bankEnabled && config.bankAccountNumber)
    enabledMethods.push("BANK");

  // Include bank details for display if bank is enabled
  const bankDetails =
    config.bankEnabled && config.bankAccountNumber
      ? {
          bankName: decryptIfPresent(config.bankName) || "",
          accountName: decryptIfPresent(config.bankAccountName) || "",
          accountNumber: decryptIfPresent(config.bankAccountNumber) || "",
          branch: decryptIfPresent(config.bankBranch) || "",
        }
      : null;

  return NextResponse.json({ enabledMethods, bankDetails });
}
