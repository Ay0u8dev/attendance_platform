# Backend Architecture Overview

This document describes the backend architecture that exists in the checked-in code.

## Current Implementation Snapshot

| Service | Tech | Port | Status | Data/state owned |
| --- | --- | --- | --- | --- |
| `auth-service` | Spring Boot | `8081` | Implemented | No user lifecycle ownership; issues and validates platform JWTs |
| `user-service` | Spring Boot + JPA | `8082` | Implemented | Users, roles, teachers, students, academic structure, active-year roster lookup |
| `attendance-service` | Spring Boot + JPA + Redis | `8083` | Implemented | Attendance sessions, live Redis roster state, final records, attendance read models |
| `qr-service` | FastAPI | `8001` dev / `8000` container | Implemented | Stateless QR payload signing and scan validation |
| `face-service` | FastAPI | `8000` sample container port | Placeholder | Future face proof validation; not production-ready |
| `justification-service` | Spring Boot | `8085` | Skeleton | Bootstrap/config only |
| `notification-service` | Spring Boot | `9000` | Skeleton | Bootstrap/config only |

## Runtime Topology

In local development, Traefik runs in Docker and forwards to services running on the host through `host.docker.internal`.

- Traefik HTTP entrypoint: `:80`
- Traefik dashboard in dev compose: host port `9000` mapped to container `8080`
- Dynamic routes file: `traefik/routes.dev.yml`
- Redis: `6379`
- User database: host `5433`, database `users_db`
- Attendance database: host `5434`, database `attendance_db`

## Gateway Routes

| Browser route | Middleware | Upstream | Notes |
| --- | --- | --- | --- |
| `/api/auth/**` | `strip-api-auth` | `auth-service` | Login cannot require an existing JWT |
| `/api/users/**` | `forward-auth`, `strip-api-user` | `user-service` | Protected user/admin/student/structure APIs |
| `/api/attendance/**` | `forward-auth`, `strip-api-attendance` | `attendance-service` | Protected attendance HTTP APIs |
| `/api/qr/**` | `forward-auth`, `strip-api-qr` | `qr-service` | Protected QR APIs |
| `/api/ws/attendance/ws` | `strip-api-ws-attendance` | `attendance-service` | STOMP `CONNECT` carries auth token |
| `/**` | none | frontend | Angular application |

The frontend WebSocket URL is `/api/ws/attendance/ws`. After Traefik strips `/api/ws`, attendance-service receives `/attendance/ws`.

## Main Communication Paths

### Login

1. Frontend calls `POST /api/auth/login`.
2. Traefik forwards as `POST /auth/login`.
3. `auth-service` validates the Google `idToken` and allowed email domain.
4. `auth-service` calls `user-service` at `POST /users/auth-user` with `X-Request-Source: auth-service`.
5. `user-service` returns the existing enabled user.
6. `auth-service` returns `{ "accessToken": "<internal-jwt>" }`.

### Protected HTTP Request

1. Frontend sends `Authorization: Bearer <jwt>` to a protected `/api/**` route.
2. Traefik calls `GET /auth/validate`.
3. `auth-service` returns identity headers:
   - `X-User-Id`
   - `X-User-Roles`
   - `X-User-Email`
4. Traefik injects those headers into the upstream request.
5. The target service checks roles with `@RequireRole` and service-local ownership rules.

### Attendance Session Creation

1. Teacher calls `POST /api/attendance/sessions`.
2. `attendance-service` checks the teacher role and prevents multiple active sessions per teacher.
3. It fetches teacher identity from `user-service`.
4. It fetches active-year students for requested `groupIds` from `user-service`.
5. It saves the session header to `attendance_db`.
6. It initializes Redis live state with every roster student as `UNKNOWN`.

### Student QR Self-Marking

1. Teacher display calls `POST /api/qr/teacher/sessions/{sessionId}/payload`.
2. `qr-service` fetches the teacher-owned attendance session and requires it to be `ACTIVE`.
3. `qr-service` returns an opaque HMAC-signed payload that expires after `QR_TOKEN_TTL_SECONDS` seconds.
4. Student scans the payload and calls `POST /api/qr/student/scan`.
5. `qr-service` validates payload signature, version, length, and expiry.
6. `qr-service` calls `attendance-service` at `POST /attendance/internal/sessions/{sessionId}/attendance` with `X-Request-Source: qr-service`.
7. `attendance-service` validates roster membership, active session state, QR method/source match, GPS distance, and device uniqueness.
8. It updates Redis live state and broadcasts `ATTENDANCE_UPDATED`.

### Attendance Finalization

1. Teacher calls `POST /api/attendance/sessions/{sessionId}/end`, or the scheduled auto-finalizer finds an expired active session.
2. Remaining `UNKNOWN` students become `ABSENT`.
3. Final attendance rows are written to `attendance_db`.
4. Aggregate snapshot counts are stored on the session header.
5. Finalized live state remains in Redis for `attendance.session.finalized-state-retention`.
6. `SESSION_FINALIZED` is broadcast to the session topic.

### WebSocket Updates

1. Frontend connects to `/api/ws/attendance/ws` using STOMP over WebSocket.
2. Client sends `Authorization: Bearer <jwt>` as a STOMP native header on `CONNECT`.
3. `attendance-service` validates the token through `auth-service /auth/validate`.
4. Subscriptions to `/topic/attendance.sessions.{sessionId}` are allowed only for the owning teacher or an admin.

## Security Model

- JWT creation and validation are centralized in `auth-service`.
- Downstream HTTP services authorize from forwarded identity headers, not from direct JWT parsing.
- WebSocket identity is handled inside `attendance-service` because STOMP sessions do not inherit Traefik forward-auth identity.
- Internal trusted calls must include `X-Request-Source`; accepted values are intentionally narrow.
- Public clients must not call internal routes such as `/attendance/internal/**`.

## Read Model Rules

- Active teacher detail combines session metadata and Redis live student state.
- Finalized teacher/admin detail combines session metadata and persisted final records.
- Teacher history reads session rows and uses persisted aggregate counts for finalized sessions.
- Student history reads finalized records only.
- Student active-session discovery reads live state and returns the authenticated student's current active-session status.

## Known Gaps

- Teacher authorization is role-based; it does not yet verify academic assignment to groups/modules.
- Student QR/face self-mark GPS and device identifiers are transient and are not persisted to final attendance records.
- Error response shapes are still inconsistent across services.
- `face-service` is not a real validator yet.
- `justification-service` and `notification-service` are skeleton services.

## Documentation Rule

When a backend endpoint changes, update `backend/docs/backend-service-contracts.md`. When frontend behavior changes, update the role-specific docs under `backend/docs/frontend-attendance-api/` as well.
