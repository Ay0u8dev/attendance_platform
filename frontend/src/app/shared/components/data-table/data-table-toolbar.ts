import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { DropdownFilter } from '../dropdown-filter/dropdown-filter';
import { DataTableColumnVisibilityOption, DataTableToolbarFilter } from './data-table.types';

@Component({
  selector: 'app-data-table-toolbar',
  imports: [DropdownFilter],
  template: `
    <div class="flex flex-col gap-4 border-b border-line bg-surface px-5 py-5 sm:px-6">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div class="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <label class="relative block min-w-0 flex-1 sm:max-w-md">
            <span class="sr-only">Search rows</span>
            <span
              class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-secondaryText"
              aria-hidden="true"
            >
              <i class="fa-solid fa-magnifying-glass text-xs"></i>
            </span>
            <input
              type="search"
              class="h-12 w-full rounded-2xl border border-line bg-surface px-11 text-sm font-medium text-principalText shadow-sm outline-none transition duration-200 placeholder:text-muted focus:border-primary focus:ring-4 focus:ring-primary/10"
              [value]="searchValue()"
              [placeholder]="searchPlaceholder()"
              (input)="handleSearchInput($event)"
            />
          </label>

          @for (filter of filterControls(); track filter.columnId) {
            @if (filter.type === 'select') {
              <div class="min-w-60">
                <app-dropdown-filter
                  [label]="filter.label"
                  [identifier]="'table-filter-' + filter.columnId"
                  [allLabel]="filter.placeholder"
                  [options]="filter.options"
                  [value]="filter.value"
                  [iconClass]="filterIcon(filter.columnId)"
                  [iconBackgroundClass]="filterIconBackground(filter.columnId)"
                  [iconColor]="filterIconColor(filter.columnId)"
                  (filterChange)="handleDropdownFilterChange(filter.columnId, $event)"
                ></app-dropdown-filter>
              </div>
            } @else {
              <label class="flex min-w-40 flex-col gap-1">
                <span class="text-xs font-semibold uppercase tracking-[0.16em] text-secondaryText">
                  {{ filter.label }}
                </span>
                <input
                  type="search"
                  class="h-12 rounded-2xl border border-line bg-surface px-3 text-sm font-medium text-principalText shadow-sm outline-none transition duration-200 placeholder:text-muted focus:border-primary focus:ring-4 focus:ring-primary/10"
                  [value]="filter.value"
                  [placeholder]="filter.placeholder"
                  (input)="handleFilterInput(filter.columnId, $event)"
                />
              </label>
            }
          }
        </div>

        @if (columnVisibilityOptions().length > 0) {
          <details class="data-table-menu relative shrink-0">
            <summary
              class="flex h-12 cursor-pointer list-none items-center gap-2 rounded-2xl border border-line bg-surface px-4 text-sm font-semibold text-principalText shadow-sm transition-colors duration-200 hover:border-primary-soft hover:bg-primary-soft"
            >
              <i class="fa-solid fa-table-columns text-xs text-primary" aria-hidden="true"></i>
              Columns
              <i
                class="fa-solid fa-chevron-down text-[0.65rem] text-secondaryText"
                aria-hidden="true"
              ></i>
            </summary>

            <div
              class="absolute top-full right-0 z-20 mt-2 min-w-56 rounded-2xl border border-line bg-surface p-2 shadow-shell"
            >
              <p
                class="px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-secondaryText"
              >
                Toggle columns
              </p>

              @for (option of columnVisibilityOptions(); track option.columnId) {
                <label
                  class="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm text-principalText transition-colors duration-200 hover:bg-surface-subtle"
                  [class.cursor-not-allowed]="option.disabled"
                  [class.opacity-50]="option.disabled"
                >
                  <span>{{ option.label }}</span>
                  <input
                    type="checkbox"
                    class="h-4 w-4 rounded border-line accent-primary"
                    [checked]="option.visible"
                    [disabled]="option.disabled"
                    (change)="handleColumnToggle(option.columnId, $event)"
                  />
                </label>
              }
            </div>
          </details>
        }
      </div>

      @if (showResultSummary() || selectedCount() > 0) {
        <div
          class="flex flex-col gap-2 rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-secondaryText shadow-sm sm:flex-row sm:items-center sm:justify-between"
        >
          @if (showResultSummary()) {
            <p>
              Showing <span class="font-semibold text-principalText">{{ filteredCount() }}</span> of
              {{ totalCount() }} rows
            </p>
          }

          @if (selectedCount() > 0) {
            <p>
              <span class="font-semibold text-principalText">{{ selectedCount() }}</span> row(s)
              selected
            </p>
          }
        </div>
      }
    </div>
  `,
  styleUrl: './data-table.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTableToolbar {
  readonly searchValue = input('');
  readonly searchPlaceholder = input('Search rows...');
  readonly filterControls = input<readonly DataTableToolbarFilter[]>([]);
  readonly columnVisibilityOptions = input<readonly DataTableColumnVisibilityOption[]>([]);
  readonly filteredCount = input(0);
  readonly totalCount = input(0);
  readonly selectedCount = input(0);
  readonly showResultSummary = input(true);

  readonly searchValueChange = output<string>();
  readonly filterValueChange = output<{ columnId: string; value: string }>();
  readonly columnVisibilityChange = output<{ columnId: string; visible: boolean }>();

  handleSearchInput(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      this.searchValueChange.emit(target.value);
    }
  }

  handleFilterInput(columnId: string, event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      this.filterValueChange.emit({ columnId, value: target.value });
    }
  }

  handleFilterChange(columnId: string, event: Event): void {
    const target = event.target;
    if (target instanceof HTMLSelectElement) {
      this.filterValueChange.emit({ columnId, value: target.value });
    }
  }

  handleDropdownFilterChange(columnId: string, value: string | null): void {
    this.filterValueChange.emit({ columnId, value: value ?? '' });
  }

  handleColumnToggle(columnId: string, event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      this.columnVisibilityChange.emit({ columnId, visible: target.checked });
    }
  }

  filterIcon(columnId: string): string {
    const normalized = columnId.toLowerCase();

    if (normalized.includes('status')) return 'fa-solid fa-circle-check';
    if (normalized.includes('group')) return 'fa-solid fa-users';
    if (normalized.includes('cycle')) return 'fa-solid fa-graduation-cap';
    if (normalized.includes('year')) return 'fa-regular fa-calendar';
    if (normalized.includes('module')) return 'fa-solid fa-layer-group';
    if (normalized.includes('teacher')) return 'fa-solid fa-chalkboard-user';
    if (normalized.includes('student')) return 'fa-solid fa-user-graduate';

    return 'fa-solid fa-filter';
  }

  filterIconBackground(columnId: string): string {
    const normalized = columnId.toLowerCase();

    if (normalized.includes('status') || normalized.includes('year')) return 'bg-warning-soft';
    if (normalized.includes('module') || normalized.includes('group')) return 'bg-secondary-soft';

    return 'bg-primary-soft';
  }

  filterIconColor(columnId: string): 'primary' | 'secondary' | 'warning' {
    const normalized = columnId.toLowerCase();

    if (normalized.includes('status') || normalized.includes('year')) return 'warning';
    if (normalized.includes('module') || normalized.includes('group')) return 'secondary';

    return 'primary';
  }
}
