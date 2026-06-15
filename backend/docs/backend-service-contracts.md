# Backend Service Contracts

This document defines the currently implemented HTTP, WebSocket, and header contracts between services. Gateway paths are shown where frontend code should call them; service-local paths are shown where services call each other directly.

## Shared Headers

### Forwarded Identity Headers

Traefik calls `GET /auth/validate` for protected HTTP routes. On success, `auth-service` returns:

- `X-User-Id`: authenticated user id
- `X-User-Roles`: comma-separated role names
- `X-User-Email`: authenticated user email

Protected downstream services authorize from these headers.

### Internal Source Header

Internal endpoints use:

- `X-Request-Source`

Current trusted values:

- `auth-service`
- `attendance-service`
- `qr-service`
- `face-service`

## Auth Service

Service-local base path: `/auth`

Gateway base path: `/api/auth`

### `POST /auth/login`

Purpose:

- Accept a Google `idToken`
- Validate the token and allowed email domain
- Fetch the existing platform user from `user-service`
- Return the platform JWT

Request:

```json
{
  "idToken": "google-id-token"
}
```

Success:

```json
{
  "accessToken": "<internal-jwt>"
}
```

### `GET /auth/validate`

Purpose:

- Validate the platform JWT for Traefik forward-auth and WebSocket auth checks.

Request header:

- `Authorization: Bearer <internal-jwt>`

Success:

- empty body
- response headers:
  - `X-User-Id`
  - `X-User-Roles`
  - `X-User-Email`

## User Service

Service-local base path: `/users`

Gateway base path: `/api/users`

### Internal User Lookup

#### `POST /users/auth-user`

Purpose:

- Internal login lookup used by `auth-service`.

Required header:

- `X-Request-Source: auth-service`

Request:

```json
{
  "email": "student@ump.ac.ma",
  "pfpUrl": "https://example.com/profile.jpg"
}
```

Success:

- user DTO with id, email, enabled state, profile fields, and roles.

#### `GET /users/internal/students/roster`

Purpose:

- Internal active-year roster lookup used by `attendance-service` during session creation.

Required header:

- `X-Request-Source: attendance-service`

Query:

- repeated `groupIds`

Success:

```json
[
  {
    "studentId": 12,
    "groupId": 4,
    "firstName": "Aya",
    "lastName": "Bennani",
    "email": "aya.bennani@ump.ac.ma",
    "pfpUrl": "https://cdn.example.com/profiles/12.jpg",
    "numApogee": "22012345"
  }
]
```

Failures:

- `400`: missing or empty `groupIds`
- `401`: missing or untrusted request source
- `409`: zero or multiple active academic years

#### `GET /users/internal/teachers/{id}/identity`

Purpose:

- Internal teacher snapshot lookup used by `attendance-service`.

Required header:

- `X-Request-Source: attendance-service`

Success:

```json
{
  "teacherId": 77,
  "firstName": "Ayoub",
  "lastName": "Elebbar"
}
```

### User/Profile Endpoints

#### `GET /users/{id}`

Purpose:

- Admin-only user read endpoint.

Role:

- `ADMIN`

#### `GET /users/student/profile`

Purpose:

- Return the authenticated student's profile.

Role:

- `STUDENT`

### Teacher CRUD

Base path: `/users/teacher`

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| `POST` | `/users/teacher` | `ADMIN` | Create teacher |
| `GET` | `/users/teacher` | `ADMIN` | List teachers |
| `GET` | `/users/teacher/{id}` | currently no `@RequireRole` in controller | Read teacher by id |
| `PUT` | `/users/teacher/{id}` | `ADMIN` | Update teacher |
| `DELETE` | `/users/teacher/{id}` | `ADMIN` | Delete teacher |

### Student CRUD

Base path: `/users/student`

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| `POST` | `/users/student` | `ADMIN` | Create student |
| `GET` | `/users/student` | currently no `@RequireRole` in controller | List students |
| `GET` | `/users/student/{id}` | currently no `@RequireRole` in controller | Read student by id |
| `PUT` | `/users/student/{id}` | `ADMIN` | Update student |
| `DELETE` | `/users/student/{id}` | `ADMIN` | Delete student |
| `POST` | `/users/student/import` | `ADMIN` | Import students from Excel multipart upload |

### Teacher Import

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| `POST` | `/users/teacher/import` | `ADMIN` | Import teachers from Excel multipart upload |

### Academic Structure CRUD

The following controllers expose the same CRUD shape: `POST`, `PUT /{id}`, `GET /{id}`, `GET`, and `DELETE /{id}`.

