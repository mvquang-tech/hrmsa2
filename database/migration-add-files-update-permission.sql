-- Migration: Add files.update permission and assign to admin/hr

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

INSERT IGNORE INTO permissions (name, code, module, action, description) VALUES
('Cập nhật file', 'files.update', 'files', 'update', 'Cập nhật metadata file');

INSERT IGNORE INTO role_permissions (roleId, permissionId)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code IN ('admin', 'hr') AND p.code = 'files.update';
