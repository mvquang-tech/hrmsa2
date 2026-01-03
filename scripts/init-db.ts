import { getDbPool } from '../lib/db';
import * as fs from 'fs';
import * as path from 'path';

async function initDatabase() {
  try {
    const pool = getDbPool();
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    // Split by semicolons and execute each statement
    const statements = schema
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await pool.execute(statement);
          console.log('Executed:', statement.substring(0, 50) + '...');
        } catch (err: any) {
          // Ignore errors for existing tables
          if (!err.message.includes('already exists')) {
            console.error('Error executing statement:', err.message);
          }
        }
      }
    }

    console.log('Database initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initDatabase();

