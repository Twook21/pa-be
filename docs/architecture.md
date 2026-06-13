# Arsitektur FinTap Backend Microservices

## Daftar Isi

- [Gambaran Umum](#gambaran-umum)
- [Diagram Arsitektur](#diagram-arsitektur)
- [Daftar Service dan Port](#daftar-service-dan-port)
- [Pemisahan Database Schema](#pemisahan-database-schema)
- [Komunikasi Antar Service](#komunikasi-antar-service)
- [Shared Package (@fintap/shared)](#shared-package-fintapshared)
- [Panduan Setup Environment](#panduan-setup-environment)
- [Alur Kerja Development](#alur-kerja-development)
- [Dokumentasi API](#dokumentasi-api)

---

## Gambaran Umum

FinTap YPLP Backend adalah sistem REST API untuk manajemen kehadiran (attendance management) berbasis GPS. Dibangun menggunakan arsitektur **microservices monorepo** dengan teknologi:

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Package Manager**: npm workspaces
- **Notification**: Nodemailer (email), Firebase Cloud Messaging (push)
- **Scheduler**: node-cron
- **API Docs**: Swagger/OpenAPI 3.0

Sistem terdiri dari **7 service** yang berjalan sebagai proses terpisah, saling berkomunikasi melalui HTTP REST internal, dan satu shared package yang berisi kode bersama.

---

## Diagram Arsitektur

```mermaid
graph TB
    subgraph Clients
        FE[Next.js Frontend]
        Mobile[Mobile App]
    end

    subgraph Gateway["API Gateway :3000"]
        GW[Express + Helmet + CORS]
        SW[Swagger UI /api-docs]
        RL[Rate Limiter]
        PROXY[Proxy Middleware]
    end

    subgraph Services["Microservices"]
        AUTH["Auth Service :3001<br/>(Users, Profile, Admin)"]
        ATT["Attendance Service :3002<br/>(Check-in/out, Stats)"]
        ACT["Activity Service :3003<br/>(Kegiatan Khusus)"]
        REQ["Request Service :3004<br/>(Cuti, Dinas Luar)"]
        CFG["Config Service :3005<br/>(Location, Settings, Calendar)"]
        NOTIF["Notification Service :3006<br/>(DB, Email, FCM)"]
    end

    subgraph Shared["Shared Package"]
        TYPES[Types/DTOs]
        ERRORS[Error Classes]
        UTILS[Utilities]
        VALIDATORS[Zod Validators]
    end

    subgraph External["External Services"]
        DB[(PostgreSQL / Supabase)]
        FCM[Firebase Cloud Messaging]
        SMTP[SMTP Server]
        CALAPI[Indonesian Calendar API]
    end

    FE --> GW
    Mobile --> GW
    GW --> RL --> PROXY
    PROXY --> AUTH & ATT & ACT & REQ & CFG & NOTIF

    AUTH --> DB
    ATT --> DB
    ACT --> DB
    REQ --> DB
    CFG --> DB & CALAPI
    NOTIF --> DB & FCM & SMTP

    ATT -.->|HTTP| CFG
    ATT -.->|HTTP| ACT
    ATT -.->|HTTP| NOTIF
    REQ -.->|HTTP| NOTIF
    ACT -.->|HTTP| NOTIF
    CFG -.->|HTTP| NOTIF

    AUTH --- Shared
    ATT --- Shared
    ACT --- Shared
    REQ --- Shared
    CFG --- Shared
    NOTIF --- Shared
```

---

## Daftar Service dan Port

| # | Service | Port | Package Name | Tanggung Jawab |
|---|---------|------|--------------|----------------|
| 1 | **Gateway** | 3000 | `gateway` | Entry point tunggal, routing, rate limiting, Swagger UI, security headers |
| 2 | **Auth** | 3001 | `auth` | Autentikasi (login/register/logout), password recovery, manajemen user (admin), profil pengguna |
| 3 | **Attendance** | 3002 | `attendance` | Check-in/check-out berbasis GPS, riwayat kehadiran, statistik, dashboard admin, laporan PDF |
| 4 | **Activity** | 3003 | `activity` | CRUD kegiatan khusus yang meng-override jadwal kehadiran default |
| 5 | **Request** | 3004 | `request` | Pengajuan cuti/izin (leave request) dan dinas luar (external duty) dengan workflow approval |
| 6 | **Config** | 3005 | `config` | Lokasi kantor, pengaturan waktu kehadiran, kalender & hari libur, scheduled jobs |
| 7 | **Notification** | 3006 | `notification` | Notifikasi multi-channel (database, email, FCM), user location tracking |

---

## Pemisahan Database Schema

Semua service terhubung ke **satu instance PostgreSQL** (Supabase) tetapi menggunakan **schema terpisah** untuk isolasi data:

| Schema | Service | Tabel |
|--------|---------|-------|
| `auth_schema` | Auth | `users` |
| `attendance_schema` | Attendance | `attendances` |
| `activity_schema` | Activity | `activities` |
| `request_schema` | Request | `leave_requests`, `external_duties` |
| `config_schema` | Config | `locations`, `attendance_settings`, `calendars` |
| `notification_schema` | Notification | `notifications`, `user_locations` |

### Keuntungan Pemisahan Schema

- **Isolasi domain**: Setiap service hanya mengelola tabel miliknya sendiri
- **Migrasi independen**: Perubahan schema pada satu service tidak mempengaruhi service lain
- **Keamanan**: Prisma client per service hanya memiliki akses ke schema yang relevan
- **Skalabilitas**: Memudahkan migrasi ke database terpisah di masa depan

### Catatan Penting

- Tidak ada foreign key cross-schema. Relasi antar service dijaga melalui `userId` (integer) yang konsisten.
- Setiap service memiliki file `prisma/schema.prisma` sendiri dengan konfigurasi `schemas = ["<nama_schema>"]`.
- Migrasi dijalankan per service menggunakan `prisma migrate dev`.

---

## Komunikasi Antar Service

### Pola Komunikasi: HTTP REST Internal

Service berkomunikasi melalui **HTTP REST** menggunakan `axios` dengan konfigurasi berikut:

```
┌──────────────────────────────────────────────────────────────┐
│                        API Gateway                            │
│  Client Request → Helmet → CORS → Body Parser → Rate Limit  │
│                 → Route Match → Proxy → Service              │
└────────────────────────────┬─────────────────────────────────┘
                             │
              ┌──────────────┼──────────────────┐
              ▼              ▼                   ▼
     ┌──────────────┐ ┌──────────────┐  ┌──────────────┐
     │ Auth :3001   │ │ Attend :3002 │  │ Config :3005 │
     └──────────────┘ └──────┬───────┘  └──────────────┘
                             │
                    Internal HTTP call
                             │
                    ┌────────┴────────┐
                    ▼                 ▼
           ┌──────────────┐  ┌──────────────┐
           │ Config :3005 │  │ Notif :3006  │
           └──────────────┘  └──────────────┘
```

### Internal Headers

Gateway meneruskan header berikut ke downstream services:

| Header | Deskripsi |
|--------|-----------|
| `x-user-id` | ID pengguna yang terautentikasi |
| `x-user-role` | Role pengguna (`admin` / `user`) |
| `x-user-email` | Email pengguna |
| `x-request-id` | UUID unik per request untuk tracing |
| `content-type` | Tipe konten request |

### Timeout dan Error Handling

- **Timeout**: 10 detik per request ke downstream service
- **Connection refused/not found**: Response `503 Service Unavailable` dengan code `SERVICE_UNREACHABLE`
- **Timeout exceeded**: Response `503 Service Unavailable` dengan code `SERVICE_TIMEOUT`
- **Non-2xx dari service**: Gateway meneruskan status code dan body response apa adanya (passthrough)

### Contoh Alur Inter-Service

```
1. User check-in di Attendance Service
2. Attendance perlu cek Activity hari ini → HTTP GET ke Activity Service :3003
3. Attendance perlu cek setting waktu → HTTP GET ke Config Service :3005
4. Attendance perlu cek lokasi kantor → HTTP GET ke Config Service :3005
5. Check-in berhasil, user terlambat → HTTP POST ke Notification Service :3006
```

### Rate Limiting

| Scope | Limit | Window |
|-------|-------|--------|
| Global (semua endpoint) | 100 request | 15 menit per IP |
| Login endpoint | 5 request | 1 menit per IP |
| Attendance endpoints | 10 request | 1 menit per IP |

---

## Shared Package (@fintap/shared)

Package `@fintap/shared` (`packages/shared/`) berisi kode yang digunakan bersama oleh semua service:

### Types/DTOs

File-file di `src/types/`:
- `common.ts` — Interface response standar, pagination meta, base DTO
- `user.dto.ts` — UserResponse, RegisterDTO, LoginDTO
- `attendance.dto.ts` — CheckInDTO, CheckOutDTO, AttendanceRecord, TodayStatus
- `activity.dto.ts` — CreateActivityDTO, ActivityFilters, ActivityRecord
- `leave-request.dto.ts` — CreateLeaveDTO, LeaveFilters
- `external-duty.dto.ts` — CreateExternalDutyDTO
- `notification.dto.ts` — NotificationPayload
- `location.dto.ts` — LocationDTO
- `calendar.dto.ts` — CalendarEntry

### Error Classes

File-file di `src/errors/`:
- `AppError` — Base error class dengan `statusCode` dan `code`
- `ValidationError` — HTTP 422, input validation failures
- `AuthError` — HTTP 401/403, authentication/authorization failures
- `NotFoundError` — HTTP 404, resource not found
- `ServiceUnavailableError` — HTTP 503, downstream service unavailable

### Utilities

File-file di `src/utils/`:
- `response-formatter.ts` — `formatSuccess()`, `formatPaginated()`, `formatError()`
- `haversine.ts` — `calculateDistance(lat1, lon1, lat2, lon2)` untuk validasi radius GPS
- `logger-factory.ts` — `createLogger(serviceName)` berbasis Winston

### Validators (Zod Schemas)

File-file di `src/validators/`:
- `coordinate.schema.ts` — Validasi latitude (-90 s/d 90) dan longitude (-180 s/d 180)
- `date.schema.ts` — Validasi format tanggal YYYY-MM-DD
- `pagination.schema.ts` — Validasi query pagination (page, per_page)

### Penggunaan di Service

```typescript
import {
  formatSuccess,
  formatError,
  AppError,
  ValidationError,
  calculateDistance,
  createLogger,
  coordinateSchema,
} from '@fintap/shared';
```

---

## Panduan Setup Environment

### Prasyarat

- **Node.js** >= 18.x
- **npm** >= 9.x
- **PostgreSQL** 15+ (atau akun Supabase)
- **Firebase project** (untuk push notification)
- **SMTP server** (untuk email, bisa Gmail App Password)

### Langkah-langkah Setup

#### 1. Clone dan Install Dependencies

```bash
git clone <repository-url>
cd fintap-v2
npm install
```

npm workspaces akan otomatis menginstall dependencies untuk semua packages dan services.

#### 2. Konfigurasi Environment Variables

```bash
cp .env.example .env
```

Edit `.env` dan isi nilai yang diperlukan:

```env
# Database - gunakan connection string dari Supabase
DATABASE_URL="postgresql://user:password@db.supabase.co:5432/postgres"

# JWT
JWT_SECRET="your-secure-random-key"
JWT_EXPIRES_IN="7d"

# Service URLs
SERVICE_AUTH_URL=http://localhost:3001
SERVICE_ATTENDANCE_URL=http://localhost:3002
SERVICE_ACTIVITY_URL=http://localhost:3003
SERVICE_REQUEST_URL=http://localhost:3004
SERVICE_CONFIG_URL=http://localhost:3005
SERVICE_NOTIFICATION_URL=http://localhost:3006

# Port assignments
GATEWAY_PORT=3000
AUTH_PORT=3001
ATTENDANCE_PORT=3002
ACTIVITY_PORT=3003
REQUEST_PORT=3004
CONFIG_PORT=3005
NOTIFICATION_PORT=3006

# SMTP (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

#### 3. Setup Database Schemas

Jalankan migrasi Prisma untuk setiap service:

```bash
# Buat schemas di PostgreSQL terlebih dahulu (jika belum ada)
# Via psql atau Supabase SQL Editor:
# CREATE SCHEMA IF NOT EXISTS auth_schema;
# CREATE SCHEMA IF NOT EXISTS attendance_schema;
# CREATE SCHEMA IF NOT EXISTS activity_schema;
# CREATE SCHEMA IF NOT EXISTS request_schema;
# CREATE SCHEMA IF NOT EXISTS config_schema;
# CREATE SCHEMA IF NOT EXISTS notification_schema;

# Generate Prisma clients
npm run prisma:generate -w auth
npm run prisma:generate -w attendance
npm run prisma:generate -w activity
npm run prisma:generate -w request
npm run prisma:generate -w config
npm run prisma:generate -w notification

# Jalankan migrasi
npm run prisma:migrate -w auth
npm run prisma:migrate -w attendance
npm run prisma:migrate -w activity
npm run prisma:migrate -w request
npm run prisma:migrate -w config
npm run prisma:migrate -w notification
```

#### 4. Build Shared Package

```bash
npm run build:shared
```

#### 5. Jalankan Semua Service

```bash
npm run dev
```

Perintah ini menggunakan `concurrently` untuk menjalankan semua 7 service + shared package watcher secara paralel.

---

## Alur Kerja Development

### Menjalankan Service Individual

```bash
# Jalankan satu service saja
npm run dev -w gateway
npm run dev -w auth
npm run dev -w attendance
npm run dev -w activity
npm run dev -w request
npm run dev -w config
npm run dev -w notification

# Jalankan shared package dalam mode watch
npm run dev -w @fintap/shared
```

### Menjalankan Semua Service

```bash
npm run dev
```

### Build Production

```bash
npm run build
```

### Menjalankan Tests

```bash
# Semua tests
npm test

# Test dengan watch mode
npx vitest
```

### Menambah Fitur Baru

1. **Tentukan service yang bertanggung jawab** berdasarkan domain:
   - User/Auth/Profile → `services/auth/`
   - Kehadiran → `services/attendance/`
   - Kegiatan → `services/activity/`
   - Cuti/Dinas luar → `services/request/`
   - Lokasi/Settings/Kalender → `services/config/`
   - Notifikasi → `services/notification/`

2. **Tambahkan types/DTOs** di `packages/shared/src/types/` jika diperlukan lintas service

3. **Implementasi di service** mengikuti layer:
   ```
   routes/ → controllers/ → services/ → prisma (DB)
   ```

4. **Tambahkan validasi** menggunakan Zod schema di folder `validations/`

5. **Registrasi route** di service dan pastikan prefix sudah terdaftar di `services/gateway/src/config/routes.ts`

6. **Update Swagger spec** di `services/gateway/src/openapi/spec.yaml`

### Menambah Tabel Database

1. Edit `prisma/schema.prisma` di service yang relevan
2. Jalankan `npm run prisma:migrate -w <service-name>`
3. Pastikan tabel masuk dalam schema yang benar (gunakan `@@schema("...")`)

### Konvensi Kode

- **File naming**: kebab-case (`user-location.service.ts`)
- **Class naming**: PascalCase (`UserLocationService`)
- **Variable/function**: camelCase (`getUserById`)
- **Database column mapping**: snake_case via `@map("column_name")`
- **Response format**: Selalu gunakan `formatSuccess()` / `formatError()` dari shared
- **Error handling**: Throw `AppError` subclass, ditangkap oleh error handler middleware

---

## Dokumentasi API

### Swagger UI

Dokumentasi API interaktif tersedia di:

```
http://localhost:3000/api-docs
```

Swagger UI menampilkan semua endpoint yang tersedia, termasuk:
- Request/response schemas
- Authentication requirements
- Parameter descriptions
- Contoh request/response

### Endpoint Publik (Tanpa Autentikasi)

| Method | Path | Deskripsi |
|--------|------|-----------|
| POST | `/api/auth/login` | Login pengguna |
| POST | `/api/auth/register` | Registrasi pengguna baru |
| POST | `/api/auth/forgot-password` | Request reset password |
| POST | `/api/auth/reset-password` | Reset password dengan token |
| GET | `/api-docs` | Swagger UI documentation |

### Endpoint Terproteksi (Perlu JWT)

Semua endpoint lainnya memerlukan header:
```
Authorization: Bearer <jwt_token>
```

### Endpoint Khusus Admin

Endpoint yang memerlukan role `admin`:
- `GET/POST/PUT/DELETE /api/users/*`
- `POST/PUT/DELETE /api/activities/*`
- `PUT /api/leave-requests/:id/approve`
- `PUT /api/leave-requests/:id/reject`
- `PUT /api/external-duties/:id/approve`
- `PUT /api/external-duties/:id/reject`
- `GET/PUT /api/locations/*`
- `GET/PUT /api/attendance-settings/*`
- `GET /api/admin/*`

### Format Response Standar

**Sukses:**
```json
{
  "status": "success",
  "message": "Data retrieved successfully",
  "data": { ... }
}
```

**Sukses dengan Pagination:**
```json
{
  "status": "success",
  "data": [ ... ],
  "meta": {
    "current_page": 1,
    "last_page": 5,
    "per_page": 10,
    "total": 48
  }
}
```

**Error:**
```json
{
  "status": "error",
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "errors": [
    { "field": "email", "message": "Email format tidak valid" }
  ]
}
```

---

## Scheduled Jobs

| Job | Waktu | Service | Deskripsi |
|-----|-------|---------|-----------|
| Calendar Sync | 00:05 WIB (daily) | Config | Sinkronisasi hari libur nasional dari API eksternal |
| Holiday Alert | 18:00 WIB (daily) | Notification | Notifikasi jika besok hari libur |
| Monthly Report | 01:00 WIB (tanggal 1) | Attendance | Generate laporan bulanan dan kirim ke admin |

---

## Teknologi Stack

| Layer | Teknologi |
|-------|-----------|
| Runtime | Node.js 18+ |
| Language | TypeScript 5.4+ |
| Framework | Express.js 4.18 |
| ORM | Prisma 5.14 |
| Database | PostgreSQL 15 (Supabase) |
| Validation | Zod 3.23 |
| Auth | JSON Web Token (jsonwebtoken) |
| Password | bcrypt (12 rounds) |
| File Upload | Multer |
| Email | Nodemailer |
| Push Notification | Firebase Admin SDK |
| Scheduler | node-cron |
| PDF | PDFKit |
| API Docs | Swagger UI Express + OpenAPI 3.0 |
| HTTP Client | Axios |
| Logging | Winston |
| Security | Helmet, CORS, express-rate-limit |
| Build Tool | TypeScript Compiler (tsc) |
| Dev Tool | tsx (watch mode) |
| Test | Vitest + fast-check |
| Monorepo | npm workspaces |
