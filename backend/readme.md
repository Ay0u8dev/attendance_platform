# Attendance Platform Backend

The backend is a set of Spring Boot services plus two FastAPI services. The implemented runtime today is auth, users, attendance, and QR attendance. Face, justification, and notification are not ready product services.

## Service Map

| Service | Tech | Local port | Status | Notes |
| --- | --- | --- | --- | --- |
| `auth-service` | Spring Boot | `8081` | Implemented | Google token validation, internal JWT issuing, `GET /auth/validate` for Traefik forward-auth |
| `user-service` | Spring Boot + JPA | `8082` | Implemented | Users, teachers, students, academic structure, Excel import, internal roster endpoints |
| `attendance-service` | Spring Boot + JPA + Redis | `8083` | Implemented | Session lifecycle, live Redis state, final records, student/admin/teacher reads, STOMP updates |
| `qr-service` | FastAPI | `8001` dev / `8000` container | Implemented | Signed rotating QR payloads and student scan forwarding |
| `face-service` | FastAPI | `8000` sample container port | Placeholder | Not a real face-recognition service yet |
| `justification-service` | Spring Boot | `8085` | Skeleton | Bootstrap/config only |
| `notification-service` | Spring Boot | `9000` | Skeleton | Bootstrap/config only |

## Gateway Contract

Local browser calls go through Traefik at `http://localhost`:

| Gateway path | Service-local path after stripping | Upstream |
| --- | --- | --- |
| `/api/auth/**` | `/auth/**` | `auth-service:8081` |
| `/api/users/**` | `/users/**` | `user-service:8082` |
| `/api/attendance/**` | `/attendance/**` | `attendance-service:8083` |
| `/api/qr/**` | `/qr/**` | `qr-service:8001` |
| `/api/ws/attendance/ws` | `/attendance/ws` | `attendance-service:8083` WebSocket |

`/api/users/**`, `/api/attendance/**`, and `/api/qr/**` are protected by Traefik forward-auth. `/api/ws/attendance/ws` is not forward-auth protected because STOMP authentication is handled inside `attendance-service` during `CONNECT`.

## Implemented Contract Docs

- `docs/backend-architecture.md`: runtime topology and ownership boundaries
- `docs/backend-service-contracts.md`: HTTP, WebSocket, DTO, and header contracts
- `docs/backend-service-rules.md`: rules for future backend changes
- `docs/student-attendance-flow.md`: student attendance lifecycle from session creation to finalization
- `docs/qr-code-flow.md`: QR payload and scan validation flow
- `docs/frontend-attendance-api/`: frontend-facing attendance and QR API slices

## Local Runtime Requirements

- Java `21`
- Maven Wrapper in each Spring service
- Python `3.11+` for FastAPI services
- Node/npm for the Angular frontend
- Docker Compose for Traefik, Redis, and PostgreSQL

Infrastructure:

```powershell
docker compose up -d traefik redis user-db attendance-db
```

Run QR service locally:

```powershell
cd backend/qr-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
$env:ATTENDANCE_SERVICE_URL = "http://localhost:8083"
$env:QR_TOKEN_SECRET = "dev-only-change-me"
$env:QR_TOKEN_TTL_SECONDS = "30"
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

## Auth And Header Model

- `auth-service` validates Google `idToken` values at login and issues the platform JWT.
- Traefik validates that JWT with `GET /auth/validate` before protected HTTP routes.
- On success, Traefik injects:
  - `X-User-Id`
  - `X-User-Roles`
  - `X-User-Email`
- Internal machine-to-machine calls use `X-Request-Source` with a narrow trusted value such as `auth-service`, `attendance-service`, `qr-service`, or `face-service`.

## Parallel Work Guidance

- If you touch a public endpoint, update `docs/backend-service-contracts.md`.
- If the frontend consumes the endpoint, update `docs/frontend-attendance-api/`.
- If you add a service-to-service call, document the trusted source, headers, request body, and owning service.
- If a service is still only scaffolded, do not write docs as if it works. That is how teams waste time debugging fiction.
