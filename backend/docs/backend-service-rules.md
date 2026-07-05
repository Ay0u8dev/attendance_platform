# Backend Service Rules

These rules keep new backend work compatible with the current platform contracts.

## Routing

1. Browser-facing APIs must be exposed through Traefik under `/api/<service-prefix>/**`.
2. Service-local controllers keep their real base path, such as `/auth`, `/users`, `/attendance`, or `/qr`.
3. The frontend must use gateway paths, not direct local service URLs.
4. The attendance WebSocket browser path is `/api/ws/attendance/ws`; attendance-service receives `/attendance/ws`.

## Authentication And Authorization

1. `auth-service` owns JWT issuing and validation for normal HTTP traffic.
2. Protected HTTP services read identity from:
   - `X-User-Id`
   - `X-User-Roles`
   - `X-User-Email`
3. Role checks must be explicit on protected endpoints.
4. Service methods must still enforce ownership rules after role checks. Example: a teacher must own the attendance session they read or finalize.
5. WebSocket/STOMP authentication is handled by attendance-service on `CONNECT`, using the STOMP native `Authorization` header.

## Internal Calls

1. Internal machine-to-machine endpoints must require `X-Request-Source`.
2. Accepted source values must be narrow and documented.
3. Current trusted sources:
   - `auth-service`
   - `attendance-service`
   - `qr-service`
   - `face-service`
4. Do not expose internal routes through frontend code. `/attendance/internal/**` is not a browser API.

## Service Ownership

1. `user-service` owns identity, role-bearing users, students, teachers, and academic structure.
2. `attendance-service` owns attendance sessions, live attendance state, final records, and attendance read models.
3. `qr-service` owns QR proof validation only; it does not own attendance state.
4. Planned or scaffolded services must not be documented as implemented until they have real controllers and behavior.

## Request And Response Contracts

1. Controllers should return DTOs, not JPA entities.
2. Validate request bodies with Jakarta validation where possible.
3. Keep route and JSON field names stable once frontend code consumes them.
4. Document every new or changed endpoint in `backend/docs/backend-service-contracts.md`.
5. If frontend code consumes it, also update `backend/docs/frontend-attendance-api/`.

## Error Contract Target

The target shape for new/updated Spring endpoints is:

```json
{
  "status": 403,
  "message": "Insufficient roles",
  "timestamp": "2026-04-20T10:15:30",
  "path": "/users/7"
}
```

The current repo does not fully meet this target. Do not hide that. Improve new work without pretending old endpoints are already consistent.

## Configuration

1. Keep service ports explicit in service config.
2. Keep inter-service URLs externalized.
3. Keep credentials and secrets in environment variables or profile config, not hardcoded production values.
4. QR configuration is environment-driven:
   - `ATTENDANCE_SERVICE_URL`
   - `QR_TOKEN_SECRET`
   - `QR_TOKEN_TTL_SECONDS`

## New Endpoint Checklist

Before treating a new endpoint as ready:

1. Gateway route exists if it is browser-facing.
2. Role and ownership checks are explicit.
3. Internal calls use a documented `X-Request-Source`.
4. Request/response examples are in docs.
5. Frontend service code and docs agree on the route and JSON shape.
6. Failure cases use coherent HTTP status codes.
7. Tests cover at least the main auth/header behavior for risky endpoints.
