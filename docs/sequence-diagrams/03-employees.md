# Sequence Diagram - Employee Module

## 3.1 Xem danh sách Nhân viên

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant Page as EmployeesPage
    participant Hook as useAuth
    participant EmpAPI as /api/employees
    participant DeptAPI as /api/departments
    participant MW as Auth Middleware
    participant DB as MySQL Database

    U->>Page: Navigate to /employees
    Page->>Hook: useAuth()
    Hook-->>Page: {isAuthenticated, token, hasPermission, user}
    
    alt Chưa đăng nhập
        Page->>Page: router.push('/login')
    end
    
    par Fetch Employees
        Page->>EmpAPI: GET /api/employees<br/>Headers: {Authorization: Bearer <token>}
        EmpAPI->>MW: requireAuth(request)
        MW-->>EmpAPI: authUser
        
        alt Employee role
            EmpAPI->>DB: SELECT e.*, d.name as departmentName,<br/>(SELECT COUNT(*) FROM users WHERE employeeId = e.id) > 0 AS hasAccount<br/>FROM employees e<br/>LEFT JOIN departments d ON e.departmentId = d.id<br/>WHERE e.id = ?
        else Admin/HR/Manager
            EmpAPI->>DB: SELECT e.*, d.name as departmentName,<br/>(SELECT COUNT(*) FROM users WHERE employeeId = e.id) > 0 AS hasAccount<br/>FROM employees e<br/>LEFT JOIN departments d ON e.departmentId = d.id<br/>ORDER BY e.code
        end
        
        DB-->>EmpAPI: Employee[] records
        EmpAPI-->>Page: {success: true, data: {data: employees[]}}
    and Fetch Departments
        Page->>DeptAPI: GET /api/departments<br/>Headers: {Authorization: Bearer <token>}
        DeptAPI->>MW: requireAuth(request)
        MW-->>DeptAPI: authUser
        DeptAPI->>DB: SELECT * FROM departments ORDER BY name
        DB-->>DeptAPI: Department[] records
        DeptAPI-->>Page: {success: true, data: {data: departments[]}}
    end
    
    Page->>Page: setEmployees(employees)
    Page->>Page: setDepartments(departments)
    Page-->>U: Render table với employees & department names
```

## 3.2 Thêm Nhân viên mới

```mermaid
sequenceDiagram
    autonumber
    participant U as User (Admin/HR)
    participant Page as EmployeesPage
    participant API as /api/employees
    participant MW as Auth Middleware
    participant VAL as Zod Validation
    participant DB as MySQL Database

    U->>Page: Click "Thêm nhân viên"
    Page->>Page: Check canCreate (hasPermission('employees.create'))
    Page->>Page: handleOpen() - Open dialog
    Page->>Page: Reset formData
    
    U->>Page: Fill form:<br/>- code, firstName, lastName<br/>- email, phone, dateOfBirth<br/>- dateOfJoin, departmentId<br/>- position, status
    U->>Page: Click "Lưu"
    
    Page->>Page: setLoading(true)
    
    Page->>API: POST /api/employees<br/>Headers: {Authorization: Bearer <token>}<br/>Body: formData
    
    API->>MW: requireAuth(request)
    MW-->>API: authUser
    
    API->>MW: requireRole(authUser, [ADMIN, HR])
    alt Không có quyền
        MW-->>API: throw Error
        API-->>Page: 403 - Không có quyền
    end
    
    API->>VAL: employeeSchema.parse(body)
    alt Validation failed
        VAL-->>API: ZodError
        API-->>Page: 400 - Validation error
        Page->>Page: setError(message)
        Page-->>U: Hiển thị lỗi
    end
    
    VAL-->>API: Validated data
    
    API->>DB: SELECT id FROM employees WHERE code = ?
    DB-->>API: existing code check
    
    alt Mã nhân viên đã tồn tại
        API-->>Page: 400 - Mã nhân viên đã tồn tại
    end
    
    API->>DB: SELECT id FROM employees WHERE email = ?
    DB-->>API: existing email check
    
    alt Email đã tồn tại
        API-->>Page: 400 - Email đã tồn tại
    end
    
    alt departmentId provided
        API->>DB: SELECT id FROM departments WHERE id = ?
        DB-->>API: department check
        alt Phòng ban không tồn tại
            API-->>Page: 400 - Phòng ban không tồn tại
        end
    end
    
    API->>DB: INSERT INTO employees<br/>(code, firstName, lastName, email, phone,<br/>dateOfBirth, dateOfJoin, departmentId, position, status)<br/>VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    DB-->>API: insertId
    
    API->>DB: SELECT e.*, d.name as departmentName<br/>FROM employees e<br/>LEFT JOIN departments d ON e.departmentId = d.id<br/>WHERE e.id = ?
    DB-->>API: New employee record
    
    API-->>Page: 200 - {success: true, data: newEmployee}
    
    Page->>Page: setLoading(false)
    Page->>Page: handleClose()
    Page->>Page: fetchEmployees()
    Page-->>U: Hiển thị danh sách cập nhật
