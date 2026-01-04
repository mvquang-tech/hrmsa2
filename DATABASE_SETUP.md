# Hướng dẫn tạo Database

## Tạo file .env.local

Tạo file `.env.local` trong thư mục gốc với nội dung sau:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=123456
DB_NAME=hrm_db
JWT_SECRET=your_jwt_secret_key_change_in_production_please_use_strong_secret
```

## Tạo Database

### Cách 1: Sử dụng script (Windows)

Chạy file batch:
```bash
scripts\create-database.bat
```

### Cách 2: Chạy thủ công

1. Tạo database:
```bash
"C:\wamp64\bin\mysql\mysql8.0.31\bin\mysql.exe" -u root -p123456 -e "CREATE DATABASE IF NOT EXISTS hrm_db;"
```

2. Import schema:
```bash
"C:\wamp64\bin\mysql\mysql8.0.31\bin\mysql.exe" -u root -p123456 hrm_db < database\schema.sql
```

> Note (PowerShell): If you run the above command in PowerShell you may see an error like:
>
> ```text
> The '<' operator is reserved for future use
> ```
>
> That's because PowerShell does not support the `<` redirection operator the same way `cmd.exe` does. Use one of the PowerShell-safe alternatives below:
>
> - Run the command via `cmd` (keeps the `<` operator):
> ```powershell
> cmd /c '"C:\wamp64\bin\mysql\mysql8.0.31\bin\mysql.exe" -u root -p123456 hrm_db < "D:\aicode\hrmsa2\database\schema.sql"'
> ```
>
> - Use MySQL's `-e "source ..."` form (recommended):
> ```powershell
> "C:\wamp64\bin\mysql\mysql8.0.31\bin\mysql.exe" -u root -p123456 hrm_db -e "source D:/aicode/hrmsa2/database/schema.sql"
> ```
>
> - Or pipe the file into mysql from PowerShell:
> ```powershell
> Get-Content "D:\aicode\hrmsa2\database\schema.sql" -Raw | & "C:\wamp64\bin\mysql\mysql8.0.31\bin\mysql.exe" -u root -p123456 hrm_db
> ```
> 
> Example (for migration file):
> ```powershell
> "C:\wamp64\bin\mysql\mysql8.0.31\bin\mysql.exe" -u root -p123456 hrm_db -e "source D:/aicode/hrmsa2/database/migration-add-settings-telegram-permissions.sql"
> ```

### Cách 3: Sử dụng MySQL Command Line

1. Mở MySQL command line:
```bash
"C:\wamp64\bin\mysql\mysql8.0.31\bin\mysql.exe" -u root -p123456
```

2. Chạy các lệnh:
```sql
CREATE DATABASE IF NOT EXISTS hrm_db;
USE hrm_db;
SOURCE database/schema.sql;
```

## Tạo Admin User

Sau khi database đã được tạo, chạy script tạo admin:

```bash
npm run create-admin
```

Thông tin đăng nhập mặc định:
- Username: `admin`
- Password: `admin123`

