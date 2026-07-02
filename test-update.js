const { PrismaClient } = require('./src/generated/prisma');
const prisma = new PrismaClient();

async function main() {
  const orderId = 'cmqz3un9x0002p8vdwz24vlvs'; // Replace with a valid order ID
  const id = 'cmqtpypqh0000z8vd7869i4wr'; // Replace with valid restaurant ID
  
  console.log("Fetching order...");
  const order = await prisma.order.findFirst({
    where: { id: orderId, restaurantId: id },
    select: {
      id: true,
      orderNo: true,
      status: true,
      items: {
        select: {
          id: true,
          menuItemId: true,
          quantity: true,
          createdAt: true,
        },
      },
    },
  });

  if (!order) {
    console.log("Order not found");
    return;
  }
  console.log("Order found:", order.orderNo);
  
  const roundItemIds = order.items.map(it => it.id);
  console.log("Updating order items...");

  try {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
        items: {
          updateMany: {
            where: { id: { in: roundItemIds } },
            data: { kitchenStatus: "ACCEPTED" },
          },
        },
      },
    });
    console.log("Update successful!");
  } catch (err) {
    console.error("Update failed:", err.message);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
