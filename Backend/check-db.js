const sql = require('mssql');
require('dotenv').config();

async function check() {
  try {
    await sql.connect(process.env.DATABASE_URL);
    const result = await sql.query`SELECT TOP 5 id, username, email, role FROM [User] ORDER BY createdAt DESC`;
    console.log("Users in DB:");
    console.table(result.recordset);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
check();
