# Sequence Diagram - Overtime Module (Làm ngoài giờ)

## 5.1 Xem danh sách Đơn ngoài giờ

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant Page as OvertimePage
    participant Hook as useAuth
    participant OTAPI as /api/overtime
    participant EmpAPI as /api/employees
    participant MW as Auth Middleware
    participant DB as MySQL Database

    U->>Page: Navigate to /overtime
    Page->>Hook: useAuth()
    Hook-->>Page: {isAuthenticated, token, user, hasPermission}
    
    alt Chưa đăng nhập
        Page->>Page: router.push('/login')
    end
    
    par Fetch Overtimes
        Page->>OTAPI: GET /api/overtime<br/>Headers: {Authorization: Bearer <token>}
        OTAPI->>MW: requireAuth(request)
        MW-->>OTAPI: authUser
        
        alt Employee role
            OTAPI->>DB: SELECT o.*, <br/>CONCAT(e.firstName, ' ', e.lastName) as employeeName,<br/>e.code as employeeCode<br/>FROM overtime o<br/>JOIN employees e ON o.employeeId = e.id<br/>WHERE o.employeeId = ?<br/>ORDER BY o.date DESC
        else Admin/HR/Manager
            OTAPI->>DB: SELECT o.*, <br/>CONCAT(e.firstName, ' ', e.lastName) as employeeName,<br/>e.code as employeeCode<br/>FROM overtime o<br/>JOIN employees e ON o.employeeId = e.id<br/>ORDER BY o.date DESC
        end
        
        DB-->>OTAPI: Overtime[] records
        OTAPI-->>Page: {success: true, data: {data: overtimes[]}}
    and Fetch Employees (nếu không phải Employee)
        alt user.role !== EMPLOYEE
            Page->>EmpAPI: GET /api/employees
            EmpAPI-->>Page: {data: employees[]}
        end
    end
    
    Page->>Page: setOvertimes(overtimes)
    Page->>Page: setEmployees(employees)
    Page-->>U: Render table với overtime requests
```

## 5.2 Tạo Đơn ngoài giờ mới

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant Page as OvertimePage
    participant API as /api/overtime
    participant MW as Auth Middleware
    participant VAL as Zod Validation
    participant DB as MySQL Database

    U->>Page: Click "Tạo đơn ngoài giờ"
    Page->>Page: handleOpen()
    Page->>Page: setOpen(true)
    Page->>Page: Reset formData
    
    U->>Page: Fill form:<br/>- date (ngày làm ngoài giờ)<br/>- hours (số giờ: 0.5 - 12)<br/>- reason (lý do)
    
    alt Employee role
        Note over Page: employeeId tự động = user.employeeId
    else Admin/HR/Manager
        U->>Page: Chọn nhân viên từ dropdown
    end
    
    U->>Page: Click "Lưu"
    
    Page->>Page: setLoading(true)
    
    Page->>API: POST /api/overtime<br/>Body: {employeeId, date, hours, reason}
    
    API->>MW: requireAuth(request)
    MW-->>API: authUser
    
    API->>VAL: overtimeSchema.parse(body)
    alt Validation failed
        VAL-->>API: ZodError
        API-->>Page: 400 - Validation error
        Page-->>U: Hiển thị lỗi
    end
    
    VAL-->>API: Validated {employeeId, date, hours, reason}
    
    alt Employee role
        API->>API: Check employeeId === user.employeeId
        alt Không phải của mình
            API-->>Page: 403 - Chỉ có thể tạo đơn cho chính mình
        end
    end
    
    API->>DB: SELECT id FROM employees WHERE id = ?
    DB-->>API: employee check
    
    alt Employee không tồn tại
        API-->>Page: 400 - Nhân viên không tồn tại
    end
    
    opt Check trùng ngày
        API->>DB: SELECT id FROM overtime<br/>WHERE employeeId = ? AND date = ?
        DB-->>API: existing check
        alt Đã có đơn cho ngày này
            API-->>Page: 400 - Đã có đơn ngoài giờ cho ngày này
        end
    end
    
    API->>DB: INSERT INTO overtime<br/>(employeeId, date, hours, reason, status)<br/>VALUES (?, ?, ?, ?, 'pending')
    DB-->>API: insertId
    
    API->>DB: SELECT o.*, e.firstName, e.lastName<br/>FROM overtime o<br/>JOIN employees e ON o.employeeId = e.id<br/>WHERE o.id = ?
    DB-->>API: New overtime record
    
    API-->>Page: 200 - {success: true, data: newOvertime}
    
    Page->>Page: setLoading(false)
    Page->>Page: handleClose()
    Page->>Page: fetchOvertimes()
    Page-->>U: Hiển thị danh sách cập nhật
```

