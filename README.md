# Attendance Platform

Attendance Platform is a local microservice-style academic attendance system. The checked-in implementation includes Google-based authentication, user and academic-structure management, live attendance sessions, QR-based student self-marking, and an Angular frontend.

This document is the onboarding entry point. Endpoint details live in `backend/docs/`.

## Current Services

| Area | Path | Tech | Local port | Status | Owns |
| --- | --- | --- | --- | --- | --- |
| Frontend | `frontend/` | Angular 21 | `4200` | Implemented | Browser UI, auth shell, admin/student/attendance screens, QR display helper |
| Auth service | `backend/auth-service/` | Spring Boot | `8081` | Implemented | Google token validation, internal JWT issuance, JWT validation for Traefik forward-auth |
| User service | `backend/user-service/` | Spring Boot + JPA | `8082` | Implemented | Users, roles, teachers, students, academic structure, active-year roster data |
| Attendance service | `backend/attendance-service/` | Spring Boot + JPA + Redis | `8083` | Implemented | Attendance sessions, live Redis state, final records, teacher/admin/student reads, WebSocket events |
| QR service | `backend/qr-service/` | FastAPI | `8001` in dev | Implemented | Signed QR payloads and QR scan validation before internal attendance marking |
| Face service | `backend/face-service/` | FastAPI | `8000` sample container port | Placeholder | Not production-ready; intended future face-proof validator |
| Justification service | `backend/justification-service/` | Spring Boot | `8085` | Skeleton | App/config only; no REST flow is documented as implemented |
| Notification service | `backend/notification-service/` | Spring Boot | `9000` | Skeleton | App/config only |
| Traefik | `traefik/` | Traefik | `80`, dashboard `9000` | Implemented for dev routing | Gateway routing and forward-auth |

## Local Runtime Shape

Local development uses Docker Compose for infrastructure and Traefik, while application services are normally run from their service folders on the host.

1. Start infrastructure and gateway from the repo root:

   ```powershell
   docker compose up -d traefik redis user-db attendance-db
   ```

2. Run backend services locally:

   - `auth-service` on `8081`
   - `user-service` on `8082`
   - `attendance-service` on `8083`
   - `qr-service` on `8001`

3. Run the Angular frontend from `frontend/`:

   ```powershell
   npm install
   npm start
   ```

4. Browser traffic goes through Traefik at `http://localhost`.

## Gateway Routes

The browser should use gateway paths, not service-local paths.

| Browser path | Upstream service | Auth behavior |
| --- | --- | --- |
| `/api/auth/**` | `auth-service` | Public login/validation route, no forward-auth middleware on login |
| `/api/users/**` | `user-service` | Protected by Traefik forward-auth |
| `/api/attendance/**` | `attendance-service` | Protected by Traefik forward-auth |
| `/api/qr/**` | `qr-service` | Protected by Traefik forward-auth |
| `/api/ws/attendance/ws` | `attendance-service` | STOMP auth is handled by attendance-service on `CONNECT` |
| `/**` | Angular frontend | Public shell |

The direct attendance WebSocket endpoint after Traefik prefix stripping is `/attendance/ws`, but frontend clients connect to `/api/ws/attendance/ws`.

## Ownership Boundaries

- `auth-service` is the only service that issues and validates internal JWTs for normal HTTP traffic.
- Traefik `forward-auth` injects `X-User-Id`, `X-User-Roles`, and `X-User-Email` into protected downstream requests.
- Downstream Spring services authorize from forwarded headers and role checks; they do not parse JWTs for normal gateway HTTP requests.
- `attendance-service` validates JWTs directly for STOMP `CONNECT` because WebSocket session identity is not solved by Traefik forward-auth.
- `user-service` owns identity, teacher/student data, and academic structure. Attendance code must call its internal roster/teacher endpoints instead of reading user tables directly.
- `attendance-service` owns attendance sessions, live Redis state, final attendance records, and attendance read models.
- `qr-service` validates QR proof and then calls the internal attendance endpoint. Browser clients must not call `/attendance/internal/**`.

## Documentation Index

- Backend overview: `backend/readme.md`
- Architecture: `backend/docs/backend-architecture.md`
- Service contracts: `backend/docs/backend-service-contracts.md`
- Backend implementation rules: `backend/docs/backend-service-rules.md`
- Student attendance flow: `backend/docs/student-attendance-flow.md`
- QR flow: `backend/docs/qr-code-flow.md`
- Frontend overview: `frontend/README.md`
- Frontend structure: `frontend/PROJECT_STRUCTURE.md`
- Frontend design language: `frontend/DESIGN_LANGUAGE.md`

## Parallel Development Rules

- Start from the service ownership table before changing code. If a feature crosses services, define the public contract first.
- Public browser calls use `/api/**` gateway paths. Internal service-to-service calls use direct service URLs and must be documented as internal.
- Any endpoint change must update `backend/docs/backend-service-contracts.md` and any role-specific frontend API doc under `backend/docs/frontend-attendance-api/`.
- Any frontend attendance or QR integration change must be checked against `frontend/src/app/core/attendance/services/`.
- Do not document planned services as implemented. If the code is a skeleton, say it is a skeleton.