| Base path | Create/update/delete role | Purpose |
| --- | --- | --- |
| `/users/structure/annees` | `ADMIN` | Academic years |
| `/users/structure/cycles` | `ADMIN` | Cycles |
| `/users/structure/filieres` | `ADMIN` | Fields/filieres |
| `/users/structure/formations` | `ADMIN` | Formations |
| `/users/structure/groupes` | `ADMIN` | Groups |
| `/users/structure/modules` | `ADMIN` | Modules |

Read methods on these structure controllers currently have no `@RequireRole` annotation in code.

## Attendance Service

Service-local base path: `/attendance`

Gateway base path: `/api/attendance`

### Teacher Session Lifecycle

#### `POST /attendance/sessions`

Gateway: `POST /api/attendance/sessions`

Purpose:

- Create one active attendance session for the authenticated teacher.
- Fetch teacher identity and active-year roster from `user-service`.
- Save session header in `attendance_db`.
- Initialize Redis live state with all students as `UNKNOWN`.

Role:

- `TEACHER`

Request:

```json
{
  "groupIds": [1, 2],
  "courseLabel": "Distributed Systems",
  "roomLabel": "Room B12",
  "gpsLat": "34.6814",
  "gpsLon": "-1.9086"
}
```

Important:

- The request DTO does not accept `method`.
- The current entity still stores `QR_CODE` as a compatibility placeholder for an existing non-null schema column.
- The active session itself is treated as method-neutral: QR, future face, and teacher manual updates can all resolve live rows.

Success:

```json
{
  "sessionId": 5,
  "teacherId": 77,
  "teacherFullName": "Ayoub Elebbar",
  "groupIds": [1, 2],
  "courseLabel": "Distributed Systems",
  "roomLabel": "Room B12",
  "gpsLat": "34.6814",
  "gpsLon": "-1.9086",
  "startedAt": "2026-04-27T10:00:00",
  "endsAt": "2026-04-27T10:30:00",
  "status": "ACTIVE",
  "studentCount": 42
}
```

#### `GET /attendance/sessions`

Purpose:

- Return paged session history for the current teacher.

Role:

- `TEACHER`

Query:

- `status`
- `dateFrom` ISO date
- `dateTo` ISO date
- Spring pageable params: `page`, `size`, `sort`

#### `GET /attendance/sessions/active`

Purpose:

- Return the current teacher's active session with live student state.

Role:

- `TEACHER`

Failure:

- `404`: no active session exists

#### `GET /attendance/sessions/{sessionId}`

Purpose:

- Return teacher-owned session detail. Active sessions read from Redis; finalized sessions read final records.

Role:

- `TEACHER`

Success shape:

```json
{
  "sessionId": 5,
  "teacherId": 77,
  "teacherFullName": "Ayoub Elebbar",
  "groupIds": [1, 2],
  "courseLabel": "Distributed Systems",
  "roomLabel": "Room B12",
  "gpsLat": "34.6814",
  "gpsLon": "-1.9086",
  "startedAt": "2026-04-28T12:00:00",
  "endsAt": "2026-04-28T12:30:00",
  "endedAt": null,
  "status": "ACTIVE",
  "presentCount": 11,
  "absentCount": 0,
  "unknownCount": 31,
  "students": [
    {
      "studentId": 12,
      "groupId": 1,
      "firstName": "Aya",
      "lastName": "Bennani",
      "email": "aya.bennani@ump.ac.ma",
      "pfpUrl": "https://cdn.example.com/profiles/12.jpg",
      "numApogee": "22012345",
      "status": "PRESENT",
      "markMethod": "QR_CODE",
      "markedAt": "2026-04-28T12:01:00"
    }
  ]
}
```

#### `POST /attendance/sessions/{sessionId}/attendance`

Purpose:

- Teacher manually marks a live student `PRESENT` or `ABSENT`.

Role:

- `TEACHER`

Request:

```json
{
  "studentId": 12,
  "status": "ABSENT"
}
```

Success:

```json
{
  "sessionId": 5,
  "studentId": 12,
  "status": "ABSENT",
  "markMethod": "MANUAL",
  "markedAt": "2026-04-28T12:05:00",
  "presentCount": 10,
  "absentCount": 1,
  "unknownCount": 31
}
```

#### `POST /attendance/sessions/{sessionId}/end`

Purpose:

- Finalize a session and persist one final record per student.

Role:

- `TEACHER`

Rules:

- Remaining `UNKNOWN` students become `ABSENT`.
- `deviceId`, QR GPS, and face GPS are transient and are not persisted in final records.
- Final aggregate counts are stored on the session header.

### Internal Attendance Update

#### `POST /attendance/internal/sessions/{sessionId}/attendance`

Purpose:

- Internal route used by QR and future face validation services.

Required header:

- `X-Request-Source: qr-service` with `method = QR_CODE`
- `X-Request-Source: face-service` with `method = FACE_ID`

Request:

