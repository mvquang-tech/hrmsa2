# Sequence Diagram - RBAC Roles Module

## 6.1 Xem danh sách Vai trò

```mermaid
sequenceDiagram
    autonumber
    participant U as Admin
    participant Page as RolesPage
    participant Hook as useAuth
    participant RoleAPI as /api/admin/roles
    participant PermAPI as /api/admin/permissions
    participant MW as Auth Middleware
    participant DB as MySQL Database

    U->>Page: Navigate to /admin/roles
    Page->>Hook: useAuth()
    Hook-->>Page: {isAuthenticated, token, hasPermission}
    
    alt Chưa đăng nhập
        Page->>Page: router.push('/login')
    end
    
    Page->>Page: Check hasPermission('roles.view')
    
    par Fetch Roles
        Page->>RoleAPI: GET /api/admin/roles<br/>Headers: {Authorization: Bearer <token>}
        RoleAPI->>MW: requireAuth(request)
        MW-->>RoleAPI: authUser
        RoleAPI->>MW: requireRole(authUser, [ADMIN])
        
        RoleAPI->>DB: SELECT * FROM roles ORDER BY name
        DB-->>RoleAPI: Role[] records
        
        RoleAPI->>RoleAPI: convertMySQLBooleans(roles, ['isSystem', 'isActive'])
        RoleAPI-->>Page: {success: true, data: {data: roles[]}}
    and Fetch Permissions (grouped)
        Page->>PermAPI: GET /api/admin/permissions?grouped=true
        PermAPI->>MW: requireAuth, requireRole
        PermAPI->>DB: SELECT * FROM permissions ORDER BY module, name
        DB-->>PermAPI: Permission[] records
        
        PermAPI->>PermAPI: Group by module
        PermAPI-->>Page: {success: true, data: {dashboard: [...], users: [...], ...}}
    end
    
    Page->>Page: setRoles(roles)
    Page->>Page: setPermissions(groupedPermissions)
    Page-->>U: Render table với roles
```

## 6.2 Thêm Vai trò mới

```mermaid
sequenceDiagram
    autonumber
    participant U as Admin
    participant Page as RolesPage
    participant API as /api/admin/roles
    participant MW as Auth Middleware
    participant VAL as Zod Validation
    participant DB as MySQL Database

    U->>Page: Click "Thêm vai trò"
    Page->>Page: handleOpen()
    Page->>Page: setOpen(true)
    Page->>Page: setFormData({name: '', code: '', description: '', isActive: true})
    
    U->>Page: Fill form:<br/>- name (Tên vai trò)<br/>- code (Mã - lowercase, underscore)<br/>- description<br/>- isActive
    U->>Page: Click "Lưu"
    
    Page->>Page: setLoading(true)
    
    Page->>API: POST /api/admin/roles<br/>Body: {name, code, description, isActive}
    
    API->>MW: requireAuth(request)
    MW-->>API: authUser
    API->>MW: requireRole(authUser, [ADMIN])
    
    API->>VAL: roleSchema.parse(body)
    alt Validation failed
        VAL-->>API: ZodError (code format, etc.)
        API-->>Page: 400 - Validation error
        Page->>Page: setError(message)
    end
    
    VAL-->>API: Validated data
    
    API->>DB: SELECT id FROM roles WHERE code = ?
    DB-->>API: existing check
    
    alt Mã đã tồn tại
        API-->>Page: 400 - Mã vai trò đã tồn tại
    end
    
    API->>DB: INSERT INTO roles (name, code, description, isActive)<br/>VALUES (?, ?, ?, ?)
    DB-->>API: insertId
    
    API->>DB: SELECT * FROM roles WHERE id = ?
    DB-->>API: New role record
    
    API->>API: convertMySQLBooleans(role, ['isSystem', 'isActive'])
    
    API-->>Page: 200 - {success: true, data: newRole}
    
    Page->>Page: setLoading(false)
    Page->>Page: handleClose()
    Page->>Page: fetchRoles()
    Page-->>U: Hiển thị danh sách cập nhật
```

## 6.3 Sửa Vai trò

