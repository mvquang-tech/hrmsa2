-- Migration: Thêm trường `status` cho bảng meetings
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

ALTER TABLE meetings
  ADD COLUMN status ENUM('upcoming','ongoing','finished','unknown') DEFAULT 'upcoming' AFTER reminderSent;

-- Tạo index cho truy vấn nhanh
ALTER TABLE meetings
  ADD INDEX idx_status (status);