```json
{
  "studentId": 12,
  "method": "QR_CODE",
  "deviceId": "student-phone-uuid",
  "gpsLat": "34.6820",
  "gpsLon": "-1.9091"
}
```

Rules:

- source must be trusted
- source must match `method`
- session must be active
- student must exist in live roster
- current student state must be `UNKNOWN`
- `deviceId`, `gpsLat`, and `gpsLon` are required for QR/face self-marking
- distance from session GPS must be within `attendance.self-mark.max-distance-meters`
- one device may mark only one student in a session
- one student may use only one device in a session

### Admin Attendance Reads

Base path: `/attendance/admin`

Role:

- `ADMIN`

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/attendance/admin/sessions` | Paged read across sessions |
| `GET` | `/attendance/admin/sessions/{sessionId}` | Full session detail |
| `GET` | `/attendance/admin/overview` | Aggregate overview |

Admin session query params:

- `teacherId`
- `groupId`
- `status`
- `dateFrom` ISO date
- `dateTo` ISO date
- Spring pageable params

The code no longer exposes a `method` request param on admin session search.

### Student Attendance Reads

Base path: `/attendance/student`

Role:

- `STUDENT`

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/attendance/student/sessions` | Authenticated student's finalized session history |
| `GET` | `/attendance/student/sessions/active` | Authenticated student's active-session state |
| `GET` | `/attendance/student/sessions/{sessionId}` | Authenticated student's finalized record for one session |
| `GET` | `/attendance/student/overview` | Authenticated student's totals |

Active-session success:

```json
{
  "sessionId": 5,
  "teacherFullName": "Ayoub Elebbar",
  "courseLabel": "Distributed Systems",
  "roomLabel": "Room B12",
  "groupIds": [1],
  "startedAt": "2026-06-01T18:00:00",
  "endsAt": "2026-06-01T18:30:00",
  "attendanceStatus": "UNKNOWN"
}
```

Finalized student detail includes `studentId`, roster snapshot fields, `attendanceStatus`, nullable `markMethod`, and nullable `markedAt`.

## QR Service

Service-local base path: `/qr`

Gateway base path: `/api/qr`

### `GET /qr/health`

Success:

```json
{
  "status": "UP"
}
```

### `POST /qr/teacher/sessions/{sessionId}/payload`

Purpose:

- Generate an opaque signed QR payload for a teacher-owned active attendance session.

Role:

- `TEACHER`

Success:

```json
{
  "sessionId": 5,
  "payload": "<opaque-signed-qr-payload>",
  "expiresAt": "2026-06-01T18:00:30Z",
  "refreshAfterSeconds": 30
}
```

### `POST /qr/student/scan`

Purpose:

- Validate the scanned QR payload and mark the authenticated student present through attendance-service.

Role:

- `STUDENT`

Request:

```json
{
  "payload": "<opaque-signed-qr-payload>",
  "deviceId": "browser-device-uuid",
  "gpsLat": "34.6814",
  "gpsLon": "-1.9086"
}
```

Success:

```json
{
  "sessionId": 5,
  "studentId": 12,
  "status": "PRESENT",
  "markMethod": "QR_CODE",
  "markedAt": "2026-06-01T18:00:12",
  "presentCount": 1,
  "absentCount": 0,
  "unknownCount": 41
}
```

## Attendance WebSocket

Browser handshake path:

- `/api/ws/attendance/ws`

Service-local path:

- `/attendance/ws`

Protocol:

- STOMP over WebSocket

`CONNECT` requirement:

- STOMP native header `Authorization: Bearer <jwt>`

Subscription destination:

- `/topic/attendance.sessions.{sessionId}`

Subscription rules:

- owning teacher: allowed
- admin: allowed
- student: denied
- other teacher: denied
- anonymous client: denied

### Event: `ATTENDANCE_UPDATED`

```json
{
  "eventType": "ATTENDANCE_UPDATED",
  "sessionId": 5,
  "studentId": 12,
  "status": "PRESENT",
  "markMethod": "QR_CODE",
  "markedAt": "2026-04-28T12:01:00",
  "presentCount": 11,
  "absentCount": 0,
  "unknownCount": 31
}
```

### Event: `SESSION_FINALIZED`

```json
{
  "eventType": "SESSION_FINALIZED",
  "sessionId": 5,
  "status": "FINALIZED",
  "presentCount": 11,
  "absentCount": 31,
  "unknownCount": 0
}
```

## Error Shapes

Error responses are not fully standardized:

- attendance-service uses structured JSON for most application errors
- auth-service may return Spring error payloads for validation failures
- user-service still has paths using servlet `sendError`
- qr-service returns FastAPI-style `detail` messages

New endpoint work should move toward the standard in `backend-service-rules.md`.
