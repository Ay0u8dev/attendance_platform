import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export type StatusFilterTab = {
  readonly value: string;
  readonly label: string;
  readonly count?: number;
};

@Component({
  selector: 'app-status-filter-tabs',
  template: `
    <div class="flex flex-wrap gap-3">
      @for (tab of tabs(); track tab.value) {
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition-colors duration-200"
          [class]="selected() === tab.value
            ? 'border-primary bg-primary-soft text-primary'
            : 'border-line bg-surface text-secondaryText hover:border-primary-soft hover:bg-primary-soft hover:text-primary'"
          (click)="selectedChange.emit(tab.value)"
        >
          <span>{{ tab.label }}</span>
          @if (tab.count !== undefined) {
            <span
              class="inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs"
              [class]="selected() === tab.value
                ? 'bg-primary text-white'
                : 'bg-surface-subtle text-principalText'"
            >
              {{ tab.count }}
            </span>
          }
        </button>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusFilterTabs {
  readonly tabs = input.required<readonly StatusFilterTab[]>();
  readonly selected = input.required<string>();

  readonly selectedChange = output<string>();
}
