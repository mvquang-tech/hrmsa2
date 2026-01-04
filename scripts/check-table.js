const mysql = require('mysql2/promise');

async function check() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_NAME || 'hrm_db',
  });

  try {
    const [rows] = await pool.query(
      "SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = ? AND table_name = 'meeting_reads'",
      [process.env.DB_NAME || 'hrm_db']
    );
    console.log('Found tables:', rows.length ? rows.map(r => r.TABLE_NAME) : []);
  } catch (err) {
    console.error('Error checking table:', err.message || err);
  } finally {
    await pool.end();
  }
}

check();
