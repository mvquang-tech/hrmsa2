const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function createAdmin() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '123456',
      database: process.env.DB_NAME || 'hrm_db',
    });

    const username = 'admin';
    const password = 'admin123';
    const email = 'admin@hrms.com';

    // Check if admin exists
    const [existing] = await connection.execute(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (existing.length > 0) {
      console.log('Admin user already exists');
      await connection.end();
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await connection.execute(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, 'admin']
    );

    console.log('Admin user created successfully!');
    console.log('Username: admin');
    console.log('Password: admin123');
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
}

createAdmin();

