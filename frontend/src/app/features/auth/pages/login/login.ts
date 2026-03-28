import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { Button } from '../../../../shared/components/button/button';

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  imports: [Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly authService = inject(AuthService);

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  testCount = signal(0);

  signInWithGoogle() {
    console.log('Initiating Google Sign-In...');
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.loginWithGoogle().subscribe({
      next: () => {
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        console.error('Login failed:', err);
        this.errorMessage.set('Authentication failed. Please try again.');
      },
      complete: () => {
        this.isLoading.set(false);
      }
    });
  }
}
