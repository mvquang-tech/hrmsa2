const mysql = require('mysql2/promise');

async function check() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_NAME || 'hrm_db',
  });

  try {
    console.log('Attempting DB connection...');
    const conn = await pool.getConnection();
    console.log('DB connection OK');
    conn.release();

    const [meetings] = await pool.query(`
      SELECT m.id, m.title, m.date, m.time, m.reminderEnabled, m.reminderSent, m.reminderMinutes,
             tc.botToken IS NOT NULL as hasBot, tc.chatId, tc.enabled as telegramEnabled
      FROM meetings m
      LEFT JOIN employees e ON m.createdBy = e.id
      LEFT JOIN users u ON e.id = u.employeeId
      LEFT JOIN telegram_config tc ON tc.userId = u.id
      WHERE m.reminderEnabled = 1 AND m.reminderSent = 0
        AND CONCAT(m.date, ' ', m.time) > NOW()
        AND DATE_SUB(CONCAT(m.date, ' ', m.time), INTERVAL m.reminderMinutes MINUTE) <= NOW()
    `);

    console.log('Meetings to remind (matching criteria):', meetings.length);
    for (const m of meetings) {
      console.log(m);
    }

    const [logs] = await pool.query(`SELECT * FROM notification_logs ORDER BY createdAt DESC LIMIT 20`);
    console.log('Recent notification logs:', logs.length);
    for (const l of logs) console.log(l);
  } catch (err) {
    console.error('Error checking reminders:', err.message || err);
  } finally {
    await pool.end();
  }
}

check();
