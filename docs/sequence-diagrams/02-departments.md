# Sequence Diagram - Department Module

## 2.1 Xem danh sách Phòng ban

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant Page as DepartmentsPage
    participant Hook as useAuth
    participant API as /api/departments
    participant MW as Auth Middleware
    participant DB as MySQL Database

    U->>Page: Navigate to /departments
    Page->>Hook: useAuth()
    Hook-->>Page: {isAuthenticated, token, hasPermission}
    
    alt Chưa đăng nhập
        Page->>Page: router.push('/login')
    end
    
    Page->>Page: Check hasPermission('departments.view')
    
    Page->>API: GET /api/departments<br/>Headers: {Authorization: Bearer <token>}
    
    API->>MW: requireAuth(request)
    MW->>MW: Verify JWT token
    MW-->>API: JWTPayload (user info)
    
    API->>DB: SELECT d.*, <br/>CONCAT(m.firstName, ' ', m.lastName) as managerName<br/>FROM departments d<br/>LEFT JOIN employees m ON d.managerId = m.id<br/>ORDER BY d.name
    DB-->>API: Department[] records
    
    API->>DB: SELECT COUNT(*) FROM departments
    DB-->>API: total count
    
    API-->>Page: 200 - {success: true, data: {data: departments[], total, page, limit}}
    
    Page->>Page: setDepartments(data.data)
    Page-->>U: Render table with departments
```

## 2.2 Thêm Phòng ban mới

```mermaid
sequenceDiagram
    autonumber
    participant U as User (Admin/HR)
    participant Page as DepartmentsPage
    participant API as /api/departments
    participant MW as Auth Middleware
    participant VAL as Zod Validation
    participant DB as MySQL Database

    U->>Page: Click "Thêm phòng ban"
    Page->>Page: Check canCreate (hasPermission('departments.create'))
    Page->>Page: Open Dialog, setOpen(true)
    
    U->>Page: Fill form {name, code, description, managerId}
    U->>Page: Click "Lưu"
    
    Page->>Page: setLoading(true)
    
    Page->>API: POST /api/departments<br/>Headers: {Authorization: Bearer <token>}<br/>Body: {name, code, description, managerId}
    
    API->>MW: requireAuth(request)
    MW-->>API: authUser (JWTPayload)
    
    API->>MW: requireRole(authUser, [ADMIN, HR])
    alt Không có quyền
        MW-->>API: throw Error
        API-->>Page: 403 - Không có quyền
        Page-->>U: Hiển thị lỗi
    end
    
    API->>VAL: departmentSchema.parse(body)
    alt Validation failed
        VAL-->>API: ZodError
        API-->>Page: 400 - {error: validation message}
        Page->>Page: setError(message)
        Page-->>U: Hiển thị lỗi validation
    end
    
    VAL-->>API: Validated data
    
    API->>DB: SELECT id FROM departments WHERE code = ?
    DB-->>API: existing code check
    
    alt Mã đã tồn tại
        API-->>Page: 400 - Mã phòng ban đã tồn tại
        Page->>Page: setError(message)
        Page-->>U: Hiển thị lỗi
    end
    
    alt managerId provided
        API->>DB: SELECT id FROM employees WHERE id = ?
        DB-->>API: manager check
        alt Manager không tồn tại
            API-->>Page: 400 - Người quản lý không tồn tại
        end
    end
    
    API->>DB: INSERT INTO departments (name, code, description, managerId)<br/>VALUES (?, ?, ?, ?)
    DB-->>API: insertId
    
    API->>DB: SELECT * FROM departments WHERE id = ?
    DB-->>API: New department record
    
    API-->>Page: 200 - {success: true, data: newDepartment}
    
    Page->>Page: setLoading(false)
    Page->>Page: handleClose() - Close dialog
    Page->>Page: fetchDepartments() - Refresh list
    Page-->>U: Hiển thị danh sách cập nhật
```

## 2.3 Sửa Phòng ban

```mermaid
sequenceDiagram
    autonumber
    participant U as User (Admin/HR)
    participant Page as DepartmentsPage
    participant API as /api/departments/[id]
    participant MW as Auth Middleware
    participant VAL as Zod Validation
    participant DB as MySQL Database

    U->>Page: Click icon Edit trên row
    Page->>Page: handleOpen(department)
    Page->>Page: setEditing(department)
    Page->>Page: setFormData({name, code, description, managerId})
    Page->>Page: setOpen(true)
    
    U->>Page: Chỉnh sửa form
    U->>Page: Click "Lưu"
    
    Page->>Page: setLoading(true)
    
    Page->>API: PUT /api/departments/{id}<br/>Headers: {Authorization: Bearer <token>}<br/>Body: {name, code, description, managerId}
    
    API->>MW: requireAuth(request)
    MW-->>API: authUser
    
    API->>MW: requireRole(authUser, [ADMIN, HR])
    MW-->>API: OK
    
    API->>VAL: idSchema.parse({id: params.id})
    API->>VAL: departmentSchema.parse(body)
    VAL-->>API: Validated data
    
    API->>DB: SELECT id FROM departments WHERE id = ?
    DB-->>API: existing record
    
    alt Department không tồn tại
        API-->>Page: 404 - Phòng ban không tồn tại
    end
    
    API->>DB: SELECT id FROM departments<br/>WHERE code = ? AND id != ?
    DB-->>API: duplicate check
    
    alt Mã đã được sử dụng
        API-->>Page: 400 - Mã phòng ban đã tồn tại
    end
    
    API->>DB: UPDATE departments<br/>SET name=?, code=?, description=?, managerId=?<br/>WHERE id=?
    DB-->>API: affectedRows
    
    API->>DB: SELECT * FROM departments WHERE id = ?
    DB-->>API: Updated department
    
    API-->>Page: 200 - {success: true, data: updatedDepartment}
    
    Page->>Page: setLoading(false)
    Page->>Page: handleClose()
    Page->>Page: fetchDepartments()
    Page-->>U: Hiển thị danh sách cập nhật