## 5.3 Sửa Đơn ngoài giờ

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant Page as OvertimePage
    participant API as /api/overtime/[id]
    participant MW as Auth Middleware
    participant VAL as Zod Validation
    participant DB as MySQL Database

    U->>Page: Click icon Edit trên overtime row
    
    Note over Page: Chỉ hiện Edit nếu status = 'pending'
    
    Page->>Page: handleEdit(overtime)
    Page->>Page: setEditing(overtime)
    Page->>Page: setFormData({date, hours, reason, employeeId})
    Page->>Page: setOpen(true)
    
    U->>Page: Chỉnh sửa thông tin
    U->>Page: Click "Lưu"
    
    Page->>Page: setLoading(true)
    
    Page->>API: PUT /api/overtime/{id}<br/>Body: {date, hours, reason}
    
    API->>MW: requireAuth(request)
    MW-->>API: authUser
    
    API->>VAL: overtimeSchema.partial().parse(body)
    VAL-->>API: Validated data
    
    API->>DB: SELECT * FROM overtime WHERE id = ?
    DB-->>API: overtime record
    
    alt Overtime không tồn tại
        API-->>Page: 404 - Không tìm thấy đơn
    end
    
    alt Employee role
        API->>API: Check overtime.employeeId === user.employeeId
        alt Không phải của mình
            API-->>Page: 403 - Không có quyền
        end
    end
    
    alt Status không phải pending
        API-->>Page: 400 - Không thể sửa đơn đã được xử lý
    end
    
    opt Check trùng ngày (nếu date thay đổi)
        API->>DB: SELECT id FROM overtime<br/>WHERE employeeId = ? AND date = ? AND id != ?
        DB-->>API: duplicate check
        alt Đã có đơn khác cho ngày này
            API-->>Page: 400 - Đã có đơn ngoài giờ cho ngày này
        end
    end
    
    API->>DB: UPDATE overtime<br/>SET date=?, hours=?, reason=?<br/>WHERE id=?
    DB-->>API: OK
    
    API->>DB: SELECT * FROM overtime WHERE id = ?
    DB-->>API: Updated overtime
    
    API-->>Page: 200 - {success: true, data: updatedOvertime}
    
    Page->>Page: setLoading(false)
    Page->>Page: handleClose()
    Page->>Page: fetchOvertimes()
    Page-->>U: Hiển thị cập nhật
```

## 5.4 Duyệt Đơn ngoài giờ

```mermaid
sequenceDiagram
    autonumber
    participant U as Manager/HR/Admin
    participant Page as OvertimePage
    participant API as /api/overtime/[id]
    participant MW as Auth Middleware
    participant DB as MySQL Database

    Note over Page: Hiển thị Chip "Duyệt" nếu<br/>canApprove && status === 'pending'
    
    U->>Page: Click Chip "Duyệt"
    Page->>Page: handleApprove(overtime.id)
    
    Page->>API: PUT /api/overtime/{id}<br/>Body: {status: 'approved'}
    
    API->>MW: requireAuth(request)
    MW-->>API: authUser
    
    API->>MW: requireRole(authUser, [ADMIN, HR, MANAGER])
    alt Không có quyền
        MW-->>API: throw Error
        API-->>Page: 403 - Không có quyền duyệt
    end
    
    API->>DB: SELECT * FROM overtime WHERE id = ?
    DB-->>API: overtime record
    
    alt Overtime không tồn tại
        API-->>Page: 404 - Không tìm thấy đơn
    end
    
    alt Status không phải pending
        API-->>Page: 400 - Đơn đã được xử lý trước đó
    end
    
    API->>DB: UPDATE overtime<br/>SET status='approved', approvedBy=?, approvedAt=NOW()<br/>WHERE id=?
    DB-->>API: OK
    
    API-->>Page: 200 - {success: true, message: 'Duyệt thành công'}
    
    Page->>Page: fetchOvertimes()
    Page-->>U: Hiển thị trạng thái mới (Đã duyệt - màu xanh)
