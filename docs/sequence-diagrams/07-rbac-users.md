# Sequence Diagram - RBAC Users Module (Quản lý người dùng)

## 7.1 Xem danh sách Người dùng

```mermaid
sequenceDiagram
    autonumber
    participant U as Admin
    participant Page as UsersPage
    participant Hook as useAuth
    participant UserAPI as /api/admin/users
    participant RoleAPI as /api/admin/roles
    participant MW as Auth Middleware
    participant DB as MySQL Database

    U->>Page: Navigate to /admin/users
    Page->>Hook: useAuth()
    Hook-->>Page: {isAuthenticated, token, hasPermission}
    
    alt Chưa đăng nhập
        Page->>Page: router.push('/login')
    end
    
    Page->>Page: Check hasPermission('users.view')
    
    par Fetch Users
        Page->>UserAPI: GET /api/admin/users<br/>Headers: {Authorization: Bearer <token>}
        UserAPI->>MW: requireAuth(request)
        MW-->>UserAPI: authUser
        UserAPI->>MW: requireRole(authUser, [ADMIN])
        
        UserAPI->>DB: SELECT u.*, e.firstName, e.lastName<br/>FROM users u<br/>LEFT JOIN employees e ON u.employeeId = e.id<br/>ORDER BY u.username
        DB-->>UserAPI: User[] records with employee info
        
        loop For each user
            UserAPI->>DB: SELECT r.* FROM roles r<br/>JOIN user_roles ur ON r.id = ur.roleId<br/>WHERE ur.userId = ?
            DB-->>UserAPI: user roles[]
        end
        
        UserAPI-->>Page: {success: true, data: {data: users[]}}
    and Fetch Roles
        Page->>RoleAPI: GET /api/admin/roles
        RoleAPI->>MW: requireAuth, requireRole
        RoleAPI->>DB: SELECT * FROM roles WHERE isActive = 1
        DB-->>RoleAPI: Role[] records
        RoleAPI-->>Page: {success: true, data: {data: roles[]}}
    end
    
    Page->>Page: setUsers(users)
    Page->>Page: setRoles(roles)
    Page-->>U: Render table với users
```

## 7.2 Thêm Người dùng mới

```mermaid
sequenceDiagram
    autonumber
    participant U as Admin
    participant Page as UsersPage
    participant API as /api/admin/users
    participant MW as Auth Middleware
    participant VAL as Zod Validation
    participant AUTH as Auth Utils
    participant DB as MySQL Database

    U->>Page: Click "Thêm người dùng"
    Page->>Page: handleOpen()
    Page->>Page: setOpen(true)
    Page->>Page: Reset formData
    
    U->>Page: Fill form:<br/>- username<br/>- email<br/>- password<br/>- role (legacy field)<br/>- roleIds[] (multiple select)<br/>- employeeId (optional)
    U->>Page: Click "Lưu"
    
    Page->>Page: setLoading(true)
    
    Page->>API: POST /api/admin/users<br/>Body: {username, email, password, role, roleIds, employeeId}
    
    API->>MW: requireAuth(request)
    MW-->>API: authUser
    API->>MW: requireRole(authUser, [ADMIN])
    
    API->>VAL: userWithRolesSchema.parse(body)
    alt Validation failed
        VAL-->>API: ZodError
        API-->>Page: 400 - Validation error
    end
    
    VAL-->>API: Validated data
    
    API->>DB: SELECT id FROM users WHERE username = ?
    DB-->>API: existing username check
    
    alt Username đã tồn tại
        API-->>Page: 400 - Tên đăng nhập đã tồn tại
    end
    
    API->>DB: SELECT id FROM users WHERE email = ?
    DB-->>API: existing email check
    
    alt Email đã tồn tại
        API-->>Page: 400 - Email đã tồn tại
    end
    
    alt employeeId provided
        API->>DB: SELECT id FROM employees WHERE id = ?
        DB-->>API: employee check
        
        alt Employee không tồn tại
            API-->>Page: 400 - Nhân viên không tồn tại
        end
        
        API->>DB: SELECT id FROM users WHERE employeeId = ?
        DB-->>API: employee linked check
        
        alt Employee đã có tài khoản
            API-->>Page: 400 - Nhân viên đã có tài khoản
        end
    end
    
    API->>AUTH: hashPassword(password)
    AUTH-->>API: hashedPassword
    
    API->>DB: INSERT INTO users<br/>(username, email, password, role, employeeId)<br/>VALUES (?, ?, ?, ?, ?)
    DB-->>API: insertId (userId)
    
    alt roleIds provided
        loop For each roleId
            API->>DB: INSERT INTO user_roles (userId, roleId)<br/>VALUES (?, ?)
        end
    else Use legacy role field
        API->>DB: INSERT INTO user_roles (userId, roleId)<br/>SELECT ?, id FROM roles WHERE code = ?
    end
    
    DB-->>API: OK
    
    API->>DB: SELECT * FROM users WHERE id = ?
    DB-->>API: New user record
    
    API-->>Page: 200 - {success: true, data: newUser}
    
    Page->>Page: setLoading(false)
    Page->>Page: handleClose()
    Page->>Page: fetchUsers()
    Page-->>U: Hiển thị danh sách cập nhật
```

