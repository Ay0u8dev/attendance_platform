import { Injectable, inject } from '@angular/core';
import { OAuthStorage } from 'angular-oauth2-oidc';

import { AuthService } from '../auth/services/auth.service';

@Injectable({ providedIn: 'root' })
export class NotificationAuthContextService {
  private readonly authService = inject(AuthService);
  private readonly storage = inject(OAuthStorage, { optional: true });
  private readonly tokenKey = 'backend_access_token';

  getToken(): string | null {
    return this.authService.getToken() ?? this.storage?.getItem(this.tokenKey) ?? null;
  }

  getCurrentUserId(): number | null {
    const currentUserId = this.parseUserId(this.authService.currentUser?.id);

    if (currentUserId !== null) {
      return currentUserId;
    }

    const token = this.getToken();

    if (!token) {
      return null;
    }

    try {
      const payload = this.decodeJwtPayload(token);

      const possibleUserId =
        payload['userId'] ??
        payload['sub'] ??
        payload['id'] ??
        payload['user_id'];

      return this.parseUserId(possibleUserId);
    } catch {
      return null;
    }
  }

  private parseUserId(value: unknown): number | null {
    if (value === null || value === undefined) {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private decodeJwtPayload(token: string): Record<string, unknown> {
    const parts = token.split('.');

    if (parts.length < 2) {
      throw new Error('Invalid JWT');
    }

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');

    return JSON.parse(atob(padded)) as Record<string, unknown>;
  }
}
