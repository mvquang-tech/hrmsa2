-- Create relational structure for overtime days and slots
-- 1) Create overtime_days and overtime_slots if not exists
-- 2) Add total_seconds and total_hours to overtime
-- 3) Migrate existing data into the new tables
-- 4) Drop legacy columns `date` and `hours` (optional)

USE hrm_db;

-- Create overtime_days table if not exists
SET @exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'overtime_days'
);
SET @sql := IF(@exists = 0,
  'CREATE TABLE overtime_days (
    id INT AUTO_INCREMENT PRIMARY KEY,
    overtimeId INT NOT NULL,
    date DATE NOT NULL,
    total_seconds INT NOT NULL DEFAULT 0,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_overtimeId (overtimeId),
    FOREIGN KEY (overtimeId) REFERENCES overtime(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
  'SELECT "Table overtime_days already exists"'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Create overtime_slots table if not exists
SET @exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'overtime_slots'
);
SET @sql := IF(@exists = 0,
  'CREATE TABLE overtime_slots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dayId INT NOT NULL,
    start_time TIME NULL,
    end_time TIME NULL,
    seconds INT NOT NULL DEFAULT 0,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_dayId (dayId),
    FOREIGN KEY (dayId) REFERENCES overtime_days(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
  'SELECT "Table overtime_slots already exists"'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add aggregate columns to overtime if missing
SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'overtime' AND COLUMN_NAME = 'total_seconds'
);
SET @sql := IF(@exists = 0,
  'ALTER TABLE overtime ADD COLUMN total_seconds INT NOT NULL DEFAULT 0',
  'SELECT "Column total_seconds already exists on overtime"'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'overtime' AND COLUMN_NAME = 'total_hours'
);
SET @sql := IF(@exists = 0,
  'ALTER TABLE overtime ADD COLUMN total_hours DECIMAL(8,2) NOT NULL DEFAULT 0.00',
  'SELECT "Column total_hours already exists on overtime"'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Migrate existing overtime data with date & hours into new structure if any rows without matching day exist
-- For each overtime row, insert a day and a slot reflecting the existing date and hours

-- Use a prepared statement to iterate existing overtime rows
SET @migrate_sql := '
  INSERT INTO overtime_days (overtimeId, date, total_seconds, createdAt, updatedAt)
  SELECT o.id, o.date, ROUND(o.hours * 3600), NOW(), NOW() FROM overtime o
  LEFT JOIN overtime_days d ON d.overtimeId = o.id
  WHERE o.date IS NOT NULL AND o.hours IS NOT NULL AND d.id IS NULL
';
PREPARE stmt FROM @migrate_sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Insert a single slot per migrated day using start_time = 00:00:00 and end_time = SEC_TO_TIME(total_seconds)
SET @migrate_slots := '
  INSERT INTO overtime_slots (dayId, start_time, end_time, seconds, createdAt, updatedAt)
  SELECT d.id, '00:00:00', SEC_TO_TIME(d.total_seconds), d.total_seconds, NOW(), NOW()
  FROM overtime_days d
  LEFT JOIN overtime_slots s ON s.dayId = d.id
  WHERE s.id IS NULL
';
PREPARE stmt FROM @migrate_slots; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Update overtime aggregate columns from newly created days
SET @update_aggregate := '
  UPDATE overtime o
  JOIN (
    SELECT overtimeId, SUM(total_seconds) AS ssum
    FROM overtime_days
    GROUP BY overtimeId
  ) t ON t.overtimeId = o.id
  SET o.total_seconds = t.ssum, o.total_hours = ROUND(t.ssum / 3600, 2)
';
PREPARE stmt FROM @update_aggregate; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Optionally drop legacy columns if they exist and no longer needed
-- Note: keep columns for backwards compat initially; comment out DROP to be safe

-- SET @exist_date := (
--   SELECT COUNT(*) FROM information_schema.COLUMNS
--   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'overtime' AND COLUMN_NAME = 'date'
-- );
-- SET @sql := IF(@exist_date = 1, 'ALTER TABLE overtime DROP COLUMN date', 'SELECT "Column date does not exist"');
-- PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- SET @exist_hours := (
--   SELECT COUNT(*) FROM information_schema.COLUMNS
--   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'overtime' AND COLUMN_NAME = 'hours'
-- );
-- SET @sql := IF(@exist_hours = 1, 'ALTER TABLE overtime DROP COLUMN hours', 'SELECT "Column hours does not exist"');
-- PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT 'Migration completed' AS message;
