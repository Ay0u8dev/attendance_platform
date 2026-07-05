import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { ToastItem } from './toast.model';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast-outlet',
  standalone: true,
  templateUrl: './toast-outlet.html',
  styleUrl: './toast-outlet.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastOutlet {
  private readonly toastService = inject(ToastService);
  private readonly dragOffsetsSignal = signal<Record<string, number>>({});

  private activeDragId: string | null = null;
  private dragStartX = 0;

  readonly toasts = this.toastService.toasts;

  dismiss(toast: ToastItem): void {
    this.clearDragOffset(toast.id);
    this.toastService.dismiss(toast.id);
  }

  startSwipe(toast: ToastItem, event: PointerEvent): void {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    this.activeDragId = toast.id;
    this.dragStartX = event.clientX;

    const card = event.currentTarget as HTMLElement | null;
    card?.setPointerCapture(event.pointerId);
  }

  moveSwipe(toast: ToastItem, event: PointerEvent): void {
    if (this.activeDragId !== toast.id) {
      return;
    }

    const deltaX = Math.max(0, event.clientX - this.dragStartX);
    this.setDragOffset(toast.id, deltaX);
  }

  endSwipe(toast: ToastItem, event: PointerEvent): void {
    if (this.activeDragId !== toast.id) {
      return;
    }

    const card = event.currentTarget as HTMLElement | null;
    card?.releasePointerCapture(event.pointerId);

    const deltaX = this.getDragOffset(toast.id);
    this.activeDragId = null;
    this.dragStartX = 0;

    if (deltaX > 120) {
      this.dismiss(toast);
      return;
    }

    this.clearDragOffset(toast.id);
  }

  cancelSwipe(toast: ToastItem, event: PointerEvent): void {
    if (this.activeDragId !== toast.id) {
      return;
    }

    const card = event.currentTarget as HTMLElement | null;
    card?.releasePointerCapture(event.pointerId);

    this.activeDragId = null;
    this.dragStartX = 0;
    this.clearDragOffset(toast.id);
  }

  toastClasses(toast: ToastItem): string {
    const variantClass =
      toast.variant === 'success'
        ? 'toast-success'
        : toast.variant === 'error'
          ? 'toast-error'
          : toast.variant === 'warning'
            ? 'toast-warning'
            : 'toast-info';

    return `toast-card ${variantClass}`;
  }

  badgeClasses(toast: ToastItem): string {
    return toast.variant === 'success'
      ? 'toast-badge toast-badge-success'
      : toast.variant === 'error'
        ? 'toast-badge toast-badge-error'
        : toast.variant === 'warning'
          ? 'toast-badge toast-badge-warning'
          : 'toast-badge toast-badge-info';
  }

  closeButtonClasses(toast: ToastItem): string {
    return toast.variant === 'success'
      ? 'toast-close toast-close-success'
      : toast.variant === 'error'
        ? 'toast-close toast-close-error'
        : toast.variant === 'warning'
          ? 'toast-close toast-close-warning'
          : 'toast-close toast-close-info';
  }

  icon(toast: ToastItem): string {
    return toast.variant === 'success'
      ? '✓'
      : toast.variant === 'error'
        ? '!'
        : toast.variant === 'warning'
          ? '!'
          : 'i';
  }

  toastTransform(toast: ToastItem, index: number): string {
    const stackIndex = Math.min(index, 3);
    const translateY = stackIndex * 8;
    const scale = 1 - stackIndex * 0.03;
    const translateX = this.getDragOffset(toast.id);

    return `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`;
  }

  toastOpacity(toast: ToastItem, index: number): number {
    const stackIndex = Math.min(index, 3);
    const baseOpacity = stackIndex === 0 ? 1 : Math.max(0.72, 1 - stackIndex * 0.08);
    const swipeOpacity = Math.max(0.35, 1 - this.getDragOffset(toast.id) / 220);

    return baseOpacity * swipeOpacity;
  }

  private getDragOffset(id: string): number {
    return this.dragOffsetsSignal()[id] ?? 0;
  }

  private setDragOffset(id: string, value: number): void {
    this.dragOffsetsSignal.update((offsets) => ({ ...offsets, [id]: value }));
  }

  private clearDragOffset(id: string): void {
    this.dragOffsetsSignal.update((offsets) => {
      if (!(id in offsets)) {
        return offsets;
      }

      const next = { ...offsets };
      delete next[id];
      return next;
    });
  }
}
