# Hướng dẫn cài đặt và chạy ứng dụng HRMS

## Yêu cầu hệ thống

- Node.js 18+ 
- MySQL 8.0+
- npm hoặc yarn

## Các bước cài đặt

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Cấu hình database

Tạo file `.env.local` trong thư mục gốc với nội dung:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=hrms_db
JWT_SECRET=your_jwt_secret_key_change_in_production
```

### 3. Tạo database và tables

Chạy file SQL schema:

```bash
mysql -u root -p < database/schema.sql
```

Hoặc sử dụng script (sau khi cài đặt ts-node):

```bash
npm run init-db
```

### 4. Tạo tài khoản admin

Sau khi database đã được tạo, chạy script tạo admin user:

```bash
npm run create-admin
```

Thông tin đăng nhập mặc định:
- Username: `admin`
- Password: `admin123`

**Lưu ý:** Đổi mật khẩu ngay sau lần đăng nhập đầu tiên!

### 5. Chạy ứng dụng

```bash
npm run dev
```

Ứng dụng sẽ chạy tại: http://localhost:3000

## Cấu trúc dự án

```
hrmsa2/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── auth/         # Authentication endpoints
│   │   ├── departments/  # Department endpoints
│   │   ├── employees/    # Employee endpoints
│   │   ├── overtime/     # Overtime endpoints
│   │   └── leaves/       # Leave endpoints
│   ├── departments/      # Department page
│   ├── employees/        # Employee page
│   ├── overtime/        # Overtime page
│   ├── leaves/          # Leave page
│   └── login/           # Login page
├── components/           # React components
├── lib/                 # Shared libraries
│   ├── db.ts           # Database connection
│   ├── types/          # TypeScript types
│   ├── utils/          # Utility functions
│   └── middleware/     # Auth middleware
├── hooks/              # React hooks
├── database/           # Database schemas
└── scripts/           # Utility scripts
```

## Tính năng

### 1. Authentication & Authorization
- JWT-based authentication
- Role-based access control (RBAC)
- Roles: Admin, HR, Manager, Employee

### 2. Quản lý Phòng ban
- CRUD operations cho phòng ban
- Quản lý trưởng phòng

### 3. Quản lý Nhân sự
- CRUD operations cho nhân viên
- Liên kết với phòng ban
- Quản lý thông tin cá nhân

### 4. Quản lý Ngoài giờ
- Tạo đơn ngoài giờ
- Duyệt/từ chối đơn (Manager/HR/Admin)
- Nhân viên chỉ xem/sửa đơn của mình

### 5. Quản lý Nghỉ phép
- Tạo đơn nghỉ phép
- Các loại: Phép năm, Ốm đau, Việc riêng, Thai sản, Không lương
- Duyệt/từ chối đơn (Manager/HR/Admin)
- Nhân viên chỉ xem/sửa đơn của mình

## API Endpoints

### Authentication
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/register` - Đăng ký (Admin/HR only)

### Departments
- `GET /api/departments` - Lấy danh sách
- `POST /api/departments` - Tạo mới
- `GET /api/departments/[id]` - Lấy chi tiết
- `PUT /api/departments/[id]` - Cập nhật
- `DELETE /api/departments/[id]` - Xóa

### Employees
- `GET /api/employees` - Lấy danh sách
- `POST /api/employees` - Tạo mới
- `GET /api/employees/[id]` - Lấy chi tiết
- `PUT /api/employees/[id]` - Cập nhật
- `DELETE /api/employees/[id]` - Xóa

### Overtime
- `GET /api/overtime` - Lấy danh sách
- `POST /api/overtime` - Tạo mới
- `GET /api/overtime/[id]` - Lấy chi tiết
- `PUT /api/overtime/[id]` - Cập nhật/Duyệt
- `DELETE /api/overtime/[id]` - Xóa

### Leaves
- `GET /api/leaves` - Lấy danh sách
- `POST /api/leaves` - Tạo mới
- `GET /api/leaves/[id]` - Lấy chi tiết
- `PUT /api/leaves/[id]` - Cập nhật/Duyệt
- `DELETE /api/leaves/[id]` - Xóa

## Lưu ý

- Tất cả API endpoints (trừ login) yêu cầu JWT token trong header: `Authorization: Bearer <token>`
- Employee role chỉ có thể xem/sửa dữ liệu của chính mình
- Manager/HR/Admin có thể xem và quản lý tất cả dữ liệu

