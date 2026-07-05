import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivateChildFn,
  CanActivateFn,
  CanMatchFn,
  Router,
} from '@angular/router';
import { Role } from '../models/auth.model';
import { AuthService } from '../services/auth.service';

type RoleRouteData = {
  allowedRoles?: Role[];
  allowFirstLoginStudent?: boolean;
};

function getAllowedRoles(route: ActivatedRouteSnapshot): Role[] {
  for (const snapshot of [...route.pathFromRoot].reverse()) {
    const allowedRoles = (snapshot.data as RoleRouteData | undefined)?.allowedRoles;
    if (allowedRoles?.length) {
      return allowedRoles;
    }
  }

  return [];
}

function validateAccess(route: ActivatedRouteSnapshot) {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.parseUrl('/');
  }

  const allowsFirstLoginStudent = [...route.pathFromRoot].some(
    (snapshot) =>
      (snapshot.data as RoleRouteData | undefined)?.allowFirstLoginStudent === true,
  );
  const user = auth.currentUser;
  if (user?.role === Role.STUDENT && user.firstLogin && !allowsFirstLoginStudent) {
    return router.parseUrl('/student/face-enrollment');
  }

  const allowedRoles = getAllowedRoles(route);
  if (allowedRoles.length && !auth.canAccessRoute(allowedRoles)) {
    return router.parseUrl(auth.getRoleHomeUrl());
  }

  return true;
}

export const authGuard: CanActivateFn = (route, state) => {
  void state;
  return validateAccess(route);
};

export const authChildGuard: CanActivateChildFn = (route, state) => {
  void state;
  return validateAccess(route);
};

export const guestGuard: CanMatchFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return router.parseUrl(auth.getRoleHomeUrl());
  }

  return true;
};
