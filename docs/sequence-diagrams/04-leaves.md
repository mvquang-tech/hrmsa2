# Sequence Diagram - Leave Module (Nghỉ phép)

## 4.1 Xem danh sách Đơn nghỉ phép

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant Page as LeavesPage
    participant Hook as useAuth
    participant LeaveAPI as /api/leaves
    participant EmpAPI as /api/employees
    participant MW as Auth Middleware
    participant DB as MySQL Database

    U->>Page: Navigate to /leaves
    Page->>Hook: useAuth()
    Hook-->>Page: {isAuthenticated, token, user, hasPermission}
    
    alt Chưa đăng nhập
        Page->>Page: router.push('/login')
    end
    
    par Fetch Leaves
        Page->>LeaveAPI: GET /api/leaves<br/>Headers: {Authorization: Bearer <token>}
        LeaveAPI->>MW: requireAuth(request)
        MW-->>LeaveAPI: authUser
        
        alt Employee role
            LeaveAPI->>DB: SELECT l.*, <br/>CONCAT(e.firstName, ' ', e.lastName) as employeeName,<br/>e.code as employeeCode<br/>FROM leaves l<br/>JOIN employees e ON l.employeeId = e.id<br/>WHERE l.employeeId = ?<br/>ORDER BY l.createdAt DESC
        else Admin/HR/Manager
            LeaveAPI->>DB: SELECT l.*, <br/>CONCAT(e.firstName, ' ', e.lastName) as employeeName,<br/>e.code as employeeCode<br/>FROM leaves l<br/>JOIN employees e ON l.employeeId = e.id<br/>ORDER BY l.createdAt DESC
        end
        
        DB-->>LeaveAPI: Leave[] records
        
        loop For each leave
            LeaveAPI->>DB: SELECT date, sessionType<br/>FROM leave_sessions<br/>WHERE leaveId = ?
            DB-->>LeaveAPI: sessions data
            LeaveAPI->>LeaveAPI: Convert to LeaveSessions object<br/>{date: ['morning', 'afternoon']}
        end
        
        LeaveAPI-->>Page: {success: true, data: {data: leaves[]}}
    and Fetch Employees (nếu không phải Employee)
        alt user.role !== EMPLOYEE
            Page->>EmpAPI: GET /api/employees
            EmpAPI-->>Page: {data: employees[]}
        end
    end
    
    Page->>Page: setLeaves(leaves)
    Page->>Page: setEmployees(employees)
    Page-->>U: Render table với leave requests
```

## 4.2 Tạo Đơn nghỉ phép mới

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant Page as LeavesPage
    participant Helper as Leave Helpers
    participant API as /api/leaves
    participant MW as Auth Middleware
    participant VAL as Zod Validation
    participant DB as MySQL Database

    U->>Page: Click "Tạo đơn nghỉ phép"
    Page->>Page: handleOpen()
    Page->>Page: setOpen(true)
    Page->>Page: Reset formData

    U->>Page: Chọn ngày bắt đầu (startDate)
    U->>Page: Chọn ngày kết thúc (endDate)
    
    Page->>Helper: generateDateRange(startDate, endDate)
    Helper-->>Page: string[] dates
    
    Page->>Helper: initializeSessionsForDateRange(dates)
    Helper-->>Page: {date1: ['morning', 'afternoon'], ...}
    
    Page->>Page: setFormData({...formData, sessions})
    
    Note over Page: User có thể toggle từng buổi<br/>cho mỗi ngày (sáng/chiều)
    
    U->>Page: Toggle sessions (handleSessionToggle)
    Page->>Helper: toggleSession(sessions, date, 'morning'/'afternoon')
    Helper-->>Page: Updated sessions
    
    Page->>Helper: calculateDaysFromSessions(sessions)
    Helper-->>Page: number totalDays (0.5 per session)
    Page->>Page: setFormData({...formData, days: totalDays})
    
    U->>Page: Chọn loại nghỉ phép (type):<br/>- annual (Phép năm)<br/>- sick (Ốm)<br/>- unpaid (Không lương)<br/>- maternity (Thai sản)<br/>- other (Khác)
    U->>Page: Nhập lý do (reason)
    U->>Page: Click "Lưu"
    
    Page->>Page: setLoading(true)
    
    alt Employee role
        Page->>Page: formData.employeeId = user.employeeId
    else Admin/HR/Manager
        Note over Page: User đã chọn employeeId từ dropdown
    end
    
    Page->>API: POST /api/leaves<br/>Body: {employeeId, type, startDate, endDate, days, sessions, reason}
    
    API->>MW: requireAuth(request)
    MW-->>API: authUser
    
    API->>VAL: leaveSchema.parse(body)
    alt Validation failed
        VAL-->>API: ZodError
        API-->>Page: 400 - Validation error
    end
    
    VAL-->>API: Validated data
    
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
    
    API->>API: Validate startDate <= endDate
    alt Invalid date range
        API-->>Page: 400 - Ngày bắt đầu phải trước ngày kết thúc
    end
    
    API->>DB: INSERT INTO leaves<br/>(employeeId, type, startDate, endDate, days, reason, status)<br/>VALUES (?, ?, ?, ?, ?, ?, 'pending')
    DB-->>API: insertId (leaveId)
    
    loop For each date in sessions
        loop For each sessionType in sessions[date]
            API->>DB: INSERT INTO leave_sessions<br/>(leaveId, date, sessionType)<br/>VALUES (?, ?, ?)
        end
    end
    
    API->>DB: SELECT * FROM leaves WHERE id = ?
    DB-->>API: New leave record
    
    API-->>Page: 200 - {success: true, data: newLeave}
    
    Page->>Page: setLoading(false)
    Page->>Page: handleClose()
    Page->>Page: fetchLeaves()
    Page-->>U: Hiển thị danh sách cập nhật
```

