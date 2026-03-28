import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { OAuthService } from 'angular-oauth2-oidc';
import { BehaviorSubject, EMPTY, Observable, from, throwError } from 'rxjs';
import { tap, catchError, filter, switchMap, take } from 'rxjs/operators';

import { getGoogleAuthConfig } from '../google-auth.config';
import { environment } from '../../../../environments/environment';
import { AuthUser, BackendAuthResponse } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly TOKEN_KEY = 'access_token';
  private readonly USER_KEY  = 'auth_user';
  private readonly isBrowser: boolean;

  private currentUserSubject = new BehaviorSubject<AuthUser | null>(this.loadStoredUser());
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private oauthService: OAuthService,
    private http: HttpClient,
    private router: Router
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);

    if (this.isBrowser) {
      this.configureOAuth();
    }
  }

  private configureOAuth(): void {
    this.oauthService.configure(getGoogleAuthConfig());
    this.oauthService.loadDiscoveryDocumentAndTryLogin();
  }

  loginWithGoogle(): Observable<BackendAuthResponse> {
    if (!this.isBrowser) return EMPTY;

    // Listen for token BEFORE opening popup
    const tokenReceived$ = this.oauthService.events.pipe(
      filter(event => event.type === 'token_received'),
      take(1),
      switchMap(() => {
        const idToken = this.oauthService.getIdToken()?.trim();

        if (!idToken) {
          return throwError(() => new Error('Missing id_token after popup login.'));
        }

        return this.http.post<BackendAuthResponse>(
          `${environment.apiBaseUrl}/auth/google`,
          { idToken }
        );
      }),
      tap(response => this.handleAuthSuccess(response)),
      catchError((error: unknown) => {
        console.error('Auth error:', error);
        return EMPTY;
      })
    );

    // Open popup (don't chain off its promise)
    this.oauthService.initLoginFlowInPopup().catch((error: unknown) => {
      const errorType = this.extractPopupErrorType(error);
      if (errorType === 'popup_blocked') {
        this.oauthService.initCodeFlow(); // fallback to redirect
      }
    });

    return tokenReceived$;
  }

  private extractPopupErrorType(error: unknown): string | null {
    if (typeof error === 'string') {
      return error;
    }

    if (error && typeof error === 'object' && 'type' in error) {
      const typedError = error as { type?: unknown };
      return typeof typedError.type === 'string' ? typedError.type : null;
    }

    return null;
  }

  logout(): void {
    if (!this.isBrowser) {
      return;
    }

    this.oauthService.logOut();
    this.clearSession();
    this.router.navigate(['/']);
  }

  isAuthenticated(): boolean {
    if (!this.isBrowser) {
      return false;
    }

    return !!localStorage.getItem(this.TOKEN_KEY);
  }

  getToken(): string | null {
    if (!this.isBrowser) {
      return null;
    }

    return localStorage.getItem(this.TOKEN_KEY);
  }

  get currentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  private handleAuthSuccess(response: BackendAuthResponse): void {
    if (!this.isBrowser) {
      return;
    }

    localStorage.setItem(this.TOKEN_KEY, response.accessToken);
    localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
    this.currentUserSubject.next(response.user);
    this.router.navigate(['/dashboard']);
  }

  private clearSession(): void {
    if (!this.isBrowser) {
      return;
    }

    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUserSubject.next(null);
  }

  private loadStoredUser(): AuthUser | null {
    if (!this.isBrowser) {
      return null;
    }

    try {
      const raw = localStorage.getItem(this.USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
