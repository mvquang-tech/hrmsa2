-- Migration: Create files table and add permissions for files module

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- Create files table
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

-- Add permissions for files module
INSERT IGNORE INTO permissions (name, code, module, action, description) VALUES
('Xem file lưu trữ', 'files.view', 'files', 'view', 'Xem danh sách file lưu trữ'),
('Tải lên file', 'files.upload', 'files', 'upload', 'Tải lên file mới'),
('Xóa file', 'files.delete', 'files', 'delete', 'Xóa file lưu trữ');

-- Assign new file permissions to Admin and HR
INSERT IGNORE INTO role_permissions (roleId, permissionId)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code IN ('admin', 'hr') AND p.module = 'files';
