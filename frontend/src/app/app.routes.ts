import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: 'popup-callback', loadComponent: () => import('./features/auth/pages/popup-callback').then(m => m.OAuthCallback) },
  { path: '', loadComponent: () => import('./features/auth/pages/login/login').then(m => m.Login) },
];
