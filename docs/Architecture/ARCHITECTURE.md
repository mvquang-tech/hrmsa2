# Sơ đồ Kiến trúc Dự án HRMS

## Tổng quan

Hệ thống HRMS (Human Resource Management System) được xây dựng trên nền tảng **Next.js 14** với kiến trúc Full-Stack, sử dụng **MySQL** làm database và **JWT** cho authentication.

## Kiến trúc Tổng thể

```mermaid
graph TB
    subgraph "Client Layer"
        Browser[Browser/Client]
    end
    
    subgraph "Next.js Application"
        subgraph "Frontend (React)"
            Pages[Pages Components]
            Layout[Layout Component]
            AuthHook[useAuth Hook]
            UI[MUI Components]
        end
        
        subgraph "API Layer (Next.js API Routes)"
            AuthAPI[Auth API<br/>/api/auth/*]
            DeptAPI[Departments API<br/>/api/departments/*]
            EmpAPI[Employees API<br/>/api/employees/*]
            LeaveAPI[Leaves API<br/>/api/leaves/*]
            OTAPI[Overtime API<br/>/api/overtime/*]
            AdminAPI[Admin API<br/>/api/admin/*]
        end
        
        subgraph "Middleware & Services"
            AuthMW[Auth Middleware]
            RBAC[RBAC Service]
            Validation[Zod Validation]
            DBHelper[DB Helpers]
        end
        
        subgraph "Data Access Layer"
            DBPool[MySQL Connection Pool]
            Query[Query Functions]
        end
    end
    
    subgraph "Database (MySQL)"
        Users[(users)]
        Employees[(employees)]
        Departments[(departments)]
        Leaves[(leaves)]
        LeaveSessions[(leave_sessions)]
        Overtime[(overtime)]
        Roles[(roles)]
        Permissions[(permissions)]
        RolePerms[(role_permissions)]
        UserRoles[(user_roles)]
    end
    
    Browser --> Pages
    Pages --> Layout
    Pages --> AuthHook
    Pages --> UI
    AuthHook --> AuthAPI
    
    Pages --> AuthAPI
    Pages --> DeptAPI
    Pages --> EmpAPI
    Pages --> LeaveAPI
    Pages --> OTAPI
    Pages --> AdminAPI
    
    AuthAPI --> AuthMW
    DeptAPI --> AuthMW
    EmpAPI --> AuthMW
    LeaveAPI --> AuthMW
    OTAPI --> AuthMW
    AdminAPI --> AuthMW
    
    AuthMW --> RBAC
    AuthMW --> Validation
    AuthMW --> DBHelper
    
    DBHelper --> Query
    Query --> DBPool
    
    DBPool --> Users
    DBPool --> Employees
    DBPool --> Departments
    DBPool --> Leaves
    DBPool --> LeaveSessions
    DBPool --> Overtime
    DBPool --> Roles
    DBPool --> Permissions
    DBPool --> RolePerms
    DBPool --> UserRoles
```

## Cấu trúc Thư mục

