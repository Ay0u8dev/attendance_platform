import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { OAuthStorage } from 'angular-oauth2-oidc';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private readonly tokenKey = 'backend_access_token';

  constructor(
    private readonly router: Router,
    private readonly storage: OAuthStorage,
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Ne pas ajouter le token pour les endpoints publics ou externes
    if (this.isPublicUrl(request.url) || this.isExternalUrl(request.url)) {
      return next
        .handle(request)
        .pipe(catchError((error: HttpErrorResponse) => this.handleError(error)));
    }

    // Récupérer le token du localStorage (backend JWT)
    const token = this.storage.getItem(this.tokenKey);

    // Cloner la requête et ajouter le header Authorization
    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });
    }

    return next
      .handle(request)
      .pipe(catchError((error: HttpErrorResponse) => this.handleError(error)));
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    if (error.status === 403) {
      // Domaine non autorisé ou accès refusé
      this.storage.removeItem(this.tokenKey);
    } else if (error.status === 401) {
      // Token expiré ou invalide
      this.storage.removeItem(this.tokenKey);
      this.router.navigateByUrl('/', { replaceUrl: true });
    }
    return throwError(() => error);
  }

  private isPublicUrl(url: string): boolean {
    const publicUrls = [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/google',
      '/api/auth/refresh',
    ];
    return publicUrls.some((publicUrl) => url.includes(publicUrl));
  }

  private isExternalUrl(url: string): boolean {
    // Don't add Authorization header to external URLs
    // This prevents CORS issues with OAuth providers and third-party services
    try {
      const urlObj = new URL(url, window.location.href);
      return urlObj.origin !== window.location.origin;
    } catch {
      return false;
    }
  }
}
