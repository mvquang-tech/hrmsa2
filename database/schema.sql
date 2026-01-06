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

-- RBAC schema (roles, permissions, role_permissions, user_roles)
-- Role-Based Access Control definitions migrated from `rbac-schema.sql`

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  code VARCHAR(30) UNIQUE NOT NULL,
  description TEXT NULL,
  isSystem BOOLEAN DEFAULT FALSE COMMENT 'Vai trò hệ thống không thể xóa',
  isActive BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_code (code),
  INDEX idx_active (isActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL COMMENT 'Mã quyền: module.action (vd: users.create)',
  module VARCHAR(50) NOT NULL COMMENT 'Module: users, departments, employees, overtime, leaves, roles, permissions',
  action VARCHAR(30) NOT NULL COMMENT 'Action: view, create, update, delete, approve',
  description TEXT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_code (code),
  INDEX idx_module (module),
  INDEX idx_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Role_Permissions linking table
CREATE TABLE IF NOT EXISTS role_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  roleId INT NOT NULL,
  permissionId INT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (roleId) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permissionId) REFERENCES permissions(id) ON DELETE CASCADE,
  UNIQUE KEY unique_role_permission (roleId, permissionId),
  INDEX idx_role (roleId),
  INDEX idx_permission (permissionId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User_Roles linking table
CREATE TABLE IF NOT EXISTS user_roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  roleId INT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (roleId) REFERENCES roles(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_role (userId, roleId),
  INDEX idx_user (userId),
  INDEX idx_role (roleId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed roles and basic permissions (idempotent)
INSERT IGNORE INTO roles (name, code, description, isSystem) VALUES
('Quản trị viên', 'admin', 'Toàn quyền quản trị hệ thống', TRUE),
('Nhân sự', 'hr', 'Quản lý nhân sự, phòng ban', TRUE),
('Quản lý', 'manager', 'Quản lý phòng ban, duyệt đơn', TRUE),
('Nhân viên', 'employee', 'Quyền cơ bản của nhân viên', TRUE);

-- Dashboard permission
INSERT IGNORE INTO permissions (name, code, module, action, description) VALUES
('Xem Dashboard', 'dashboard.view', 'dashboard', 'view', 'Xem trang Dashboard');

-- Users module
INSERT IGNORE INTO permissions (name, code, module, action, description) VALUES
('Xem danh sách người dùng', 'users.view', 'users', 'view', 'Xem danh sách người dùng'),
('Tạo người dùng', 'users.create', 'users', 'create', 'Tạo người dùng mới'),
('Sửa người dùng', 'users.update', 'users', 'update', 'Cập nhật thông tin người dùng'),
('Xóa người dùng', 'users.delete', 'users', 'delete', 'Xóa người dùng');

-- Roles module
INSERT IGNORE INTO permissions (name, code, module, action, description) VALUES
('Xem vai trò', 'roles.view', 'roles', 'view', 'Xem danh sách vai trò'),
('Tạo vai trò', 'roles.create', 'roles', 'create', 'Tạo vai trò mới'),
('Sửa vai trò', 'roles.update', 'roles', 'update', 'Cập nhật vai trò'),
('Xóa vai trò', 'roles.delete', 'roles', 'delete', 'Xóa vai trò'),
('Phân quyền', 'roles.assign', 'roles', 'assign', 'Phân quyền cho vai trò');

-- Departments module
INSERT IGNORE INTO permissions (name, code, module, action, description) VALUES
('Xem phòng ban', 'departments.view', 'departments', 'view', 'Xem danh sách phòng ban'),
('Tạo phòng ban', 'departments.create', 'departments', 'create', 'Tạo phòng ban mới'),
('Sửa phòng ban', 'departments.update', 'departments', 'update', 'Cập nhật phòng ban'),
('Xóa phòng ban', 'departments.delete', 'departments', 'delete', 'Xóa phòng ban');

-- Employees module
INSERT IGNORE INTO permissions (name, code, module, action, description) VALUES
('Xem nhân viên', 'employees.view', 'employees', 'view', 'Xem danh sách nhân viên'),
('Tạo nhân viên', 'employees.create', 'employees', 'create', 'Tạo nhân viên mới'),
('Sửa nhân viên', 'employees.update', 'employees', 'update', 'Cập nhật nhân viên'),
('Xóa nhân viên', 'employees.delete', 'employees', 'delete', 'Xóa nhân viên');

-- Overtime module
INSERT IGNORE INTO permissions (name, code, module, action, description) VALUES
('Xem ngoài giờ', 'overtime.view', 'overtime', 'view', 'Xem danh sách làm ngoài giờ'),
('Tạo đơn ngoài giờ', 'overtime.create', 'overtime', 'create', 'Tạo đơn làm ngoài giờ'),
('Sửa đơn ngoài giờ', 'overtime.update', 'overtime', 'update', 'Cập nhật đơn ngoài giờ'),
('Xóa đơn ngoài giờ', 'overtime.delete', 'overtime', 'delete', 'Xóa đơn ngoài giờ'),
('Duyệt đơn ngoài giờ', 'overtime.approve', 'overtime', 'approve', 'Duyệt/từ chối đơn ngoài giờ');

-- Leaves module
INSERT IGNORE INTO permissions (name, code, module, action, description) VALUES
('Xem nghỉ phép', 'leaves.view', 'leaves', 'view', 'Xem danh sách nghỉ phép'),
('Tạo đơn nghỉ phép', 'leaves.create', 'leaves', 'create', 'Tạo đơn nghỉ phép'),
('Sửa đơn nghỉ phép', 'leaves.update', 'leaves', 'update', 'Cập nhật đơn nghỉ phép'),
('Xóa đơn nghỉ phép', 'leaves.delete', 'leaves', 'delete', 'Xóa đơn nghỉ phép'),
('Duyệt đơn nghỉ phép', 'leaves.approve', 'leaves', 'approve', 'Duyệt/từ chối đơn nghỉ phép');

-- Assign permissions (idempotent)
INSERT IGNORE INTO role_permissions (roleId, permissionId)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.code = 'admin';

INSERT IGNORE INTO role_permissions (roleId, permissionId)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.code = 'hr' AND p.module IN ('dashboard', 'users', 'departments', 'employees', 'overtime', 'leaves');

INSERT IGNORE INTO role_permissions (roleId, permissionId)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.code = 'manager' AND (
  p.code IN ('dashboard.view', 'departments.view', 'employees.view', 
             'overtime.view', 'overtime.approve', 'leaves.view', 'leaves.approve')
);

INSERT IGNORE INTO role_permissions (roleId, permissionId)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.code = 'employee' AND p.code IN (
  'dashboard.view', 'overtime.view', 'overtime.create', 'leaves.view', 'leaves.create'
);

-- Assign admin role to default admin user if exists
INSERT IGNORE INTO user_roles (userId, roleId)
SELECT u.id, r.id FROM users u, roles r 
WHERE u.username = 'admin' AND r.code = 'admin';

-- Insert dữ liệu mẫu
-- Tạo admin user mặc định (password: admin123)
-- Lưu ý: Bạn cần chạy script tạo password hash trước khi insert
-- Hoặc sử dụng API register để tạo user mới

-- ==========================================
-- Migrations consolidated into schema
-- Add new lookup tables and columns introduced by migrations
-- ==========================================

-- Education levels lookup and academic titles
CREATE TABLE IF NOT EXISTS education_levels (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS academic_titles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add education/academic FK columns to employees (if not already present)
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'educationLevelId');
SET @sql := IF(@exist = 0, 'ALTER TABLE employees ADD COLUMN educationLevelId INT NULL', 'SELECT "column_exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'academicTitleId');
SET @sql := IF(@exist = 0, 'ALTER TABLE employees ADD COLUMN academicTitleId INT NULL', 'SELECT "column_exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add extra employee fields introduced by migration-add-employee-extra-fields.sql
SET @cols := (
  SELECT CONCAT(
    IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'placeOfTraining') = 0, 'ALTER TABLE employees ADD COLUMN placeOfTraining VARCHAR(255) NULL; ', ''),
    IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'gender') = 0, "ALTER TABLE employees ADD COLUMN gender ENUM('male','female') NULL; ", ''),
    IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'cccdNumber') = 0, 'ALTER TABLE employees ADD COLUMN cccdNumber VARCHAR(64) NULL; ', ''),
    IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'cccdIssuedDate') = 0, 'ALTER TABLE employees ADD COLUMN cccdIssuedDate DATE NULL; ', ''),
    IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'cccdIssuedPlace') = 0, 'ALTER TABLE employees ADD COLUMN cccdIssuedPlace VARCHAR(255) NULL; ', ''),
    IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'internshipStart') = 0, 'ALTER TABLE employees ADD COLUMN internshipStart DATE NULL; ', ''),
    IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'internshipEnd') = 0, 'ALTER TABLE employees ADD COLUMN internshipEnd DATE NULL; ', ''),
    IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'trainingStart') = 0, 'ALTER TABLE employees ADD COLUMN trainingStart DATE NULL; ', ''),
    IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'trainingEnd') = 0, 'ALTER TABLE employees ADD COLUMN trainingEnd DATE NULL; ', ''),
    IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'probationStart') = 0, 'ALTER TABLE employees ADD COLUMN probationStart DATE NULL; ', ''),
    IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'probationEnd') = 0, 'ALTER TABLE employees ADD COLUMN probationEnd DATE NULL; ', ''),
    IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'officialStart') = 0, 'ALTER TABLE employees ADD COLUMN officialStart DATE NULL; ', ''),
    IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'officialEnd') = 0, 'ALTER TABLE employees ADD COLUMN officialEnd DATE NULL; ', '')
  )
);