```
hrmsa2/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes (Backend)
│   │   ├── auth/                 # Authentication endpoints
│   │   │   ├── login/route.ts
│   │   │   └── register/route.ts
│   │   ├── departments/          # Department management
│   │   │   ├── route.ts          # GET, POST
│   │   │   └── [id]/route.ts     # GET, PUT, DELETE
│   │   ├── employees/            # Employee management
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       ├── route.ts
│   │   │       └── account/route.ts
│   │   ├── leaves/               # Leave management
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── overtime/             # Overtime management
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   └── admin/               # RBAC administration
│   │       ├── roles/
│   │       ├── permissions/
│   │       └── users/
│   ├── departments/page.tsx     # Department page (Frontend)
│   ├── employees/page.tsx        # Employee page
│   ├── leaves/page.tsx           # Leave page
│   ├── overtime/page.tsx          # Overtime page
│   ├── admin/                    # Admin pages
│   │   ├── roles/page.tsx
│   │   └── users/page.tsx
│   ├── login/page.tsx            # Login page
│   ├── page.tsx                  # Dashboard
│   └── layout.tsx                # Root layout
│
├── components/                   # React Components
│   ├── Layout.tsx                # Main layout with sidebar
│   └── ThemeProvider.tsx         # MUI theme provider
│
├── hooks/                        # React Hooks
│   └── useAuth.tsx               # Authentication hook
│
├── lib/                          # Shared Libraries
│   ├── db.ts                     # Database connection pool
│   ├── middleware/
│   │   └── auth.ts               # Auth & RBAC middleware
│   ├── types/
│   │   └── index.ts              # TypeScript types
│   └── utils/
│       ├── auth.ts               # JWT & password utilities
│       ├── validation.ts        # Zod schemas
│       ├── db-helpers.ts         # Database helpers
│       └── leave-helpers.ts      # Leave calculation helpers
│
├── database/                     # Database Schemas
│   ├── schema.sql                # Main schema
│   ├── rbac-schema.sql           # RBAC tables
│   └── migration-*.sql          # Migration scripts
│
└── scripts/                      # Utility Scripts
    ├── init-db.ts                # Initialize database
    ├── create-admin.js           # Create admin user
    └── migrate-*.js              # Migration scripts
```

## Luồng Xác thực (Authentication Flow)

```mermaid
sequenceDiagram
    participant Client
    participant LoginPage
    participant AuthAPI
    participant AuthMW
    participant DB
    participant useAuth

    Client->>LoginPage: Nhập username/password
    LoginPage->>AuthAPI: POST /api/auth/login
    AuthAPI->>DB: Query user by username
    DB-->>AuthAPI: User data
    AuthAPI->>DB: Get user permissions (RBAC)
    DB-->>AuthAPI: Permissions list
    AuthAPI->>AuthAPI: Generate JWT token
    AuthAPI-->>LoginPage: { token, user, permissions }
    LoginPage->>useAuth: login(token, user, permissions)
    useAuth->>useAuth: Store in localStorage
    useAuth->>Client: Redirect to dashboard
```

## Luồng Phân quyền (Authorization Flow)

```mermaid
sequenceDiagram
    participant Client
    participant Page
    participant API
    participant AuthMW
    participant RBAC
    participant DB

    Client->>Page: Request protected page
    Page->>useAuth: Check authentication
    useAuth-->>Page: User & permissions
    Page->>Page: Check hasPermission()
    Page->>API: API request with JWT
    API->>AuthMW: requireAuth(request)
    AuthMW->>AuthMW: Verify JWT token
    AuthMW->>RBAC: Check permission
    RBAC->>DB: Query user permissions
    DB-->>RBAC: Permissions
    RBAC-->>AuthMW: Has permission?
    AuthMW-->>API: Authorized
    API->>DB: Execute query
    DB-->>API: Data
    API-->>Page: Response
    Page-->>Client: Render UI
```

## UML Class Diagrams

### Domain Models (Entities)

