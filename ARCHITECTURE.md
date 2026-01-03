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

## Kiến trúc Database

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
        string username
        string email
        string password
        enum role
        int employeeId FK
    }
    
    employees {
        int id PK
        string code
        string firstName
        string lastName
        int departmentId FK
    }
    
    departments {
        int id PK
        string name
        string code
        int managerId FK
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
    }
    
    leave_sessions {
        int id PK
        int leaveId FK
        date date
        enum sessionType
    }
    
    overtime {
        int id PK
        int employeeId FK
        date date
        decimal hours
        text reason
        enum status
        int approvedBy FK
    }
    
    roles {
        int id PK
        string code
        string name
        boolean isActive
        boolean isSystem
    }
    
    permissions {
        int id PK
        string code
        string name
        string module
    }
    
    role_permissions {
        int roleId FK
        int permissionId FK
    }
    
    user_roles {
        int userId FK
        int roleId FK
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

