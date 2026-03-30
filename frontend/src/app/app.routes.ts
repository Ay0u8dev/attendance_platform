import { Routes } from '@angular/router';
import { Login } from './features/auth/pages/login/login';
import { OAuthCallback } from './features/auth/pages/popup-callback';
// import { authGuard } from './core/auth/guards/auth.guard';

export const routes: Routes = [
  { path: 'popup-callback', component: OAuthCallback },
  { path: '', component: Login },
  // example of a protected route using the authGuard
  // { path: 'home', component: HomeDahsboard, canActivate: [authGuard] },
];
