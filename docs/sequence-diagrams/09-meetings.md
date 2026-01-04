# Sequence Diagram: Quản lý Lịch họp (Meetings Management)

## 1. Tạo cuộc họp mới (Create Meeting)

```mermaid
sequenceDiagram
    autonumber
    actor User as 👤 User
    participant UI as 📱 Meetings Page
    participant API as 🔌 /api/meetings
    participant Auth as 🔐 Auth Middleware
    participant DB as 🗄️ MySQL Database

    User->>UI: Nhấn "Tạo cuộc họp"
    UI->>UI: Mở dialog form

    User->>UI: Nhập thông tin cuộc họp
    Note over User,UI: title, date, time, duration,<br/>location, attendees, notes,<br/>reminderEnabled, reminderMinutes

    User->>UI: Nhấn "Tạo"
    UI->>API: POST /api/meetings
    Note over UI,API: Authorization: Bearer {token}<br/>Body: { meetingData }

    API->>Auth: requireAuth(request)
    Auth->>Auth: Verify JWT Token
    Auth-->>API: User authenticated

    API->>Auth: getAuthUser(request)
    Auth->>DB: SELECT user info
    DB-->>Auth: User data (id, role, employeeId)
    Auth-->>API: User info

    alt employeeId is null
        API-->>UI: 400 - Tài khoản chưa liên kết nhân viên
        UI-->>User: Hiển thị lỗi
    end

    API->>API: Validate với Zod schema
    alt Validation fails
        API-->>UI: 400 - Validation error
        UI-->>User: Hiển thị lỗi validation
    end

    API->>DB: INSERT INTO meetings<br/>(title, date, time, duration, location,<br/>attendees, notes, reminderEnabled,<br/>reminderMinutes, createdBy)
    DB-->>API: insertId

    API->>DB: SELECT * FROM meetings WHERE id = ?
    DB-->>API: New meeting data

    API-->>UI: 200 - { success: true, data: meeting }
    UI->>UI: Đóng dialog, refresh list
    UI-->>User: Hiển thị thông báo thành công
```

## 2. Xem danh sách cuộc họp (List Meetings)

```mermaid
sequenceDiagram
    autonumber
    actor User as 👤 User
    participant UI as 📱 Meetings Page
    participant API as 🔌 /api/meetings
    participant Auth as 🔐 Auth Middleware
    participant DB as 🗄️ MySQL Database

    User->>UI: Truy cập /meetings
    UI->>API: GET /api/meetings
    Note over UI,API: Authorization: Bearer {token}

    API->>Auth: requireAuth(request)
    Auth->>Auth: Verify JWT Token
    Auth-->>API: User authenticated

    API->>Auth: getAuthUser(request)
    Auth->>DB: SELECT user info
    DB-->>Auth: User data
    Auth-->>API: User info (role, employeeId)

    alt Role = admin/hr/manager
        API->>DB: SELECT m.*, e.firstName, e.lastName<br/>FROM meetings m<br/>LEFT JOIN employees e ON m.createdBy = e.id<br/>ORDER BY date DESC, time ASC
        DB-->>API: All meetings
    else Role = employee
        API->>DB: SELECT m.*, ...<br/>FROM meetings m<br/>WHERE m.createdBy = {employeeId}
        DB-->>API: User's meetings only
    end

    API-->>UI: 200 - { success: true, data: meetings[] }
    UI->>UI: Render bảng cuộc họp
    UI->>UI: Tính stats (hôm nay, sắp tới, tổng)
    UI-->>User: Hiển thị danh sách
```

## 3. Cập nhật cuộc họp (Update Meeting)

```mermaid
sequenceDiagram
    autonumber
    actor User as 👤 User
    participant UI as 📱 Meetings Page
    participant API as 🔌 /api/meetings/[id]
    participant Auth as 🔐 Auth Middleware
    participant DB as 🗄️ MySQL Database

    User->>UI: Nhấn icon Edit
    UI->>UI: Mở dialog với data hiện tại

    User->>UI: Sửa thông tin
    User->>UI: Nhấn "Cập nhật"

    UI->>API: PUT /api/meetings/{id}
    Note over UI,API: Authorization: Bearer {token}<br/>Body: { updatedData }

    API->>Auth: requireAuth(request)
    Auth-->>API: User authenticated

    API->>Auth: getAuthUser(request)
    Auth-->>API: User info

    API->>DB: SELECT * FROM meetings WHERE id = ?
    DB-->>API: Existing meeting

    alt Meeting not found
        API-->>UI: 404 - Không tìm thấy cuộc họp
        UI-->>User: Hiển thị lỗi
    end

    API->>API: Check quyền sửa
    Note over API: admin/hr: luôn được sửa<br/>others: chỉ sửa meeting của mình

    alt Không có quyền
        API-->>UI: 403 - Không có quyền sửa
        UI-->>User: Hiển thị lỗi
    end

    API->>API: Build dynamic UPDATE query
    API->>DB: UPDATE meetings SET ... WHERE id = ?
    DB-->>API: Success

    API->>DB: SELECT * FROM meetings WHERE id = ?
    DB-->>API: Updated meeting

    API-->>UI: 200 - { success: true, data: meeting }
    UI->>UI: Đóng dialog, refresh list
    UI-->>User: Hiển thị thông báo thành công
```

