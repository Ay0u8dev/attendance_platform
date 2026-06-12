import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-student-alert-banner',
  host: {
    class: 'block',
  },
  template: `
    <article
      class="flex flex-col gap-4 rounded-2xl border border-warning/25 bg-warning-soft px-4 py-4 shadow-card sm:gap-5 sm:px-5 sm:py-5 md:flex-row md:items-center md:justify-between md:px-6"
    >
      <div class="flex items-start gap-3 sm:items-center sm:gap-4">
        <div
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-base text-warning shadow-sm sm:h-12 sm:w-12 sm:rounded-2xl sm:text-[1.15rem]"
        >
          <i [class]="icon()" aria-hidden="true"></i>
        </div>

        <div class="min-w-0 space-y-1">
          <h2 class="text-sm font-semibold leading-6 tracking-tight text-warning-strong sm:text-base">
            {{ title() }}
          </h2>
          @if (description()) {
            <p class="max-w-2xl text-sm leading-6 text-warning-strong">{{ description() }}</p>
          }
        </div>
      </div>

      @if (actionLabel()) {
        <div class="shrink-0">
          <button
            type="button"
            class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-onHold px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-warning-strong focus:outline-none focus:ring-2 focus:ring-warning/25 focus:ring-offset-2 md:w-auto md:px-6"
            (click)="actionClicked.emit()"
          >
            @if (actionIcon()) {
              <i [class]="actionIcon()" aria-hidden="true"></i>
            }
            <span>{{ actionLabel() }}</span>
          </button>
        </div>
      }
    </article>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentAlertBanner {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly actionLabel = input('');
  readonly actionIcon = input<string | undefined>(undefined);
  readonly icon = input('fa-solid fa-triangle-exclamation');

  readonly actionClicked = output<void>();
}
