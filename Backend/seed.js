const sql = require('mssql');
require('dotenv').config();

async function seed() {
  try {
    await sql.connect(process.env.DATABASE_URL);
    const genres = [
      'Hành động', 'Hài hước', 'Tình cảm', 'Phiêu lưu', 'Kinh dị', 
      'Kỳ ảo', 'Khoa học viễn tưởng', 'Xuyên không', 'Đời thường', 'Học đường',
      'Trinh thám', 'Lịch sử', 'Thể thao', 'Harem', 'Mecha'
    ];
    console.log("Seeding genres...");
    for (const g of genres) {
      await sql.query`
        IF NOT EXISTS (SELECT 1 FROM [Genre] WHERE name = ${g})
        BEGIN
          INSERT INTO [Genre] (id, name) VALUES (NEWID(), ${g});
        END
      `;
      console.log(`+ Added genre: ${g}`);
    }
    console.log("Done seeding genres.");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
seed();
