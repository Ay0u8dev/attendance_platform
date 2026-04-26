import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { OAuthService, OAuthStorage } from 'angular-oauth2-oidc';
import { EMPTY, of, throwError } from 'rxjs';
import { catchError, filter, switchMap } from 'rxjs/operators';

import { getGoogleAuthConfig } from '../google-auth.config';
import { environment } from '../../../../environments/environment';
import { User, BackendAuthResponse, Role } from '../models/auth.model';
import { ToastService } from '../../../shared/components/toast/toast.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'backend_access_token';

  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly oauthService = inject(OAuthService);
  private readonly storage = inject(OAuthStorage);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  private authInitialized = false;

  private readonly currentUserSignal = signal<User | null>(null);
  private readonly authInProgressSignal = signal(false);
  private readonly authErrorSignal = signal<string | null>(null);
  readonly currentUser$ = toObservable(this.currentUserSignal);
  readonly authInProgress$ = toObservable(this.authInProgressSignal);
  readonly authError$ = toObservable(this.authErrorSignal);

  constructor() {
    if (this.isBrowser) {
      this.initializeAuth();
    }
  }

  private initializeAuth(): void {
    if (this.authInitialized) {
      return;
    }

    this.authInitialized = true;
    this.currentUserSignal.set(this.loadStoredUser());

    if (!this.currentUserSignal() && this.storage.getItem(this.TOKEN_KEY)) {
      this.clearSession();
    }

    this.configureOAuth();
    this.setupGlobalTokenListener();
  }

  // initialize OAuth configuration
  private configureOAuth(): void {
    this.oauthService.configure(getGoogleAuthConfig());
    this.oauthService.loadDiscoveryDocumentAndTryLogin().catch((error: unknown) => {
      this.authErrorSignal.set('OAuth initialization failed. Please try again.');
      this.toastService.error('OAuth initialization failed', 'Please refresh and try again.');
      console.error('OAuth discovery/login initialization failed:', error);
      this.authInProgressSignal.set(false);
    });
  }

  // Listen globally for Google tokens and exchange id_token with backend
  private setupGlobalTokenListener(): void {
    this.oauthService.events
      .pipe(
        filter((event) => event.type === 'token_received'),
        switchMap(() => {
          // If we already have a valid backend session, no need to exchange again
          if (this.isAuthenticated()) {
            this.authInProgressSignal.set(false);
            return EMPTY;
          }

          const idToken = this.oauthService.getIdToken()?.trim();
          if (!idToken) {
            this.authInProgressSignal.set(false);
            return throwError(() => new Error('Missing id_token from Google.'));
          }

          this.authInProgressSignal.set(true);
          this.authErrorSignal.set(null);

          return this.http.post<BackendAuthResponse>(`${environment.apiBaseUrl}/auth/login`, {
            idToken,
          });
        }),
        catchError((error) => {
          this.authInProgressSignal.set(false);

          // Handle specific error responses from backend
          if (error.status === 401) {
            const message =
              this.normalizeAuthMessage(error.error?.message) ||
              'Domaine non autorisé. Utilisez votre adresse @ump.ac.ma';
            this.authErrorSignal.set(message);
            this.toastService.error('Accès refusé', message);
            console.warn('Domain validation failed:', error);
          } else if (error.status === 400) {
            const message = error.error?.message || 'Requête invalide. Vérifiez vos informations.';
            this.authErrorSignal.set(message);
            this.toastService.error('Erreur de requête', message);
            console.error('Invalid request:', error);
          } else {
            const message =
              this.normalizeAuthMessage(error.error?.message) ||
              "Nous n'avons pas pu terminer la connexion.";
            this.authErrorSignal.set(message);
            console.error('Backend auth exchange failed:', error);
          }

          return of(null); // Keep the listener alive for future attempts
        }),
      )
      .subscribe((response) => {
        if (response) {
          this.handleAuthSuccess(response);
        }
      });
  }

  // Start Google login using redirect flow.
  loginWithGoogle(): void {
    if (!this.isBrowser) return;

    this.authInProgressSignal.set(true);
    this.authErrorSignal.set(null);

    this.oauthService.initLoginFlow();
  }

  // Finalize OAuth callback handling for the redirect page.
  completeOAuthCallback(): void {
    if (!this.isBrowser) {
      return;
    }

    this.authInProgressSignal.set(true);
    this.authErrorSignal.set(null);

    this.oauthService
      .loadDiscoveryDocumentAndTryLogin()
      .then(() => {
        if (!this.oauthService.hasValidIdToken()) {
          this.authInProgressSignal.set(false);
        }
      })
      .catch((error: unknown) => {
        this.authInProgressSignal.set(false);
        this.authErrorSignal.set('OAuth callback failed. Please try again.');
        this.toastService.error('OAuth callback failed', 'Please retry the login.');
        console.error('OAuth callback processing failed:', error);
      });
  }

  // check if the user is authenticated
  isAuthenticated(): boolean {
    if (!this.isBrowser) {
      return false;
    }
    const token = this.storage.getItem(this.TOKEN_KEY);
    if (!token) {
      return false;
    }

    if (!this.currentUserSignal()) {
      const user = this.decodeToken(token);
      if (!user) {
        console.error('Invalid token found in storage when calling isAuthenticated()');
        this.clearSession();
        return false;
      }
      this.currentUserSignal.set(user);
    }

    return true;
  }

  // get the user's access token
  getToken(): string | null {
    if (!this.isBrowser) {
      return null;
    }
    return this.storage.getItem(this.TOKEN_KEY);
  }

  // get the current user's information
  get currentUser(): User | null {
    return this.currentUserSignal();
  }

  // handle successful authentication response from the backend
  private handleAuthSuccess(response: BackendAuthResponse): void {
    if (!this.isBrowser) {
      return;
    }

    const user = this.decodeToken(response.accessToken);
    if (!user) {
      console.error('Invalid token received from backend');
      this.authInProgressSignal.set(false);
      this.authErrorSignal.set('Received an invalid token from the server.');
      this.toastService.error('Invalid session token', 'The server returned an invalid token.');
      return;
    }

    this.storage.setItem(this.TOKEN_KEY, response.accessToken);
    this.currentUserSignal.set(user);
    this.authInProgressSignal.set(false);
    this.authErrorSignal.set(null);
    this.toastService.success('Authentification réussie', 'Bienvenue sur la plateforme !');    this.redirectToRoleHome(user, true);
  }

  // logout the user
  logout(): void {
    if (!this.isBrowser) {
      return;
    }
    this.oauthService.logOut();
    this.clearSession();
    this.router.navigate(['/']);
  }

  clearSessionAndRedirect(targetUrl: string): void {
    if (!this.isBrowser) {
      return;
    }

    this.clearSession();
    this.router.navigateByUrl(targetUrl, { replaceUrl: true });
  }

  // load the stored user from localStorage (if available)
  private loadStoredUser(): User | null {
    if (!this.isBrowser) {
      return null;
    }

    try {
      const token = this.storage.getItem(this.TOKEN_KEY);
      return token ? this.decodeToken(token) : null;
    } catch {
      return null;
    }
  }

  private clearSession(): void {
    if (!this.isBrowser) {
      return;
    }

    this.storage.removeItem(this.TOKEN_KEY);
    this.currentUserSignal.set(null);
    this.authInProgressSignal.set(false);
    this.authErrorSignal.set(null);
  }

  // helper to decode JWT and extract user payload
  private decodeToken(token: string): User | null {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join(''),
      );

      const payload = JSON.parse(jsonPayload) as Record<string, unknown> & { exp?: number };
      if (typeof payload.exp === 'number' && Date.now() >= payload.exp * 1000) {
        return null;
      }

      const role = this.normalizeRole(payload['role'] ?? payload['roles']);
      if (!role) {
        return null;
      }

      return { ...(payload as Partial<User>), role } as User;
    } catch {
      return null;
    }
  }

  private normalizeRole(roleValue: unknown): Role | null {
    if (Array.isArray(roleValue)) {
      return this.normalizeRole(roleValue[0]);
    }

    if (typeof roleValue !== 'string') {
      return null;
    }

    const normalized = roleValue.toUpperCase().trim();
    if (normalized in Role) {
      return Role[normalized as keyof typeof Role];
    }

    return null;
  }

  private normalizeAuthMessage(message: unknown): string | null {
    if (typeof message !== 'string') {
      return null;
    }

    let cleaned = message.trim();
    const prefixes = [
      "Erreur d'authentification:",
      'Token Google invalide :',
      'Token Google invalide:',
    ];

    for (const prefix of prefixes) {
      if (cleaned.toLowerCase().startsWith(prefix.toLowerCase())) {
        cleaned = cleaned.slice(prefix.length).trim();
      }
    }

    return cleaned || null;
  }

  getRoleHomeUrl(role: Role | null | undefined = this.currentUserSignal()?.role): string {
    switch (role) {
      case Role.ADMIN:
        return '/dashboard';
      case Role.TEACHER:
        return '/teacher';
      case Role.STUDENT:
        return '/student';
      default:
        return '/';
    }
  }

  redirectToRoleHome(user?: User | null, replaceUrl = false): void {
    if (!this.isBrowser) {
      return;
    }

    const target = this.getRoleHomeUrl(user?.role ?? this.currentUserSignal()?.role ?? null);
    this.router.navigateByUrl(target, { replaceUrl });
  }

  canAccessUrl(url: string): boolean {
    const role = this.currentUserSignal()?.role;
    if (!role) {
      return false;
    }

    if (url.startsWith('/teacher')) {
      return role === Role.TEACHER;
    }

    if (url.startsWith('/student')) {
      return role === Role.STUDENT;
    }

    const adminPrefixes = [
      '/dashboard',
      '/students',
      '/teachers',
      '/structure',
      '/attendance',
      '/justifications',
    ];
    if (adminPrefixes.some((prefix) => url.startsWith(prefix))) {
      return role === Role.ADMIN;
    }

    return true;
  }
}
