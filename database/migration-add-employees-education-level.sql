-- Add education level column to employees
ALTER TABLE employees
  ADD COLUMN educationLevel VARCHAR(64) NULL COMMENT 'Trình độ đào tạo (Tiếng Việt)';
