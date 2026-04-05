import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { DataTableColumnVisibilityOption, DataTableToolbarFilter } from './data-table.types';

@Component({
  selector: 'app-data-table-toolbar',
  template: `
    <div class="flex flex-col gap-4 border-b border-line px-5 py-4 sm:px-6">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div class="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <label class="relative block min-w-0 flex-1 sm:max-w-sm">
            <span class="sr-only">Search rows</span>
            <span
              class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-secondaryText"
              aria-hidden="true"
            >
              <i class="fa-solid fa-magnifying-glass text-xs"></i>
            </span>
            <input
              type="search"
              class="h-11 w-full rounded-2xl border border-line bg-surface px-10 text-sm text-principalText outline-none transition-colors duration-200 placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary-soft"
              [value]="searchValue()"
              [placeholder]="searchPlaceholder()"
              (input)="handleSearchInput($event)"
            />
          </label>

          @for (filter of filterControls(); track filter.columnId) {
            @if (filter.type === 'select') {
              <label class="flex min-w-40 flex-col gap-1">
                <span class="text-xs font-semibold uppercase tracking-[0.16em] text-secondaryText">
                  {{ filter.label }}
                </span>
                <select
                  class="h-11 rounded-2xl border border-line bg-surface px-3 text-sm text-principalText outline-none transition-colors duration-200 focus:border-primary focus:ring-2 focus:ring-primary-soft"
                  [value]="filter.value"
                  (change)="handleFilterChange(filter.columnId, $event)"
                >
                  <option value="">{{ filter.placeholder }}</option>
                  @for (option of filter.options; track option.value) {
                    <option [value]="option.value">{{ option.label }}</option>
                  }
                </select>
              </label>
            } @else {
              <label class="flex min-w-40 flex-col gap-1">
                <span class="text-xs font-semibold uppercase tracking-[0.16em] text-secondaryText">
                  {{ filter.label }}
                </span>
                <input
                  type="search"
                  class="h-11 rounded-2xl border border-line bg-surface px-3 text-sm text-principalText outline-none transition-colors duration-200 placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary-soft"
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
              class="flex h-11 cursor-pointer list-none items-center gap-2 rounded-2xl border border-line bg-surface px-4 text-sm font-medium text-principalText transition-colors duration-200 hover:border-primary-soft hover:bg-primary-soft"
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

      <div
        class="flex flex-col gap-2 text-sm text-secondaryText sm:flex-row sm:items-center sm:justify-between"
      >
        <p>
          Showing <span class="font-semibold text-principalText">{{ filteredCount() }}</span> of
          {{ totalCount() }} rows
        </p>

        @if (selectedCount() > 0) {
          <p>
            <span class="font-semibold text-principalText">{{ selectedCount() }}</span> row(s)
            selected
          </p>
        }
      </div>
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

  handleColumnToggle(columnId: string, event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      this.columnVisibilityChange.emit({ columnId, visible: target.checked });
    }
  }
}