```

## 3.3 Sửa thông tin Nhân viên

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant Page as EmployeesPage
    participant API as /api/employees/[id]
    participant MW as Auth Middleware
    participant VAL as Zod Validation
    participant DB as MySQL Database

    U->>Page: Click icon Edit
    Page->>Page: handleOpen(employee)
    Page->>Page: setEditing(employee)
    Page->>Page: setFormData({...employee data})
    Page->>Page: setOpen(true)
    
    U->>Page: Chỉnh sửa thông tin
    U->>Page: Click "Lưu"
    
    Page->>API: PUT /api/employees/{id}<br/>Headers: {Authorization: Bearer <token>}<br/>Body: formData
    
    API->>MW: requireAuth(request)
    MW-->>API: authUser
    
    alt Employee role
        Note over API: Employee chỉ được sửa<br/>một số thông tin của mình
        API->>API: Check user.employeeId === id
        alt Không phải của mình
            API-->>Page: 403 - Không có quyền
        end
        API->>API: Filter allowed fields only<br/>(phone, address, etc.)
    else Admin/HR
        API->>MW: requireRole(authUser, [ADMIN, HR])
    end
    
    API->>VAL: employeeSchema.partial().parse(body)
    VAL-->>API: Validated data
    
    API->>DB: SELECT * FROM employees WHERE id = ?
    DB-->>API: existing record
    
    alt Employee không tồn tại
        API-->>Page: 404 - Nhân viên không tồn tại
    end
    
    API->>DB: SELECT id FROM employees<br/>WHERE code = ? AND id != ?
    DB-->>API: duplicate code check
    
    API->>DB: SELECT id FROM employees<br/>WHERE email = ? AND id != ?
    DB-->>API: duplicate email check
    
    API->>DB: UPDATE employees<br/>SET firstName=?, lastName=?, email=?, ...<br/>WHERE id=?
    DB-->>API: affectedRows
    
    API->>DB: SELECT e.*, d.name as departmentName<br/>FROM employees e<br/>LEFT JOIN departments d ON e.departmentId = d.id<br/>WHERE e.id = ?
    DB-->>API: Updated employee
    
    API-->>Page: 200 - {success: true, data: updatedEmployee}
    
    Page->>Page: handleClose()
    Page->>Page: fetchEmployees()
    Page-->>U: Hiển thị thông tin cập nhật
```

## 3.4 Xóa Nhân viên

```mermaid
sequenceDiagram
    autonumber
    participant U as User (Admin/HR)
    participant Page as EmployeesPage
    participant Browser as Browser Confirm
    participant API as /api/employees/[id]
    participant MW as Auth Middleware
    participant DB as MySQL Database

    U->>Page: Click icon Delete
    Page->>Browser: confirm('Bạn có chắc chắn?')
    Browser-->>Page: true
    
    Page->>API: DELETE /api/employees/{id}<br/>Headers: {Authorization: Bearer <token>}
    
    API->>MW: requireAuth(request)
    MW-->>API: authUser
    
    API->>MW: requireRole(authUser, [ADMIN, HR])
    
    API->>DB: SELECT * FROM employees WHERE id = ?
    DB-->>API: existing record
    
    alt Employee không tồn tại
        API-->>Page: 404 - Nhân viên không tồn tại
    end
    
    Note over API,DB: Check các ràng buộc liên quan
    
    API->>DB: SELECT id FROM users WHERE employeeId = ?
    DB-->>API: linked user check
    
    alt Có tài khoản liên kết
        API->>DB: DELETE FROM user_roles<br/>WHERE userId IN (SELECT id FROM users WHERE employeeId = ?)
        DB-->>API: OK
        API->>DB: DELETE FROM users WHERE employeeId = ?
        DB-->>API: OK
    end
    
    API->>DB: SELECT id FROM leaves WHERE employeeId = ?
    DB-->>API: leaves check
    
    alt Có đơn nghỉ phép liên quan
        Note over API: Tùy business logic:<br/>- Soft delete employee<br/>- Hoặc xóa cascade leaves
        API->>DB: DELETE FROM leave_sessions<br/>WHERE leaveId IN (SELECT id FROM leaves WHERE employeeId = ?)
        API->>DB: DELETE FROM leaves WHERE employeeId = ?
    end
    
    API->>DB: DELETE FROM overtime WHERE employeeId = ?
    DB-->>API: OK
    
    API->>DB: DELETE FROM employees WHERE id = ?
    DB-->>API: affectedRows
    
    API-->>Page: 200 - {success: true, message: 'Xóa thành công'}
    
    Page->>Page: fetchEmployees()
    Page-->>U: Hiển thị danh sách cập nhật
```

