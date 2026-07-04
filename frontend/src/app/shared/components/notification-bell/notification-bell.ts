import { NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthService } from '../../../core/auth/services/auth.service';
import { AppNotification, NotificationSeverity } from '../../../core/notifications/notification.model';
import { NotificationService } from '../../../core/notifications/notification.service';
import { NotificationRealtimeService } from '../../../core/notifications/notification-realtime.service';
import { NotificationWebSocketService } from '../../../core/notifications/notification-websocket.service';

@Component({
  selector: 'app-notification-bell',
  imports: [NgClass],
  host: {
    '(document:click)': 'handleDocumentClick($event)',
    '(document:keydown.escape)': 'closeDropdown()',
  },
  template: `
    <div #notificationRoot class="relative">
      <button
        type="button"
        class="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-secondaryText transition-colors duration-200 hover:border-primary-soft hover:bg-primary-soft hover:text-primary"
        aria-label="Notifications"
        aria-haspopup="menu"
        [attr.aria-expanded]="isOpen()"
        (click)="toggleDropdown($event)"
      >
        <i class="fa-regular fa-bell" aria-hidden="true"></i>
        @if (unreadCount() > 0) {
          <span
            class="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[0.62rem] font-bold leading-none text-white"
          >
            {{ unreadBadge() }}
          </span>
        }
      </button>

      @if (isOpen()) {
        <div
          class="absolute right-0 z-50 mt-2 flex max-h-[28rem] w-[min(22rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-shell"
          role="menu"
        >
          <div class="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div class="min-w-0">
              <p class="text-sm font-semibold text-principalText">Notifications</p>
              <p class="text-xs text-secondaryText">{{ unreadCount() }} unread</p>
            </div>
            <div class="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                class="rounded-lg px-2 py-1 text-xs font-semibold text-secondaryText transition-colors hover:bg-surface-subtle hover:text-principalText disabled:pointer-events-none disabled:opacity-50"
                title="Delete read notifications"
                aria-label="Delete read notifications"
                [disabled]="!hasReadNotifications() || isDeletingRead()"
                (click)="deleteReadNotifications($event)"
              >
                Clear read
              </button>
              <button
                type="button"
                class="rounded-lg px-2 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary-soft disabled:pointer-events-none disabled:opacity-50"
                [disabled]="unreadCount() === 0 || isMarkingAllRead()"
                (click)="markAllAsRead($event)"
              >
                Mark all read
              </button>
            </div>
          </div>

          <div class="max-h-80 overflow-y-auto p-2">
            @if (isLoading()) {
              <div class="px-3 py-6 text-center text-sm text-secondaryText">Loading...</div>
            } @else if (hasError()) {
              <div class="px-3 py-6 text-center text-sm text-danger">
                Notifications unavailable.
              </div>
            } @else {
              @for (notification of notifications(); track notification.id) {
                <div
                  class="mb-1 flex w-full gap-2 rounded-xl border px-2.5 py-2.5 transition-colors hover:bg-surface-subtle"
                  [ngClass]="itemClasses(notification)"
                  role="group"
                >
                  <button
                    type="button"
                    class="flex min-w-0 flex-1 gap-3 text-left"
                    [attr.aria-label]="notification.read ? notification.title : 'Mark notification as read: ' + notification.title"
                    (click)="markAsRead(notification)"
                  >
                    <span
                      class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                      [ngClass]="iconAccentClasses(notification)"
                    >
                      <i [class]="iconFor(notification)" aria-hidden="true"></i>
                    </span>
                    <span class="min-w-0 flex-1">
                      <span class="block text-sm font-semibold text-principalText">
                        {{ notification.title }}
                      </span>
                      <span class="mt-0.5 block text-xs leading-5 text-secondaryText">
                        {{ notification.message }}
                      </span>
                      <span class="mt-1 block text-[0.68rem] font-medium text-secondaryText">
                        {{ formatCreatedAt(notification.createdAt) }}
                      </span>
                    </span>
                  </button>
                  @if (!notification.read) {
                    <span class="mt-2 h-2 w-2 shrink-0 rounded-full" [ngClass]="dotClasses(notification)"></span>
                  }
                  <button
                    type="button"
                    class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-secondaryText transition-colors hover:bg-danger/10 hover:text-danger disabled:pointer-events-none disabled:opacity-50"
                    title="Delete notification"
                    aria-label="Delete notification"
                    [disabled]="isDeleting(notification.id)"
                    (click)="deleteNotification(notification, $event)"
                  >
                    <i class="fa-regular fa-trash-can text-xs" aria-hidden="true"></i>
                  </button>
                </div>
              } @empty {
                <div class="px-3 py-6 text-center text-sm text-secondaryText">
                  No notifications yet.
                </div>
              }
            }
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationBellComponent {
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly notificationRealtimeService = inject(NotificationRealtimeService);
  private readonly notificationWebSocketService = inject(NotificationWebSocketService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly notificationRoot = viewChild<ElementRef<HTMLElement>>('notificationRoot');

  readonly notifications = signal<AppNotification[]>([]);
  readonly unreadCount = signal(0);
  readonly isOpen = signal(false);
  readonly isLoading = signal(false);
  readonly hasError = signal(false);
  readonly isMarkingAllRead = signal(false);
  readonly isDeletingRead = signal(false);
  readonly deletingIds = signal<Set<number>>(new Set());
  readonly unreadBadge = computed(() => (this.unreadCount() > 99 ? '99+' : String(this.unreadCount())));
  readonly hasReadNotifications = computed(() => this.notifications().some((notification) => notification.read));

  private loadedUserId: string | null = null;

  constructor() {
    void this.notificationRealtimeService;

    this.authService.currentUser$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        if (!user) {
          this.loadedUserId = null;
          this.notifications.set([]);
          this.unreadCount.set(0);
          return;
        }

        if (this.loadedUserId === user.id) {
          return;
        }

        this.loadedUserId = user.id;
        this.loadInitialState();
      });

    const currentUser = this.authService.currentUser;
    if (currentUser) {
      this.loadedUserId = currentUser.id;
      this.loadInitialState();
    }

    this.notificationWebSocketService.notifications$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((notification) => this.handleIncomingNotification(notification));
  }

  toggleDropdown(event: Event): void {
    event.stopPropagation();
    this.isOpen.update((value) => !value);

    if (this.isOpen()) {
      this.loadInitialState();
    }
  }

  closeDropdown(): void {
    this.isOpen.set(false);
  }

  handleDocumentClick(event: Event): void {
    if (!this.isOpen()) {
      return;
    }

    const root = this.notificationRoot()?.nativeElement;
    const target = event.target;

    if (!root || !(target instanceof Node) || !root.contains(target)) {
      this.closeDropdown();
    }
  }

  markAsRead(notification: AppNotification): void {
    if (notification.read) {
      return;
    }

    this.notificationService
      .markAsRead(notification.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.notifications.update((items) =>
            items.map((item) => (item.id === updated.id ? updated : item)),
          );
          this.unreadCount.update((count) => Math.max(0, count - 1));
        },
        error: () => this.hasError.set(true),
      });
  }

  markAllAsRead(event: Event): void {
    event.stopPropagation();

    if (this.isMarkingAllRead() || this.unreadCount() === 0) {
      return;
    }

    this.isMarkingAllRead.set(true);
    this.notificationService
      .markAllAsRead()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          const now = new Date().toISOString();
          this.notifications.update((items) =>
            items.map((item) => ({ ...item, read: true, readAt: item.readAt ?? now })),
          );
          this.unreadCount.set(0);
          this.isMarkingAllRead.set(false);
        },
        error: () => this.isMarkingAllRead.set(false),
      });
  }

  deleteNotification(notification: AppNotification, event: Event): void {
    event.stopPropagation();

    if (this.isDeleting(notification.id)) {
      return;
    }

    const previousNotifications = this.notifications();
    const previousUnreadCount = this.unreadCount();

    this.deletingIds.update((ids) => new Set(ids).add(notification.id));
    this.notifications.update((items) => items.filter((item) => item.id !== notification.id));
    if (!notification.read) {
      this.unreadCount.update((count) => Math.max(0, count - 1));
    }

    this.notificationService
      .deleteNotification(notification.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.clearDeletingId(notification.id),
        error: () => {
          this.notifications.set(previousNotifications);
          this.unreadCount.set(previousUnreadCount);
          this.clearDeletingId(notification.id);
          this.hasError.set(true);
        },
      });
  }

  deleteReadNotifications(event: Event): void {
    event.stopPropagation();

    if (this.isDeletingRead() || !this.hasReadNotifications()) {
      return;
    }

    const previousNotifications = this.notifications();
    this.isDeletingRead.set(true);
    this.notifications.update((items) => items.filter((item) => !item.read));

    this.notificationService
      .deleteReadNotifications()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.isDeletingRead.set(false),
        error: () => {
          this.notifications.set(previousNotifications);
          this.isDeletingRead.set(false);
          this.hasError.set(true);
        },
      });
  }

  iconFor(notification: AppNotification): string {
    switch (notification.type) {
      case 'ATTENDANCE_SESSION_STARTED':
        return 'fa-regular fa-calendar-check';
      case 'ATTENDANCE_SESSION_FINALIZED':
      case 'ATTENDANCE_STATUS_CONFIRMED':
        return 'fa-regular fa-circle-check';
      case 'ATTENDANCE_STATUS_UPDATED':
        return 'fa-regular fa-pen-to-square';
      case 'ABSENCE_RECORDED':
        return 'fa-regular fa-circle-xmark';
      case 'JUSTIFICATION_SUBMITTED':
        return 'fa-regular fa-paper-plane';
      case 'JUSTIFICATION_APPROVED':
        return 'fa-regular fa-circle-check';
      case 'JUSTIFICATION_REJECTED':
        return 'fa-regular fa-circle-xmark';
      case 'JUSTIFICATION_STATUS_CHANGED':
        return 'fa-regular fa-file-lines';
      default:
        return 'fa-regular fa-bell';
    }
  }

  formatCreatedAt(value: string): string {
    const createdAt = new Date(value);
    if (Number.isNaN(createdAt.getTime())) {
      return '';
    }

    return createdAt.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  itemClasses(notification: AppNotification): string {
    const unreadClass = notification.read ? 'border-transparent opacity-75' : 'bg-surface-subtle/60';
    return `${unreadClass} ${this.borderClass(notification)}`;
  }

  iconAccentClasses(notification: AppNotification): string {
    switch (this.severityFor(notification)) {
      case 'SUCCESS':
        return 'bg-emerald-500/10 text-emerald-600';
      case 'WARNING':
        return 'bg-amber-500/10 text-amber-600';
      case 'DANGER':
        return 'bg-red-500/10 text-red-600';
      case 'NEUTRAL':
        return 'bg-surface-subtle text-secondaryText';
      default:
        return 'bg-sky-500/10 text-sky-600';
    }
  }

  dotClasses(notification: AppNotification): string {
    switch (this.severityFor(notification)) {
      case 'SUCCESS':
        return 'bg-emerald-500';
      case 'WARNING':
        return 'bg-amber-500';
      case 'DANGER':
        return 'bg-red-500';
      case 'NEUTRAL':
        return 'bg-secondaryText';
      default:
        return 'bg-sky-500';
    }
  }

  isDeleting(notificationId: number): boolean {
    return this.deletingIds().has(notificationId);
  }

  private loadInitialState(): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.notificationService
      .getMyNotifications(0, 10)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.notifications.set(page.content);
          this.isLoading.set(false);
        },
        error: () => {
          this.hasError.set(true);
          this.isLoading.set(false);
        },
      });

    this.notificationService
      .getUnreadCount()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => this.unreadCount.set(response.unreadCount),
        error: () => this.hasError.set(true),
      });
  }

  private handleIncomingNotification(notification: AppNotification): void {
    const existing = this.notifications().find((item) => item.id === notification.id);

    this.notifications.update((items) => [
      notification,
      ...items.filter((item) => item.id !== notification.id),
    ].slice(0, 10));

    if (!notification.read && !existing) {
      this.unreadCount.update((count) => count + 1);
    }
  }

  private borderClass(notification: AppNotification): string {
    switch (this.severityFor(notification)) {
      case 'SUCCESS':
        return notification.read ? '' : 'border-emerald-500/20';
      case 'WARNING':
        return notification.read ? '' : 'border-amber-500/25';
      case 'DANGER':
        return notification.read ? '' : 'border-red-500/25';
      case 'NEUTRAL':
        return notification.read ? '' : 'border-line';
      default:
        return notification.read ? '' : 'border-sky-500/20';
    }
  }

  private severityFor(notification: AppNotification): NotificationSeverity {
    if (notification.severity) {
      return notification.severity;
    }

    switch (notification.type) {
      case 'ATTENDANCE_SESSION_FINALIZED':
      case 'ATTENDANCE_STATUS_CONFIRMED':
      case 'JUSTIFICATION_APPROVED':
        return 'SUCCESS';
      case 'ABSENCE_RECORDED':
        return 'WARNING';
      case 'JUSTIFICATION_REJECTED':
        return 'DANGER';
      case 'SYSTEM_ALERT':
        return 'NEUTRAL';
      default:
        return 'INFO';
    }
  }

  private clearDeletingId(notificationId: number): void {
    this.deletingIds.update((ids) => {
      const next = new Set(ids);
      next.delete(notificationId);
      return next;
    });
  }
}
