import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

type StatusVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

@Component({
  selector: 'app-status-badge',
  template: `
    <span
      class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
      [class]="badgeClasses()"
    >
      <span class="h-2 w-2 rounded-full" [class]="dotClasses()"></span>
      {{ label() }}
    </span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBadge {
  readonly label = input.required<string>();
  readonly variant = input<StatusVariant>('neutral');

  readonly badgeClasses = computed(() => {
    switch (this.variant()) {
      case 'success':
        return 'bg-success-soft text-secondary';
      case 'warning':
        return 'bg-warning-soft text-warning-strong';
      case 'error':
        return 'bg-danger-soft text-danger';
      case 'info':
        return 'bg-info-soft text-primary';
      default:
        return 'bg-surface-subtle text-secondaryText';
    }
  });

  readonly dotClasses = computed(() => {
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
        return 'bg-muted';
    }
  });
}
