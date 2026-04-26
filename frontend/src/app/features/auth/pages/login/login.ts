import { CommonModule, NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { Button } from '../../../../shared/components/button/button';

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  standalone: true,
  imports: [CommonModule, Button, NgOptimizedImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly authService = inject(AuthService);

  readonly isLoading = toSignal(this.authService.authInProgress$, { initialValue: false });
  readonly authError = toSignal(this.authService.authError$, { initialValue: null });

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.authService.redirectToRoleHome(undefined, true);
    }
  }

  signInWithGoogle(): void {
    this.authService.loginWithGoogle();
  }
}