## 3.5 Cấp tài khoản cho Nhân viên

```mermaid
sequenceDiagram
    autonumber
    participant U as User (Admin/HR)
    participant Page as EmployeesPage
    participant CheckAPI as /api/employees/[id]/account (GET)
    participant CreateAPI as /api/employees/[id]/account (POST)
    participant MW as Auth Middleware
    participant AUTH as Auth Utils
    participant DB as MySQL Database

    U->>Page: Click icon "Cấp tài khoản" trên employee row
    
    Note over Page: Chỉ hiện nếu employee.hasAccount = false
    
    Page->>Page: handleAccountOpen(employee)
    Page->>Page: setSelectedEmployee(employee)
    Page->>Page: setAccountForm({<br/>  username: employee.code.toLowerCase(),<br/>  password: ''<br/>})
    Page->>Page: setAccountOpen(true)
    
    Page->>CheckAPI: GET /api/employees/{id}/account<br/>Headers: {Authorization: Bearer <token>}
    
    CheckAPI->>MW: requireAuth(request)
    MW-->>CheckAPI: authUser
    CheckAPI->>MW: requireRole(authUser, [ADMIN, HR])
    
    CheckAPI->>DB: SELECT * FROM employees WHERE id = ?
    DB-->>CheckAPI: employee record
    
    alt Employee không tồn tại
        CheckAPI-->>Page: 404 - Nhân viên không tồn tại
    end
    
    CheckAPI->>DB: SELECT id, username, email FROM users<br/>WHERE employeeId = ?
    DB-->>CheckAPI: user record (nếu có)
    
    alt Đã có tài khoản
        CheckAPI-->>Page: {hasAccount: true, account: {username, email}}
        Page->>Page: setError('Nhân viên đã có tài khoản: ' + username)
        Page-->>U: Hiển thị thông báo
    else Chưa có tài khoản
        CheckAPI-->>Page: {hasAccount: false}
    end
    
    U->>Page: Nhập/chỉnh sửa username
    U->>Page: Nhập password (>= 6 ký tự)
    U->>Page: Click "Tạo tài khoản"
    
    Page->>Page: Validate client-side
    alt Validation failed
        Page-->>U: Hiển thị lỗi validation
    end
    
    Page->>Page: setLoading(true)
    
    Page->>CreateAPI: POST /api/employees/{id}/account<br/>Body: {username, password}
    
    CreateAPI->>MW: requireAuth(request)
    MW-->>CreateAPI: authUser
    CreateAPI->>MW: requireRole(authUser, [ADMIN, HR])
    
    CreateAPI->>VAL: createAccountSchema.parse(body)
    VAL-->>CreateAPI: Validated data
    
    CreateAPI->>DB: SELECT * FROM employees WHERE id = ?
    DB-->>CreateAPI: employee record
    
    alt Employee không tồn tại
        CreateAPI-->>Page: 404 - Nhân viên không tồn tại
    end
    
    CreateAPI->>DB: SELECT id FROM users WHERE employeeId = ?
    DB-->>CreateAPI: existing account check
    
    alt Đã có tài khoản
        CreateAPI-->>Page: 400 - Nhân viên đã có tài khoản
    end
    
    CreateAPI->>DB: SELECT id FROM users WHERE username = ?
    DB-->>CreateAPI: username check
    
    alt Username đã tồn tại
        CreateAPI-->>Page: 400 - Tên đăng nhập đã tồn tại
    end
    
    CreateAPI->>AUTH: hashPassword(password)
    AUTH-->>CreateAPI: hashedPassword
    
    CreateAPI->>DB: INSERT INTO users<br/>(username, email, password, role, employeeId)<br/>VALUES (?, ?, ?, 'employee', ?)
    DB-->>CreateAPI: insertId (userId)
    
    CreateAPI->>DB: INSERT INTO user_roles (userId, roleId)<br/>SELECT ?, id FROM roles WHERE code = 'employee'
    DB-->>CreateAPI: OK
    
    CreateAPI-->>Page: 200 - {success: true, data: {userId, username}}
    
    Page->>Page: setLoading(false)
    Page->>Page: handleAccountClose()
    Page->>Page: setSuccess('Tạo tài khoản thành công')
    Page->>Page: fetchEmployees()
    Page-->>U: Hiển thị thông báo & cập nhật UI (hasAccount = true)
```

