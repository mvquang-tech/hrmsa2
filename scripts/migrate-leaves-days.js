const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Load .env.local manually
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        process.env[key] = value;
      }
    });
  }
}

loadEnv();

async function migrate() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '123456',
      database: process.env.DB_NAME || 'hrm_db',
      multipleStatements: true,
    });

    console.log('Đang kết nối database...');
    
    // Đổi cột days từ INT sang DECIMAL(4,2)
    console.log('Đang cập nhật cột days từ INT sang DECIMAL(4,2)...');
    await connection.query(`
      ALTER TABLE leaves MODIFY COLUMN days DECIMAL(4,2) NOT NULL;
    `);
    
    console.log('✅ Migration thành công! Cột days đã được đổi sang DECIMAL(4,2)');
    
    // Kiểm tra kết quả
    const [result] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, NUMERIC_PRECISION, NUMERIC_SCALE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'leaves' AND COLUMN_NAME = 'days'
    `, [process.env.DB_NAME || 'hrm_db']);
    
    console.log('\nKết quả kiểm tra:');
    console.log(result[0]);
    
  } catch (error) {
    console.error('❌ Lỗi migration:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\nĐã đóng kết nối database.');
    }
  }
}

migrate();

