-- Migration: Thêm cột sessions để lưu thông tin buổi sáng/chiều
-- Chạy script này để cập nhật database

USE hrm_db;

-- Thêm cột sessions để lưu JSON array các buổi (morning, afternoon)
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS sessions JSON NULL;

-- Kiểm tra kết quả
SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'hrm_db' AND TABLE_NAME = 'leaves' AND COLUMN_NAME = 'sessions';


