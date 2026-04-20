# Backend Service Rules (Must Follow)

This document defines implementation rules for existing and future backend services so they remain compatible with the current platform contracts.

## 1) API Surface and Routing Rules

1. Expose service endpoints under a clear service base path (for example `/users`, `/attendance`, `/sessions`).
2. Expose services to clients through Traefik using `/api/<service-prefix>/...` routes.
3. Keep auth endpoints separate (`/api/auth/...`) and unprotected by forward-auth when login is required.

Example Traefik router pattern:

```yaml
routers:
  attendance:
    entryPoints: ["web"]
    rule: "PathPrefix(`/api/attendance`)"
    middlewares: ["forward-auth", "strip-api-attendance"]
    service: attendance-service

middlewares:
  strip-api-attendance:
    stripPrefix:
      prefixes: ["/api"]
```

## 2) Authentication and Authorization Rules

1. JWT parsing and signature validation belong to `auth-service` only.
2. Downstream services must authorize using forwarded identity headers:
   - `X-User-Id`
   - `X-User-Roles`
   - `X-User-Email`
3. Protected endpoints must reject requests with missing/invalid role headers.
4. Role checks must be explicit per endpoint (annotation/interceptor/filter based).

Example rule check logic:

```text
if endpoint is protected:
  require X-User-Id and X-User-Roles
  parse roles from comma-separated string
  verify at least one required role
```

## 3) Trusted Internal Call Rules

1. Internal trusted service-to-service calls must include `X-Request-Source`.
2. Never trust arbitrary `X-Request-Source` from public traffic. Only accept it behind gateway/private network.
3. Any bypass behavior (like `auth-service` bypass in `user-service`) must be narrow and documented.
4. Prefer dedicated internal endpoints for machine-to-machine calls (for example `/users/auth-user`).

Example internal request:

```http
POST /users/auth-user
X-Request-Source: auth-service
Content-Type: application/json

{"email":"user@ump.ac.ma","pfpUrl":"https://example.com/pfp.jpg"}
```

## 4) Header Propagation Rules for Outbound Calls

When service A calls service B on behalf of a user request, propagate user context headers.

Required propagation headers:

- `X-User-Id`
- `X-User-Email`
- `X-User-Roles`

Example Feign interceptor behavior:

```text
read current user context from request thread
copy X-User-* headers into outgoing Feign request
```

## 5) Request/Response Contract Rules

1. Use DTOs for API responses; avoid returning JPA entities directly from controllers.
2. Validate request bodies (`@Valid`, explicit required fields).
3. Keep endpoint behavior stable and version-compatible.
4. Document every new endpoint in `backend/docs/backend-service-contracts.md`.

## 6) Error Contract Rules

Target standard for all new/updated endpoints:

```json
{
  "status": 403,
  "message": "Insufficient roles",
  "timestamp": "2026-04-20T10:15:30",
  "path": "/users/7"
}
```

Rules:

1. Return structured JSON for errors (do not mix plain text and JSON for the same API family).
2. Use consistent HTTP status semantics:
   - `400` bad input
   - `401` unauthenticated
   - `403` authenticated but forbidden
   - `404` resource not found
   - `500` unexpected server error
3. Add global exception handling in each service.

## 7) Configuration Rules

1. Keep `spring.application.name` unique and aligned with service identity.
2. Keep service ports explicit in each service config.
3. Use environment variables for credentials and secrets.
4. Keep inter-service URLs externalized in config (for example `services.user-service.url`).

Minimum config template:

```yaml
server:
  port: 808X

spring:
  application:
    name: <service-name>

services:
  auth-service:
    url: http://localhost:8081
```

## 8) Database Ownership Rules

1. Each service should own its aggregate/domain boundaries.
2. Avoid direct cross-service database access.
3. Integrate via HTTP contracts, not shared entity classes.

## 9) New Service Checklist

Before considering a new service endpoint ready:

1. Route added in Traefik with correct middleware.
2. Endpoint contract documented with request/response examples.
3. Protected endpoints enforce role checks from `X-User-Roles`.
4. Outbound calls propagate `X-User-*` headers when needed.
5. Errors follow the standard JSON shape.
6. Service config uses env vars for credentials/secrets.
7. At least one integration test validates auth/header contract behavior.