SET @sql := @cols;
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add FK constraints for employees' new lookup columns
SET @exist_fk := (SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_schema = DATABASE() AND constraint_name = 'fk_employee_education' AND table_name = 'employees');
SET @sqlfk := IF(@exist_fk = 0, 'ALTER TABLE employees ADD CONSTRAINT fk_employee_education FOREIGN KEY (educationLevelId) REFERENCES education_levels(id) ON DELETE SET NULL', 'SELECT "constraint_exists"');
PREPARE stmt_fk FROM @sqlfk; EXECUTE stmt_fk; DEALLOCATE PREPARE stmt_fk;

SET @exist_fk := (SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_schema = DATABASE() AND constraint_name = 'fk_employee_academic' AND table_name = 'employees');
SET @sqlfk := IF(@exist_fk = 0, 'ALTER TABLE employees ADD CONSTRAINT fk_employee_academic FOREIGN KEY (academicTitleId) REFERENCES academic_titles(id) ON DELETE SET NULL', 'SELECT "constraint_exists"');
PREPARE stmt_fk FROM @sqlfk; EXECUTE stmt_fk; DEALLOCATE PREPARE stmt_fk;

-- ==========================================
-- Files module
-- ==========================================

CREATE TABLE IF NOT EXISTS files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  filename VARCHAR(255) NOT NULL COMMENT 'Stored filename on disk',
  originalName VARCHAR(255) NOT NULL COMMENT 'Original uploaded filename',
  mimeType VARCHAR(255) NULL,
  size BIGINT DEFAULT 0,
  description TEXT NULL,
  tags TEXT NULL COMMENT 'JSON array of tags',
  fileType VARCHAR(100) NULL COMMENT 'User defined file type/category',
  notes TEXT NULL,
  createdBy INT NULL,
  path VARCHAR(1024) NOT NULL COMMENT 'Relative path to file on disk',
  isActive BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_createdBy (createdBy),
  INDEX idx_fileType (fileType)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- Leaves: sessions extracted to separate table and days as DECIMAL
