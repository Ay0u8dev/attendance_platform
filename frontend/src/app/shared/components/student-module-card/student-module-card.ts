import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-student-module-card',
  template: `
    <button
      type="button"
      class="flex h-full w-full flex-col rounded-2xl border bg-surface p-4 text-left shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-strong sm:rounded-[1.7rem] sm:p-5"
      [class]="shellClasses()"
      (click)="clicked.emit()"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="space-y-1">
          <p class="text-sm font-medium text-secondaryText">{{ title() }}</p>
          <p class="text-3xl font-semibold leading-none tracking-tight text-principalText sm:text-[2.15rem]">
            {{ value() }}
          </p>
          @if (subtitle()) {
            <p class="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-secondaryText sm:text-xs sm:tracking-[0.18em]">
              {{ subtitle() }}
            </p>
          }
        </div>

        <span
          class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm sm:h-11 sm:w-11 sm:rounded-2xl sm:text-base"
          [class]="iconClasses()"
        >
          <i [class]="icon()" aria-hidden="true"></i>
        </span>
      </div>

      <div class="mt-4 flex items-center justify-between gap-3 sm:mt-6">
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
