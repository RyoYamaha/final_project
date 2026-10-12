const { PrismaClient } = require('./generated/prisma');
const prisma = new PrismaClient();

async function main() {
  const genres = [
    'Hành động', 'Hài hước', 'Tình cảm', 'Phiêu lưu', 'Kinh dị', 
    'Kỳ ảo', 'Khoa học viễn tưởng', 'Xuyên không', 'Đời thường', 'Học đường',
    'Trinh thám', 'Lịch sử', 'Thể thao', 'Harem', 'Mecha'
  ];
  console.log('Seeding genres...');
  for (const g of genres) {
    try {
      await prisma.genre.upsert({
        where: { name: g },
        update: {},
        create: { name: g }
      });
      console.log(`+ Added genre: ${g}`);
    } catch (err) {
      console.log(`Error adding genre ${g}:`, err.message);
    }
  }
  console.log('Genres seeded successfully.');
}

main().finally(() => prisma.$disconnect());