```

## 5.5 Từ chối Đơn ngoài giờ

```mermaid
sequenceDiagram
    autonumber
    participant U as Manager/HR/Admin
    participant Page as OvertimePage
    participant API as /api/overtime/[id]
    participant MW as Auth Middleware
    participant DB as MySQL Database

    Note over Page: Hiển thị Chip "Từ chối" nếu<br/>canApprove && status === 'pending'
    
    U->>Page: Click Chip "Từ chối"
    Page->>Page: handleReject(overtime.id)
    
    opt Có dialog nhập lý do từ chối
        Page->>Page: setRejectDialogOpen(true)
        U->>Page: Nhập lý do từ chối (optional)
        U->>Page: Click "Xác nhận"
    end
    
    Page->>API: PUT /api/overtime/{id}<br/>Body: {status: 'rejected', rejectReason: '...'}
    
    API->>MW: requireAuth(request)
    MW-->>API: authUser
    
    API->>MW: requireRole(authUser, [ADMIN, HR, MANAGER])
    
    API->>DB: SELECT * FROM overtime WHERE id = ?
    DB-->>API: overtime record
    
    alt Status không phải pending
        API-->>Page: 400 - Đơn đã được xử lý trước đó
    end
    
    API->>DB: UPDATE overtime<br/>SET status='rejected', approvedBy=?, approvedAt=NOW(), rejectReason=?<br/>WHERE id=?
    DB-->>API: OK
    
    API-->>Page: 200 - {success: true, message: 'Từ chối thành công'}
    
    Page->>Page: fetchOvertimes()
    Page-->>U: Hiển thị trạng thái mới (Đã từ chối - màu đỏ)
```

## 5.6 Xóa Đơn ngoài giờ

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant Page as OvertimePage
    participant Browser as Browser Confirm
    participant API as /api/overtime/[id]
    participant MW as Auth Middleware
    participant DB as MySQL Database

    U->>Page: Click icon Delete
    
    Note over Page: Chỉ hiện Delete nếu:<br/>- Owner của đơn & status = 'pending'<br/>- Hoặc Admin/HR
    
    Page->>Browser: confirm('Bạn có chắc chắn muốn xóa?')
    Browser-->>Page: true
    
    Page->>API: DELETE /api/overtime/{id}<br/>Headers: {Authorization: Bearer <token>}
    
    API->>MW: requireAuth(request)
    MW-->>API: authUser
    
    API->>DB: SELECT * FROM overtime WHERE id = ?
    DB-->>API: overtime record
    
    alt Overtime không tồn tại
        API-->>Page: 404 - Không tìm thấy đơn
    end
    
    alt Employee role
        API->>API: Check overtime.employeeId === user.employeeId
        alt Không phải của mình
            API-->>Page: 403 - Không có quyền
        end
        alt Status không phải pending
            API-->>Page: 400 - Không thể xóa đơn đã được xử lý
        end
    end
    
    API->>DB: DELETE FROM overtime WHERE id = ?
    DB-->>API: affectedRows
    
    API-->>Page: 200 - {success: true, message: 'Xóa thành công'}
    
    Page->>Page: fetchOvertimes()
    Page-->>U: Hiển thị danh sách cập nhật
```

## 5.7 Lọc và Tìm kiếm Đơn ngoài giờ

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant Page as OvertimePage
    participant API as /api/overtime
    participant MW as Auth Middleware
    participant DB as MySQL Database

    U->>Page: Chọn filter trạng thái
    Page->>Page: setFilterStatus('pending'/'approved'/'rejected')
    
    U->>Page: Chọn filter khoảng thời gian
    Page->>Page: setFilterDateRange({from, to})
    
    alt Admin/HR/Manager
        U->>Page: Chọn filter nhân viên
        Page->>Page: setFilterEmployee(employeeId)
    end
    
    Page->>API: GET /api/overtime?<br/>status={filterStatus}&<br/>from={filterDateRange.from}&<br/>to={filterDateRange.to}&<br/>employeeId={filterEmployee}
    
    API->>MW: requireAuth(request)
    MW-->>API: authUser
    
    alt Employee role
        API->>DB: SELECT o.*, e.firstName, e.lastName<br/>FROM overtime o<br/>JOIN employees e ON o.employeeId = e.id<br/>WHERE o.employeeId = ?<br/>AND o.status = ?<br/>AND o.date >= ? AND o.date <= ?<br/>ORDER BY o.date DESC
    else Admin/HR/Manager
        API->>DB: SELECT o.*, e.firstName, e.lastName<br/>FROM overtime o<br/>JOIN employees e ON o.employeeId = e.id<br/>WHERE 1=1<br/>AND o.status = ?<br/>AND o.date >= ? AND o.date <= ?<br/>AND o.employeeId = ?<br/>ORDER BY o.date DESC
    end
    
    DB-->>API: Filtered Overtime[] records
    
    API-->>Page: {success: true, data: {data: overtimes[]}}
    
    Page->>Page: setOvertimes(overtimes)
    Page-->>U: Hiển thị kết quả lọc
