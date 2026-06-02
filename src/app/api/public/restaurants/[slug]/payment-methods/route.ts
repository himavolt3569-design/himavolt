import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decryptIfPresent } from "@/lib/encryption";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: encodedSlug } = await params;
  const slug = decodeURIComponent(encodedSlug);

  const restaurant = await db.restaurant.findUnique({
    where: { slug },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const r = restaurant as Record<string, unknown>;
  const counterPayEnabled = r.counterPayEnabled === true;
  const directPayEnabled = r.directPayEnabled === true;

  const config = await db.paymentConfig.findUnique({
    where: { restaurantId: restaurant.id },
  });

  if (!config) {
    // Default: cash + counter/direct based on restaurant settings
    const methods: string[] = ["CASH"];
    if (counterPayEnabled) methods.push("COUNTER");
    if (directPayEnabled) methods.push("DIRECT");
    return NextResponse.json({
      enabledMethods: methods,
      bankDetails: null,
    });
  }

  // Digital methods first so they become the default selection in checkout
  const enabledMethods: string[] = [];
  if (config.esewaEnabled && config.esewaMerchantCode && config.esewaSecretKey)
    enabledMethods.push("ESEWA");
  if (config.khaltiEnabled && config.khaltiSecretKey)
    enabledMethods.push("KHALTI");
  if (config.bankEnabled && config.bankAccountNumber)
    enabledMethods.push("BANK");
  if (config.cashEnabled) enabledMethods.push("CASH");
  if (counterPayEnabled) enabledMethods.push("COUNTER");
  if (directPayEnabled) enabledMethods.push("DIRECT");

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
