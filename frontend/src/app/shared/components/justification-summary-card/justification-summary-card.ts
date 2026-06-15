import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-justification-summary-card',
  template: `
    <section class="rounded-[1.75rem] border border-line bg-surface p-5 shadow-card">
      <p class="text-xs font-semibold uppercase tracking-[0.16em] text-secondaryText">
        {{ label() }}
      </p>
      <div class="mt-4 space-y-3">
        @for (item of items(); track item.label) {
          <div class="flex items-start justify-between gap-4">
            <span class="text-sm text-secondaryText">{{ item.label }}</span>
            <span class="text-right text-sm font-medium text-principalText">{{ item.value }}</span>
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
