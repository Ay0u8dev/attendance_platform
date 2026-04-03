import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { Button } from '../../../../shared/components/button/button';

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  imports: [Button, NgOptimizedImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly authService = inject(AuthService);

  readonly isLoading = toSignal(this.authService.authInProgress$, { initialValue: false });

  signInWithGoogle(): void {
    this.authService.loginWithGoogle();
  }
}