```mermaid
classDiagram
    direction TB
    
    class User {
        +int id
        +string username
        +string email
        +string password
        +UserRole role
        +int employeeId
        +Date createdAt
        +Date updatedAt
    }
    
    class Employee {
        +int id
        +string code
        +string firstName
        +string lastName
        +string email
        +string phone
        +string address
        +Date dateOfBirth
        +Date dateOfJoin
        +int departmentId
        +string position
        +number salary
        +EmployeeStatus status
        +Date createdAt
        +Date updatedAt
    }
    
    class Department {
        +int id
        +string name
        +string code
        +string description
        +int managerId
        +Date createdAt
        +Date updatedAt
    }
    
    class Leave {
        +int id
        +int employeeId
        +LeaveType type
        +Date startDate
        +Date endDate
        +number days
        +LeaveSessions sessions
        +string reason
        +LeaveStatus status
        +int approvedBy
        +Date approvedAt
        +Date createdAt
        +Date updatedAt
    }
    
    class Overtime {
        +int id
        +int employeeId
        +Date date
        +number hours
        +string reason
        +OvertimeStatus status
        +int approvedBy
        +Date approvedAt
        +Date createdAt
        +Date updatedAt
    }
    
    class Role {
        +int id
        +string name
        +string code
        +string description
        +boolean isSystem
        +boolean isActive
        +Date createdAt
        +Date updatedAt
        +Permission[] permissions
    }
    
    class Permission {
        +int id
        +string name
        +string code
        +string module
        +string action
        +string description
        +Date createdAt
        +Date updatedAt
    }
    
    class RolePermission {
        +int id
        +int roleId
        +int permissionId
        +Date createdAt
    }
    
    class UserRoleMapping {
        +int id
        +int userId
        +int roleId
        +Date createdAt
    }
    
    %% Enumerations
    class UserRole {
        <<enumeration>>
        ADMIN
        HR
        MANAGER
        EMPLOYEE
    }
    
    class EmployeeStatus {
        <<enumeration>>
        active
        inactive
        terminated
    }
    
    class LeaveType {
        <<enumeration>>
        annual
        sick
        personal
        maternity
        unpaid
    }
    
    class LeaveStatus {
        <<enumeration>>
        pending
        approved
        rejected
    }
    
    class OvertimeStatus {
        <<enumeration>>
        pending
        approved
        rejected
    }
    
    class SessionType {
        <<enumeration>>
        morning
        afternoon
    }
    
    %% Relationships
    User "1" --> "0..1" Employee : employeeId
    User "1" --> "*" UserRoleMapping : userId
    User --> UserRole : role
    
    Employee "1" --> "*" Leave : employeeId
    Employee "1" --> "*" Overtime : employeeId
    Employee "*" --> "1" Department : departmentId
    Employee --> EmployeeStatus : status
    
    Department "1" --> "0..1" Employee : managerId
    
    Leave --> LeaveType : type
    Leave --> LeaveStatus : status
    Leave "1" --> "0..1" User : approvedBy
    
    Overtime --> OvertimeStatus : status
    Overtime "1" --> "0..1" User : approvedBy
    
    Role "1" --> "*" RolePermission : roleId
    Role "1" --> "*" UserRoleMapping : roleId
    
    Permission "1" --> "*" RolePermission : permissionId
    
    UserRoleMapping "*" --> "1" User
    UserRoleMapping "*" --> "1" Role
    
    RolePermission "*" --> "1" Role
    RolePermission "*" --> "1" Permission
```

### Service Layer Classes

