# Attendance Platform Frontend

This is the Angular frontend for the Attendance Platform. It is an Angular `21.x` application using standalone components, Angular SSR support, Tailwind CSS v4, RxJS, and `angular-oauth2-oidc`.

The frontend talks to backend services through the Traefik gateway using `environment.apiBaseUrl = '/api'`.

## Quick Start

```powershell
cd frontend
npm install
npm start
```

Open `http://localhost:4200`.

For normal backend-backed development, also run the root infrastructure and backend services described in `../README.md`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm start` | Run Angular dev server |
| `npm run build` | Production build |
| `npm test` | Run Vitest unit tests through Angular CLI |
| `npm run watch` | Development build watch |
| `npm run serve:ssr:frontend` | Serve built SSR output |

## Runtime Configuration

Development environment:

```ts
export const environment = {
  production: false,
  googleClientId: '...',
  apiBaseUrl: '/api',
  useMockStudentAttendance: false,
};
```

All app HTTP calls should build from `environment.apiBaseUrl`.

Gateway paths used by the frontend:

| Area | Path |
| --- | --- |
| Auth login exchange | `/api/auth/login` |
| Users/students/teachers/structure | `/api/users/**` |
| Attendance HTTP APIs | `/api/attendance/**` |
| QR APIs | `/api/qr/**` |
| Attendance WebSocket | `/api/ws/attendance/ws` |

Do not call service-local paths like `/attendance/**` or `/qr/**` from browser code.

## Auth Flow

1. `AuthService` initializes Google OAuth through `angular-oauth2-oidc`.
2. The Google `idToken` is exchanged with backend `POST /api/auth/login`.
3. Backend returns `{ accessToken }`.
4. The token is stored under `backend_access_token`.
5. `AuthInterceptor` attaches `Authorization: Bearer <token>` to non-public same-origin API requests.
6. A `401` clears the token and navigates back to `/`.

The public frontend routes include `/`, `/login`, `/auth/login`, `/popup-callback`, `/forbidden`, and `/attendance/qr-display`.

## Attendance And QR Integration

Student attendance reads are implemented in:

- `src/app/core/attendance/services/student-attendance.service.ts`

QR display and scan integration is implemented in:

- `src/app/core/attendance/services/qr-attendance.service.ts`
- `src/app/features/attendance/qr-display/`

Important behavior:

- student history endpoints return finalized records
- active student attendance uses `GET /api/attendance/student/sessions/active`
- QR student scans use `POST /api/qr/student/scan`
- teacher QR display fetches the teacher active session and then QR payloads
- QR display uses explicit token headers through a raw `HttpClient` because it is a temporary helper page that accepts a pasted token

Backend contract docs:

- `../backend/docs/backend-service-contracts.md`
- `../backend/docs/student-attendance-flow.md`
- `../backend/docs/qr-code-flow.md`
- `../backend/docs/frontend-attendance-api/`

## Development Rules

- Use standalone Angular components. In Angular 21, do not add `standalone: true` unless an existing file pattern requires it.
- Use `ChangeDetectionStrategy.OnPush` for new components.
- Prefer signals and `computed()` for local UI state.
- Use native control flow (`@if`, `@for`, `@switch`).
- Keep shared reusable UI in `src/app/shared/components/`.
- Keep domain integrations in `src/app/core/<domain>/services/`.
- Follow `DESIGN_LANGUAGE.md` before building or changing UI.

## Styling

- Tailwind CSS v4 is configured through `src/styles.css`.
- Use project tokens from `src/styles.css` instead of raw hex colors.
- This is an administrative product. Avoid marketing-page UI patterns, loud gradients, and decorative motion.
