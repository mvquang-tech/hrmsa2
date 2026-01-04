const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^"|"$/g, '');
        process.env[key] = value;
      }
    });
  }
}

console.log('Starting check-overtime-migration.js');
loadEnv();

(async () => {
  try {
    console.log('Attempting to connect to DB with env:', {
      DB_HOST: process.env.DB_HOST || 'localhost',
      DB_PORT: process.env.DB_PORT || '3306',
      DB_USER: process.env.DB_USER || 'root',
      DB_NAME: process.env.DB_NAME || 'hrm_db',
    });

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '123456',
      database: process.env.DB_NAME || 'hrm_db',
    });

    console.log('Connected, querying information_schema...');

    const [tables] = await connection.query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('overtime', 'overtime_days', 'overtime_slots')");
    console.log('Tables found:', tables.map(r => r.TABLE_NAME));

    const [cols] = await connection.query("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'overtime' AND COLUMN_NAME IN ('total_seconds', 'total_hours')");
    console.log('Overtime columns found:', cols.map(r => r.COLUMN_NAME));

    const [counts] = await connection.query("SELECT TABLE_NAME, TABLE_ROWS FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('overtime', 'overtime_days', 'overtime_slots')");
    console.log('Row counts (approx):', counts.map(r => ({ table: r.TABLE_NAME, rows: r.TABLE_ROWS })));

    await connection.end();
    console.log('Check complete.');
  } catch (err) {
    console.error('Error checking DB:', err?.message || err);
    process.exit(1);
  }
})();