# HRMS Application

Ứng dụng quản lý nhân sự với các chức năng:
- Nhân sự (Employees)
- Phòng Ban (Departments)
- Ngoài giờ (Overtime)
- Nghỉ phép (Leave)

## Công nghệ sử dụng
- Next.js 14
- Material-UI (MUI)
- MySQL
- JWT Authentication + RBAC

## Cài đặt

```bash
npm install
```

## Cấu hình

Tạo file `.env.local` với các biến môi trường:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=123456
DB_NAME=hrm_db
JWT_SECRET=your_jwt_secret_key
```

## Chạy ứng dụng

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000) trong trình duyệt.

