# Frontend Project Structure

This document reflects the current Angular project layout in `frontend/`.

## Stack

- Angular `21.x`
- Standalone components
- Angular application builder and SSR files
- Tailwind CSS v4 through `src/styles.css`
- Font Awesome
- `angular-oauth2-oidc` for Google OAuth
- `@zxing/ngx-scanner` for QR scanning support
- Vitest through Angular CLI

## Top-Level Files

```text
frontend/
├── angular.json
├── package.json
├── src/
│   ├── app/
│   ├── environments/
│   ├── main.ts
│   ├── main.server.ts
│   ├── server.ts
│   ├── index.html
│   └── styles.css
├── DESIGN_LANGUAGE.md
├── PROJECT_STRUCTURE.md
└── README.md
```

## App Layout

```text
src/app/
├── app.config.ts
├── app.routes.ts
├── app.routes.server.ts
├── app.ts
├── core/
├── features/
└── shared/
```

### `core/`

Singleton services, guards, interceptors, and models that are reused across feature areas.

Important current areas:

```text
core/
├── attendance/
│   ├── models/
│   └── services/
│       ├── qr-attendance.service.ts
│       └── student-attendance.service.ts
├── auth/
│   ├── guards/
│   ├── interceptors/
│   ├── models/
│   └── services/
└── student/
    └── services/
```

### `features/`

Feature screens grouped by product area and role.

Important current areas:

```text
features/
├── admin/
│   ├── attendance/
│   ├── dashboard/
│   ├── justifications/
│   ├── structure/
│   ├── students/
│   └── teachers/
├── attendance/
│   └── qr-display/
├── auth/
│   └── pages/
└── student/
    ├── attendance/
    ├── dashboard/
    └── justifications/
```

### `shared/`

Reusable layout and UI components. Current examples include shared layouts, buttons, data table, toast, and utility UI primitives.

## Current Route Shape

Routes are configured in `src/app/app.routes.ts`.

Public routes:

- `/`
- `/login`
- `/auth/login`
- `/popup-callback`
- `/forbidden`
- `/attendance/qr-display`

Authenticated shell routes:

- `/dashboard` for admin dashboard
- `/students`
- `/teachers`
- `/structure/...`
- `/attendance`
- `/justifications`
- `/statistics`
- `/alerts`
- `/my-attendance`

There are also placeholder authenticated routes for teacher and student dashboards. Check `app.routes.ts` before adding navigation because route ownership is still evolving.

## Backend Integration Points

Environment:

```ts
environment.apiBaseUrl === '/api';
```

The browser calls Traefik gateway paths:

- `/api/auth/login`
- `/api/users/**`
- `/api/attendance/**`
- `/api/qr/**`
- `/api/ws/attendance/ws` for attendance WebSocket

Do not use service-local URLs in browser code.

## Auth Implementation

- `core/auth/services/auth.service.ts` handles OAuth startup, callback completion, token exchange, token storage, role decoding, and logout.
- `core/auth/interceptors/auth.interceptor.ts` attaches backend JWTs to protected API requests.
- `core/auth/guards/auth.guard.ts` protects routes and handles role-aware navigation.
- Backend JWT storage key: `backend_access_token`.

## Attendance Implementation

- `core/attendance/services/student-attendance.service.ts` calls student attendance endpoints and maps DTOs into student-facing view models.
- `core/attendance/services/qr-attendance.service.ts` calls QR endpoints and the teacher active-session endpoint used by the QR display helper.
- `features/attendance/qr-display/` contains the temporary QR display page.

Backend docs for the behavior:

- `../backend/docs/student-attendance-flow.md`
- `../backend/docs/qr-code-flow.md`
- `../backend/docs/frontend-attendance-api/`

## Adding New Frontend Work

1. Check `app.routes.ts` and existing feature folders before creating a new route.
2. Put cross-feature API clients in `core/<domain>/services/`.
3. Put feature-specific presentational work under `features/<area>/`.
4. Promote reused UI to `shared/components/`.
5. Keep UI consistent with `DESIGN_LANGUAGE.md`.
6. Update frontend docs when route shape, API integration, or feature ownership changes.