```mermaid
classDiagram
    direction TB
    
    %% Authentication & Authorization
    class AuthService {
        +generateToken(payload: JWTPayload) string
        +verifyToken(token: string) JWTPayload
        +hashPassword(password: string) Promise~string~
        +comparePassword(password: string, hash: string) Promise~boolean~
        +checkRole(userRole: UserRole, requiredRoles: UserRole[]) boolean
        +requireRole(userRole: UserRole, requiredRoles: UserRole[]) void
    }
    
    class JWTPayload {
        +int userId
        +string username
        +UserRole role
        +int employeeId
    }
    
    class AuthMiddleware {
        +getAuthToken(request: NextRequest) string
        +authenticate(request: NextRequest) JWTPayload
        +requireAuth(request: NextRequest) JWTPayload
        +requireRole(user: JWTPayload, roles: UserRole[]) void
        +hasPermission(userId: int, permissionCode: string) Promise~boolean~
        +getUserPermissions(userId: int) Promise~string[]~
        +requirePermission(user: JWTPayload, permissionCode: string) Promise~void~
        +createErrorResponse(message: string, status: int) NextResponse
    }
    
    %% Database Layer
    class DatabasePool {
        -Pool mysqlPool
        +getDbPool() Pool
        +query(sql: string, params: any[]) Promise~any~
    }
    
    class DBHelpers {
        +paginate~T~(table: string, params: PaginationParams, whereClause: string, whereParams: any[]) Promise~PaginatedResponse~T~~
        +formatDate(date: Date) string
        +parseDate(dateString: string) Date
        +normalizeQueryResult~T~(result: any) T[]
        +getFirstResult~T~(result: any) T
        +convertMySQLBooleans~T~(obj: T, fields: string[]) T
        +convertMySQLBooleansArray~T~(arr: T[], fields: string[]) T[]
    }
    
    %% Leave Helpers
    class LeaveHelpers {
        +generateDateRange(startDate: string, endDate: string) string[]
        +calculateDaysFromSessions(sessions: LeaveSessions) number
        +normalizeDate(date: string | Date) string
        +normalizeSessions(sessions: any) LeaveSessions
    }
    
    %% API Response Types
    class ApiResponse~T~ {
        +boolean success
        +T data
        +string message
        +string error
    }
    
    class PaginationParams {
        +int page
        +int limit
        +string sortBy
        +string sortOrder
    }
    
    class PaginatedResponse~T~ {
        +T[] data
        +int total
        +int page
        +int limit
        +int totalPages
    }
    
    %% Relationships
    AuthMiddleware --> AuthService : uses
    AuthMiddleware --> JWTPayload : creates
    AuthMiddleware --> DatabasePool : queries
    
    DBHelpers --> DatabasePool : uses
    DBHelpers --> PaginationParams : input
    DBHelpers --> PaginatedResponse : output
    
    LeaveHelpers ..> SessionType : uses
```

### Frontend Components & Hooks

```mermaid
classDiagram
    direction TB
    
    class AuthContext {
        +User user
        +string token
        +string[] permissions
        +login(username: string, password: string) Promise~void~
        +logout() void
        +boolean isAuthenticated
        +boolean isLoading
        +hasPermission(permission: string) boolean
        +hasAnyPermission(permissions: string[]) boolean
    }
    
    class AuthProvider {
        -User user
        -string token
        -string[] permissions
        -boolean isLoading
        +login(username: string, password: string) Promise~void~
        +logout() void
        +hasPermission(permission: string) boolean
        +hasAnyPermission(permissions: string[]) boolean
    }
    
    class useAuth {
        <<hook>>
        +User user
        +string token
        +string[] permissions
        +boolean isAuthenticated
        +boolean isLoading
        +login() Promise~void~
        +logout() void
        +hasPermission() boolean
        +hasAnyPermission() boolean
    }
    
    class Layout {
        <<component>>
        -boolean sidebarOpen
        -string[] menuItems
        +children ReactNode
        +render() JSX
    }
    
    class ThemeProvider {
        <<component>>
        +children ReactNode
        +theme Theme
        +render() JSX
    }
    
    %% Page Components
    class DashboardPage {
        <<page>>
        +render() JSX
    }
    
    class LoginPage {
        <<page>>
        -string username
        -string password
        -boolean loading
        -string error
        +handleLogin() void
        +render() JSX
    }
    
    class DepartmentsPage {
        <<page>>
        -Department[] departments
        -boolean loading
        +fetchDepartments() void
        +handleCreate() void
        +handleEdit() void
        +handleDelete() void
        +render() JSX
    }
    
    class EmployeesPage {
        <<page>>
        -Employee[] employees
        -boolean loading
        +fetchEmployees() void
        +handleCreate() void
        +handleEdit() void
        +handleDelete() void
        +handleCreateAccount() void
        +render() JSX
    }
    
    class LeavesPage {
        <<page>>
        -Leave[] leaves
        -boolean loading
        +fetchLeaves() void
        +handleCreate() void
        +handleApprove() void
        +handleReject() void
        +render() JSX
    }
    
    class OvertimePage {
        <<page>>
        -Overtime[] overtimes
        -boolean loading
        +fetchOvertimes() void
        +handleCreate() void
        +handleApprove() void
        +handleReject() void
        +render() JSX
    }
    
    class RolesPage {
        <<page>>
        -Role[] roles
        -Permission[] permissions
        -boolean loading
        +fetchRoles() void
        +handleCreate() void
        +handleEdit() void
        +handleAssignPermissions() void
        +render() JSX
    }
    
    class UsersPage {
        <<page>>
        -User[] users
        -Role[] roles
        -boolean loading
        +fetchUsers() void
        +handleAssignRoles() void
        +render() JSX
    }
    
    %% Relationships
    AuthProvider --> AuthContext : provides
    useAuth --> AuthContext : consumes
    
    Layout --> useAuth : uses
    LoginPage --> useAuth : uses
    DashboardPage --> Layout : wraps
    DepartmentsPage --> Layout : wraps
    EmployeesPage --> Layout : wraps
    LeavesPage --> Layout : wraps
    OvertimePage --> Layout : wraps
    RolesPage --> Layout : wraps
    UsersPage --> Layout : wraps
    
    DepartmentsPage --> useAuth : uses
    EmployeesPage --> useAuth : uses
    LeavesPage --> useAuth : uses
    OvertimePage --> useAuth : uses
    RolesPage --> useAuth : uses
    UsersPage --> useAuth : uses
```

