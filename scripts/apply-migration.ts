import { getDbPool } from '../lib/db';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration(migrationPath: string) {
  try {
    const fullPath = path.join(__dirname, '..', migrationPath);
    if (!fs.existsSync(fullPath)) {
      console.error('Migration file not found:', fullPath);
      process.exit(1);
    }

    const sql = fs.readFileSync(fullPath, 'utf-8');
    const pool = getDbPool();

    // Basic split on semicolons, ignore comments and empty
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      try {
        await pool.execute(statement);
        console.log('Executed statement OK (truncated):', statement.substring(0, 100) + '...');
      } catch (err: any) {
        if (err.message && err.message.includes('already exists')) {
          console.warn('Warning (ignored):', err.message);
        } else {
          console.error('Error executing statement:', err.message);
          throw err;
        }
      }
    }

    console.log('Migration applied successfully!');
    process.exit(0);
  } catch (err: any) {
    console.error('Migration failed:', err.message || err);
    process.exit(1);
  }
}

const migrationArg = process.argv[2] || 'database/migration-meetings-add-reads.sql';
runMigration(migrationArg);