## 4.3 Chi tiết xử lý Sessions (Half-day leave)

```mermaid
sequenceDiagram
    autonumber
    participant Page as LeavesPage
    participant Helper as leave-helpers.ts
    participant State as React State

    Note over Page,Helper: Khi user chọn date range

    Page->>Helper: generateDateRange('2024-01-15', '2024-01-17')
    Helper->>Helper: Loop từ startDate đến endDate
    Helper-->>Page: ['2024-01-15', '2024-01-16', '2024-01-17']

    Page->>Helper: initializeSessionsForDateRange(dates)
    Helper-->>Page: {<br/>  '2024-01-15': ['morning', 'afternoon'],<br/>  '2024-01-16': ['morning', 'afternoon'],<br/>  '2024-01-17': ['morning', 'afternoon']<br/>}

    Page->>State: setFormData({sessions: {...}})

    Note over Page: User toggle bỏ buổi chiều ngày 15

    Page->>Helper: toggleSession(sessions, '2024-01-15', 'afternoon')
    Helper->>Helper: Remove 'afternoon' from array
    Helper-->>Page: {<br/>  '2024-01-15': ['morning'],<br/>  '2024-01-16': ['morning', 'afternoon'],<br/>  '2024-01-17': ['morning', 'afternoon']<br/>}

    Page->>Helper: calculateDaysFromSessions(sessions)
    Helper->>Helper: Count total sessions<br/>morning = 0.5, afternoon = 0.5
    Helper-->>Page: 2.5 (ngày)

    Page->>State: setFormData({days: 2.5})
    
    Note over Page: UI hiển thị:<br/>- 15/01: [x] Sáng [ ] Chiều<br/>- 16/01: [x] Sáng [x] Chiều<br/>- 17/01: [x] Sáng [x] Chiều<br/>Tổng: 2.5 ngày
```

## 4.4 Sửa Đơn nghỉ phép (chỉ khi pending)

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant Page as LeavesPage
    participant Helper as Leave Helpers
    participant API as /api/leaves/[id]
    participant MW as Auth Middleware
    participant DB as MySQL Database

    U->>Page: Click icon Edit trên leave row
    
    Note over Page: Chỉ hiện Edit nếu status = 'pending'
    
    Page->>Page: handleEdit(leave)
    Page->>Page: setEditing(leave)
    Page->>Page: setFormData({<br/>  employeeId, type, startDate, endDate,<br/>  days, sessions, reason<br/>})
    Page->>Page: setOpen(true)
    
    U->>Page: Chỉnh sửa thông tin
    U->>Page: Click "Lưu"
    
    Page->>Page: setLoading(true)
    
    Page->>API: PUT /api/leaves/{id}<br/>Body: {type, startDate, endDate, days, sessions, reason}
    
    API->>MW: requireAuth(request)
    MW-->>API: authUser
    
    API->>DB: SELECT * FROM leaves WHERE id = ?
    DB-->>API: leave record
    
    alt Leave không tồn tại
        API-->>Page: 404 - Không tìm thấy đơn
    end
    
    alt Employee role
        API->>API: Check leave.employeeId === user.employeeId
        alt Không phải của mình
            API-->>Page: 403 - Không có quyền
        end
    end
    
    alt Status không phải pending
        API-->>Page: 400 - Không thể sửa đơn đã được xử lý
    end
    
    API->>DB: UPDATE leaves<br/>SET type=?, startDate=?, endDate=?, days=?, reason=?<br/>WHERE id=?
    DB-->>API: OK
    
    API->>DB: DELETE FROM leave_sessions WHERE leaveId = ?
    DB-->>API: OK
    
    loop For each date/session
        API->>DB: INSERT INTO leave_sessions (leaveId, date, sessionType)
    end
    
    API->>DB: SELECT * FROM leaves WHERE id = ?
    DB-->>API: Updated leave
    
    API-->>Page: 200 - {success: true, data: updatedLeave}
    
    Page->>Page: setLoading(false)
    Page->>Page: handleClose()
    Page->>Page: fetchLeaves()
    Page-->>U: Hiển thị cập nhật
