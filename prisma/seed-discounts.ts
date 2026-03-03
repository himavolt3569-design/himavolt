// Run with: npx tsx prisma/seed-discounts.ts
// Seeds discount & isFeatured fields on existing menu items

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/index.js";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const items = await prisma.menuItem.findMany({
    select: { id: true, rating: true, badge: true, price: true },
  });

  console.log(`Found ${items.length} menu items to process`);

  let featuredCount = 0;
  let discountCount = 0;

  for (const item of items) {
    const isFeatured = item.rating >= 4.5 || item.badge === "Bestseller";
    const shouldDiscount = Math.random() < 0.2;
    const discountPercent = shouldDiscount
      ? [10, 15, 20][Math.floor(Math.random() * 3)]
      : 0;
    const discountAmt = Math.round(item.price * (discountPercent / 100));
    const discountLabel = shouldDiscount
      ? discountAmt >= 50
        ? `FLAT Rs.${discountAmt} OFF`
        : `${discountPercent}% OFF`
      : null;

    await prisma.menuItem.update({
      where: { id: item.id },
      data: {
        isFeatured,
        discount: discountPercent,
        discountLabel,
      },
    });

    if (isFeatured) featuredCount++;
    if (shouldDiscount) discountCount++;
  }

  console.log(`✓ ${featuredCount} items marked as featured`);
  console.log(`✓ ${discountCount} items given discounts`);
  console.log("Done!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
