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
    
    // Kiểm tra xem cột đã tồn tại chưa
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'leaves' AND COLUMN_NAME = 'sessions'
    `, [process.env.DB_NAME || 'hrm_db']);
    
    if (columns.length > 0) {
      console.log('✅ Cột sessions đã tồn tại, bỏ qua migration.');
    } else {
      // Thêm cột sessions
      console.log('Đang thêm cột sessions...');
      await connection.query(`
        ALTER TABLE leaves ADD COLUMN sessions JSON NULL;
      `);
      
      console.log('✅ Migration thành công! Cột sessions đã được thêm.');
    }
    
    // Kiểm tra kết quả
    const [result] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'leaves' AND COLUMN_NAME = 'sessions'
    `, [process.env.DB_NAME || 'hrm_db']);
    
    if (result.length > 0) {
      console.log('\nKết quả kiểm tra:');
      console.log(result[0]);
    }
    
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