## 4. Xóa cuộc họp (Delete Meeting)

```mermaid
sequenceDiagram
    autonumber
    actor User as 👤 User
    participant UI as 📱 Meetings Page
    participant API as 🔌 /api/meetings/[id]
    participant Auth as 🔐 Auth Middleware
    participant DB as 🗄️ MySQL Database

    User->>UI: Nhấn icon Delete
    UI->>UI: Mở dialog xác nhận

    User->>UI: Nhấn "Xóa"
    UI->>API: DELETE /api/meetings/{id}
    Note over UI,API: Authorization: Bearer {token}

    API->>Auth: requireAuth(request)
    Auth-->>API: User authenticated

    API->>Auth: getAuthUser(request)
    Auth-->>API: User info

    API->>DB: SELECT * FROM meetings WHERE id = ?
    DB-->>API: Existing meeting

    alt Meeting not found
        API-->>UI: 404 - Không tìm thấy
        UI-->>User: Hiển thị lỗi
    end

    API->>API: Check quyền xóa
    Note over API: admin: luôn được xóa<br/>others: chỉ xóa meeting của mình

    alt Không có quyền
        API-->>UI: 403 - Không có quyền xóa
        UI-->>User: Hiển thị lỗi
    end

    API->>DB: DELETE FROM notification_logs WHERE meetingId = ?
    DB-->>API: Deleted logs

    API->>DB: DELETE FROM meetings WHERE id = ?
    DB-->>API: Deleted

    API-->>UI: 200 - { success: true }
    UI->>UI: Đóng dialog, refresh list
    UI-->>User: Hiển thị thông báo thành công
```

## 5. Cấu hình Telegram Bot (Telegram Config)

```mermaid
sequenceDiagram
    autonumber
    actor User as 👤 User
    participant UI as 📱 Meetings Page (Tab Settings)
    participant API as 🔌 /api/meetings/telegram-config
    participant Auth as 🔐 Auth Middleware
    participant DB as 🗄️ MySQL Database

    User->>UI: Chọn tab "Cài đặt Telegram"
    UI->>API: GET /api/meetings/telegram-config
    Note over UI,API: Authorization: Bearer {token}

    API->>Auth: requireAuth(request)
    Auth-->>API: User authenticated

    API->>Auth: getAuthUser(request)
    Auth-->>API: User info

    API->>DB: SELECT * FROM telegram_config WHERE userId = ?
    DB-->>API: Config data (or null)

    API-->>UI: 200 - { success: true, data: config }
    UI->>UI: Populate form fields
    UI-->>User: Hiển thị cấu hình hiện tại

    User->>UI: Nhập Bot Token & Chat ID
    User->>UI: Bật/tắt enabled
    User->>UI: Nhấn "Lưu cấu hình"

    UI->>API: PUT /api/meetings/telegram-config
    Note over UI,API: Body: { botToken, chatId, enabled }

    API->>Auth: requireAuth(request)
    Auth-->>API: User authenticated

    API->>API: Validate với Zod schema

    API->>DB: SELECT * FROM telegram_config WHERE userId = ?
    DB-->>API: Existing config (or null)

    alt Config exists
        API->>DB: UPDATE telegram_config SET ... WHERE userId = ?
    else Config not exists
        API->>DB: INSERT INTO telegram_config (userId, botToken, chatId, enabled)
    end
    DB-->>API: Success

    API->>DB: SELECT * FROM telegram_config WHERE userId = ?
    DB-->>API: Updated config

    API-->>UI: 200 - { success: true, data: config }
    UI-->>User: Hiển thị thông báo thành công
```

## 6. Test kết nối Telegram (Test Telegram Connection)

```mermaid
sequenceDiagram
    autonumber
    actor User as 👤 User
    participant UI as 📱 Meetings Page
    participant API as 🔌 /api/meetings/telegram-config/test
    participant Auth as 🔐 Auth Middleware
    participant DB as 🗄️ MySQL Database
    participant TG as 📱 Telegram API

    User->>UI: Nhấn "Gửi test"
    UI->>API: POST /api/meetings/telegram-config/test
    Note over UI,API: Authorization: Bearer {token}

    API->>Auth: requireAuth(request)
    Auth-->>API: User authenticated

    API->>Auth: getAuthUser(request)
    Auth-->>API: User info

    API->>DB: SELECT * FROM telegram_config WHERE userId = ?
    DB-->>API: Config data

    alt Config not found
        API-->>UI: 400 - Chưa cấu hình Telegram
        UI-->>User: Hiển thị lỗi
    end

    API->>API: Format test message
    Note over API: 🔔 Test thông báo từ HRMS<br/>Kết nối thành công!<br/>Thời gian: {datetime}

    API->>TG: POST /bot{token}/sendMessage
    Note over API,TG: { chat_id, text, parse_mode: "Markdown" }

    alt Telegram success
        TG-->>API: { ok: true, result: {...} }
        API-->>UI: 200 - { success: true, message }
        UI-->>User: "Đã gửi tin nhắn test thành công!"
    else Telegram error
        TG-->>API: { ok: false, description: "..." }
        API-->>UI: 400 - { error: description }
        UI-->>User: Hiển thị lỗi từ Telegram
    end
```

