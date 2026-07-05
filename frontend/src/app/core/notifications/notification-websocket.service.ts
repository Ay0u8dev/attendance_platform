import { Injectable, OnDestroy, inject } from '@angular/core';
import type { Client, Message, Subscription } from 'stompjs';
import { Stomp } from 'stompjs/lib/stomp';
import { Subject } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AppNotification } from './notification.model';
import { NotificationAuthContextService } from './notification-auth-context.service';

@Injectable({ providedIn: 'root' })
export class NotificationWebSocketService implements OnDestroy {
  private readonly authContext = inject(NotificationAuthContextService);

  private stompClient: Client | null = null;
  private subscription: Subscription | null = null;
  private connected = false;
  private currentUserId: number | null = null;
  private connectPromise: Promise<void> | null = null;
  private connectingUserId: number | null = null;
  private connectionGeneration = 0;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private activeWebSocketUrl: string | null = null;

  private readonly notificationsSubject = new Subject<AppNotification>();
  private readonly connectionSubject = new Subject<boolean>();

  readonly notifications$ = this.notificationsSubject.asObservable();
  readonly connection$ = this.connectionSubject.asObservable();

  ngOnDestroy(): void {
    this.disconnect();
  }

  connect(): Promise<void> {
    const userId = this.authContext.getCurrentUserId();

    if (this.connected && this.currentUserId === userId) {
      return Promise.resolve();
    }

    if (this.connectPromise && this.connectingUserId === userId) {
      return this.connectPromise;
    }

    const generation = ++this.connectionGeneration;
    this.connectingUserId = userId;
    const connectionPromise = this.openConnection(userId, generation);
    this.connectPromise = connectionPromise.finally(() => {
      if (this.connectionGeneration === generation) {
        this.connectPromise = null;
        this.connectingUserId = null;
      }
    });

    return this.connectPromise;
  }

  private async openConnection(userId: number | null, generation: number): Promise<void> {
    const token = this.authContext.getToken();

    if (!token) {
      throw new Error('Missing authentication token for notifications websocket');
    }

    if (!userId) {
      throw new Error('Missing current user id for notifications websocket');
    }

    if (this.isStaleConnectionGeneration(generation)) {
      return;
    }

    this.releaseClient(false);
    if (this.isStaleConnectionGeneration(generation)) {
      return;
    }
    this.currentUserId = userId;

    const url = this.buildWebSocketUrl();

    try {
      await this.connectToUrl(url, token, userId, generation);

      if (this.isStaleConnectionGeneration(generation)) {
        return;
      }
    } catch (error) {
      if (this.isStaleConnectionGeneration(generation)) {
        return;
      }

      console.warn(`Notification websocket failed for ${url}:`, error);
      this.releaseClient(false);
      this.connected = false;
      this.connectionSubject.next(false);
      this.handleReconnect(userId);
      throw error;
    }
  }

  disconnect(): void {
    this.releaseClient(true);
  }

  private connectToUrl(url: string, token: string, userId: number, generation: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const client = Stomp.client(url);

      this.stompClient = client;
      this.activeWebSocketUrl = url;
      client.debug = () => undefined;

      client.connect(
        { Authorization: `Bearer ${token}` },
        () => {
          if (this.isStaleConnectionGeneration(generation) || this.stompClient !== client) {
            resolve();
            return;
          }

          if (this.stompClient !== client) {
            return;
          }

          this.connected = true;
          this.reconnectAttempts = 0;
          this.connectionSubject.next(true);
          this.subscribeToUserTopic(userId);
          resolve();
        },
        (error: unknown) => {
          if (this.isStaleConnectionGeneration(generation) || this.stompClient !== client) {
            resolve();
            return;
          }

          if (this.stompClient !== client) {
            return;
          }

          const shouldReconnect = this.connected && this.currentUserId === userId;
          this.connected = false;
          this.connectionSubject.next(false);

          if (shouldReconnect) {
            this.handleReconnect(userId);
            return;
          }

          reject(error);
        },
      );
    });
  }

  private isStaleConnectionGeneration(generation: number): boolean {
    return generation !== this.connectionGeneration;
  }

  private releaseClient(resetUser: boolean): void {
    this.clearReconnectTimer();

    if (this.subscription) {
      try {
        this.subscription.unsubscribe();
      } catch {
        // Ignore stale subscription cleanup errors during reconnect.
      }
      this.subscription = null;
    }

    const client = this.stompClient;
    this.stompClient = null;
    this.activeWebSocketUrl = null;

    if (client) {
      this.closeClient(client);
    }

    this.connected = false;

    if (resetUser) {
      this.currentUserId = null;
      this.connectionSubject.next(false);
    }
  }

  private closeClient(client: Client): void {
    const websocket = (client as unknown as { ws?: WebSocket }).ws;

    try {
      if (this.isSocketOpen(websocket)) {
        client.disconnect(() => undefined);
        return;
      }

      if (this.isSocketConnecting(websocket)) {
        websocket?.close();
      }
    } catch {
      // A reconnect can race with browser socket teardown; the next attempt owns recovery.
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  private subscribeToUserTopic(userId: number): void {
    if (!this.stompClient) {
      return;
    }

    this.subscription = this.stompClient.subscribe(
      `/topic/notifications.users.${userId}`,
      (message: Message) => {
        try {
          this.notificationsSubject.next(JSON.parse(message.body) as AppNotification);
        } catch {
          // Keep websocket alive even if one frame is malformed.
          console.warn('Received malformed notification websocket frame.');
        }
      },
    );
  }

  private handleReconnect(userId: number): void {
    if (this.currentUserId !== userId || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.clearReconnectTimer();

    this.reconnectTimer = setTimeout(
      () => {
        if (this.currentUserId !== userId) {
          return;
        }

        this.reconnectAttempts += 1;
        this.connect().catch((error) => {
          console.warn('Notification websocket reconnect failed:', error);
        });
      },
      2000 * Math.pow(2, this.reconnectAttempts),
    );
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
  }

  private buildWebSocketUrl(): string {
    const apiBaseUrl = environment.apiBaseUrl || '/api';
    const baseUrl = new URL(apiBaseUrl, window.location.origin);
    baseUrl.protocol = baseUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    baseUrl.pathname = `${baseUrl.pathname.replace(/\/$/, '')}/ws/notifications/ws`;
    baseUrl.search = '';
    baseUrl.hash = '';
    return baseUrl.toString();
  }

  private isSocketOpen(websocket: WebSocket | undefined): boolean {
    return websocket?.readyState === this.getWebSocketState('OPEN');
  }

  private isSocketConnecting(websocket: WebSocket | undefined): boolean {
    return websocket?.readyState === this.getWebSocketState('CONNECTING');
  }

  private getWebSocketState(state: 'CONNECTING' | 'OPEN'): number {
    if (typeof WebSocket === 'undefined') {
      return state === 'CONNECTING' ? 0 : 1;
    }

    return WebSocket[state];
  }

}
