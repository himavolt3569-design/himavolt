import { db } from './src/lib/db';

async function verify() {
  const restaurantId = 'cmqtpypqh0000z8vd7869i4wr';
  console.log("Starting verification for restaurant:", restaurantId);

  try {
    // 1. Menu normal
    const menu1 = await db.menuItem.findMany({
      where: { restaurantId },
      include: { sizes: true, addOns: true, category: true },
      take: 1
    });
    console.log("Menu (full) success, found:", menu1.length);

    // 2. Menu light
    const menu2 = await db.menuItem.findMany({
      where: { restaurantId },
      select: { id: true, name: true, price: true, categoryId: true, isAvailable: true, imageUrl: true, isDrink: true, drinkCategory: true, sortOrder: true, category: { select: { name: true } } },
      take: 1
    });
    console.log("Menu (light) success, found:", menu2.length);

    // 3. Orders live stream query
    const orderSelect = {
      id: true, orderNo: true, tableNo: true, roomNo: true, guestName: true, status: true, type: true, subtotal: true, tax: true, total: true, note: true,
      deliveryAddress: true, deliveryLat: true, deliveryLng: true, deliveryPhone: true, deliveryNote: true, deliveryFee: true, acceptedAt: true,
      createdAt: true, updatedAt: true, userId: true, restaurantId: true,
    };
    const orders = await db.order.findMany({
      where: { restaurantId },
      select: {
        ...orderSelect,
        items: true,
        user: { select: { name: true, email: true } },
        payment: { select: { method: true, status: true, transactionId: true } },
        delivery: { include: { driver: true } }
      },
      take: 1
    });
    console.log("Orders (kitchen stream) success, found:", orders.length);

    // 4. Print jobs claimable query
    const printJobs = await db.printJob.findMany({
      where: { restaurantId },
      take: 1
    });
    console.log("Print jobs query success, found:", printJobs.length);

    console.log("ALL QUERIES PASSED WITH NO P2022 ERRORS.");
  } catch (e) {
    console.error("QUERY FAILED:", e);
  } finally {
    process.exit(0);
  }
}

verify();