```

## 4.5 Duyệt Đơn nghỉ phép

```mermaid
sequenceDiagram
    autonumber
    participant U as Manager/HR/Admin
    participant Page as LeavesPage
    participant API as /api/leaves/[id]
    participant MW as Auth Middleware
    participant DB as MySQL Database

    Note over Page: Hiển thị nút Duyệt/Từ chối<br/>nếu canApprove && status === 'pending'
    
    U->>Page: Click "Duyệt"
    Page->>Page: handleApprove(leave.id)
    
    Page->>API: PUT /api/leaves/{id}<br/>Body: {status: 'approved'}
    
    API->>MW: requireAuth(request)
    MW-->>API: authUser
    
    API->>MW: requireRole(authUser, [ADMIN, HR, MANAGER])
    alt Không có quyền duyệt
        MW-->>API: throw Error
        API-->>Page: 403 - Không có quyền
    end
    
    API->>DB: SELECT * FROM leaves WHERE id = ?
    DB-->>API: leave record
    
    alt Leave không tồn tại
        API-->>Page: 404 - Không tìm thấy đơn
    end
    
    alt Status không phải pending
        API-->>Page: 400 - Đơn đã được xử lý
    end
    
    API->>DB: UPDATE leaves<br/>SET status='approved', approvedBy=?, approvedAt=NOW()<br/>WHERE id=?
    DB-->>API: OK
    
    API-->>Page: 200 - {success: true, message: 'Duyệt thành công'}
    
    Page->>Page: fetchLeaves()
    Page-->>U: Hiển thị trạng thái mới (Đã duyệt)
```

## 4.6 Từ chối Đơn nghỉ phép

```mermaid
sequenceDiagram
    autonumber
    participant U as Manager/HR/Admin
    participant Page as LeavesPage
    participant API as /api/leaves/[id]
    participant MW as Auth Middleware
    participant DB as MySQL Database

    U->>Page: Click "Từ chối"
    Page->>Page: handleReject(leave.id)
    
    opt Có dialog nhập lý do từ chối
        Page->>Page: setRejectDialogOpen(true)
        U->>Page: Nhập lý do từ chối
        U->>Page: Click "Xác nhận"
    end
    
    Page->>API: PUT /api/leaves/{id}<br/>Body: {status: 'rejected', rejectReason: '...'}
    
    API->>MW: requireAuth(request)
    MW-->>API: authUser
    
    API->>MW: requireRole(authUser, [ADMIN, HR, MANAGER])
    
    API->>DB: SELECT * FROM leaves WHERE id = ?
    DB-->>API: leave record
    
    alt Status không phải pending
        API-->>Page: 400 - Đơn đã được xử lý
    end
    
    API->>DB: UPDATE leaves<br/>SET status='rejected', approvedBy=?, approvedAt=NOW(), rejectReason=?<br/>WHERE id=?
    DB-->>API: OK
    
    API-->>Page: 200 - {success: true, message: 'Từ chối thành công'}
    
    Page->>Page: fetchLeaves()
    Page-->>U: Hiển thị trạng thái mới (Đã từ chối)
