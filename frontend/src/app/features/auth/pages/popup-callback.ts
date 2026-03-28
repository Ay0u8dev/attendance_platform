import { Component, OnInit } from '@angular/core';
import { OAuthService } from 'angular-oauth2-oidc';
import { filter, take } from 'rxjs/operators';

import { getGoogleAuthConfig } from '../../../core/auth/google-auth.config';

@Component({
  selector: 'app-oauth-callback',
  standalone: true,
  template: `
    <div class="min-h-screen flex items-center justify-center">
      <p class="text-gray-400 text-sm animate-pulse">Connexion en cours...</p>
    </div>
  `
})
export class OAuthCallback implements OnInit {

  constructor(private oauthService: OAuthService) {}

  ngOnInit(): void {
    this.oauthService.configure(getGoogleAuthConfig());

    this.oauthService.events
      .pipe(filter(event => event.type === 'token_received'), take(1))
      .subscribe(() => {
        if (window.opener) {
          window.close();
        }
      });

    this.oauthService.loadDiscoveryDocumentAndTryLogin()
      .catch(() => {
        if (window.opener) {
          window.close();
        }
      });
  }
}
