const mysql = require('mysql2/promise');

async function test() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_NAME || 'hrm_db',
    connectTimeout: 5000,
  });

  try {
    console.log('Attempting to get connection...');
    const conn = await pool.getConnection();
    console.log('Connection acquired');
    const [rows] = await conn.query('SELECT NOW() as now');
    console.log('Server time:', rows[0].now);
    conn.release();
  } catch (err) {
    console.error('DB connect error:', err && err.message ? err.message : err);
  } finally {
    await pool.end();
  }
}

test();
