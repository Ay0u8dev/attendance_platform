import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AppNotification,
  DeleteNotificationsResponse,
  PagedResponse,
  ReadAllNotificationsResponse,
  UnreadCountResponse,
} from './notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = environment.apiBaseUrl || '/api';

  getMyNotifications(page = 0, size = 10): Observable<PagedResponse<AppNotification>> {
    const params = new HttpParams()
      .set('page', page)
      .set('size', size);

    return this.http.get<PagedResponse<AppNotification>>(
      `${this.apiBaseUrl}/notifications/me`,
      { params },
    );
  }

  getUnreadCount(): Observable<UnreadCountResponse> {
    return this.http.get<UnreadCountResponse>(
      `${this.apiBaseUrl}/notifications/unread-count`,
    );
  }

  markAsRead(notificationId: number): Observable<AppNotification> {
    return this.http.patch<AppNotification>(
      `${this.apiBaseUrl}/notifications/${notificationId}/read`,
      {},
    );
  }

  markAllAsRead(): Observable<ReadAllNotificationsResponse> {
    return this.http.patch<ReadAllNotificationsResponse>(
      `${this.apiBaseUrl}/notifications/read-all`,
      {},
    );
  }

  deleteNotification(notificationId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiBaseUrl}/notifications/${notificationId}`,
    );
  }

  deleteReadNotifications(): Observable<DeleteNotificationsResponse> {
    return this.http.delete<DeleteNotificationsResponse>(
      `${this.apiBaseUrl}/notifications/read`,
    );
  }
}
