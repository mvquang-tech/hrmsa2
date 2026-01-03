# Sequence Diagram - Authentication Module

## 1.1 Đăng nhập (Login)

```mermaid
sequenceDiagram
    autonumber
    participant U as User/Browser
    participant LP as LoginPage
    participant API as /api/auth/login
    participant VAL as Zod Validation
    participant DB as MySQL Database
    participant AUTH as Auth Utils
    participant RBAC as RBAC Service

    U->>LP: Nhập username & password
    LP->>LP: Validate form (client-side)
    LP->>API: POST /api/auth/login<br/>{username, password}
    
    API->>VAL: loginSchema.parse(body)
    alt Validation Failed
        VAL-->>API: ZodError
        API-->>LP: 400 - Dữ liệu không hợp lệ
        LP-->>U: Hiển thị lỗi validation
    end
    
    VAL-->>API: Validated data
    
    API->>DB: SELECT * FROM users<br/>WHERE username = ?
    DB-->>API: User record (hoặc empty)
    
    alt User không tồn tại
        API-->>LP: 401 - Tên đăng nhập hoặc mật khẩu không đúng
        LP-->>U: Hiển thị lỗi
    end
    
    API->>AUTH: comparePassword(password, user.password)
    AUTH-->>API: boolean isValid
    
    alt Password không đúng
        API-->>LP: 401 - Tên đăng nhập hoặc mật khẩu không đúng
        LP-->>U: Hiển thị lỗi
    end
    
    API->>RBAC: getUserPermissions(userId)
    RBAC->>DB: SELECT p.code FROM permissions p<br/>JOIN role_permissions rp ON p.id = rp.permissionId<br/>JOIN user_roles ur ON rp.roleId = ur.roleId<br/>WHERE ur.userId = ?
    DB-->>RBAC: Permission codes[]
    RBAC-->>API: string[] permissions
    
    API->>AUTH: generateToken({userId, username, role, employeeId})
    AUTH-->>API: JWT token
    
    API-->>LP: 200 - {success: true, data: {token, user, permissions}}
    
    LP->>LP: localStorage.setItem('token', token)
    LP->>LP: localStorage.setItem('user', JSON.stringify(user))
    LP->>LP: localStorage.setItem('permissions', JSON.stringify(permissions))
    
    LP->>U: Redirect to Dashboard (/)
```

## 1.2 Kiểm tra Authentication (useAuth Hook)

```mermaid
sequenceDiagram
    autonumber
    participant C as Component
    participant Hook as useAuth Hook
    participant LS as localStorage
    participant Router as Next Router

    C->>Hook: useAuth()
    Hook->>LS: getItem('token')
    Hook->>LS: getItem('user')
    Hook->>LS: getItem('permissions')
    
    alt Token exists
        LS-->>Hook: token, user, permissions
        Hook->>Hook: setIsAuthenticated(true)
        Hook->>Hook: setUser(parsedUser)
        Hook->>Hook: setPermissions(parsedPermissions)
        Hook-->>C: {isAuthenticated: true, user, token, permissions, hasPermission()}
    else Token không tồn tại
        LS-->>Hook: null
        Hook->>Hook: setIsAuthenticated(false)
        Hook-->>C: {isAuthenticated: false, user: null, ...}
    end
    
    Note over C,Hook: hasPermission(code) kiểm tra<br/>permissions.includes(code)
```

## 1.3 Đăng xuất (Logout)

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant Layout as Layout Component
    participant Hook as useAuth Hook
    participant LS as localStorage
    participant Router as Next Router

    U->>Layout: Click "Đăng xuất"
    Layout->>Hook: logout()
    
    Hook->>LS: removeItem('token')
    Hook->>LS: removeItem('user')
    Hook->>LS: removeItem('permissions')
    
    Hook->>Hook: setUser(null)
    Hook->>Hook: setToken(null)
    Hook->>Hook: setPermissions([])
    Hook->>Hook: setIsAuthenticated(false)
    
    Hook->>Router: router.push('/login')
    Router-->>U: Redirect to Login page