```mermaid
sequenceDiagram
    autonumber
    participant U as Admin
    participant Page as RolesPage
    participant API as /api/admin/roles/[id]
    participant MW as Auth Middleware
    participant VAL as Zod Validation
    participant DB as MySQL Database

    U->>Page: Click icon Edit trên role row
    Page->>Page: handleOpen(role)
    Page->>Page: setEditing(role)
    Page->>Page: setFormData({name, code, description, isActive})
    Page->>Page: setOpen(true)
    
    Note over Page: Nếu role.isSystem = true,<br/>disable field code
    
    U->>Page: Chỉnh sửa thông tin
    U->>Page: Click "Lưu"
    
    Page->>API: PUT /api/admin/roles/{id}<br/>Body: {name, code, description, isActive}
    
    API->>MW: requireAuth(request)
    MW-->>API: authUser
    API->>MW: requireRole(authUser, [ADMIN])
    
    API->>VAL: roleSchema.partial().parse(body)
    VAL-->>API: Validated data
    
    API->>DB: SELECT * FROM roles WHERE id = ?
    DB-->>API: role record
    
    alt Role không tồn tại
        API-->>Page: 404 - Vai trò không tồn tại
    end
    
    API->>API: convertMySQLBooleans(role, ['isSystem', 'isActive'])
    
    alt role.isSystem && code changed
        API-->>Page: 400 - Không thể đổi mã vai trò hệ thống
    end
    
    API->>DB: SELECT id FROM roles WHERE code = ? AND id != ?
    DB-->>API: duplicate check
    
    API->>DB: UPDATE roles<br/>SET name=?, code=?, description=?, isActive=?<br/>WHERE id=?
    DB-->>API: OK
    
    API-->>Page: 200 - {success: true, data: updatedRole}
    
    Page->>Page: handleClose()
    Page->>Page: fetchRoles()
    Page-->>U: Hiển thị cập nhật
```

## 6.4 Xóa Vai trò

```mermaid
sequenceDiagram
    autonumber
    participant U as Admin
    participant Page as RolesPage
    participant Browser as Browser Confirm
    participant API as /api/admin/roles/[id]
    participant MW as Auth Middleware
    participant DB as MySQL Database

    U->>Page: Click icon Delete trên role row
    
    Note over Page: Chỉ hiện Delete nếu !role.isSystem
    
    Page->>Browser: confirm('Bạn có chắc chắn muốn xóa vai trò này?')
    
    alt User cancel
        Browser-->>Page: false
        Page-->>U: Không làm gì
    end
    
    Browser-->>Page: true (confirmed)
    
    Page->>API: DELETE /api/admin/roles/{id}<br/>Headers: {Authorization: Bearer <token>}
    
    API->>MW: requireAuth(request)
    MW-->>API: authUser
    API->>MW: requireRole(authUser, [ADMIN])
    
    API->>DB: SELECT * FROM roles WHERE id = ?
    DB-->>API: role record
    
    alt Role không tồn tại
        API-->>Page: 404 - Vai trò không tồn tại
    end
    
    API->>API: convertMySQLBooleans(role, ['isSystem'])
    
    alt role.isSystem = true
        API-->>Page: 400 - Không thể xóa vai trò hệ thống
        Page->>Page: alert(error)
        Page-->>U: Hiển thị lỗi
    end
    
    API->>DB: SELECT COUNT(*) FROM user_roles WHERE roleId = ?
    DB-->>API: userCount
    
    alt userCount > 0
        API-->>Page: 400 - Không thể xóa vai trò đang được sử dụng
        Page->>Page: alert(error)
        Page-->>U: Hiển thị lỗi
    end
    
    API->>DB: DELETE FROM role_permissions WHERE roleId = ?
    DB-->>API: OK
    
    API->>DB: DELETE FROM roles WHERE id = ?
    DB-->>API: affectedRows
    
    API-->>Page: 200 - {success: true, message: 'Xóa thành công'}
    
    Page->>Page: fetchRoles()
    Page-->>U: Hiển thị danh sách cập nhật
```

