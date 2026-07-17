import { PrismaClient } from "../src/generated/prisma";
const prisma = new PrismaClient();

async function check() {
  const restaurants = await prisma.restaurant.findMany({
    include: { owner: true }
  });
  console.log("Total Restaurants:", restaurants.length);
  restaurants.forEach(r => {
    console.log(`- ${r.name} (ID: ${r.id}) owned by ${r.owner?.email} (OwnerID: ${r.ownerId})`);
  });
  
  const users = await prisma.user.findMany();
  console.log("\nTotal Users:", users.length);
  users.forEach(u => {
    console.log(`- ${u.email} (ID: ${u.id}, Role: ${u.role}, isDeleted: ${u.isDeleted})`);
  });
}

check().catch(console.error).finally(() => prisma.$disconnect());
