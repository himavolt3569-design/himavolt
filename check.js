const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.restaurant.findUnique({where: {slug: 'restrofoodie-mxsSummit'}})
  .then(r => console.dir(r, {depth: null}))
  .finally(() => prisma.$disconnect());
