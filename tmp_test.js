const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const r = await prisma.restaurant.findFirst();
  if (!r) {
    console.log("No restaurant found");
    return;
  }
  
  await prisma.restaurant.update({
    where: { id: r.id },
    data: { wifiName: 'Test Wifi', wifiPassword: 'password123' }
  });

  const fetched = await prisma.restaurant.findUnique({
    where: { slug: r.slug },
    select: {
      id: true,
      name: true,
      slug: true,
      wifiName: true,
      wifiPassword: true,
      categories: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, slug: true, parentId: true, icon: true },
      },
      paymentQRs: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, label: true, imageUrl: true },
      },
    }
  });

  console.log("Fetched successfully:", fetched ? "YES. Slug: " + fetched.slug + " Wifi: " + fetched.wifiName : "NO");
}

main().catch(console.error).finally(() => prisma.$disconnect());
