-- Migration: Tách cột sessions JSON thành bảng riêng leave_sessions
-- Chạy script này để cập nhật database

USE hrm_db;

-- 1. Tạo bảng leave_sessions
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Migrate dữ liệu từ cột sessions JSON sang bảng leave_sessions
-- Lấy tất cả leaves có sessions không null
INSERT INTO leave_sessions (leaveId, date, sessionType)
SELECT 
  l.id AS leaveId,
  STR_TO_DATE(date_key, '%Y-%m-%d') AS date,
  CASE 
    WHEN session_value = 'morning' THEN 'morning'
    WHEN session_value = 'afternoon' THEN 'afternoon'
  END AS sessionType
FROM leaves l
CROSS JOIN JSON_TABLE(
  l.sessions,
  '$' COLUMNS (
    NESTED PATH '$.*' COLUMNS (
      date_key VARCHAR(10) PATH '$.key',
      sessions_array JSON PATH '$'
    )
  )
) AS jt
CROSS JOIN JSON_TABLE(
  jt.sessions_array,
  '$[*]' COLUMNS (
    session_value VARCHAR(20) PATH '$'
  )
) AS sessions
WHERE l.sessions IS NOT NULL
  AND date_key IS NOT NULL
  AND session_value IN ('morning', 'afternoon')
  AND STR_TO_DATE(date_key, '%Y-%m-%d') IS NOT NULL
ON DUPLICATE KEY UPDATE sessionType = VALUES(sessionType);

-- Nếu JSON_TABLE không hoạt động (MySQL < 8.0), sử dụng cách khác:
-- Migrate bằng cách parse JSON trong application code (sẽ làm trong migration script Node.js)

-- 3. Xóa cột sessions khỏi bảng leaves (sau khi đã migrate xong)
-- ALTER TABLE leaves DROP COLUMN sessions;

-- Kiểm tra kết quả
SELECT 
  'leave_sessions table created' AS status,
  COUNT(*) AS total_sessions
FROM leave_sessions;

SELECT 
  'leaves with sessions' AS status,
  COUNT(*) AS total_leaves
FROM leaves
WHERE sessions IS NOT NULL;

