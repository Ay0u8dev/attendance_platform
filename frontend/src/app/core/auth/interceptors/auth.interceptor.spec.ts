import { HttpErrorResponse, HttpHandler, HttpRequest, HttpResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { OAuthStorage } from 'angular-oauth2-oidc';
import { of, throwError } from 'rxjs';

import { AuthInterceptor } from './auth.interceptor';

describe('AuthInterceptor', () => {
  let storage: OAuthStorage;
  let router: Pick<Router, 'navigateByUrl'>;
  let interceptor: AuthInterceptor;

  beforeEach(() => {
    storage = {
      getItem: vi.fn(() => 'token'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    router = {
      navigateByUrl: vi.fn(),
    };
    interceptor = new AuthInterceptor(router as Router, storage);
  });

  it('keeps the backend token when an authenticated request is forbidden', () => {
    const next = failingHandler(403);
    const request = new HttpRequest('GET', '/api/attendance/student/sessions');

    interceptor.intercept(request, next).subscribe({ error: () => undefined });

    expect(storage.removeItem).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('clears the backend token and redirects when an authenticated request is unauthorized', () => {
    const next = failingHandler(401);
    const request = new HttpRequest('GET', '/api/attendance/student/sessions');

    interceptor.intercept(request, next).subscribe({ error: () => undefined });

    expect(storage.removeItem).toHaveBeenCalledWith('backend_access_token');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/', { replaceUrl: true });
  });

  it('does not turn public auth endpoint failures into global logout side effects', () => {
    const next = failingHandler(401);
    const request = new HttpRequest('POST', '/api/auth/login', {});

    interceptor.intercept(request, next).subscribe({ error: () => undefined });

    expect(storage.removeItem).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('attaches the current JWT to the authenticated refresh endpoint', () => {
    const next: HttpHandler = {
      handle: vi.fn(() => of(new HttpResponse({ status: 200 }))),
    };

    interceptor.intercept(new HttpRequest('POST', '/api/auth/refresh', {}), next).subscribe();

    const forwarded = vi.mocked(next.handle).mock.calls[0][0];
    expect(forwarded.headers.get('Authorization')).toBe('Bearer token');
  });
});

function failingHandler(status: number): HttpHandler {
  return {
    handle: vi.fn(() =>
      throwError(
        () =>
          new HttpErrorResponse({
            status,
            statusText: status === 401 ? 'Unauthorized' : 'Forbidden',
          }),
      ),
    ),
  };
}
