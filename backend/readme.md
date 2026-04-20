# Attendance Platform Backend

This backend currently has two implemented service APIs (`auth-service` and `user-service`) and multiple scaffolded services.

This README is the quick entry point. Detailed documentation is split into dedicated files:

- Architecture: `docs/backend-architecture.md`
- HTTP + header contracts: `docs/backend-service-contracts.md`
- Rules all other services must follow: `docs/backend-service-rules.md`

## 1) Current Service Map

| Service                 | Port   | Status      | Notes                                                                     |
| ----------------------- | ------ | ----------- | ------------------------------------------------------------------------- |
| `auth-service`          | `8081` | Implemented | Google token validation, internal JWT issuance, token validation endpoint |
| `user-service`          | `8082` | Implemented | User lookup, role-protected user read, JPA user model                     |
| `attendance-service`    | `8084` | Skeleton    | Spring app + config only, no REST controllers                             |
| `session-service`       | `8083` | Skeleton    | Spring app + config only, no REST controllers                             |
| `justification-service` | `8085` | Skeleton    | Spring app + config only, no REST controllers                             |
| `notification-service`  | `9000` | Skeleton    | Spring app + config only, no REST controllers                             |
| `face-service`          | n/a    | Placeholder | Minimal FastAPI sample endpoints                                          |
| `qr-service`            | n/a    | Placeholder | `main.py` currently empty                                                 |

## 2) How Services Communicate

Current communication model:

1. Client calls through Traefik on `http://localhost`.
2. Auth endpoints (`/api/auth/**`) are routed to `auth-service` without forward-auth.
3. Protected endpoints (`/api/users/**`) use Traefik `forward-auth` to call `GET /auth/validate`.
4. On valid token, auth returns:
   - `X-User-Id`
   - `X-User-Roles`
   - `X-User-Email`
5. Traefik forwards those headers to downstream services.
6. `user-service` enforces role checks using forwarded headers.
7. For internal login flow, `auth-service` calls `user-service` with:
   - `X-Request-Source: auth-service`

## 3) Current Implemented Contracts

## Auth contracts

- `POST /auth/login`
  - request: `{ "idToken": "<google-id-token>" }`
  - success: `{ "accessToken": "<internal-jwt>" }`

- `GET /auth/validate`
  - request header: `Authorization: Bearer <internal-jwt>`
  - success: `200` + `X-User-*` headers

## User contracts

- `POST /users/auth-user` (internal, called by auth-service)
  - requires `X-Request-Source: auth-service`
  - request: `{ "email": "...", "pfpUrl": "..." }`
  - returns existing user record

- `GET /users/{id}`
  - requires forwarded auth headers (`X-User-*`)
  - role required: `ADMIN`
  - returns DTO with user profile fields and roles

## Header contract summary

```text
X-Request-Source: auth-service
X-User-Id: <id>
X-User-Roles: <comma-separated-roles>
X-User-Email: <email>
```

## 4) Rules Other Services Must Follow

Any new backend service must follow these rules:

1. Keep JWT validation centralized in `auth-service`.
2. Trust and validate forwarded identity headers (`X-User-*`) for protected endpoints.
3. Use explicit role checks per protected endpoint.
4. Use `X-Request-Source` only for narrow internal trust paths.
5. Document every new endpoint contract with request/response examples.
6. Standardize error responses as structured JSON (`status`, `message`, `timestamp`, `path`).
7. Keep URLs, secrets, and credentials in config/env vars (not hardcoded).

See full implementation guidance in `docs/backend-service-rules.md`.

## 5) Examples

### Example A: Login

```bash
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"idToken":"<google-id-token>"}'
```

### Example B: Access protected user endpoint

```bash
curl http://localhost/api/users/1 \
  -H "Authorization: Bearer <internal-jwt>"
```

### Example C: Internal auth-service -> user-service call

```bash
curl -X POST http://localhost:8082/users/auth-user \
  -H "Content-Type: application/json" \
  -H "X-Request-Source: auth-service" \
  -d '{"email":"user@ump.ac.ma","pfpUrl":"https://example.com/avatar.jpg"}'
```

## 6) Build and Runtime Requirements

- Java `21`
- Maven Wrapper (`mvnw` / `mvnw.cmd`)
- PostgreSQL (`users_db`, and `attendance_db` for scaffolded services)
- Docker Compose + Traefik for local routing/gateway setup

## 7) Scope Note

This README reflects the currently checked-in code behavior, not the full planned platform target.
