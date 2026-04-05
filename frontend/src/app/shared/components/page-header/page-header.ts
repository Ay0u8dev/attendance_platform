import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  template: `
    <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div class="space-y-1">
        <p
          class="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-primary"
          [textContent]="eyebrow()"
        ></p>
        <h1 class="text-2xl font-semibold tracking-tight text-principalText sm:text-3xl">
          {{ title() }}
        </h1>
        @if (description()) {
          <p class="max-w-2xl text-sm leading-6 text-secondaryText sm:text-base">
            {{ description() }}
          </p>
        }
      </div>

      @if (meta()) {
        <div
          class="inline-flex items-center gap-2 rounded-2xl border border-primary-soft bg-primary-soft px-4 py-3 text-sm font-medium text-primary"
        >
          <span class="h-2 w-2 rounded-full bg-secondary"></span>
          {{ meta() }}
        </div>
      }
    </header>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeader {
  readonly eyebrow = input('Academic Attendance');
  readonly title = input.required<string>();
  readonly description = input('');
  readonly meta = input('');
}
