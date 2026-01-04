-- Create education_levels lookup table and migrate existing data
START TRANSACTION;

CREATE TABLE IF NOT EXISTS education_levels (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert predefined levels
INSERT IGNORE INTO education_levels (code, name) VALUES
  ('trung_cap', 'Trung cấp'),
  ('cao_dang', 'Cao đẳng'),
  ('dai_hoc', 'Đại học'),
  ('thac_si', 'Thạc sĩ'),
  ('tien_si', 'Tiến sĩ'),
  ('tien_si_khoa_hoc', 'Tiến sĩ khoa học'),
  ('chuyen_khoa_i', 'Chuyên khoa cấp I'),
  ('chuyen_khoa_ii', 'Chuyên khoa cấp II'),
  ('bac_si_noi_tru', 'Bác sĩ nội trú'),
  ('khac', 'Khác');

-- Add new FK column to employees if it doesn't exist
SET @exist_col := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'employees' AND column_name = 'educationLevelId');
SET @sqlcol := IF(@exist_col = 0, 'ALTER TABLE employees ADD COLUMN educationLevelId INT NULL', 'SELECT "column_exists"');
PREPARE stmt_col FROM @sqlcol;
EXECUTE stmt_col;
DEALLOCATE PREPARE stmt_col;

-- Migrate existing text values to the new lookup table (if old column exists)
-- This assumes previous column was named 'educationLevel' with same display names
SET @exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'employees' AND column_name = 'educationLevel');

-- If the old column exists, map values
SET @sql := IF(@exists > 0,
  'UPDATE employees e JOIN education_levels el ON e.educationLevel = el.name SET e.educationLevelId = el.id',
  'SELECT "no_old_column"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop old column if exists
SET @sql2 := IF(@exists > 0, 'ALTER TABLE employees DROP COLUMN educationLevel', 'SELECT "no_old_column"');
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- Add foreign key constraint if not exists
SET @exist_fk := (SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_schema = DATABASE() AND constraint_name = 'fk_employee_education' AND table_name = 'employees');
SET @sqlfk := IF(@exist_fk = 0, 'ALTER TABLE employees ADD CONSTRAINT fk_employee_education FOREIGN KEY (educationLevelId) REFERENCES education_levels(id) ON DELETE SET NULL', 'SELECT "constraint_exists"');
PREPARE stmt_fk FROM @sqlfk;
EXECUTE stmt_fk;
DEALLOCATE PREPARE stmt_fk;

COMMIT;