-- Migration: Create table to log leave notification attempts

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

CREATE TABLE IF NOT EXISTS leave_notification_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  leaveId INT NOT NULL,
  status ENUM('pending','sent','failed') DEFAULT 'pending',
  error TEXT NULL,
  sentAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (leaveId) REFERENCES leaves(id) ON DELETE CASCADE,
  INDEX idx_leave (leaveId),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
