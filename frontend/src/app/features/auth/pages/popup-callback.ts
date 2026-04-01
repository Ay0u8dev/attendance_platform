import { Component, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { OAuthService } from 'angular-oauth2-oidc';
import { filter, take } from 'rxjs/operators';

import { getGoogleAuthConfig } from '../../../core/auth/google-auth.config';
import { AuthService } from '../../../core/auth/services/auth.service';

@Component({
  selector: 'app-oauth-callback',
  standalone: true,
  template: `
    <div class="min-h-screen flex items-center justify-center">
      <p class="text-gray-400 text-sm animate-pulse">Connexion en cours...</p>
    </div>
  `,
})
export class OAuthCallback {
  private readonly oauthService = inject(OAuthService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  ngOnInit(): void {
    if (!this.isBrowser) {
      return;
    }

    this.oauthService.configure(getGoogleAuthConfig());

    this.oauthService.events
      .pipe(
        filter((event) => event.type === 'token_received'),
        take(1),
      )
      .subscribe(() => {
        this.redirectToLogin();
      });

    this.oauthService
      .loadDiscoveryDocumentAndTryLogin()
      .then(() => {
        this.redirectToLogin();
      })
      .catch(() => {
        this.redirectToLogin();
      });
  }

  private redirectToLogin(): void {
    if (!this.isBrowser) {
      return;
    }

    this.router.navigateByUrl('/', { replaceUrl: true });
  }
}
