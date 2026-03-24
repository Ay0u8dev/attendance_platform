# Angular Project Structure — Attendance Platform

## Overview

This is a **standalone Angular 21** project using **Tailwind CSS** and **SCSS**.  
It follows a **feature-based architecture** where code is grouped by role/domain, not by type.

---

## Full Folder Structure

```
attendance-web/
├── src/
│   ├── app/
│   │   │
│   │   ├── core/                          # Singleton services, used globally
│   │   │   ├── guards/
│   │   │   │   └── auth.guard.ts          # Protects routes: checks login + role
│   │   │   ├── interceptors/
│   │   │   │   └── auth.interceptor.ts    # Attaches JWT token to every HTTP request
│   │   │   ├── services/
│   │   │   │   └── auth.service.ts        # Google SSO, session management, logout
│   │   │   └── models/
│   │   │       └── user.model.ts          # User interface (id, email, role, ...)
│   │   │
│   │   ├── features/                      # One folder per role/feature area
│   │   │   │
│   │   │   ├── auth/                      # Public pages (no login required)
│   │   │   │   ├── auth.routes.ts         # Routes: /auth/login, /auth/callback
│   │   │   │   ├── login/
│   │   │   │   │   ├── login.component.ts
│   │   │   │   │   └── login.component.html
│   │   │   │   └── unauthorized/
│   │   │   │       └── unauthorized.component.ts
│   │   │   │
│   │   │   ├── admin/                     # Admin role pages
│   │   │   │   ├── admin.routes.ts        # Routes: /admin/dashboard, /admin/students, ...
│   │   │   │   ├── dashboard/
│   │   │   │   ├── students/
│   │   │   │   ├── teachers/
│   │   │   │   ├── sessions/
│   │   │   │   └── justifications/
│   │   │   │
│   │   │   ├── teacher/                   # Teacher role pages
│   │   │   │   ├── teacher.routes.ts      # Routes: /teacher/dashboard, /teacher/sessions, ...
│   │   │   │   ├── dashboard/
│   │   │   │   ├── sessions/
│   │   │   │   │   ├── new-session/       # Start a session (choose method: QR / face / manual)
│   │   │   │   │   └── session-detail/
│   │   │   │   └── justifications/
│   │   │   │
│   │   │   └── student/                   # Student role pages
│   │   │       ├── student.routes.ts      # Routes: /student/dashboard, /student/absences, ...
│   │   │       ├── dashboard/
│   │   │       ├── absences/
│   │   │       └── justifications/
│   │   │
│   │   ├── layout/                        # Shell wrapping authenticated pages
│   │   │   ├── shell/
│   │   │   │   ├── shell.component.ts     # Root layout component with <router-outlet>
│   │   │   │   └── shell.component.html
│   │   │   ├── sidebar/
│   │   │   │   └── sidebar.component.ts   # Side navigation (links change per role)
│   │   │   └── topbar/
│   │   │       └── topbar.component.ts    # Top bar (user avatar, logout button)
│   │   │
│   │   ├── app.ts                         # Root component
│   │   ├── app.html                       # Root template — just <router-outlet>
│   │   ├── app.routes.ts                  # Top-level routes with lazy loading
│   │   └── app.config.ts                  # App providers: router, HTTP client, interceptors
│   │
│   ├── environments/
│   │   ├── environment.ts                 # Dev config (apiUrl: http://localhost/api)
│   │   └── environment.prod.ts            # Prod config
│   │
│   ├── styles.scss                        # Global styles + Tailwind import
│   ├── main.ts                            # Entry point — bootstraps the app
│   └── index.html                         # The single HTML file served
│
├── tailwind.config.js                     # Tailwind config (content paths, plugins)
├── angular.json                           # Angular CLI config (build, serve, test)
├── tsconfig.json                          # TypeScript config
└── package.json
```

---

## Key Concepts

### Standalone Components
Every component has `standalone: true` and imports its own dependencies directly.  
No NgModules. No `declarations` array. When you generate a component it looks like:

```ts
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],  // ← imported here, not in a module
  templateUrl: './login.component.html',
})
export class LoginComponent {}
```

### Lazy Loading
Each feature folder has its own `*.routes.ts` file.  
The router only loads a feature's code when the user actually navigates to it.  
This keeps the initial bundle small.

```
User navigates to /admin/dashboard
  → Angular loads admin.routes.ts
  → Angular loads DashboardComponent
  → Nothing else is loaded
```

### Role-Based Guards
Two guards protect all routes:

| Guard | What it does |
|---|---|
| `authGuard` | Redirects to `/auth/login` if the user is not logged in |
| `roleGuard(['ADMIN'])` | Redirects to `/unauthorized` if the user's role doesn't match |

Applied in `app.routes.ts` like this:
```ts
{
  path: 'admin',
  canActivate: [authGuard, roleGuard(['ADMIN'])],
  loadChildren: () => import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES),
}
```

### HTTP Interceptor
The `auth.interceptor.ts` runs automatically on every outgoing HTTP request.  
It reads the JWT from `localStorage` and attaches it as a header:
```
Authorization: Bearer <token>
```
You never call this manually — it's registered once in `app.config.ts`.

### Environments
Use `environment.ts` for any value that changes between dev and prod:

```ts
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost/api',           // → Traefik gateway in dev
  googleClientId: 'YOUR_CLIENT_ID.apps.googleusercontent.com',
};
```

Import it in any service:
```ts
import { environment } from '../../../environments/environment';

this.http.post(`${environment.apiUrl}/auth/google/callback`, { code });
```

---

## How a New Page Is Added

Example: adding a **Students list** page under Admin.

**1. Generate the component**
```bash
ng g c features/admin/students
```

**2. Add the route in `admin.routes.ts`**
```ts
{ path: 'students', component: StudentsComponent }
```

**3. Link to it from the sidebar**
```html
<a routerLink="/admin/students">Students</a>
```

That's it. Three steps for every new page.

---

## Generating Things with the CLI

| What you want | Command |
|---|---|
| New component | `ng g c features/admin/students` |
| New service | `ng g s core/services/attendance` |
| New guard | `ng g g core/guards/role` |
| New interface/model | `ng g interface core/models/session` |
| Build for production | `ng build` |
| Run tests | `ng test` |
