# Backend Architecture Overview

This document describes the backend architecture based on currently implemented source code.

## 1) Current Implementation Snapshot

| Service               | Tech              | Port                             | Implementation Status | Notes                                                                                |
| --------------------- | ----------------- | -------------------------------- | --------------------- | ------------------------------------------------------------------------------------ |
| auth-service          | Spring Boot       | 8081                             | Implemented           | Login with Google token validation, internal JWT issuance, token validation endpoint |
| user-service          | Spring Boot + JPA | 8082                             | Implemented           | User lookup, auth-user flow, role-guarded read endpoint                              |
| attendance-service    | Spring Boot       | 8084                             | Skeleton              | Application bootstrap and config only, no REST controllers                           |
| session-service       | Spring Boot       | 8083                             | Skeleton              | Application bootstrap and config only, no REST controllers                           |
| justification-service | Spring Boot       | 8085                             | Skeleton              | Application bootstrap and config only, no REST controllers                           |
| notification-service  | Spring Boot       | 9000                             | Skeleton              | Application bootstrap and config only, no REST controllers                           |
| face-service          | FastAPI           | n/a (compose comment shows 8000) | Placeholder           | Minimal sample endpoints (`/`, `/items/{item_id}`)                                   |
| qr-service            | Python            | n/a                              | Placeholder           | `main.py` is currently empty                                                         |

## 2) Runtime Topology

In local development, Traefik runs in Docker and forwards traffic to services running on the host machine through `host.docker.internal`.

- Traefik entrypoint: `:80`
- Traefik dashboard: `:8080` (dev only)
- Dynamic routes file: `traefik/routes.dev.yml`

### Active routes in Traefik

- `/api/auth/**` -> `auth-service` (no forward-auth middleware)
- `/api/users/**` -> `user-service` (protected by forward-auth middleware)
- `/**` -> frontend service

## 3) Communication Paths

### 3.1 Client login path

1. Client calls `POST /api/auth/login`.
2. Traefik strips `/api` and forwards to `auth-service` as `POST /auth/login`.
3. `auth-service` validates Google token via:
   - `GET https://oauth2.googleapis.com/tokeninfo?id_token=<...>`
4. `auth-service` calls `user-service`:
   - `POST /users/auth-user`
   - Header: `X-Request-Source: auth-service`
5. `auth-service` returns internal access token to client.

### 3.2 Protected route path

1. Client calls a protected route, for example `GET /api/users/{id}` with `Authorization: Bearer <jwt>`.
2. Traefik forward-auth middleware calls `GET /auth/validate` on `auth-service`.
3. If token is valid, `auth-service` responds with headers:
   - `X-User-Id`
   - `X-User-Roles`
   - `X-User-Email`
4. Traefik injects these headers into the upstream request.
5. `user-service` reads those headers and applies role checks (`@RequireRole`).

## 4) Security Ownership Model

- `auth-service` owns token validation and token generation.
- Downstream services (such as `user-service`) are header-driven and do not parse JWTs.
- Internal trusted service calls are identified by `X-Request-Source`.

This model keeps JWT logic centralized and authorization decisions distributed through role headers.

## 5) Data Ownership

- `auth-service` does not own user persistence.
- `user-service` owns user identity records and academic structure entities.
- `attendance_db` is configured for attendance/session/justification services, but those services do not expose implemented APIs yet.

## 6) Current Gaps

- Only two backend services expose actual business endpoints (`auth-service`, `user-service`).
- Error response formats are not fully standardized across services.
- Routing in Traefik is currently defined for auth and user routes only.

## 7) Practical Guidance

Before implementing a new service endpoint:

1. Decide if endpoint is public (`/api/auth/...`) or protected (`/api/<service>/...`).
2. If protected, ensure gateway route uses `forward-auth` middleware.
3. Enforce role checks in service based on `X-User-Roles`.
4. Propagate identity headers to downstream calls when needed.
5. Document endpoint contract in `backend/docs/backend-service-contracts.md`.
