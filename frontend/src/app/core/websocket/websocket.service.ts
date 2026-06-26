import { Injectable, OnDestroy, inject } from '@angular/core';
import { OAuthStorage } from 'angular-oauth2-oidc';
import type { Client, Message, Subscription } from 'stompjs';
import { Stomp } from 'stompjs/lib/stomp';
import { Subject } from 'rxjs';

import { environment } from '../../../environments/environment';

export type AttendanceWebSocketEventType = 'ATTENDANCE_UPDATED' | 'SESSION_FINALIZED';

export interface AttendanceUpdateNotification {
  eventType: 'ATTENDANCE_UPDATED';
  sessionId: number;
  studentId: number;
  status: 'UNKNOWN' | 'PRESENT' | 'ABSENT';
  markMethod: 'QR_CODE' | 'FACE_ID' | 'MANUAL';
  markedAt: string;
  presentCount: number;
  absentCount: number;
  unknownCount: number;
}

export interface SessionFinalizedNotification {
  eventType: 'SESSION_FINALIZED';
  sessionId: number;
  status: 'FINALIZED';
  presentCount: number;
  absentCount: number;
  unknownCount: number;
}

export type AttendanceWebSocketNotification =
  | AttendanceUpdateNotification
  | SessionFinalizedNotification;

@Injectable({ providedIn: 'root' })
export class AttendanceWebSocketService implements OnDestroy {
  private readonly storage = inject(OAuthStorage);
  private readonly tokenKey = 'backend_access_token';

  private stompClient: Client | null = null;
  private subscription: Subscription | null = null;
  private connected = false;
  private currentSessionId: number | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private reconnectTimer?: ReturnType<typeof setTimeout>;

  private readonly eventsSubject = new Subject<AttendanceWebSocketNotification>();
  private readonly connectionSubject = new Subject<boolean>();

  readonly events$ = this.eventsSubject.asObservable();
  readonly connection$ = this.connectionSubject.asObservable();

  ngOnDestroy(): void {
    this.disconnect();
  }

  connect(sessionId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.connected && this.currentSessionId === sessionId) {
        resolve();
        return;
      }

      const token = this.storage.getItem(this.tokenKey);
      if (!token) {
        reject(new Error('Missing authentication token for attendance websocket'));
        return;
      }

      this.disconnect();
      this.currentSessionId = sessionId;
      this.stompClient = Stomp.client(this.buildWebSocketUrl());
      this.stompClient.debug = () => undefined;

      this.stompClient.connect(
        { Authorization: `Bearer ${token}` },
        () => {
          this.connected = true;
          this.reconnectAttempts = 0;
          this.connectionSubject.next(true);
          this.subscribeToSessionTopic(sessionId);
          resolve();
        },
        (error: unknown) => {
          this.connected = false;
          this.connectionSubject.next(false);
          this.handleReconnect(sessionId);
          reject(error);
        },
      );
    });
  }

  disconnect(): void {
    this.clearReconnectTimer();

    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }

    if (this.stompClient) {
      this.stompClient.disconnect(() => undefined);
      this.stompClient = null;
    }

    this.connected = false;
    this.currentSessionId = null;
    this.connectionSubject.next(false);
  }

  isConnected(): boolean {
    return this.connected;
  }

  private subscribeToSessionTopic(sessionId: number): void {
    if (!this.stompClient) {
      return;
    }

    this.subscription = this.stompClient.subscribe(
      `/topic/attendance.sessions.${sessionId}`,
      (message: Message) => {
        try {
          this.eventsSubject.next(JSON.parse(message.body) as AttendanceWebSocketNotification);
        } catch {
          // Ignore malformed frames and keep the live session connected.
        }
      },
    );
  }

  private handleReconnect(sessionId: number): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.clearReconnectTimer();
    this.reconnectTimer = setTimeout(
      () => {
        this.reconnectAttempts += 1;
        this.connect(sessionId).catch(() => undefined);
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
    baseUrl.pathname = `${baseUrl.pathname.replace(/\/$/, '')}/ws/attendance/ws`;
    baseUrl.search = '';
    baseUrl.hash = '';
    return baseUrl.toString();
  }
}