## 7.3 Sửa thông tin Người dùng

```mermaid
sequenceDiagram
    autonumber
    participant U as Admin
    participant Page as UsersPage
    participant API as /api/admin/users/[id]
    participant MW as Auth Middleware
    participant VAL as Zod Validation
    participant AUTH as Auth Utils
    participant DB as MySQL Database

    U->>Page: Click icon Edit trên user row
    Page->>Page: handleOpen(user)
    Page->>Page: setEditing(user)
    Page->>Page: setFormData({username, email, role, roleIds, employeeId})
    Page->>Page: setOpen(true)
    
    Note over Page: Password field để trống<br/>nếu không muốn đổi mật khẩu
    
    U->>Page: Chỉnh sửa thông tin
    U->>Page: Click "Lưu"
    
    Page->>API: PUT /api/admin/users/{id}<br/>Body: {username, email, password?, role, roleIds, employeeId}
    
    API->>MW: requireAuth(request)
    MW-->>API: authUser
    API->>MW: requireRole(authUser, [ADMIN])
    
    API->>VAL: userUpdateSchema.parse(body)
    VAL-->>API: Validated data
    
    API->>DB: SELECT * FROM users WHERE id = ?
    DB-->>API: user record
    
    alt User không tồn tại
        API-->>Page: 404 - Người dùng không tồn tại
    end
    
    API->>DB: SELECT id FROM users WHERE username = ? AND id != ?
    DB-->>API: duplicate username check
    
    API->>DB: SELECT id FROM users WHERE email = ? AND id != ?
    DB-->>API: duplicate email check
    
    alt password provided
        API->>AUTH: hashPassword(password)
        AUTH-->>API: hashedPassword
        API->>API: updateData.password = hashedPassword
    end
    
    API->>DB: UPDATE users<br/>SET username=?, email=?, password=?, role=?, employeeId=?<br/>WHERE id=?
    DB-->>API: OK
    
    alt roleIds provided
        API->>DB: DELETE FROM user_roles WHERE userId = ?
        DB-->>API: OK
        
        loop For each roleId
            API->>DB: INSERT INTO user_roles (userId, roleId) VALUES (?, ?)
        end
        DB-->>API: OK
    end
    
    API-->>Page: 200 - {success: true, data: updatedUser}
    
    Page->>Page: handleClose()
    Page->>Page: fetchUsers()
    Page-->>U: Hiển thị cập nhật
```

## 7.4 Xóa Người dùng

```mermaid
sequenceDiagram
    autonumber
    participant U as Admin
    participant Page as UsersPage
    participant Browser as Browser Confirm
    participant API as /api/admin/users/[id]
    participant MW as Auth Middleware
    participant DB as MySQL Database

    U->>Page: Click icon Delete trên user row
    
    Note over Page: Không cho xóa user đang login<br/>(user.id === currentUser.id)
    
    Page->>Browser: confirm('Bạn có chắc chắn muốn xóa người dùng này?')
    
    alt User cancel
        Browser-->>Page: false
        Page-->>U: Không làm gì
    end
    
    Browser-->>Page: true (confirmed)
    
    Page->>API: DELETE /api/admin/users/{id}<br/>Headers: {Authorization: Bearer <token>}
    
    API->>MW: requireAuth(request)
    MW-->>API: authUser
    API->>MW: requireRole(authUser, [ADMIN])
    
    API->>DB: SELECT * FROM users WHERE id = ?
    DB-->>API: user record
    
    alt User không tồn tại
        API-->>Page: 404 - Người dùng không tồn tại
    end
    
    alt Đang xóa chính mình
        API->>API: Check authUser.userId === id
        alt True
            API-->>Page: 400 - Không thể xóa tài khoản đang đăng nhập
        end
    end
    
    API->>DB: DELETE FROM user_roles WHERE userId = ?
    DB-->>API: OK
    
    API->>DB: DELETE FROM users WHERE id = ?
    DB-->>API: affectedRows
    
    API-->>Page: 200 - {success: true, message: 'Xóa thành công'}
    
    Page->>Page: fetchUsers()
    Page-->>U: Hiển thị danh sách cập nhật
```

