const { PrismaClient } = require('./generated/prisma');
const bcrypt = require('bcrypt');

async function test() {
  const prisma = new PrismaClient();
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 1
  });
  console.log(users);
  await prisma.$disconnect();
}
test();
