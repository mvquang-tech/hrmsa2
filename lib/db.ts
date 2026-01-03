import mysql from 'mysql2/promise';

// Use global variable to persist pool across Next.js hot reloads
declare global {
  var mysqlPool: mysql.Pool | undefined;
}

export function getDbPool(): mysql.Pool {
  if (!global.mysqlPool) {
    global.mysqlPool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '123456',
      database: process.env.DB_NAME || 'hrm_db',
      waitForConnections: true,
      connectionLimit: 5, // Reduced to prevent too many connections
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });
  }
  return global.mysqlPool;
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

