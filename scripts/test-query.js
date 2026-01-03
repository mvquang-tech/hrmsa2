const mysql = require('mysql2/promise');

async function testQuery() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '123456',
      database: process.env.DB_NAME || 'hrm_db',
    });

    // Test 1: Query without params
    console.log('Test 1: Query without params');
    const [result1] = await connection.execute('SELECT COUNT(*) as total FROM `departments`');
    console.log('Result:', result1);

    // Test 2: Query with params
    console.log('\nTest 2: Query with LIMIT and OFFSET');
    const [result2] = await connection.execute(
      'SELECT * FROM `departments` ORDER BY `id` ASC LIMIT ? OFFSET ?',
      [10, 0]
    );
    console.log('Result count:', result2.length);

    await connection.end();
    console.log('\nAll tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testQuery();

