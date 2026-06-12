# Backend Architecture Overview

This document describes the backend architecture based on the currently implemented source code.

## 1) Current Implementation Snapshot

| Service               | Tech              | Port                             | Implementation Status | Notes                                                                                                                                               |
| --------------------- | ----------------- | -------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| auth-service          | Spring Boot       | 8081                             | Implemented           | Google login, internal JWT issuance, token validation endpoint                                                                                      |
| user-service          | Spring Boot + JPA | 8082                             | Implemented           | User lookup, auth-user flow, role-guarded read endpoint, internal student roster                                                                    |
| attendance-service    | Spring Boot       | 8083                             | Implemented           | Owns attendance session lifecycle, live Redis state, final attendance persistence, teacher/admin/student reads, and authenticated WebSocket updates |
| justification-service | Spring Boot       | 8085                             | Skeleton              | Bootstrap/config only                                                                                                                               |
| notification-service  | Spring Boot       | 9000                             | Skeleton              | Bootstrap/config only                                                                                                                               |
| face-service          | FastAPI           | n/a (compose comment shows 8000) | Placeholder           | Future internal caller of attendance mark endpoint                                                                                                  |
| qr-service            | FastAPI           | 8001 in dev / 8000 in container  | Implemented           | Generates signed rotating QR payloads and forwards validated student scans to attendance-service                                                    |

## 2) Runtime Topology

In local development, Traefik runs in Docker and forwards traffic to services running on the host machine through `host.docker.internal`.

- Traefik entrypoint: `:80`
- Traefik dashboard: `:8080` in dev
- Dynamic routes file: `traefik/routes.dev.yml`

### Active routes in Traefik

- `/api/auth/**` -> `auth-service`
- `/api/users/**` -> `user-service` with forward-auth
- `/api/attendance/**` -> `attendance-service` with forward-auth
- `/api/qr/**` -> `qr-service` with forward-auth
- `/api/ws/attendance/ws` -> `attendance-service websocket`
- `/**` -> frontend

## 3) Communication Paths

### 3.1 Login path

1. Client calls `POST /api/auth/login`.
2. Traefik strips `/api` and forwards to `auth-service` as `POST /auth/login`.
3. `auth-service` validates the Google token.
4. `auth-service` calls `user-service` at `POST /users/auth-user` with `X-Request-Source: auth-service`.
5. `auth-service` returns the internal JWT.

### 3.2 Protected HTTP path

1. Client calls a protected route with `Authorization: Bearer <jwt>`.
2. Traefik forward-auth calls `GET /auth/validate` on `auth-service`.
3. If valid, `auth-service` returns:
   - `X-User-Id`
   - `X-User-Roles`
   - `X-User-Email`
4. Traefik injects those headers into the upstream request.
5. The target service enforces role and ownership rules using those headers.

### 3.3 Attendance roster bootstrap path

1. Teacher starts a session through `attendance-service`.
2. `attendance-service` calls `user-service` at `GET /users/internal/students/roster`.
3. `user-service` returns active-year student roster rows for the requested group IDs.
4. `attendance-service` persists the session header and initializes live roster state in Redis.

### 3.4 Internal attendance marking path

1. Teacher display clients call `qr-service` at `/qr/teacher/sessions/{sessionId}/payload`.
2. `qr-service` confirms the teacher-owned attendance session is active and returns a signed 30-second payload.
3. Student clients scan that payload and call `qr-service` at `/qr/student/scan`.
4. `qr-service` validates the QR signature and expiry, then calls `attendance-service` at `/attendance/internal/sessions/{sessionId}/attendance`.
5. `attendance-service` validates:
   - trusted `X-Request-Source`
   - source/method match
   - active method-neutral session
   - student membership
   - student self-mark GPS is present and close enough to the teacher session GPS
   - one device may not mark another student in the same active session
6. `attendance-service` updates Redis live state and broadcasts a WebSocket event.

`FACE_ID` is also a student-phone self-service choice. It uses the same device and GPS distance rules as QR. The placeholder face-service is still responsible for validating face proof before reporting successful marks internally.

### 3.5 WebSocket path

1. Frontend connects to `/api/ws/attendance/ws` using STOMP.
2. Client sends `Authorization: Bearer <jwt>` in the STOMP `CONNECT` frame.
3. `attendance-service` validates the token by calling `auth-service /auth/validate`.
4. `attendance-service` attaches authenticated identity to the WebSocket session.
5. Subscription to `/topic/attendance.sessions.{sessionId}` is allowed only for:
   - owning teacher
   - admin

## 4) Security Ownership Model

- `auth-service` owns JWT issuance and validation.
- Downstream HTTP services are header-driven and do not parse JWTs for normal gateway traffic.
- `attendance-service` validates JWTs directly only for WebSocket `CONNECT`, because Traefik forward-auth does not solve STOMP session identity for you.
- Internal trusted service calls are identified by `X-Request-Source`.

## 5) Data Ownership

- `user-service` owns user identity and academic structure data.
- `attendance-service` owns:
  - attendance session lifecycle
  - live session state in Redis
  - final attendance records in `attendance_db`
  - teacher/admin/student attendance read models
- `justification-service` is out of this flow.

## 6) Attendance Service Read Model

- Active teacher detail:
  - session header from DB
  - live roster and counts from Redis
- Finalized teacher/admin detail:
  - session header from DB
  - final attendance records from DB
- Teacher history:
  - DB sessions
  - Redis counts for still-active sessions
  - persisted aggregate snapshot counts for finalized sessions
- Student history:
  - finalized DB records only

## 7) Current Gaps

- Teacher authorization is still role-only. That is a deliberate compromise, not a strong academic authorization model.
- Student self-mark GPS is required for proximity validation. It is transient and is not persisted to finalized attendance records.
- Error response formatting across services is still inconsistent.
- `face-service` and `justification-service` are still unfinished.

## 8) Practical Guidance

Before adding a new backend endpoint:

1. Decide whether it is public through the gateway or internal service-to-service only.
2. If it is gateway-protected, ensure Traefik uses forward-auth.
3. If it is STOMP/WebSocket, do not assume HTTP auth middleware solves it.
4. Keep role checks and ownership checks explicit in the service.
5. Update:
   - `backend/docs/backend-service-contracts.md`
   - `backend/docs/frontend-attendance-api.md` when frontend calls are affected
