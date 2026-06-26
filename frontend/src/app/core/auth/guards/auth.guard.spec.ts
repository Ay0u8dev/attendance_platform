import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { Role, User } from '../models/auth.model';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';

describe('authGuard face enrollment', () => {
  const router = { parseUrl: vi.fn((url: string) => url) };
  const auth = {
    currentUser: null as User | null,
    isAuthenticated: vi.fn(() => true),
    canAccessRoute: vi.fn(() => true),
    getRoleHomeUrl: vi.fn(() => '/student'),
    clearSessionAndRedirect: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    auth.currentUser = null;
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('redirects a first-login student away from dashboard routes without clearing the session', () => {
    auth.currentUser = student(true);

    const result = runGuard({ allowedRoles: [Role.STUDENT] });

    expect(result).toBe('/student/face-enrollment');
    expect(auth.clearSessionAndRedirect).not.toHaveBeenCalled();
  });

  it('allows a first-login student to access face enrollment without a loop', () => {
    auth.currentUser = student(true);

    expect(
      runGuard({ allowedRoles: [Role.STUDENT], allowFirstLoginStudent: true }),
    ).toBe(true);
  });

  it('allows an enrolled student to access dashboard routes', () => {
    auth.currentUser = student(false);

    expect(runGuard({ allowedRoles: [Role.STUDENT] })).toBe(true);
  });

  it('keeps non-student routing behavior unchanged', () => {
    auth.currentUser = {
      id: '2',
      email: 'admin@ump.ac.ma',
      role: Role.ADMIN,
      firstLogin: false,
    };

    expect(runGuard({ allowedRoles: [Role.ADMIN] })).toBe(true);
  });

  function runGuard(data: Record<string, unknown>) {
    const route = { data, pathFromRoot: [{ data }] } as unknown as ActivatedRouteSnapshot;
    const state = {} as RouterStateSnapshot;
    return TestBed.runInInjectionContext(() => authGuard(route, state));
  }

  function student(firstLogin: boolean): User {
    return {
      id: '1',
      email: 'student@ump.ac.ma',
      role: Role.STUDENT,
      firstLogin,
    };
  }
});
