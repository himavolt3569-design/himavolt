const { PrismaClient } = require('./src/generated/prisma');
const prisma = new PrismaClient();

async function main() {
  const o = await prisma.order.findUnique({
    where: { id: 'cmqz3un9x0002p8vdwz24vlvs' },
    include: { items: true }
  });
  if (!o) {
    console.log("Order not found");
    return;
  }
  const roundAt = o.items[0].createdAt.toISOString();
  console.log("Using roundAt:", roundAt);
  
  const res = await fetch("http://localhost:3000/api/restaurants/cmqtpypqh0000z8vd7869i4wr/orders/cmqz3un9x0002p8vdwz24vlvs/round", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "ACCEPT", roundAt })
  });
  
  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Body:", text);
}

main().catch(console.error).finally(() => prisma.$disconnect());
