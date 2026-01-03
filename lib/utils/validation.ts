import { z } from 'zod';

// Validation schemas dùng chung
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

export const idSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const departmentSchema = z.object({
  name: z.string().min(1, 'Tên phòng ban không được để trống'),
  code: z.string().min(1, 'Mã phòng ban không được để trống'),
  description: z.string().optional(),
  managerId: z.coerce.number().int().positive().optional(),
});

export const employeeSchema = z.object({
  code: z.string().min(1, 'Mã nhân viên không được để trống'),
  firstName: z.string().min(1, 'Họ không được để trống'),
  lastName: z.string().min(1, 'Tên không được để trống'),
  email: z.string().email('Email không hợp lệ'),
  phone: z.string().optional(),
  address: z.string().optional(),
  dateOfBirth: z.string().optional(),
  dateOfJoin: z.string().min(1, 'Ngày vào làm không được để trống'),
  departmentId: z.coerce.number().int().positive('Phòng ban không hợp lệ'),
  position: z.string().optional(),
  salary: z.coerce.number().positive().optional(),
  status: z.enum(['active', 'inactive', 'terminated']).default('active'),
});

export const overtimeSchema = z.object({
  employeeId: z.coerce.number().int().positive('Nhân viên không hợp lệ'),
  date: z.string().min(1, 'Ngày không được để trống'),
  hours: z.coerce.number().positive('Số giờ phải lớn hơn 0'),
  reason: z.string().min(1, 'Lý do không được để trống'),
});

export const leaveSchema = z.object({
  employeeId: z.coerce.number().int().positive('Nhân viên không hợp lệ'),
  type: z.enum(['annual', 'sick', 'personal', 'maternity', 'unpaid']),
  startDate: z.string().min(1, 'Ngày bắt đầu không được để trống'),
  endDate: z.string().min(1, 'Ngày kết thúc không được để trống'),
  reason: z.string().min(1, 'Lý do không được để trống'),
});

export const loginSchema = z.object({
  username: z.string().min(1, 'Tên đăng nhập không được để trống'),
  password: z.string().min(1, 'Mật khẩu không được để trống'),
});

