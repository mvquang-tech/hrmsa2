const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runMigration(migrationPath) {
  try {
    const fullPath = path.join(__dirname, '..', migrationPath);
    if (!fs.existsSync(fullPath)) {
      console.error('Migration file not found:', fullPath);
      process.exit(1);
    }

    const sql = fs.readFileSync(fullPath, 'utf-8');

    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '123456',
      database: process.env.DB_NAME || 'hrm_db',
      waitForConnections: true,
      connectionLimit: 5,
    });

    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      try {
        await pool.execute(statement);
        console.log('Executed statement OK (truncated):', statement.substring(0, 100) + '...');
      } catch (err) {
        if (err && err.message && err.message.includes('already exists')) {
          console.warn('Warning (ignored):', err.message);
        } else {
          console.error('Error executing statement:', err && err.message ? err.message : err);
          throw err;
        }
      }
    }

    console.log('Migration applied successfully!');
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err && err.message ? err.message : err);
    process.exit(1);
  }
}

const migrationArg = process.argv[2] || 'database/migration-meetings-add-reads.sql';
runMigration(migrationArg);
