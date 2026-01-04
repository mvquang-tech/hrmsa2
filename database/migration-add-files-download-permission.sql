-- Migration: Add files.download permission and assign to admin/hr

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

INSERT IGNORE INTO permissions (name, code, module, action, description) VALUES
('Tải file', 'files.download', 'files', 'download', 'Tải file trực tiếp');

INSERT IGNORE INTO role_permissions (roleId, permissionId)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code IN ('admin', 'hr') AND p.code = 'files.download';