```

## 2.4 Xóa Phòng ban

```mermaid
sequenceDiagram
    autonumber
    participant U as User (Admin/HR)
    participant Page as DepartmentsPage
    participant Browser as Browser Confirm
    participant API as /api/departments/[id]
    participant MW as Auth Middleware
    participant DB as MySQL Database

    U->>Page: Click icon Delete
    Page->>Browser: confirm('Bạn có chắc chắn muốn xóa?')
    
    alt User cancel
        Browser-->>Page: false
        Page-->>U: Không làm gì
    end
    
    Browser-->>Page: true (confirmed)
    
    Page->>API: DELETE /api/departments/{id}<br/>Headers: {Authorization: Bearer <token>}
    
    API->>MW: requireAuth(request)
    MW-->>API: authUser
    
    API->>MW: requireRole(authUser, [ADMIN, HR])
    
    API->>VAL: idSchema.parse({id: params.id})
    VAL-->>API: {id: number}
    
    API->>DB: SELECT id FROM departments WHERE id = ?
    DB-->>API: existing check
    
    alt Department không tồn tại
        API-->>Page: 404 - Phòng ban không tồn tại
    end
    
    API->>DB: SELECT COUNT(*) FROM employees WHERE departmentId = ?
    DB-->>API: employeeCount
    
    alt Có nhân viên thuộc phòng ban
        API-->>Page: 400 - Không thể xóa phòng ban có nhân viên
        Page->>Page: alert(error)
        Page-->>U: Hiển thị lỗi
    end
    
    API->>DB: DELETE FROM departments WHERE id = ?
    DB-->>API: affectedRows
    
    API-->>Page: 200 - {success: true, message: 'Xóa thành công'}
    
    Page->>Page: fetchDepartments()
    Page-->>U: Hiển thị danh sách cập nhật
```

## 2.5 Xem chi tiết Phòng ban

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant Page as DepartmentsPage
    participant API as /api/departments/[id]
    participant MW as Auth Middleware
    participant DB as MySQL Database

    U->>Page: Click row hoặc icon View
    Page->>Page: handleView(departmentId)
    
    Page->>API: GET /api/departments/{id}<br/>Headers: {Authorization: Bearer <token>}
    
    API->>MW: requireAuth(request)
    MW-->>API: authUser
    
    API->>DB: SELECT d.*, <br/>CONCAT(m.firstName, ' ', m.lastName) as managerName,<br/>m.email as managerEmail<br/>FROM departments d<br/>LEFT JOIN employees m ON d.managerId = m.id<br/>WHERE d.id = ?
    DB-->>API: department record
    
    alt Department không tồn tại
        API-->>Page: 404 - Phòng ban không tồn tại
    end
    
    API->>DB: SELECT id, code, firstName, lastName, position<br/>FROM employees WHERE departmentId = ?
    DB-->>API: employees[] in department
    
    API-->>Page: 200 - {success: true, data: {department, employees}}
    
    Page->>Page: setSelectedDepartment(data)
    Page->>Page: setDetailOpen(true)
    Page-->>U: Hiển thị dialog chi tiết phòng ban
```

## 2.6 Gán Quản lý cho Phòng ban

```mermaid
sequenceDiagram
    autonumber
    participant U as Admin/HR
    participant Page as DepartmentsPage
    participant EmpAPI as /api/employees
    participant DeptAPI as /api/departments/[id]
    participant MW as Auth Middleware
    participant DB as MySQL Database

    U->>Page: Click "Gán quản lý" trên department row
    Page->>Page: handleAssignManager(department)
    Page->>Page: setSelectedDepartment(department)
    
    Page->>EmpAPI: GET /api/employees<br/>Headers: {Authorization: Bearer <token>}
    EmpAPI->>MW: requireAuth
    MW-->>EmpAPI: authUser
    EmpAPI->>DB: SELECT id, code, firstName, lastName<br/>FROM employees WHERE status = 'active'
    DB-->>EmpAPI: Employee[] list
    EmpAPI-->>Page: {data: employees[]}
    
    Page->>Page: setAvailableManagers(employees)
    Page->>Page: setManagerOpen(true)
    Page-->>U: Hiển thị dialog chọn quản lý
    
    U->>Page: Chọn employee làm manager
    U->>Page: Click "Lưu"
    
    Page->>DeptAPI: PUT /api/departments/{id}<br/>Body: {managerId: selectedEmployeeId}
    
    DeptAPI->>MW: requireAuth, requireRole
    MW-->>DeptAPI: OK
    
    DeptAPI->>DB: UPDATE departments SET managerId = ? WHERE id = ?
    DB-->>DeptAPI: OK
    
    DeptAPI-->>Page: 200 - {success: true}
    
    Page->>Page: handleManagerClose()
    Page->>Page: fetchDepartments()
    Page-->>U: Hiển thị phòng ban với manager mới
```
