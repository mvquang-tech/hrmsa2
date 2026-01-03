-- Migration: Đổi cột days từ INT sang DECIMAL để hỗ trợ nghỉ phép 0.5 ngày
-- Chạy script này để cập nhật database

USE hrm_db;

-- Đổi kiểu dữ liệu của cột days từ INT sang DECIMAL(4,2)
ALTER TABLE leaves MODIFY COLUMN days DECIMAL(4,2) NOT NULL;

-- Kiểm tra kết quả
SELECT COLUMN_NAME, DATA_TYPE, NUMERIC_PRECISION, NUMERIC_SCALE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'hrm_db' AND TABLE_NAME = 'leaves' AND COLUMN_NAME = 'days';


