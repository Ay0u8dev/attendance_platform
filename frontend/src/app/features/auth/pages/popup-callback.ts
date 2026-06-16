import { ChangeDetectionStrategy, Component, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../../../core/auth/services/auth.service';

@Component({
  selector: 'app-oauth-callback',
  standalone: true,
  template: `
    <div class="rounded-[2rem] border border-line bg-surface p-8 text-center shadow-card">
      <div
        class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-info-soft text-primary"
      >
        <i class="fa-solid fa-shield-heart text-xl" aria-hidden="true"></i>
      </div>
      <p class="mt-4 text-base font-semibold text-principalText">Connexion en cours ...</p>
      <p class="mt-2 text-sm text-secondaryText">
        Validation de votre session institutionnelle et redirection vers la plateforme.
      </p>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OAuthCallback {
  private readonly authService = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  ngOnInit(): void {
    if (!this.isBrowser) {
      return;
    }

    this.authService.completeOAuthCallback();
  }
}