```

## 5.8 Xem chi tiết Đơn ngoài giờ

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant Page as OvertimePage
    participant API as /api/overtime/[id]
    participant MW as Auth Middleware
    participant DB as MySQL Database

    U->>Page: Click row hoặc icon View
    Page->>Page: handleView(overtimeId)
    
    Page->>API: GET /api/overtime/{id}<br/>Headers: {Authorization: Bearer <token>}
    
    API->>MW: requireAuth(request)
    MW-->>API: authUser
    
    API->>DB: SELECT o.*, <br/>CONCAT(e.firstName, ' ', e.lastName) as employeeName,<br/>e.code as employeeCode,<br/>d.name as departmentName,<br/>CONCAT(a.firstName, ' ', a.lastName) as approverName<br/>FROM overtime o<br/>JOIN employees e ON o.employeeId = e.id<br/>LEFT JOIN departments d ON e.departmentId = d.id<br/>LEFT JOIN employees a ON o.approvedBy = a.id<br/>WHERE o.id = ?
    DB-->>API: overtime record with details
    
    alt Overtime không tồn tại
        API-->>Page: 404 - Không tìm thấy đơn
    end
    
    alt Employee role
        API->>API: Check overtime.employeeId === user.employeeId
        alt Không phải của mình
            API-->>Page: 403 - Không có quyền xem
        end
    end
    
    API-->>Page: 200 - {success: true, data: overtime}
    
    Page->>Page: setSelectedOvertime(data)
    Page->>Page: setDetailOpen(true)
    Page-->>U: Hiển thị dialog chi tiết:<br/>- Thông tin nhân viên<br/>- Ngày làm ngoài giờ<br/>- Số giờ<br/>- Lý do<br/>- Trạng thái<br/>- Người duyệt (nếu có)<br/>- Thời gian duyệt (nếu có)
```

## 5.9 Thống kê Giờ làm thêm

```mermaid
sequenceDiagram
    autonumber
    participant U as Manager/HR/Admin
    participant Page as OvertimePage
    participant API as /api/overtime/stats
    participant MW as Auth Middleware
    participant DB as MySQL Database

    U->>Page: Click "Thống kê"
    Page->>Page: setStatsOpen(true)
    
    Page->>API: GET /api/overtime/stats?<br/>month={selectedMonth}&<br/>year={selectedYear}
    
    API->>MW: requireAuth(request)
    MW-->>API: authUser
    
    API->>MW: requireRole(authUser, [ADMIN, HR, MANAGER])
    
    API->>DB: SELECT <br/>e.id, e.code, e.firstName, e.lastName,<br/>SUM(CASE WHEN o.status = 'approved' THEN o.hours ELSE 0 END) as approvedHours,<br/>SUM(CASE WHEN o.status = 'pending' THEN o.hours ELSE 0 END) as pendingHours,<br/>COUNT(CASE WHEN o.status = 'approved' THEN 1 END) as approvedCount,<br/>COUNT(CASE WHEN o.status = 'pending' THEN 1 END) as pendingCount<br/>FROM employees e<br/>LEFT JOIN overtime o ON e.id = o.employeeId<br/>AND MONTH(o.date) = ? AND YEAR(o.date) = ?<br/>GROUP BY e.id<br/>ORDER BY approvedHours DESC
    DB-->>API: Statistics[] data
    
    API-->>Page: 200 - {success: true, data: stats[]}
    
    Page->>Page: setStats(data)
    Page-->>U: Hiển thị bảng thống kê:<br/>- Tên nhân viên<br/>- Tổng giờ đã duyệt<br/>- Tổng giờ chờ duyệt<br/>- Số đơn đã duyệt<br/>- Số đơn chờ duyệt
```
