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

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private router: Router) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Ne pas ajouter le token pour les endpoints publics
    if (this.isPublicUrl(request.url)) {
      return next
        .handle(request)
        .pipe(catchError((error: HttpErrorResponse) => this.handleError(error)));
    }

    // Récupérer le token du localStorage (backend JWT)
    const token = localStorage.getItem('backend_access_token');

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
      localStorage.removeItem('backend_access_token');
      this.router.navigate(['/forbidden']);
    } else if (error.status === 401) {
      // Token expiré ou invalide
      localStorage.removeItem('backend_access_token');
      this.router.navigate(['/']);
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
}
