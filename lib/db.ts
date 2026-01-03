import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

export function getDbPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '123456',
      database: process.env.DB_NAME || 'hrm_db',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }
  return pool;
}

export async function query(sql: string, params?: any[]): Promise<any> {
  const dbPool = getDbPool();
  try {
    // Use pool.query() instead of pool.execute() to avoid prepared statement issues
    // pool.query() handles parameter substitution properly
    const [results] = await dbPool.query(sql, params || []);
    return results;
  } catch (error: any) {
    console.error('Database query error:', error.message);
    console.error('SQL:', sql.substring(0, 200));
    console.error('Params:', params);
    throw error;
  }
}

