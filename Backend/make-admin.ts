import { PrismaClient } from './generated/prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.user.updateMany({
    data: { role: 'Admin' },
  });
  console.log(`Updated ${result.count} users to Admin role.`);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
