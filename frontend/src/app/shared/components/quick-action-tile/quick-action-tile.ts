import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

type TileTone = 'primary' | 'secondary' | 'warning' | 'neutral';

@Component({
  selector: 'app-quick-action-tile',
  imports: [RouterLink],
  template: `
    <a
      class="group relative flex min-h-28 flex-col items-start justify-between overflow-hidden rounded-3xl border bg-surface p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-strong"
      [class]="shellClasses()"
      [routerLink]="route()"
    >
      <span class="absolute inset-x-0 top-0 h-1" [class]="barClasses()"></span>

      <span
        class="flex h-11 w-11 items-center justify-center rounded-2xl transition-colors duration-200"
        [class]="iconClasses()"
      >
        <i [class]="icon()" aria-hidden="true"></i>
      </span>

      <div class="space-y-1.5">
        <h3 class="text-sm font-semibold text-principalText sm:text-base">{{ label() }}</h3>
        <p class="text-xs leading-5 text-secondaryText sm:text-sm">{{ description() }}</p>
        <p
          class="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.15em]"
          [class]="linkClasses()"
        >
          Open
          <i class="fa-solid fa-arrow-right text-[0.6rem]" aria-hidden="true"></i>
        </p>
      </div>
    </a>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuickActionTile {
  readonly label = input.required<string>();
  readonly description = input.required<string>();
  readonly icon = input.required<string>();
  readonly route = input.required<string>();
  readonly tone = input<TileTone>('primary');

  readonly shellClasses = computed(() => {
    switch (this.tone()) {
      case 'secondary':
        return 'border-secondary-soft';
      case 'warning':
        return 'border-warning-soft';
      case 'neutral':
        return 'border-line hover:border-line-strong';
      default:
        return 'border-primary-soft';
    }
  });

  readonly barClasses = computed(() => {
    switch (this.tone()) {
      case 'secondary':
        return 'bg-secondary';
      case 'warning':
        return 'bg-warning';
      case 'neutral':
        return 'bg-line-strong';
      default:
        return 'bg-primary';
    }
  });

  readonly iconClasses = computed(() => {
    switch (this.tone()) {
      case 'secondary':
        return 'bg-secondary-soft text-secondary-strong';
      case 'warning':
        return 'bg-warning-soft text-warning-strong';
      case 'neutral':
        return 'bg-surface-subtle text-secondaryText';
      default:
        return 'bg-primary-soft text-primary';
    }
  });

  readonly linkClasses = computed(() => {
    switch (this.tone()) {
      case 'secondary':
        return 'text-secondary-strong';
      case 'warning':
        return 'text-warning-strong';
      case 'neutral':
        return 'text-secondaryText';
      default:
        return 'text-primary';
    }
  });
}