## 7. Gửi nhắc nhở tự động (Send Reminders - Cron Job)

```mermaid
sequenceDiagram
    autonumber
    participant Cron as ⏰ Cron Service
    participant API as 🔌 /api/meetings/send-reminders
    participant DB as 🗄️ MySQL Database
    participant TG as 📱 Telegram API

    Cron->>API: GET /api/meetings/send-reminders
    Note over Cron,API: Header: x-cron-secret (optional)

    alt CRON_SECRET is set
        API->>API: Verify cron secret
        alt Invalid secret
            API-->>Cron: 401 - Unauthorized
        end
    end

    API->>DB: SELECT meetings cần nhắc nhở
    Note over API,DB: WHERE reminderEnabled = 1<br/>AND reminderSent = 0<br/>AND meeting_time > NOW()<br/>AND NOW() >= meeting_time - reminderMinutes
    DB-->>API: Meetings to remind[]

    loop For each meeting
        API->>API: Check Telegram config exists & enabled

        alt No Telegram config
            API->>API: Skip, log reason
        else Has config
            API->>API: Format reminder message
            Note over API: 🔔 NHẮC NHỞ LỊCH HỌP<br/>📋 {title}<br/>📅 {date}<br/>⏰ {time}<br/>📍 {location}<br/>👥 {attendees}<br/>📝 {notes}

            API->>TG: POST /bot{token}/sendMessage
            
            alt Success
                TG-->>API: { ok: true }
                API->>DB: UPDATE meetings SET reminderSent = 1
                API->>DB: INSERT notification_logs (status: 'sent')
            else Failed
                TG-->>API: { ok: false, description }
                API->>DB: INSERT notification_logs (status: 'failed', error)
            end
        end
    end

    API-->>Cron: 200 - { success, processed, results[] }
```

## 8. Luồng phân quyền xem cuộc họp

```mermaid
flowchart TD
    A[User truy cập /meetings] --> B{Đã đăng nhập?}
    B -->|Không| C[Redirect /login]
    B -->|Có| D{Có permission meetings.view?}
    D -->|Không| E[403 Forbidden]
    D -->|Có| F{Role là gì?}
    
    F -->|admin/hr/manager| G[Xem tất cả cuộc họp]
    F -->|employee| H[Chỉ xem cuộc họp của mình]
    
    G --> I[Hiển thị danh sách]
    H --> I
    
    I --> J{Có quyền sửa?}
    J -->|admin/hr hoặc người tạo| K[Hiện Edit/Delete]
    J -->|Không| L[Ẩn Edit/Delete]
```

## Mô tả các bảng dữ liệu

### Bảng `meetings`
| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary Key, Auto Increment |
| title | VARCHAR(255) | Tiêu đề cuộc họp |
| date | DATE | Ngày họp |
| time | TIME | Giờ bắt đầu |
| duration | INT | Thời lượng (phút) |
| location | VARCHAR(255) | Địa điểm |
| attendees | TEXT | Danh sách người tham dự |
| notes | TEXT | Ghi chú, nội dung |
| reminderEnabled | BOOLEAN | Bật/tắt nhắc nhở |
| reminderMinutes | INT | Nhắc trước bao nhiêu phút |
| reminderSent | BOOLEAN | Đã gửi nhắc nhở chưa |
| createdBy | INT | FK → employees.id |
| createdAt | TIMESTAMP | Thời gian tạo |
| updatedAt | TIMESTAMP | Thời gian cập nhật |

### Bảng `telegram_config`
| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary Key, Auto Increment |
| userId | INT | FK → users.id (Unique) |
| botToken | VARCHAR(255) | Token của Telegram Bot |
| chatId | VARCHAR(100) | ID chat/group/channel |
| enabled | BOOLEAN | Bật/tắt thông báo |
| createdAt | TIMESTAMP | Thời gian tạo |
| updatedAt | TIMESTAMP | Thời gian cập nhật |

### Bảng `notification_logs`
| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary Key, Auto Increment |
| meetingId | INT | FK → meetings.id |
| status | ENUM | 'sent' / 'failed' |
| error | TEXT | Chi tiết lỗi (nếu failed) |
| sentAt | TIMESTAMP | Thời gian gửi |

## Permissions liên quan
- `meetings.view` - Xem danh sách cuộc họp
- `meetings.create` - Tạo cuộc họp mới
- `meetings.update` - Cập nhật cuộc họp
- `meetings.delete` - Xóa cuộc họp
- `meetings.config` - Cấu hình Telegram