## 7.5 Gán Vai trò cho Người dùng

```mermaid
sequenceDiagram
    autonumber
    participant U as Admin
    participant Page as UsersPage
    participant Dialog as Role Assignment Dialog
    participant API as /api/admin/users/[id]
    participant MW as Auth Middleware
    participant DB as MySQL Database

    U->>Page: Click icon "Phân vai trò" trên user row
    Page->>Page: handleRoleOpen(user)
    Page->>Page: setSelectedUser(user)
    Page->>Page: setSelectedRoles(user.roles.map(r => r.id))
    Page->>Page: setRoleOpen(true)
    
    Page-->>U: Hiển thị dialog với role checkboxes
    
    Note over Dialog: Hiển thị tất cả active roles<br/>User có thể chọn nhiều roles
    
    U->>Dialog: Toggle roles (check/uncheck)
    Dialog->>Page: handleRoleToggle(roleId)
    
    alt Role đang được chọn
        Page->>Page: Remove from selectedRoles
    else Role chưa được chọn
        Page->>Page: Add to selectedRoles
    end
    
    U->>Dialog: Click "Lưu"
    Page->>Page: setLoading(true)
    
    Page->>API: PUT /api/admin/users/{id}<br/>Body: {roleIds: [1, 2, 3]}
    
    API->>MW: requireAuth(request)
    MW-->>API: authUser
    API->>MW: requireRole(authUser, [ADMIN])
    
    API->>DB: SELECT * FROM users WHERE id = ?
    DB-->>API: user record
    
    API->>DB: BEGIN TRANSACTION
    
    API->>DB: DELETE FROM user_roles WHERE userId = ?
    DB-->>API: OK
    
    loop For each roleId
        API->>DB: INSERT INTO user_roles (userId, roleId) VALUES (?, ?)
    end
    
    API->>DB: COMMIT
    DB-->>API: OK
    
    API-->>Page: 200 - {success: true}
    
    Page->>Page: setLoading(false)
    Page->>Page: handleRoleClose()
    Page->>Page: fetchUsers()
    Page-->>U: Hiển thị user với roles mới
```

## 7.6 Reset mật khẩu Người dùng

```mermaid
sequenceDiagram
    autonumber
    participant U as Admin
    participant Page as UsersPage
    participant Dialog as Reset Password Dialog
    participant API as /api/admin/users/[id]
    participant MW as Auth Middleware
    participant AUTH as Auth Utils
    participant DB as MySQL Database

    U->>Page: Click icon "Reset mật khẩu" trên user row
    Page->>Page: handleResetPasswordOpen(user)
    Page->>Page: setSelectedUser(user)
    Page->>Page: setNewPassword('')
    Page->>Page: setResetPasswordOpen(true)
    
    Page-->>U: Hiển thị dialog nhập mật khẩu mới
    
    U->>Dialog: Nhập mật khẩu mới
    U->>Dialog: Click "Đặt lại mật khẩu"
    
    alt Password validation failed
        Dialog->>Dialog: Check password.length >= 6
        Dialog-->>U: Hiển thị lỗi validation
    end
    
    Page->>Page: setLoading(true)
    
    Page->>API: PUT /api/admin/users/{id}<br/>Body: {password: newPassword}
    
    API->>MW: requireAuth(request)
    MW-->>API: authUser
    API->>MW: requireRole(authUser, [ADMIN])
    
    API->>DB: SELECT * FROM users WHERE id = ?
    DB-->>API: user record
    
    API->>AUTH: hashPassword(newPassword)
    AUTH-->>API: hashedPassword
    
    API->>DB: UPDATE users SET password = ? WHERE id = ?
    DB-->>API: OK
    
    API-->>Page: 200 - {success: true, message: 'Đặt lại mật khẩu thành công'}
    
    Page->>Page: setLoading(false)
    Page->>Page: handleResetPasswordClose()
    Page-->>U: Hiển thị thông báo thành công
    
    Note over U: User cần đăng nhập lại<br/>với mật khẩu mới
```
