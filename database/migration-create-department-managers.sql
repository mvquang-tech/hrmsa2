-- Migration: create department_managers table (many-to-many between departments and employees)

CREATE TABLE IF NOT EXISTS department_managers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  departmentId INT NOT NULL,
  employeeId INT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_department_employee (departmentId, employeeId),
  FOREIGN KEY (departmentId) REFERENCES departments(id) ON DELETE CASCADE,
  FOREIGN KEY (employeeId) REFERENCES employees(id) ON DELETE CASCADE
);

-- Backfill from departments.managerId (legacy single-manager column)
INSERT INTO department_managers (departmentId, employeeId)
SELECT id, managerId FROM departments WHERE managerId IS NOT NULL;

-- Optional: keep managerId column for backward compatibility, but application will use department_managers table
