import { signal } from '@angular/core';
import { of } from 'rxjs';

import { Role, User } from '../models/auth.model';
import { AuthService } from './auth.service';

describe('AuthService token decoding', () => {
  const decodeToken = (payload: Record<string, unknown>): User | null => {
    const service = Object.create(AuthService.prototype) as AuthService;
    const decoder = service as unknown as { decodeToken(token: string): User | null };
    return decoder.decodeToken(jwt(payload));
  };

  it('rejects a legacy student token without firstLogin', () => {
    expect(decodeToken(basePayload(Role.STUDENT))).toBeNull();
  });

  it('decodes a student token with an explicit firstLogin claim', () => {
    expect(decodeToken({ ...basePayload(Role.STUDENT), firstLogin: true })?.firstLogin).toBe(true);
  });

  it('keeps legacy non-student tokens compatible', () => {
    expect(decodeToken(basePayload(Role.ADMIN))?.firstLogin).toBe(false);
  });

  it('resolves first-login students to face enrollment', () => {
    const service = Object.create(AuthService.prototype) as AuthService;

    expect(service.getRoleHomeUrl(Role.STUDENT, true)).toBe('/student/face-enrollment');
    expect(service.getRoleHomeUrl(Role.STUDENT, false)).toBe('/student');
  });

  it('stores a refreshed JWT and updates the authenticated user atomically', () => {
    const token = jwt({ ...basePayload(Role.STUDENT), firstLogin: false });
    const http = { post: vi.fn(() => of({ accessToken: token })) };
    const storage = { setItem: vi.fn() };
    const currentUserSignal = signal<User | null>(null);
    const service = Object.create(AuthService.prototype) as AuthService;
    Object.assign(service, {
      TOKEN_KEY: 'backend_access_token',
      http,
      storage,
      currentUserSignal,
    });
    let refreshedUser: User | undefined;

    service.refreshSession().subscribe((user) => (refreshedUser = user));

    expect(http.post).toHaveBeenCalledWith(expect.stringContaining('/auth/refresh'), {});
    expect(storage.setItem).toHaveBeenCalledWith('backend_access_token', token);
    expect(refreshedUser?.firstLogin).toBe(false);
    expect(currentUserSignal()?.firstLogin).toBe(false);
  });

  function basePayload(role: Role): Record<string, unknown> {
    return { id: 1, email: 'user@ump.ac.ma', roles: [role] };
  }

  function jwt(payload: Record<string, unknown>): string {
    const encode = (value: object) =>
      btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.`;
  }
});
