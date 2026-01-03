-- RBAC Schema cho HRMS Application
-- Role-Based Access Control

USE hrm_db;

-- Bảng Roles (Vai trò)
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

-- Bảng Permissions (Quyền)
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

-- Bảng Role_Permissions (Liên kết vai trò - quyền)
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

-- Bảng User_Roles (Liên kết người dùng - vai trò)
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

-- ==========================================
-- INSERT DỮ LIỆU MẪU
-- ==========================================

-- Tạo các vai trò mặc định
INSERT IGNORE INTO roles (name, code, description, isSystem) VALUES
('Quản trị viên', 'admin', 'Toàn quyền quản trị hệ thống', TRUE),
('Nhân sự', 'hr', 'Quản lý nhân sự, phòng ban', TRUE),
('Quản lý', 'manager', 'Quản lý phòng ban, duyệt đơn', TRUE),
('Nhân viên', 'employee', 'Quyền cơ bản của nhân viên', TRUE);

-- Tạo các quyền cho từng module
-- Module: Dashboard
INSERT IGNORE INTO permissions (name, code, module, action, description) VALUES
('Xem Dashboard', 'dashboard.view', 'dashboard', 'view', 'Xem trang Dashboard');

-- Module: Users
INSERT IGNORE INTO permissions (name, code, module, action, description) VALUES
('Xem danh sách người dùng', 'users.view', 'users', 'view', 'Xem danh sách người dùng'),
('Tạo người dùng', 'users.create', 'users', 'create', 'Tạo người dùng mới'),
('Sửa người dùng', 'users.update', 'users', 'update', 'Cập nhật thông tin người dùng'),
('Xóa người dùng', 'users.delete', 'users', 'delete', 'Xóa người dùng');

-- Module: Roles
INSERT IGNORE INTO permissions (name, code, module, action, description) VALUES
('Xem vai trò', 'roles.view', 'roles', 'view', 'Xem danh sách vai trò'),
('Tạo vai trò', 'roles.create', 'roles', 'create', 'Tạo vai trò mới'),
('Sửa vai trò', 'roles.update', 'roles', 'update', 'Cập nhật vai trò'),
('Xóa vai trò', 'roles.delete', 'roles', 'delete', 'Xóa vai trò'),
('Phân quyền', 'roles.assign', 'roles', 'assign', 'Phân quyền cho vai trò');

-- Module: Departments
INSERT IGNORE INTO permissions (name, code, module, action, description) VALUES
('Xem phòng ban', 'departments.view', 'departments', 'view', 'Xem danh sách phòng ban'),
('Tạo phòng ban', 'departments.create', 'departments', 'create', 'Tạo phòng ban mới'),
('Sửa phòng ban', 'departments.update', 'departments', 'update', 'Cập nhật phòng ban'),
('Xóa phòng ban', 'departments.delete', 'departments', 'delete', 'Xóa phòng ban');

-- Module: Employees
INSERT IGNORE INTO permissions (name, code, module, action, description) VALUES
('Xem nhân viên', 'employees.view', 'employees', 'view', 'Xem danh sách nhân viên'),
('Tạo nhân viên', 'employees.create', 'employees', 'create', 'Tạo nhân viên mới'),
('Sửa nhân viên', 'employees.update', 'employees', 'update', 'Cập nhật nhân viên'),
('Xóa nhân viên', 'employees.delete', 'employees', 'delete', 'Xóa nhân viên');

-- Module: Overtime
INSERT IGNORE INTO permissions (name, code, module, action, description) VALUES
('Xem ngoài giờ', 'overtime.view', 'overtime', 'view', 'Xem danh sách làm ngoài giờ'),
('Tạo đơn ngoài giờ', 'overtime.create', 'overtime', 'create', 'Tạo đơn làm ngoài giờ'),
('Sửa đơn ngoài giờ', 'overtime.update', 'overtime', 'update', 'Cập nhật đơn ngoài giờ'),
('Xóa đơn ngoài giờ', 'overtime.delete', 'overtime', 'delete', 'Xóa đơn ngoài giờ'),
('Duyệt đơn ngoài giờ', 'overtime.approve', 'overtime', 'approve', 'Duyệt/từ chối đơn ngoài giờ');

-- Module: Leaves
INSERT IGNORE INTO permissions (name, code, module, action, description) VALUES
('Xem nghỉ phép', 'leaves.view', 'leaves', 'view', 'Xem danh sách nghỉ phép'),
('Tạo đơn nghỉ phép', 'leaves.create', 'leaves', 'create', 'Tạo đơn nghỉ phép'),
('Sửa đơn nghỉ phép', 'leaves.update', 'leaves', 'update', 'Cập nhật đơn nghỉ phép'),
('Xóa đơn nghỉ phép', 'leaves.delete', 'leaves', 'delete', 'Xóa đơn nghỉ phép'),
('Duyệt đơn nghỉ phép', 'leaves.approve', 'leaves', 'approve', 'Duyệt/từ chối đơn nghỉ phép');

-- ==========================================
-- PHÂN QUYỀN CHO CÁC VAI TRÒ
-- ==========================================

-- Admin: Toàn quyền
INSERT IGNORE INTO role_permissions (roleId, permissionId)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.code = 'admin';

-- HR: Quản lý users, departments, employees
INSERT IGNORE INTO role_permissions (roleId, permissionId)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.code = 'hr' AND p.module IN ('dashboard', 'users', 'departments', 'employees', 'overtime', 'leaves');

-- Manager: Xem và duyệt
INSERT IGNORE INTO role_permissions (roleId, permissionId)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.code = 'manager' AND (
  p.code IN ('dashboard.view', 'departments.view', 'employees.view', 
             'overtime.view', 'overtime.approve', 'leaves.view', 'leaves.approve')
);

-- Employee: Quyền cơ bản
INSERT IGNORE INTO role_permissions (roleId, permissionId)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.code = 'employee' AND p.code IN (
  'dashboard.view', 'overtime.view', 'overtime.create', 'leaves.view', 'leaves.create'
);

-- Gán vai trò admin cho user admin (nếu có)
INSERT IGNORE INTO user_roles (userId, roleId)
SELECT u.id, r.id FROM users u, roles r 
WHERE u.username = 'admin' AND r.code = 'admin';