### Validation Schemas (Zod)

```mermaid
classDiagram
    direction TB
    
    class ValidationSchemas {
        <<module>>
    }
    
    class loginSchema {
        +string username
        +string password
    }
    
    class registerSchema {
        +string username
        +string email
        +string password
        +UserRole role
    }
    
    class departmentSchema {
        +string name
        +string code
        +string description
        +int managerId
    }
    
    class employeeSchema {
        +string code
        +string firstName
        +string lastName
        +string email
        +string phone
        +string address
        +string dateOfBirth
        +string dateOfJoin
        +int departmentId
        +string position
        +number salary
        +EmployeeStatus status
    }
    
    class leaveSchema {
        +int employeeId
        +LeaveType type
        +string startDate
        +string endDate
        +number days
        +LeaveSessions sessions
        +string reason
        +LeaveStatus status
    }
    
    class overtimeSchema {
        +int employeeId
        +string date
        +number hours
        +string reason
        +OvertimeStatus status
    }
    
    class roleSchema {
        +string name
        +string code
        +string description
        +boolean isActive
    }
    
    class permissionSchema {
        +string name
        +string code
        +string module
        +string action
        +string description
    }
    
    class paginationSchema {
        +int page
        +int limit
        +string sortBy
        +string sortOrder
    }
    
    class idSchema {
        +int id
    }
    
    ValidationSchemas --> loginSchema
    ValidationSchemas --> registerSchema
    ValidationSchemas --> departmentSchema
    ValidationSchemas --> employeeSchema
    ValidationSchemas --> leaveSchema
    ValidationSchemas --> overtimeSchema
    ValidationSchemas --> roleSchema
    ValidationSchemas --> permissionSchema
    ValidationSchemas --> paginationSchema
    ValidationSchemas --> idSchema
```

## Kiến trúc Database (ER Diagram)