-- ==========================================

CREATE TABLE IF NOT EXISTS leave_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  leaveId INT NOT NULL,
  date DATE NOT NULL,
  sessionType ENUM('morning', 'afternoon') NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (leaveId) REFERENCES leaves(id) ON DELETE CASCADE,
  INDEX idx_leave (leaveId),
  INDEX idx_date (date),
  UNIQUE KEY unique_leave_date_session (leaveId, date, sessionType)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

-- Change days to DECIMAL(4,2) to support half-days
ALTER TABLE leaves MODIFY COLUMN days DECIMAL(4,2) NOT NULL;

-- ==========================================
-- Meetings & notification tables
-- ==========================================

CREATE TABLE IF NOT EXISTS meetings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL COMMENT 'Tiêu đề cuộc họp',
  date DATE NOT NULL COMMENT 'Ngày họp',
  time TIME NOT NULL COMMENT 'Giờ bắt đầu',
  duration INT DEFAULT 60 COMMENT 'Thời lượng (phút)',
  location VARCHAR(255) COMMENT 'Địa điểm',
  attendees TEXT COMMENT 'Danh sách người tham dự (comma separated)',
  notes TEXT COMMENT 'Ghi chú, agenda',
  reminderEnabled BOOLEAN DEFAULT FALSE COMMENT 'Bật nhắc nhở',
  reminderMinutes INT DEFAULT 15 COMMENT 'Nhắc trước bao nhiêu phút',
  reminderSent BOOLEAN DEFAULT FALSE COMMENT 'Đã gửi nhắc nhở chưa',
  createdBy INT NOT NULL COMMENT 'Người tạo (employee id)',
  status ENUM('upcoming','ongoing','finished','unknown') DEFAULT 'upcoming',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (createdBy) REFERENCES employees(id) ON DELETE CASCADE,
  INDEX idx_date (date),
  INDEX idx_createdBy (createdBy),
  INDEX idx_reminder (reminderEnabled, reminderSent, date, time),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS meeting_reads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  meetingId INT NOT NULL,
  userId INT NOT NULL COMMENT 'employee id',
  readAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_meeting_user (meetingId, userId),
  FOREIGN KEY (meetingId) REFERENCES meetings(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES employees(id) ON DELETE CASCADE,
  INDEX idx_meeting (meetingId),
  INDEX idx_user (userId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS telegram_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL UNIQUE COMMENT 'User ID',
  botToken VARCHAR(255) COMMENT 'Telegram Bot Token',
  chatId VARCHAR(100) COMMENT 'Telegram Chat ID',
  enabled BOOLEAN DEFAULT FALSE COMMENT 'Kích hoạt thông báo',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_enabled (enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notification_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  meetingId INT NOT NULL,
  status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
  error TEXT COMMENT 'Lỗi nếu có',
  sentAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (meetingId) REFERENCES meetings(id) ON DELETE CASCADE,
  INDEX idx_meeting (meetingId),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- Overtime: normalize days/slots and add aggregates
-- ==========================================

CREATE TABLE IF NOT EXISTS overtime_days (
  id INT AUTO_INCREMENT PRIMARY KEY,
  overtimeId INT NOT NULL,
  date DATE NOT NULL,
  total_seconds INT NOT NULL DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_overtimeId (overtimeId),
  FOREIGN KEY (overtimeId) REFERENCES overtime(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS overtime_slots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dayId INT NOT NULL,
  start_time TIME NULL,
  end_time TIME NULL,
  seconds INT NOT NULL DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_dayId (dayId),
  FOREIGN KEY (dayId) REFERENCES overtime_days(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add aggregate columns to overtime if missing
SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'overtime' AND COLUMN_NAME = 'total_seconds');
SET @sql := IF(@exists = 0, 'ALTER TABLE overtime ADD COLUMN total_seconds INT NOT NULL DEFAULT 0', 'SELECT "Column total_seconds already exists on overtime"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'overtime' AND COLUMN_NAME = 'total_hours');
SET @sql := IF(@exists = 0, 'ALTER TABLE overtime ADD COLUMN total_hours DECIMAL(8,2) NOT NULL DEFAULT 0.00', 'SELECT "Column total_hours already exists on overtime"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- End of consolidated migrations

