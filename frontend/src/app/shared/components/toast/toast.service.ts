import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { ToastItem, ToastVariant } from './toast.model';

type ToastInput = {
  title: string;
  message?: string;
  variant?: ToastVariant;
  durationMs?: number;
};

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly toastsSignal = signal<ToastItem[]>([]);
  readonly toasts = this.toastsSignal.asReadonly();

  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  success(title: string, message?: string, durationMs?: number): string {
    return this.show({ title, message, variant: 'success', durationMs });
  }

  error(title: string, message?: string, durationMs?: number): string {
    return this.show({ title, message, variant: 'error', durationMs });
  }

  warning(title: string, message?: string, durationMs?: number): string {
    return this.show({ title, message, variant: 'warning', durationMs });
  }

  info(title: string, message?: string, durationMs?: number): string {
    return this.show({ title, message, variant: 'info', durationMs });
  }

  dismiss(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }

    this.toastsSignal.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }

  clear(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }

    this.timers.clear();
    this.toastsSignal.set([]);
  }

  private show(input: ToastInput): string {
    const id = this.createToastId();

    if (!this.isBrowser) {
      return id;
    }

    const toast: ToastItem = {
      id,
      title: input.title,
      message: input.message,
      variant: input.variant ?? 'info',
      durationMs: input.durationMs ?? 4500,
    };

    this.toastsSignal.update((toasts) => {
      const updated = [toast, ...toasts].slice(0, 4);
      const evicted = [toast, ...toasts].slice(4);

      // Clear timers for evicted toasts
      for (const evictedToast of evicted) {
        const timer = this.timers.get(evictedToast.id);
        if (timer) {
          clearTimeout(timer);
          this.timers.delete(evictedToast.id);
        }
      }

      return updated;
    });

    const timer = setTimeout(() => this.dismiss(id), toast.durationMs);
    this.timers.set(id, timer);

    return id;
  }

  private createToastId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }

    return `toast_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
}
