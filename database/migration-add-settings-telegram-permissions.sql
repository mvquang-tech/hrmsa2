-- Migration: Add settings and telegram permissions

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- Add permissions for Settings module
INSERT IGNORE INTO permissions (name, code, module, action, description) VALUES
('Xem cấu hình hệ thống', 'settings.view', 'settings', 'view', 'Xem trang cài đặt hệ thống'),
('Cập nhật cấu hình hệ thống', 'settings.update', 'settings', 'update', 'Cập nhật cấu hình hệ thống');

-- Add explicit permissions for Telegram config management (separate module)
INSERT IGNORE INTO permissions (name, code, module, action, description) VALUES
('Xem cấu hình Telegram', 'telegram.view', 'telegram', 'view', 'Xem cấu hình Telegram'),
('Cập nhật cấu hình Telegram', 'telegram.update', 'telegram', 'update', 'Cập nhật cấu hình Telegram');

-- Assign new settings permissions to Admin and HR
INSERT IGNORE INTO role_permissions (roleId, permissionId)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code IN ('admin', 'hr') AND p.module = 'settings';

-- Assign new telegram permissions to Admin and HR
INSERT IGNORE INTO role_permissions (roleId, permissionId)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code IN ('admin', 'hr') AND p.module = 'telegram';
