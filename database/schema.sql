-- Database schema cho HRMS Application

CREATE DATABASE IF NOT EXISTS hrm_db;
USE hrm_db;

-- Bảng Users (người dùng hệ thống)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'hr', 'manager', 'employee') NOT NULL DEFAULT 'employee',
  employeeId INT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (username),
  INDEX idx_email (email),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng Departments (Phòng ban)
CREATE TABLE IF NOT EXISTS departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  description TEXT NULL,
  managerId INT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_code (code),
  INDEX idx_manager (managerId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng Employees (Nhân viên)
CREATE TABLE IF NOT EXISTS employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  firstName VARCHAR(50) NOT NULL,
  lastName VARCHAR(50) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  phone VARCHAR(20) NULL,
  address TEXT NULL,
  dateOfBirth DATE NULL,
  dateOfJoin DATE NOT NULL,
  departmentId INT NOT NULL,
  position VARCHAR(100) NULL,
  salary DECIMAL(12, 2) NULL,
  status ENUM('active', 'inactive', 'terminated') NOT NULL DEFAULT 'active',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (departmentId) REFERENCES departments(id) ON DELETE RESTRICT,
  INDEX idx_code (code),
  INDEX idx_email (email),
  INDEX idx_department (departmentId),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng Overtime (Ngoài giờ)
CREATE TABLE IF NOT EXISTS overtime (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employeeId INT NOT NULL,
  date DATE NOT NULL,
  hours DECIMAL(4, 2) NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  approvedBy INT NULL,
  approvedAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employeeId) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (approvedBy) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_employee (employeeId),
  INDEX idx_date (date),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng Leaves (Nghỉ phép)
CREATE TABLE IF NOT EXISTS leaves (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employeeId INT NOT NULL,
  type ENUM('annual', 'sick', 'personal', 'maternity', 'unpaid') NOT NULL,
  startDate DATE NOT NULL,
  endDate DATE NOT NULL,
  days INT NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  approvedBy INT NULL,
  approvedAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employeeId) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (approvedBy) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_employee (employeeId),
  INDEX idx_type (type),
  INDEX idx_status (status),
  INDEX idx_dates (startDate, endDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Thêm foreign key cho users.employeeId (nếu chưa tồn tại)
SET @exist := (SELECT COUNT(*) FROM information_schema.table_constraints 
               WHERE constraint_schema = 'hrm_db' 
               AND constraint_name = 'fk_user_employee' 
               AND table_name = 'users');
SET @sqlstmt := IF(@exist = 0, 
  'ALTER TABLE users ADD CONSTRAINT fk_user_employee FOREIGN KEY (employeeId) REFERENCES employees(id) ON DELETE SET NULL',
  'SELECT "Constraint fk_user_employee already exists"');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Thêm foreign key cho departments.managerId (nếu chưa tồn tại)
SET @exist := (SELECT COUNT(*) FROM information_schema.table_constraints 
               WHERE constraint_schema = 'hrm_db' 
               AND constraint_name = 'fk_department_manager' 
               AND table_name = 'departments');
SET @sqlstmt := IF(@exist = 0, 
  'ALTER TABLE departments ADD CONSTRAINT fk_department_manager FOREIGN KEY (managerId) REFERENCES employees(id) ON DELETE SET NULL',
  'SELECT "Constraint fk_department_manager already exists"');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Insert dữ liệu mẫu
-- Tạo admin user mặc định (password: admin123)
-- Lưu ý: Bạn cần chạy script tạo password hash trước khi insert
-- Hoặc sử dụng API register để tạo user mới