## 3.6 Xem chi tiết Nhân viên

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant Page as EmployeesPage
    participant API as /api/employees/[id]
    participant MW as Auth Middleware
    participant DB as MySQL Database

    U->>Page: Click row hoặc icon View
    Page->>Page: handleView(employeeId)
    
    Page->>API: GET /api/employees/{id}<br/>Headers: {Authorization: Bearer <token>}
    
    API->>MW: requireAuth(request)
    MW-->>API: authUser
    
    alt Employee role
        API->>API: Check user.employeeId === id
        alt Không phải của mình và không phải Admin/HR
            API-->>Page: 403 - Không có quyền xem
        end
    end
    
    API->>DB: SELECT e.*, <br/>d.name as departmentName,<br/>d.code as departmentCode<br/>FROM employees e<br/>LEFT JOIN departments d ON e.departmentId = d.id<br/>WHERE e.id = ?
    DB-->>API: employee record
    
    alt Employee không tồn tại
        API-->>Page: 404 - Nhân viên không tồn tại
    end
    
    API->>DB: SELECT username, email FROM users WHERE employeeId = ?
    DB-->>API: user account info (nếu có)
    
    API-->>Page: 200 - {success: true, data: {employee, account}}
    
    Page->>Page: setSelectedEmployee(data)
    Page->>Page: setDetailOpen(true)
    Page-->>U: Hiển thị dialog chi tiết nhân viên
```

## 3.7 Tìm kiếm và Lọc Nhân viên

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant Page as EmployeesPage
    participant API as /api/employees
    participant MW as Auth Middleware
    participant DB as MySQL Database

    U->>Page: Nhập từ khóa tìm kiếm
    Page->>Page: setSearchTerm(value)
    Page->>Page: debounce 300ms
    
    U->>Page: Chọn phòng ban filter
    Page->>Page: setFilterDepartment(value)
    
    U->>Page: Chọn trạng thái filter
    Page->>Page: setFilterStatus(value)
    
    Page->>API: GET /api/employees?<br/>search={searchTerm}&<br/>departmentId={filterDepartment}&<br/>status={filterStatus}
    
    API->>MW: requireAuth(request)
    MW-->>API: authUser
    
    API->>DB: SELECT e.*, d.name as departmentName<br/>FROM employees e<br/>LEFT JOIN departments d ON e.departmentId = d.id<br/>WHERE 1=1<br/>AND (e.code LIKE ? OR e.firstName LIKE ? OR e.lastName LIKE ? OR e.email LIKE ?)<br/>AND e.departmentId = ?<br/>AND e.status = ?<br/>ORDER BY e.code
    DB-->>API: Filtered Employee[] records
    
    API-->>Page: {success: true, data: {data: employees[], total}}
    
    Page->>Page: setEmployees(employees)
    Page-->>U: Hiển thị kết quả lọc
```

## 3.8 Xuất danh sách Nhân viên (Export)

```mermaid
sequenceDiagram
    autonumber
    participant U as User (Admin/HR)
    participant Page as EmployeesPage
    participant API as /api/employees/export
    participant MW as Auth Middleware
    participant DB as MySQL Database

    U->>Page: Click "Xuất Excel"
    Page->>Page: Check hasPermission('employees.export')
    
    Page->>API: GET /api/employees/export<br/>Headers: {Authorization: Bearer <token>}
    
    API->>MW: requireAuth(request)
    MW-->>API: authUser
    API->>MW: requireRole(authUser, [ADMIN, HR])
    
    API->>DB: SELECT e.code, e.firstName, e.lastName,<br/>e.email, e.phone, e.dateOfBirth, e.dateOfJoin,<br/>d.name as departmentName, e.position, e.status<br/>FROM employees e<br/>LEFT JOIN departments d ON e.departmentId = d.id<br/>ORDER BY e.code
    DB-->>API: All employees data
    
    API->>API: Generate Excel/CSV file
    API->>API: Set Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
    API->>API: Set Content-Disposition: attachment; filename="employees.xlsx"
    
    API-->>Page: Binary file stream
    
    Page->>Page: Create download link
    Page->>Page: Trigger download
    Page-->>U: Download file employees.xlsx
```