```mermaid
erDiagram
    users ||--o{ user_roles : has
    users ||--o| employees : "linked to"
    
    roles ||--o{ user_roles : assigned
    roles ||--o{ role_permissions : has
    
    permissions ||--o{ role_permissions : assigned
    
    departments ||--o{ employees : contains
    departments ||--o| employees : "managed by"
    
    employees ||--o{ leaves : requests
    employees ||--o{ overtime : requests
    employees ||--o{ users : "has account"
    
    leaves ||--o{ leave_sessions : has
    leaves ||--o| users : "approved by"
    
    users {
        int id PK
        string username UK
        string email UK
        string password
        enum role
        int employeeId FK
        datetime createdAt
        datetime updatedAt
    }
    
    employees {
        int id PK
        string code UK
        string firstName
        string lastName
        string email UK
        string phone
        string address
        date dateOfBirth
        date dateOfJoin
        int departmentId FK
        string position
        decimal salary
        enum status
        datetime createdAt
        datetime updatedAt
    }
    
    departments {
        int id PK
        string name
        string code UK
        text description
        int managerId FK
        datetime createdAt
        datetime updatedAt
    }
    
    leaves {
        int id PK
        int employeeId FK
        enum type
        date startDate
        date endDate
        decimal days
        text reason
        enum status
        int approvedBy FK
        datetime approvedAt
        datetime createdAt
        datetime updatedAt
    }
    
    leave_sessions {
        int id PK
        int leaveId FK
        date date
        enum sessionType
        datetime createdAt
    }
    
    overtime {
        int id PK
        int employeeId FK
        date date
        decimal hours
        text reason
        enum status
        int approvedBy FK
        datetime approvedAt
        datetime createdAt
        datetime updatedAt
    }
    
    roles {
        int id PK
        string code UK
        string name
        text description
        boolean isActive
        boolean isSystem
        datetime createdAt
        datetime updatedAt
    }
    
    permissions {
        int id PK
        string code UK
        string name
        string module
        string action
        text description
        datetime createdAt
        datetime updatedAt
    }
    
    role_permissions {
        int id PK
        int roleId FK
        int permissionId FK
        datetime createdAt
    }
    
    user_roles {
        int id PK
        int userId FK
        int roleId FK
        datetime createdAt
    }
```

## Các Module Chính

### 1. Authentication & Authorization
- **JWT-based authentication**: Token được lưu trong localStorage
- **RBAC (Role-Based Access Control)**: 
  - Roles: Admin, HR, Manager, Employee
  - Permissions: Fine-grained permissions per module
  - Dynamic permission checking

### 2. Department Management
- CRUD operations
- Manager assignment
- Permission-based access control

### 3. Employee Management
- CRUD operations
- Account creation for employees
- Department linking

### 4. Leave Management
- Create leave requests
- Session-based leave (morning/afternoon)
- Half-day leave support (0.5 days)
- Approval workflow
- Separate `leave_sessions` table for session tracking

### 5. Overtime Management
- Create overtime requests
- Hours tracking
- Approval workflow

### 6. RBAC Administration
- Role management
- Permission management
- User-role assignment
- Permission-role assignment

## Công nghệ Sử dụng

### Frontend
- **Next.js 14** (App Router)
- **React 18**
- **Material-UI (MUI)** v5
- **TypeScript**
- **date-fns** (Date manipulation)

### Backend
- **Next.js API Routes**
- **MySQL 8.0+** (mysql2/promise)
- **JWT** (jsonwebtoken)
- **bcryptjs** (Password hashing)
- **Zod** (Schema validation)

### Database
- **MySQL** với InnoDB engine
- Connection pooling
- Foreign key constraints
- Indexes for performance

## Security Features

1. **Password Hashing**: bcryptjs với salt rounds
2. **JWT Tokens**: Secure token generation và validation
3. **SQL Injection Prevention**: Prepared statements
4. **RBAC**: Fine-grained permission control
5. **Input Validation**: Zod schemas cho tất cả inputs
6. **CORS**: Next.js built-in CORS handling

## Performance Optimizations

1. **Connection Pooling**: MySQL connection pool với limit 5
2. **Global Pool**: Singleton pattern để tránh multiple pools
3. **Indexes**: Database indexes trên các cột thường query
4. **Pagination**: API pagination cho large datasets
5. **Client-side Caching**: localStorage cho auth state

## Deployment Considerations

- Environment variables: `.env.local`
- Database migrations: Script-based migrations
- Build: `npm run build`
- Production: `npm start`
- Database connection: Configurable via env vars

