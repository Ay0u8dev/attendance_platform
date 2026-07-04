import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastOutlet } from './shared/components/toast/toast-outlet';
import { AuthService } from './core/auth/services/auth.service';
import { NotificationRealtimeService } from './core/notifications/notification-realtime.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  // Keep AuthService alive from app startup so OAuth callbacks are handled on every route.
  private readonly authService = inject(AuthService);
  // Keep notification websocket lifecycle tied to the authenticated app session.
  private readonly notificationRealtimeService = inject(NotificationRealtimeService);

  protected readonly title = signal('Attendance Platform');
}
