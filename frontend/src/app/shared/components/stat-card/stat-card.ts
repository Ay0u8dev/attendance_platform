import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { StatusBadge } from '../status-badge/status-badge';

@Component({
  selector: 'app-stat-card',
  imports: [StatusBadge],
  template: `
    <article
      class="group relative overflow-hidden rounded-3xl border bg-surface p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-strong"
      [class]="cardClasses()"
    >
      <span class="absolute inset-x-0 top-0 h-1" [class]="barClasses()"></span>

      <div class="flex items-start justify-between gap-4">
        <div
          class="flex h-12 w-12 items-center justify-center rounded-2xl text-lg transition-colors duration-200"
          [class]="iconClasses()"
        >
          <i [class]="icon()" aria-hidden="true"></i>
        </div>

        @if (badge()) {
          <app-status-badge [label]="badge()!" [variant]="variant()"></app-status-badge>
        }
      </div>

      <div class="mt-6 flex items-end justify-between gap-3">
        <div class="space-y-1">
          <p class="text-3xl font-semibold tracking-tight text-principalText">{{ value() }}</p>
          <p class="text-sm text-secondaryText">{{ label() }}</p>
        </div>

        <span
          class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-secondaryText"
          [class]="trendClasses()"
        >
          <i class="fa-solid fa-arrow-trend-up text-xs" aria-hidden="true"></i>
        </span>
      </div>
    </article>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatCard {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly icon = input.required<string>();
  readonly badge = input<string | undefined>(undefined);
  readonly variant = input<'success' | 'warning' | 'error' | 'info' | 'neutral'>('info');

  readonly cardClasses = computed(() => {
    switch (this.variant()) {
      case 'success':
        return 'border-secondary-soft';
      case 'warning':
        return 'border-warning-soft';
      case 'error':
        return 'border-danger-soft';
      case 'info':
        return 'border-primary-soft';
      default:
        return 'border-line hover:border-line-strong';
    }
  });

  readonly barClasses = computed(() => {
    switch (this.variant()) {
      case 'success':
        return 'bg-secondary';
      case 'warning':
        return 'bg-warning';
      case 'error':
        return 'bg-danger';
      case 'info':
        return 'bg-primary';
      default:
        return 'bg-line-strong';
    }
  });

  readonly iconClasses = computed(() => {
    switch (this.variant()) {
      case 'success':
        return 'bg-secondary-soft text-secondary-strong';
      case 'warning':
        return 'bg-warning-soft text-warning-strong';
      case 'error':
        return 'bg-danger-soft text-danger';
      case 'info':
        return 'bg-primary-soft text-primary';
      default:
        return 'bg-surface-subtle text-secondaryText';
    }
  });

  readonly trendClasses = computed(() => {
    switch (this.variant()) {
      case 'success':
        return 'border border-secondary-soft bg-secondary-soft text-secondary-strong';
      case 'warning':
        return 'border border-warning-soft bg-warning-soft text-warning-strong';
      case 'error':
        return 'border border-danger-soft bg-danger-soft text-danger';
      case 'info':
        return 'border border-primary-soft bg-primary-soft text-primary';
      default:
        return 'border border-line bg-surface-subtle text-secondaryText';
    }
  });
}
