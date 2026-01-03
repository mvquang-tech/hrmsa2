import { z } from 'zod';

// Auth validation
export const loginSchema = z.object({
  username: z.string().min(3, 'Tên đăng nhập ít nhất 3 ký tự'),
  password: z.string().min(6, 'Mật khẩu ít nhất 6 ký tự'),
});

export const registerSchema = z.object({
  username: z.string().min(3, 'Tên đăng nhập ít nhất 3 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu ít nhất 6 ký tự'),
  role: z.enum(['admin', 'hr', 'manager', 'employee']).optional(),
});

// Department validation
export const departmentSchema = z.object({
  name: z.string().min(2, 'Tên phòng ban ít nhất 2 ký tự'),
  code: z.string().min(2, 'Mã phòng ban ít nhất 2 ký tự'),
  description: z.string().optional(),
  managerId: z.number().optional(),
});

// Employee validation
export const employeeSchema = z.object({
  code: z.string().min(2, 'Mã nhân viên ít nhất 2 ký tự'),
  firstName: z.string().min(2, 'Họ ít nhất 2 ký tự'),
  lastName: z.string().min(2, 'Tên ít nhất 2 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  phone: z.string().optional(),
  address: z.string().optional(),
  dateOfBirth: z.string().optional(),
  dateOfJoin: z.string().min(1, 'Ngày vào làm là bắt buộc'),
  departmentId: z.number().min(1, 'Phòng ban là bắt buộc'),
  position: z.string().optional(),
  salary: z.number().optional(),
  status: z.enum(['active', 'inactive', 'terminated']).optional(),
});

// Overtime validation
export const overtimeSchema = z.object({
  employeeId: z.number().min(1, 'Nhân viên là bắt buộc'),
  date: z.string().min(1, 'Ngày làm ngoài giờ là bắt buộc'),
  hours: z.number().min(0.5, 'Số giờ ít nhất 0.5').max(12, 'Số giờ tối đa 12'),
  reason: z.string().min(5, 'Lý do ít nhất 5 ký tự'),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
});

// Leave validation
export const leaveSchema = z.object({
  employeeId: z.number().min(1, 'Nhân viên là bắt buộc'),
  type: z.enum(['annual', 'sick', 'personal', 'maternity', 'unpaid']),
  startDate: z.string().min(1, 'Ngày bắt đầu là bắt buộc'),
  endDate: z.string().min(1, 'Ngày kết thúc là bắt buộc'),
  days: z.number().min(1, 'Số ngày nghỉ ít nhất 1'),
  reason: z.string().min(5, 'Lý do ít nhất 5 ký tự'),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
});

// Pagination validation
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

// ID validation
export const idSchema = z.object({
  id: z.coerce.number().min(1, 'ID không hợp lệ'),
});

// Helper to coerce number/string to boolean
const coerceBoolean = z.preprocess((val) => {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val === 1;
  if (typeof val === 'string') return val === 'true' || val === '1';
  return true;
}, z.boolean());

// Role validation
export const roleSchema = z.object({
  name: z.string().min(2, 'Tên vai trò ít nhất 2 ký tự'),
  code: z.string().min(2, 'Mã vai trò ít nhất 2 ký tự').regex(/^[a-z_]+$/, 'Mã chỉ chứa chữ thường và dấu gạch dưới'),
  description: z.string().optional().nullable(),
  isActive: coerceBoolean.optional().default(true),
});

// Permission validation
export const permissionSchema = z.object({
  name: z.string().min(2, 'Tên quyền ít nhất 2 ký tự'),
  code: z.string().min(2, 'Mã quyền ít nhất 2 ký tự').regex(/^[a-z_.]+$/, 'Mã chỉ chứa chữ thường, dấu chấm và gạch dưới'),
  module: z.string().min(2, 'Module ít nhất 2 ký tự'),
  action: z.string().min(2, 'Action ít nhất 2 ký tự'),
  description: z.string().optional(),
});

// Role permissions assignment
export const rolePermissionsSchema = z.object({
  permissionIds: z.array(z.number()).min(0, 'Danh sách quyền không hợp lệ'),
});

// User with roles
export const userWithRolesSchema = z.object({
  username: z.string().min(3, 'Tên đăng nhập ít nhất 3 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu ít nhất 6 ký tự').optional(),
  roleIds: z.array(z.number()).min(1, 'Phải chọn ít nhất 1 vai trò'),
  employeeId: z.number().optional().nullable(),
});

export const updateUserRolesSchema = z.object({
  roleIds: z.array(z.number()).min(1, 'Phải chọn ít nhất 1 vai trò'),
});
