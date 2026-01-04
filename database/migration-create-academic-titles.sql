-- Create academic_titles lookup table and add relation to employees
START TRANSACTION;

CREATE TABLE IF NOT EXISTS academic_titles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert predefined titles
INSERT IGNORE INTO academic_titles (code, name) VALUES
  ('giao_su', 'Giáo sư'),
  ('pho_giao_su', 'Phó giáo sư'),
  ('vien_si', 'Viện sĩ'),
  ('tien_si', 'Tiến sĩ');

-- Add new FK column to employees if it doesn't exist
SET @exist_col := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'employees' AND column_name = 'academicTitleId');
SET @sqlcol := IF(@exist_col = 0, 'ALTER TABLE employees ADD COLUMN academicTitleId INT NULL', 'SELECT "column_exists"');
PREPARE stmt_col FROM @sqlcol;
EXECUTE stmt_col;
DEALLOCATE PREPARE stmt_col;

-- Add foreign key constraint if not exists
SET @exist_fk := (SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_schema = DATABASE() AND constraint_name = 'fk_employee_academic' AND table_name = 'employees');
SET @sqlfk := IF(@exist_fk = 0, 'ALTER TABLE employees ADD CONSTRAINT fk_employee_academic FOREIGN KEY (academicTitleId) REFERENCES academic_titles(id) ON DELETE SET NULL', 'SELECT "constraint_exists"');
PREPARE stmt_fk FROM @sqlfk;
EXECUTE stmt_fk;
DEALLOCATE PREPARE stmt_fk;

COMMIT;
