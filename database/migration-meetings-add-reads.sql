-- Migration: Thêm bảng lưu trạng thái đọc của người dùng trên mỗi cuộc họp

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

CREATE TABLE IF NOT EXISTS meeting_reads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  meetingId INT NOT NULL,
  userId INT NOT NULL COMMENT 'employee id',
  readAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_meeting_user (meetingId, userId),
  FOREIGN KEY (meetingId) REFERENCES meetings(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES employees(id) ON DELETE CASCADE,
  INDEX idx_meeting (meetingId),
  INDEX idx_user (userId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
