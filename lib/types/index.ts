// Shared types cho toàn bộ ứng dụng

export enum UserRole {
  ADMIN = 'admin',
  HR = 'hr',
  MANAGER = 'manager',
  EMPLOYEE = 'employee',
}

export interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  role: UserRole;
  employeeId?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Department {
  id: number;
  name: string;
  code: string;
  description?: string;
  managerId?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Employee {
  id: number;
  code: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  dateOfBirth?: Date;
  dateOfJoin: Date;
  departmentId: number;
  position?: string;
  salary?: number;
  status: 'active' | 'inactive' | 'terminated';
  createdAt: Date;
  updatedAt: Date;
}

export interface Overtime {
  id: number;
  employeeId: number;
  date: Date;
  hours: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: number;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Leave {
  id: number;
  employeeId: number;
  type: 'annual' | 'sick' | 'personal' | 'maternity' | 'unpaid';
  startDate: Date;
  endDate: Date;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: number;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

