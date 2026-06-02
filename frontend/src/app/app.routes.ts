import { Routes } from '@angular/router';
import { authChildGuard, authGuard, guestGuard } from './core/auth/guards/auth.guard';
import { Role } from './core/auth/models/auth.model';

export const routes: Routes = [
  {
    path: 'attendance/qr-display',
    loadComponent: () =>
      import('./features/attendance/qr-display/qr-display-page').then(
        (module) => module.QrDisplayPage,
      ),
  },
  {
    path: '',
    loadComponent: () => import('./shared/layouts/auth-layout').then((module) => module.AuthLayout),
    children: [
      {
        path: '',
        pathMatch: 'full',
        canMatch: [guestGuard],
        loadComponent: () =>
          import('./features/auth/pages/login/login').then((module) => module.Login),
      },
      {
        path: 'login',
        canMatch: [guestGuard],
        loadComponent: () =>
          import('./features/auth/pages/login/login').then((module) => module.Login),
      },
      {
        path: 'popup-callback',
        loadComponent: () =>
          import('./features/auth/pages/popup-callback').then((module) => module.OAuthCallback),
      },
      {
        path: 'forbidden',
        loadComponent: () =>
          import('./features/auth/pages/forbidden').then((module) => module.ForbiddenComponent),
      },
    ],
  },
  {
    path: '',
    canActivate: [authGuard],
    canActivateChild: [authChildGuard],
    data: { allowedRoles: [Role.ADMIN] },
    loadComponent: () =>
      import('./shared/layouts/admin-layout').then((module) => module.AdminLayout),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/admin/dashboard/dashboard/dashboard').then(
            (module) => module.Dashboard,
          ),
      },
      {
        path: 'students',
        loadComponent: () =>
          import('./features/admin/students/students-page').then((module) => module.StudentsPage),
      },
      {
        path: 'teachers',
        loadComponent: () =>
          import('./features/admin/teachers/teachers-page').then((module) => module.TeachersPage),
      },
      {
        path: 'structure',
        loadComponent: () =>
          import('./features/admin/structure/structure-page').then(
            (module) => module.StructurePage,
          ),
      },
      {
        path: 'attendance',
        loadComponent: () =>
          import('./features/admin/attendance/attendance-page').then(
            (module) => module.AttendancePage,
          ),
      },
      {
        path: 'justifications',
        loadComponent: () =>
          import('./features/admin/justifications/justifications-page').then(
            (module) => module.JustificationsPage,
          ),
      },
    ],
  },
  {
    path: 'teacher',
    canActivate: [authGuard],
    data: { allowedRoles: [Role.TEACHER] },
    loadComponent: () =>
      import('./shared/layouts/teacher-layout').then((module) => module.TeacherLayout),
    children: [],
  },
  {
    path: 'student',
    canActivate: [authGuard],
    data: { allowedRoles: [Role.STUDENT] },
    loadComponent: () =>
      import('./shared/layouts/student-layout').then((module) => module.StudentLayout),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/student/dashboard/student-dashboard-page').then(
            (module) => module.StudentDashboardPage,
          ),
      },
      {
        path: 'sessions',
        loadComponent: () =>
          import('./features/student/sessions/student-sessions-page').then(
            (module) => module.StudentSessionsPage,
          ),
      },
      {
        path: 'justifications',
        loadComponent: () =>
          import('./features/student/justifications/student-justifications-page').then(
            (module) => module.StudentJustificationsPage,
          ),
      },
      {
        path: 'justifications/:id',
        loadComponent: () =>
          import('./features/student/justifications/student-justification-detail-page').then(
            (module) => module.StudentJustificationDetailPage,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
