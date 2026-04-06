import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.restaurant.findMany({ select: { slug: true, name: true } }).then(res => {
  console.log(JSON.stringify(res, null, 2));
}).catch(console.error).finally(()=>prisma.$disconnect());
