import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-justification-summary-card',
  host: {
    class: 'block min-w-0',
  },
  template: `
    <section class="min-w-0 rounded-[1.5rem] border border-line bg-surface p-4 shadow-card sm:rounded-[1.75rem] sm:p-5">
      <p class="text-xs font-semibold uppercase tracking-[0.16em] text-secondaryText">
        {{ label() }}
      </p>
      <div class="mt-4 grid gap-y-3">
        @for (item of items(); track item.label) {
          <div class="grid min-w-0 gap-1 sm:grid-cols-[minmax(5.5rem,8rem)_minmax(0,1fr)] sm:items-start sm:gap-x-6">
            <span class="text-sm text-secondaryText">{{ item.label }}</span>
            <span class="break-words text-sm font-medium leading-6 text-principalText sm:text-right">
              {{ item.value }}
            </span>
          </div>
        }
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JustificationSummaryCard {
  readonly label = input.required<string>();
  readonly items = input.required<readonly { label: string; value: string }[]>();
}
