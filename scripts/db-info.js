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
        const value = match[2].trim().replace(/^\"|\"$/g, '');
        process.env[key] = value;
      }
    });
  }
}

loadEnv();

(async () => {
  try {
    console.log('DB config:', { host: process.env.DB_HOST || 'localhost', port: process.env.DB_PORT || '3306', user: process.env.DB_USER || 'root', database: process.env.DB_NAME || 'hrm_db' });
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '123456',
      database: process.env.DB_NAME || 'hrm_db',
    });

    const [tables] = await conn.query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('overtime', 'overtime_days', 'overtime_slots')");
    console.log('Tables:', tables.map(r => r.TABLE_NAME));

    const [cols] = await conn.query("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'overtime' AND COLUMN_NAME IN ('total_seconds', 'total_hours')");
    console.log('Overtime columns:', cols.map(r => r.COLUMN_NAME));

    const [sampleOt] = await conn.query('SELECT id, date, hours, total_seconds, total_hours FROM overtime LIMIT 5');
    console.log('Sample overtime rows:', sampleOt);

    const [sampleDays] = await conn.query('SELECT id, overtimeId, date, total_seconds FROM overtime_days LIMIT 5');
    console.log('Sample overtime_days rows:', sampleDays);

    const [sampleSlots] = await conn.query('SELECT id, dayId, start_time, end_time, seconds FROM overtime_slots LIMIT 5');
    console.log('Sample overtime_slots rows:', sampleSlots);

    await conn.end();
  } catch (err) {
    console.error('DB info error:', err.message || err);
    process.exit(1);
  }
})();