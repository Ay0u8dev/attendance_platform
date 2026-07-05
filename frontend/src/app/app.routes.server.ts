import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Client,
  },
  {
    path: 'login',
    renderMode: RenderMode.Client,
  },
  {
    path: 'popup-callback',
    renderMode: RenderMode.Client,
  },
  {
    path: 'forbidden',
    renderMode: RenderMode.Client,
  },
  {
    path: 'dashboard',
    renderMode: RenderMode.Client,
  },
  {
    path: 'students',
    renderMode: RenderMode.Client,
  },
  {
    path: 'teachers',
    renderMode: RenderMode.Client,
  },
  {
    path: 'structure',
    renderMode: RenderMode.Client,
  },
  {
    path: 'attendance',
    renderMode: RenderMode.Client,
  },
  {
    path: 'justifications',
    renderMode: RenderMode.Client,
  },
  {
    path: 'inscription',
    renderMode: RenderMode.Client,
  },
  {
    path: 'teacher',
    renderMode: RenderMode.Client,
  },
  {
    path: 'teacher/**',
    renderMode: RenderMode.Client,
  },
  {
    path: 'student',
    renderMode: RenderMode.Client,
  },
  {
    path: 'student/**',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
