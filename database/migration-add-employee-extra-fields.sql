-- Add extra employee fields for training, ID, and status dates
START TRANSACTION;

-- placeOfTraining
SET @exist := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'employees' AND column_name = 'placeOfTraining');
SET @sql := IF(@exist = 0, 'ALTER TABLE employees ADD COLUMN placeOfTraining VARCHAR(255) NULL', 'SELECT "column_exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- gender
SET @exist := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'employees' AND column_name = 'gender');
SET @sql := IF(@exist = 0, "ALTER TABLE employees ADD COLUMN gender ENUM('male','female') NULL", 'SELECT "column_exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- cccd fields
SET @exist := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'employees' AND column_name = 'cccdNumber');
SET @sql := IF(@exist = 0, 'ALTER TABLE employees ADD COLUMN cccdNumber VARCHAR(64) NULL', 'SELECT "column_exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'employees' AND column_name = 'cccdIssuedDate');
SET @sql := IF(@exist = 0, 'ALTER TABLE employees ADD COLUMN cccdIssuedDate DATE NULL', 'SELECT "column_exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'employees' AND column_name = 'cccdIssuedPlace');
SET @sql := IF(@exist = 0, 'ALTER TABLE employees ADD COLUMN cccdIssuedPlace VARCHAR(255) NULL', 'SELECT "column_exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- internship
SET @exist := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'employees' AND column_name = 'internshipStart');
SET @sql := IF(@exist = 0, 'ALTER TABLE employees ADD COLUMN internshipStart DATE NULL', 'SELECT "column_exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'employees' AND column_name = 'internshipEnd');
SET @sql := IF(@exist = 0, 'ALTER TABLE employees ADD COLUMN internshipEnd DATE NULL', 'SELECT "column_exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- training (học việc)
SET @exist := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'employees' AND column_name = 'trainingStart');
SET @sql := IF(@exist = 0, 'ALTER TABLE employees ADD COLUMN trainingStart DATE NULL', 'SELECT "column_exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'employees' AND column_name = 'trainingEnd');
SET @sql := IF(@exist = 0, 'ALTER TABLE employees ADD COLUMN trainingEnd DATE NULL', 'SELECT "column_exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- probation
SET @exist := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'employees' AND column_name = 'probationStart');
SET @sql := IF(@exist = 0, 'ALTER TABLE employees ADD COLUMN probationStart DATE NULL', 'SELECT "column_exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'employees' AND column_name = 'probationEnd');
SET @sql := IF(@exist = 0, 'ALTER TABLE employees ADD COLUMN probationEnd DATE NULL', 'SELECT "column_exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- official
SET @exist := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'employees' AND column_name = 'officialStart');
SET @sql := IF(@exist = 0, 'ALTER TABLE employees ADD COLUMN officialStart DATE NULL', 'SELECT "column_exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'employees' AND column_name = 'officialEnd');
SET @sql := IF(@exist = 0, 'ALTER TABLE employees ADD COLUMN officialEnd DATE NULL', 'SELECT "column_exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

COMMIT;