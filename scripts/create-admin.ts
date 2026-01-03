import { query } from '../lib/db';
import { hashPassword } from '../lib/utils/auth';

async function createAdmin() {
  try {
    const username = 'admin';
    const password = 'admin123';
    const email = 'admin@hrms.com';

    // Check if admin exists
    const [existing] = await query('SELECT id FROM users WHERE username = ?', [username]);
    if ((existing as any[]).length > 0) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    const hashedPassword = await hashPassword(password);
    await query(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, 'admin']
    );

    console.log('Admin user created successfully!');
    console.log('Username: admin');
    console.log('Password: admin123');
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
}

createAdmin();

