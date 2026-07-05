import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export type StatusFilterTab = {
  readonly value: string;
  readonly label: string;
  readonly count?: number;
};

@Component({
  selector: 'app-status-filter-tabs',
  template: `
    <div class="-mx-1 flex min-w-0 gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:gap-3 sm:overflow-visible sm:px-0 sm:pb-0">
      @for (tab of tabs(); track tab.value) {
        <button
          type="button"
          [class]="tabClasses(tab.value)"
          (click)="selectedChange.emit(tab.value)"
        >
          <span>{{ tab.label }}</span>
          @if (tab.count !== undefined) {
            <span
              class="inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs"
              [class]="countClasses(tab.value)"
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

  tabClasses(value: string): string {
    const palette = this.palette(value);
    const baseClasses =
      'inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border px-3 py-2.5 text-xs font-semibold transition-colors duration-200 sm:px-4 sm:text-sm';
    return `${baseClasses} ${this.selected() === value ? palette.selected : palette.idle}`;
  }

  countClasses(value: string): string {
    const palette = this.palette(value);
    return this.selected() === value ? palette.countSelected : palette.countIdle;
  }

  private palette(value: string): {
    selected: string;
    idle: string;
    countSelected: string;
    countIdle: string;
  } {
    switch (value) {
      case 'En attente':
        return {
          selected: 'border-warning-soft bg-warning-soft text-warning-strong',
          idle: 'border-warning-soft bg-surface text-warning-strong hover:bg-warning-soft',
          countSelected: 'bg-warning text-white',
          countIdle: 'bg-warning-soft text-warning-strong',
        };
      case 'Acceptée':
        return {
          selected: 'border-secondary-soft bg-secondary-soft text-secondary-strong',
          idle: 'border-secondary-soft bg-surface text-secondary-strong hover:bg-secondary-soft',
          countSelected: 'bg-secondary text-white',
          countIdle: 'bg-secondary-soft text-secondary-strong',
        };
      case 'Refusée':
        return {
          selected: 'border-danger/30 bg-danger-soft text-danger',
          idle: 'border-danger/20 bg-surface text-danger hover:bg-danger-soft',
          countSelected: 'bg-danger text-white',
          countIdle: 'bg-danger/10 text-danger',
        };
      default:
        return {
          selected: 'border-primary bg-primary-soft text-primary',
          idle: 'border-line bg-surface text-secondaryText hover:border-primary-soft hover:bg-primary-soft hover:text-primary',
          countSelected: 'bg-primary text-white',
          countIdle: 'bg-surface-subtle text-principalText',
        };
    }
  }
}
