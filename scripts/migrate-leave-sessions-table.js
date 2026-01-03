/**
 * Migration script: Tách cột sessions JSON thành bảng riêng leave_sessions
 * 
 * Script này sẽ:
 * 1. Tạo bảng leave_sessions
 * 2. Migrate dữ liệu từ JSON sessions sang bảng mới
 * 3. Xóa cột sessions khỏi bảng leaves (sau khi xác nhận)
 */

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
    // Kết nối database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '123456',
      database: process.env.DB_NAME || 'hrm_db',
      multipleStatements: true
    });

    console.log('Đã kết nối database');

    // 1. Tạo bảng leave_sessions
    console.log('Đang tạo bảng leave_sessions...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS leave_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        leaveId INT NOT NULL,
        date DATE NOT NULL,
        sessionType ENUM('morning', 'afternoon') NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (leaveId) REFERENCES leaves(id) ON DELETE CASCADE,
        INDEX idx_leave (leaveId),
        INDEX idx_date (date),
        UNIQUE KEY unique_leave_date_session (leaveId, date, sessionType)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ Đã tạo bảng leave_sessions');

    // 2. Lấy tất cả leaves có sessions
    console.log('Đang lấy dữ liệu từ bảng leaves...');
    const [leaves] = await connection.query(
      'SELECT id, sessions FROM leaves WHERE sessions IS NOT NULL'
    );

    console.log(`Tìm thấy ${leaves.length} đơn nghỉ phép có sessions`);

    // 3. Migrate dữ liệu từ JSON sang bảng leave_sessions
    let migratedCount = 0;
    let sessionCount = 0;

    for (const leave of leaves) {
      try {
        let sessions;
        
        // Parse JSON
        if (typeof leave.sessions === 'string') {
          sessions = JSON.parse(leave.sessions);
        } else {
          sessions = leave.sessions;
        }

        if (!sessions || typeof sessions !== 'object') {
          continue;
        }

        // Xử lý cả array format (old) và object format (new)
        let sessionsToInsert = [];

        if (Array.isArray(sessions)) {
          // Old format: ["morning", "afternoon", "morning"]
          // Cần startDate và endDate để map vào dates
          const [leaveInfo] = await connection.query(
            'SELECT startDate, endDate FROM leaves WHERE id = ?',
            [leave.id]
          );
          
          if (leaveInfo && leaveInfo.length > 0) {
            const startDate = new Date(leaveInfo[0].startDate);
            const endDate = new Date(leaveInfo[0].endDate);
            const dates = [];
            
            // Generate date range
            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
              dates.push(new Date(d).toISOString().split('T')[0]);
            }

            // Map sessions array to dates
            dates.forEach((date, index) => {
              const morningIndex = index * 2;
              const afternoonIndex = index * 2 + 1;
              
              if (sessions[morningIndex] === 'morning') {
                sessionsToInsert.push({ date, sessionType: 'morning' });
              }
              if (sessions[afternoonIndex] === 'afternoon') {
                sessionsToInsert.push({ date, sessionType: 'afternoon' });
              }
            });
          }
        } else {
          // New format: { "2026-01-01": ["morning", "afternoon"], ... }
          Object.keys(sessions).forEach(dateKey => {
            const sessionArray = sessions[dateKey];
            if (Array.isArray(sessionArray)) {
              sessionArray.forEach(sessionType => {
                if (sessionType === 'morning' || sessionType === 'afternoon') {
                  // Normalize date to YYYY-MM-DD
                  let normalizedDate = dateKey;
                  try {
                    const dateObj = new Date(dateKey);
                    if (!isNaN(dateObj.getTime())) {
                      normalizedDate = dateObj.toISOString().split('T')[0];
                    }
                  } catch (e) {
                    // Keep original if parsing fails
                  }
                  sessionsToInsert.push({ date: normalizedDate, sessionType });
                }
              });
            }
          });
        }

        // Insert vào bảng leave_sessions
        if (sessionsToInsert.length > 0) {
          for (const session of sessionsToInsert) {
            try {
              await connection.query(
                'INSERT INTO leave_sessions (leaveId, date, sessionType) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE sessionType = VALUES(sessionType)',
                [leave.id, session.date, session.sessionType]
              );
              sessionCount++;
            } catch (err) {
              console.error(`Lỗi khi insert session cho leave ${leave.id}, date ${session.date}:`, err.message);
            }
          }
          migratedCount++;
        }
      } catch (err) {
        console.error(`Lỗi khi migrate leave ${leave.id}:`, err.message);
      }
    }

    console.log(`✓ Đã migrate ${migratedCount} đơn nghỉ phép với tổng ${sessionCount} sessions`);

    // 4. Kiểm tra kết quả
    const [sessionStats] = await connection.query(
      'SELECT COUNT(*) as total FROM leave_sessions'
    );
    console.log(`✓ Tổng số sessions trong bảng leave_sessions: ${sessionStats[0].total}`);

    // 5. Hỏi xem có muốn xóa cột sessions không (tùy chọn)
    console.log('\n⚠️  LƯU Ý: Cột sessions vẫn còn trong bảng leaves.');
    console.log('   Sau khi xác nhận dữ liệu đã migrate đúng, bạn có thể chạy:');
    console.log('   ALTER TABLE leaves DROP COLUMN sessions;');
    console.log('\n✓ Migration hoàn tất!');

  } catch (error) {
    console.error('Lỗi migration:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('Đã đóng kết nối database');
    }
  }
}

// Chạy migration
migrate()
  .then(() => {
    console.log('Migration thành công!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration thất bại:', error);
    process.exit(1);
  });

