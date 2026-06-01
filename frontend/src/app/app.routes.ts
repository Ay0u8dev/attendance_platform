import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/guards/auth.guard';

export const routes: Routes = [
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
    loadComponent: () =>
      import('./shared/layouts/teacher-layout').then((module) => module.TeacherLayout),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/teacher/dashboard/dashboard/dashboard').then(
            (module) => module.TeacherDashboard,
          ),
      },
      {
        path: 'mark-attendance/manual',
        loadComponent: () =>
          import('./features/teacher/markattendance/manual-marking/manual-marking').then(
            (module) => module.ManualMarking,
          ),
      },
      {
        path: 'mark-attendance/start-session',
        loadComponent: () =>
          import('./features/teacher/markattendance/start-session/start-session').then(
            (module) => module.StartSession,
          ),
      },
      {
        path: 'mark-attendance/start-session/qr-code-marking',
        loadComponent: () =>
          import('./features/teacher/markattendance/qr-code-marking/qr-code-marking').then(
            (module) => module.QrCodeMarking,
          ),
      },
      {
        path: 'mark-attendance/start-session/facial-recognition',
        loadComponent: () =>
          import('./features/teacher/markattendance/facial-recognition/facial-recognition').then(
            (module) => module.FacialRecognition,
          ),
      },
      {
        path: 'sessions',
        loadComponent: () =>
          import('./features/teacher/sessions/sessions-page').then((module) => module.TeacherSessionsPage),
      },
      {
        path: 'modules',
        loadComponent: () =>
          import('./features/teacher/modules/modules-page').then((module) => module.TeacherModulesPage),
      },
      {
        path: 'groups',
        loadComponent: () =>
          import('./features/teacher/groups/groups-page').then((module) => module.TeacherGroupsPage),
      },
      {
        path: 'students',
        loadComponent: () =>
          import('./features/teacher/students/students-page').then((module) => module.TeacherStudentsPage),
      },
      {
        path: 'justifications',
        loadComponent: () =>
          import('./features/teacher/justifications/justifications-page').then(
            (module) => module.TeacherJustificationsPage,
          ),
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
  {
    path: 'student',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./shared/layouts/student-layout').then((module) => module.StudentLayout),
    children: [],
  },
  { path: '**', redirectTo: '' },
];
