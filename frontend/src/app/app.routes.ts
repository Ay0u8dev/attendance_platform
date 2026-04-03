import { Routes } from '@angular/router';
import { authGuard } from './core/auth/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./shared/layouts/auth-layout').then((module) => module.AuthLayout),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/auth/pages/login/login').then((module) => module.Login),
      },
      {
        path: 'popup-callback',
        loadComponent: () =>
          import('./features/auth/pages/popup-callback').then((module) => module.OAuthCallback),
      },
    ],
  },
  {
    path: '',
    // canActivate: [authGuard],
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
      {
        path: 'alerts',
        loadComponent: () =>
          import('./features/admin/alerts/alerts-page').then((module) => module.AlertsPage),
      },
      {
        path: 'statistics',
        loadComponent: () =>
          import('./features/admin/statistics/statistics-page').then(
            (module) => module.StatisticsPage,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
