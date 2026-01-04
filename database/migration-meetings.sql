-- ==========================================
-- MEETINGS MODULE SCHEMA
-- Migration: Tạo bảng quản lý lịch họp
-- ==========================================

-- Thiết lập UTF-8 cho kết nối
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- Bảng lưu thông tin cuộc họp
CREATE TABLE IF NOT EXISTS meetings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL COMMENT 'Tiêu đề cuộc họp',
  date DATE NOT NULL COMMENT 'Ngày họp',
  time TIME NOT NULL COMMENT 'Giờ bắt đầu',
  duration INT DEFAULT 60 COMMENT 'Thời lượng (phút)',
  location VARCHAR(255) COMMENT 'Địa điểm',
  attendees TEXT COMMENT 'Danh sách người tham dự (comma separated)',
  notes TEXT COMMENT 'Ghi chú, agenda',
  reminderEnabled BOOLEAN DEFAULT FALSE COMMENT 'Bật nhắc nhở',
  reminderMinutes INT DEFAULT 15 COMMENT 'Nhắc trước bao nhiêu phút',
  reminderSent BOOLEAN DEFAULT FALSE COMMENT 'Đã gửi nhắc nhở chưa',
  createdBy INT NOT NULL COMMENT 'Người tạo (employee id)',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (createdBy) REFERENCES employees(id) ON DELETE CASCADE,
  INDEX idx_date (date),
  INDEX idx_createdBy (createdBy),
  INDEX idx_reminder (reminderEnabled, reminderSent, date, time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng cấu hình Telegram Bot
CREATE TABLE IF NOT EXISTS telegram_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL UNIQUE COMMENT 'User ID',
  botToken VARCHAR(255) COMMENT 'Telegram Bot Token',
  chatId VARCHAR(100) COMMENT 'Telegram Chat ID',
  enabled BOOLEAN DEFAULT FALSE COMMENT 'Kích hoạt thông báo',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_enabled (enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng log thông báo
CREATE TABLE IF NOT EXISTS notification_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  meetingId INT NOT NULL,
  status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
  error TEXT COMMENT 'Lỗi nếu có',
  sentAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (meetingId) REFERENCES meetings(id) ON DELETE CASCADE,
  INDEX idx_meeting (meetingId),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Thêm quyền cho module meetings
INSERT IGNORE INTO permissions (name, code, module, description) VALUES
('Xem lịch họp', 'meetings.view', 'meetings', 'Xem danh sách cuộc họp'),
('Tạo cuộc họp', 'meetings.create', 'meetings', 'Tạo cuộc họp mới'),
('Sửa cuộc họp', 'meetings.update', 'meetings', 'Cập nhật cuộc họp'),
('Xóa cuộc họp', 'meetings.delete', 'meetings', 'Xóa cuộc họp'),
('Cấu hình thông báo', 'meetings.config', 'meetings', 'Cấu hình Telegram bot');

-- Gán quyền meetings cho Admin
INSERT IGNORE INTO role_permissions (roleId, permissionId)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'admin' AND p.module = 'meetings';

-- Gán quyền meetings cho HR
INSERT IGNORE INTO role_permissions (roleId, permissionId)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'hr' AND p.module = 'meetings';

-- Gán quyền meetings cho Manager
INSERT IGNORE INTO role_permissions (roleId, permissionId)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'manager' AND p.module = 'meetings';

-- Gán quyền cơ bản cho Employee (xem, tạo, sửa, xóa của mình)
INSERT IGNORE INTO role_permissions (roleId, permissionId)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'employee' AND p.code IN ('meetings.view', 'meetings.create', 'meetings.update', 'meetings.delete');
