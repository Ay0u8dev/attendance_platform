import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { Button } from '../../../../shared/components/button/button';
import { ToastService } from '../../../../shared/components/toast/toast.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  imports: [Button, NgOptimizedImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  readonly isLoading = toSignal(this.authService.authInProgress$, { initialValue: false });
  readonly authError = toSignal(this.authService.authError$, { initialValue: null });

  signInWithGoogle(): void {
    this.authService.loginWithGoogle();
  }

  test(): void {
    this.toastService.error('Google login failed', 'Missing token returned from Google.');
  }
}