## 6.5 Phân quyền cho Vai trò

```mermaid
sequenceDiagram
    autonumber
    participant U as Admin
    participant Page as RolesPage
    participant GetAPI as /api/admin/roles/[id]/permissions (GET)
    participant PutAPI as /api/admin/roles/[id]/permissions (PUT)
    participant MW as Auth Middleware
    participant DB as MySQL Database

    U->>Page: Click icon "Phân quyền" trên role row
    Page->>Page: handlePermissionOpen(role)
    Page->>Page: setSelectedRole(role)
    Page->>Page: setPermissionOpen(true)
    
    Page->>GetAPI: GET /api/admin/roles/{id}/permissions
    
    GetAPI->>MW: requireAuth(request)
    MW-->>GetAPI: authUser
    GetAPI->>MW: requireRole(authUser, [ADMIN])
    
    GetAPI->>DB: SELECT p.* FROM permissions p<br/>JOIN role_permissions rp ON p.id = rp.permissionId<br/>WHERE rp.roleId = ?
    DB-->>GetAPI: Permission[] records
    
    GetAPI-->>Page: {success: true, data: currentPermissions[]}
    
    Page->>Page: setSelectedPermissions(permissionIds)
    Page-->>U: Hiển thị dialog với checkboxes
    
    Note over Page: Permissions được group theo module<br/>User có thể check/uncheck từng permission
    
    U->>Page: Toggle permissions (check/uncheck)
    Page->>Page: handlePermissionToggle(permissionId)
    
    U->>Page: Click "Lưu"
    Page->>Page: setLoading(true)
    
    Page->>PutAPI: PUT /api/admin/roles/{id}/permissions<br/>Body: {permissionIds: [1, 2, 3, ...]}
    
    PutAPI->>MW: requireAuth(request)
    MW-->>PutAPI: authUser
    PutAPI->>MW: requireRole(authUser, [ADMIN])
    
    PutAPI->>DB: SELECT * FROM roles WHERE id = ?
    DB-->>PutAPI: role record
    
    alt Role không tồn tại
        PutAPI-->>Page: 404 - Vai trò không tồn tại
    end
    
    PutAPI->>DB: BEGIN TRANSACTION
    
    PutAPI->>DB: DELETE FROM role_permissions WHERE roleId = ?
    DB-->>PutAPI: OK
    
    loop For each permissionId
        PutAPI->>DB: INSERT INTO role_permissions (roleId, permissionId)<br/>VALUES (?, ?)
    end
    
    PutAPI->>DB: COMMIT
    DB-->>PutAPI: OK
    
    PutAPI-->>Page: 200 - {success: true, message: 'Cập nhật quyền thành công'}
    
    Page->>Page: setLoading(false)
    Page->>Page: handlePermissionClose()
    Page-->>U: Hiển thị thông báo thành công
```

## 6.6 Chi tiết Permission Toggle UI

```mermaid
sequenceDiagram
    autonumber
    participant U as Admin
    participant Dialog as Permission Dialog
    participant State as React State

    Note over Dialog: Permissions grouped by module:<br/>- dashboard: [...]<br/>- users: [...]<br/>- employees: [...]<br/>- departments: [...]<br/>- leaves: [...]<br/>- overtime: [...]<br/>- roles: [...]

    Dialog-->>U: Render checkboxes grouped by module

    U->>Dialog: Click checkbox "users.view"
    Dialog->>State: handlePermissionToggle('users.view')
    
    alt Permission đang được chọn
        State->>State: Remove from selectedPermissions
    else Permission chưa được chọn
        State->>State: Add to selectedPermissions
    end
    
    State-->>Dialog: Re-render với state mới

    Note over Dialog: Module header có thể có<br/>"Select All" / "Deselect All"

    U->>Dialog: Click "Select All" cho module "employees"
    Dialog->>State: handleSelectAllModule('employees')
    State->>State: Add all employee permissions to selectedPermissions
    State-->>Dialog: Re-render

    U->>Dialog: Click "Lưu"
    Dialog->>Dialog: Submit selectedPermissions to API
```
