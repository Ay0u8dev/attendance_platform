import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { StatusBadge } from '../status-badge/status-badge';

@Component({
  selector: 'app-stat-card',
  imports: [StatusBadge],
  template: `
    <article
      class="group rounded-3xl border border-line bg-surface p-5 shadow-card transition-colors duration-200 hover:bg-surface-subtle"
    >
      <div class="flex items-start justify-between gap-4">
        <div
          class="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-subtle text-lg text-primary transition-colors duration-200 group-hover:bg-surface"
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
          class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface-subtle text-secondaryText"
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
}