```

## 1.4 Đăng ký User mới (Admin/HR only)

```mermaid
sequenceDiagram
    autonumber
    participant Admin as Admin User
    participant Page as UsersPage
    participant API as /api/admin/users
    participant MW as Auth Middleware
    participant VAL as Zod Validation
    participant AUTH as Auth Utils
    participant DB as MySQL Database

    Admin->>Page: Click "Thêm người dùng"
    Page->>Page: Open Dialog form
    Admin->>Page: Fill form & Submit
    
    Page->>API: POST /api/admin/users<br/>Headers: {Authorization: Bearer <token>}<br/>Body: {username, email, password, role, employeeId}
    
    API->>MW: requireAuth(request)
    MW->>MW: getAuthToken(request)
    MW->>AUTH: verifyToken(token)
    
    alt Token invalid
        AUTH-->>MW: null
        MW-->>API: throw Error('Unauthorized')
        API-->>Page: 401 - Unauthorized
        Page->>Page: Redirect to /login
    end
    
    AUTH-->>MW: JWTPayload
    MW-->>API: authUser
    
    API->>MW: requireRole(authUser, [ADMIN])
    alt Không phải Admin
        MW-->>API: throw Error('Không có quyền')
        API-->>Page: 403 - Không có quyền truy cập
    end
    
    API->>VAL: userWithRolesSchema.parse(body)
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
    
    API->>AUTH: hashPassword(password)
    AUTH-->>API: hashedPassword
    
    API->>DB: INSERT INTO users (username, email, password, role, employeeId)
    DB-->>API: insertId
    
    API->>DB: INSERT INTO user_roles (userId, roleId)<br/>SELECT id FROM roles WHERE code = ?
    DB-->>API: Success
    
    API-->>Page: 200 - {success: true, data: newUser}
    Page->>Page: fetchUsers() - Refresh list
    Page-->>Admin: Hiển thị thông báo thành công
```

## 1.5 Auth Middleware Flow

```mermaid
sequenceDiagram
    autonumber
    participant Client as Client
    participant API as API Route
    participant MW as Auth Middleware
    participant AUTH as Auth Utils
    participant DB as Database

    Client->>API: Request with Authorization header
    API->>MW: requireAuth(request)
    
    MW->>MW: getAuthToken(request)
    MW->>MW: Extract token from "Bearer <token>"
    
    alt No Authorization header
        MW-->>API: throw Error('Không có token xác thực')
        API-->>Client: 401 - Unauthorized
    end
    
    MW->>AUTH: verifyToken(token)
    
    alt Token expired
        AUTH-->>MW: null
        MW-->>API: throw Error('Token hết hạn')
        API-->>Client: 401 - Token expired
    end
    
    alt Token invalid
        AUTH-->>MW: null
        MW-->>API: throw Error('Token không hợp lệ')
        API-->>Client: 401 - Invalid token
    end
    
    AUTH-->>MW: JWTPayload {userId, username, role, employeeId}
    MW-->>API: authUser (JWTPayload)
    
    Note over API: Tiếp tục xử lý request<br/>với thông tin user đã xác thực
```

## 1.6 Role-based Access Control Flow

```mermaid
sequenceDiagram
    autonumber
    participant API as API Route
    participant MW as Auth Middleware
    participant AUTH as Auth Utils

    Note over API,MW: Sau khi requireAuth() thành công

    API->>MW: requireRole(authUser, [ADMIN, HR])
    
    MW->>MW: Check authUser.role in allowedRoles
    
    alt Role allowed
        MW-->>API: OK (no error)
        Note over API: Tiếp tục xử lý
    else Role not allowed
        MW-->>API: throw Error('Không có quyền truy cập')
        API-->>Client: 403 - Forbidden
    end
```

## 1.7 Permission-based Access Control (Client-side)

```mermaid
sequenceDiagram
    autonumber
    participant Page as Page Component
    participant Hook as useAuth Hook
    participant UI as UI Elements

    Page->>Hook: useAuth()
    Hook-->>Page: {hasPermission, permissions}
    
    Page->>Hook: hasPermission('employees.create')
    Hook->>Hook: permissions.includes('employees.create')
    Hook-->>Page: boolean canCreate
    
    Page->>Hook: hasPermission('employees.edit')
    Hook-->>Page: boolean canEdit
    
    Page->>Hook: hasPermission('employees.delete')
    Hook-->>Page: boolean canDelete
    
    Page->>UI: Conditional render buttons
    
    alt canCreate
        UI-->>User: Show "Thêm mới" button
    end
    
    alt canEdit
        UI-->>User: Show Edit icon on rows
    end
    
    alt canDelete
        UI-->>User: Show Delete icon on rows
    end
```
