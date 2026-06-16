import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-student-module-card',
  template: `
    <button
      type="button"
      class="flex h-full w-full flex-col rounded-[1.7rem] border bg-surface p-5 text-left shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-strong"
      [class]="shellClasses()"
      (click)="clicked.emit()"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="space-y-1">
          <p class="text-sm font-medium text-secondaryText">{{ title() }}</p>
          <p class="text-[2.15rem] font-semibold leading-none tracking-tight text-principalText">
            {{ value() }}
          </p>
          @if (subtitle()) {
            <p class="text-xs font-medium uppercase tracking-[0.18em] text-secondaryText">
              {{ subtitle() }}
            </p>
          }
        </div>

        <span
          class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-base"
          [class]="iconClasses()"
        >
          <i [class]="icon()" aria-hidden="true"></i>
        </span>
      </div>

      <div class="mt-6 flex items-center justify-between gap-3">
        @if (footnote()) {
          <span
            class="rounded-full bg-surface-subtle px-3 py-1 text-xs font-medium text-secondaryText"
          >
            {{ footnote() }}
          </span>
        } @else {
          <span></span>
        }
        <span class="inline-flex items-center gap-2 text-sm font-semibold" [class]="ctaClasses()">
          {{ ctaLabel() }}
          <i class="fa-solid fa-arrow-right text-sm" aria-hidden="true"></i>
        </span>
      </div>
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentModuleCard {
  readonly title = input.required<string>();
  readonly value = input.required<string | number>();
  readonly subtitle = input('');
  readonly footnote = input('');
  readonly ctaLabel = input('Consulter');
  readonly icon = input('fa-solid fa-chart-column');
  readonly variant = input<'default' | 'warning' | 'success'>('default');

  readonly clicked = output<void>();

  readonly shellClasses = computed(() => {
    switch (this.variant()) {
      case 'warning':
        return 'border-warning-soft hover:border-warning/35';
      case 'success':
        return 'border-secondary-soft hover:border-secondary/35';
      default:
        return 'border-line hover:border-primary-soft';
    }
  });

  readonly iconClasses = computed(() => {
    switch (this.variant()) {
      case 'warning':
        return 'bg-warning-soft text-warning-strong';
      case 'success':
        return 'bg-secondary-soft text-secondary-strong';
      default:
        return 'bg-primary-soft text-primary';
    }
  });

  readonly ctaClasses = computed(() => {
    switch (this.variant()) {
      case 'warning':
        return 'text-warning-strong';
      case 'success':
        return 'text-secondary-strong';
      default:
        return 'text-primary';
    }
  });
}
