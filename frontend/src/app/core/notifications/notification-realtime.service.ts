import { Injectable, inject } from '@angular/core';

import { AuthService } from '../auth/services/auth.service';
import { ToastService } from '../../shared/components/toast/toast.service';
import { NotificationWebSocketService } from './notification-websocket.service';
import { NotificationSeverity } from './notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationRealtimeService {
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly notificationWebSocketService = inject(NotificationWebSocketService);

  private connectedUserId: string | null = null;
  private readonly toastedNotificationIds = new Set<number>();

  constructor() {
    this.authService.currentUser$.subscribe((user) => {
      if (!user) {
        this.connectedUserId = null;
        this.notificationWebSocketService.disconnect();
        return;
      }

      if (this.connectedUserId === user.id) {
        return;
      }

      this.connectedUserId = user.id;
      this.notificationWebSocketService.connect().catch((error) => {
        console.warn('Notification websocket connection failed:', error);
      });
    });

    const currentUser = this.authService.currentUser;
    if (currentUser) {
      this.connectedUserId = currentUser.id;
      this.notificationWebSocketService.connect().catch((error) => {
        console.warn('Notification websocket connection failed:', error);
      });
    }

    this.notificationWebSocketService.notifications$.subscribe((notification) => {
      if (this.toastedNotificationIds.has(notification.id)) {
        return;
      }

      this.toastedNotificationIds.add(notification.id);
      if (this.toastedNotificationIds.size > 100) {
        const oldestId = this.toastedNotificationIds.values().next().value;
        if (oldestId !== undefined) {
          this.toastedNotificationIds.delete(oldestId);
        }
      }

      switch (this.toastVariant(notification.severity)) {
        case 'success':
          this.toastService.success(notification.title, notification.message, 5000);
          break;
        case 'warning':
          this.toastService.warning(notification.title, notification.message, 5000);
          break;
        case 'error':
          this.toastService.error(notification.title, notification.message, 5000);
          break;
        default:
          this.toastService.info(notification.title, notification.message, 5000);
          break;
      }
    });
  }

  private toastVariant(severity: NotificationSeverity): 'success' | 'warning' | 'error' | 'info' {
    if (severity === 'SUCCESS') {
      return 'success';
    }
    if (severity === 'WARNING') {
      return 'warning';
    }
    if (severity === 'DANGER') {
      return 'error';
    }
    return 'info';
  }
}
