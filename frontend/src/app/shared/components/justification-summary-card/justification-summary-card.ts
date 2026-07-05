import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-justification-summary-card',
  host: {
    class: 'block',
  },
  template: `
    <section class="rounded-[1.75rem] border border-line bg-surface p-5 shadow-card">
      <p class="text-xs font-semibold uppercase tracking-[0.16em] text-secondaryText">
        {{ label() }}
      </p>
      <div class="mt-4 grid gap-y-3">
        @for (item of items(); track item.label) {
          <div class="grid grid-cols-[minmax(5.5rem,8rem)_minmax(0,1fr)] items-start gap-x-6">
            <span class="text-sm text-secondaryText">{{ item.label }}</span>
            <span class="text-right text-sm font-medium leading-6 text-principalText">
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