```

## 4.7 Xóa Đơn nghỉ phép

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant Page as LeavesPage
    participant Browser as Browser Confirm
    participant API as /api/leaves/[id]
    participant MW as Auth Middleware
    participant DB as MySQL Database

    U->>Page: Click icon Delete
    
    Note over Page: Chỉ hiện Delete nếu:<br/>- Owner của đơn & status = 'pending'<br/>- Hoặc Admin/HR
    
    Page->>Browser: confirm('Bạn có chắc chắn muốn xóa?')
    Browser-->>Page: true
    
    Page->>API: DELETE /api/leaves/{id}<br/>Headers: {Authorization: Bearer <token>}
    
    API->>MW: requireAuth(request)
    MW-->>API: authUser
    
    API->>DB: SELECT * FROM leaves WHERE id = ?
    DB-->>API: leave record
    
    alt Leave không tồn tại
        API-->>Page: 404 - Không tìm thấy đơn
    end
    
    alt Employee role
        API->>API: Check leave.employeeId === user.employeeId
        alt Không phải của mình
            API-->>Page: 403 - Không có quyền
        end
        alt Status không phải pending
            API-->>Page: 400 - Không thể xóa đơn đã được xử lý
        end
    end
    
    API->>DB: DELETE FROM leave_sessions WHERE leaveId = ?
    DB-->>API: OK
    
    API->>DB: DELETE FROM leaves WHERE id = ?
    DB-->>API: OK
    
    API-->>Page: 200 - {success: true, message: 'Xóa thành công'}
    
    Page->>Page: fetchLeaves()
    Page-->>U: Hiển thị danh sách cập nhật
```

## 4.8 Lọc và Tìm kiếm Đơn nghỉ phép

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant Page as LeavesPage
    participant API as /api/leaves
    participant MW as Auth Middleware
    participant DB as MySQL Database

    U->>Page: Chọn filter trạng thái
    Page->>Page: setFilterStatus('pending'/'approved'/'rejected')
    
    U->>Page: Chọn filter loại nghỉ phép
    Page->>Page: setFilterType('annual'/'sick'/...)
    
    U->>Page: Chọn filter khoảng thời gian
    Page->>Page: setFilterDateRange({from, to})
    
    alt Admin/HR/Manager
        U->>Page: Chọn filter nhân viên
        Page->>Page: setFilterEmployee(employeeId)
    end
    
    Page->>API: GET /api/leaves?<br/>status={filterStatus}&<br/>type={filterType}&<br/>from={filterDateRange.from}&<br/>to={filterDateRange.to}&<br/>employeeId={filterEmployee}
    
    API->>MW: requireAuth(request)
    MW-->>API: authUser
    
    API->>DB: SELECT l.*, e.firstName, e.lastName<br/>FROM leaves l<br/>JOIN employees e ON l.employeeId = e.id<br/>WHERE 1=1<br/>AND l.status = ?<br/>AND l.type = ?<br/>AND l.startDate >= ?<br/>AND l.endDate <= ?<br/>AND l.employeeId = ?<br/>ORDER BY l.createdAt DESC
    DB-->>API: Filtered Leave[] records
    
    API-->>Page: {success: true, data: {data: leaves[]}}
    
    Page->>Page: setLeaves(leaves)
    Page-->>U: Hiển thị kết quả lọc
```

## 4.9 Xem chi tiết Đơn nghỉ phép

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant Page as LeavesPage
    participant API as /api/leaves/[id]
    participant MW as Auth Middleware
    participant DB as MySQL Database

    U->>Page: Click row hoặc icon View
    Page->>Page: handleView(leaveId)
    
    Page->>API: GET /api/leaves/{id}<br/>Headers: {Authorization: Bearer <token>}
    
    API->>MW: requireAuth(request)
    MW-->>API: authUser
    
    API->>DB: SELECT l.*, <br/>CONCAT(e.firstName, ' ', e.lastName) as employeeName,<br/>e.code as employeeCode,<br/>d.name as departmentName,<br/>CONCAT(a.firstName, ' ', a.lastName) as approverName<br/>FROM leaves l<br/>JOIN employees e ON l.employeeId = e.id<br/>LEFT JOIN departments d ON e.departmentId = d.id<br/>LEFT JOIN employees a ON l.approvedBy = a.id<br/>WHERE l.id = ?
    DB-->>API: leave record with details
    
    alt Leave không tồn tại
        API-->>Page: 404 - Không tìm thấy đơn
    end
    
    alt Employee role
        API->>API: Check leave.employeeId === user.employeeId
        alt Không phải của mình
            API-->>Page: 403 - Không có quyền xem
        end
    end
    
    API->>DB: SELECT date, sessionType FROM leave_sessions<br/>WHERE leaveId = ?<br/>ORDER BY date, sessionType
    DB-->>API: sessions[] data
    
    API-->>Page: 200 - {success: true, data: {leave, sessions}}
    
    Page->>Page: setSelectedLeave(data)
    Page->>Page: setDetailOpen(true)
    Page-->>U: Hiển thị dialog chi tiết đơn nghỉ phép<br/>với danh sách ngày và buổi nghỉ
```
