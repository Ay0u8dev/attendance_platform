import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-data-table-pagination',
  template: `
    <div
      class="flex flex-col gap-4 border-t border-line px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between"
    >
      <div
        class="flex flex-col gap-2 text-sm text-secondaryText sm:flex-row sm:items-center sm:gap-4"
      >
        <p>
          @if (totalItems() > 0) {
            Showing <span class="font-semibold text-principalText">{{ startIndex() }}</span> to
            <span class="font-semibold text-principalText">{{ endIndex() }}</span> of
            {{ totalItems() }} rows
          } @else {
            No matching rows
          }
        </p>

        @if (selectedCount() > 0) {
          <p>
            <span class="font-semibold text-principalText">{{ selectedCount() }}</span> selected
            across the current result set
          </p>
        }
      </div>

      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <label class="flex items-center gap-2 text-sm text-secondaryText">
          <span>Rows per page</span>
          <select
            class="h-10 rounded-xl border border-line bg-surface px-3 text-sm text-principalText outline-none transition-colors duration-200 focus:border-primary focus:ring-2 focus:ring-primary-soft"
            [value]="pageSize()"
            (change)="handlePageSizeChange($event)"
          >
            @for (option of pageSizeOptions(); track option) {
              <option [value]="option">{{ option }}</option>
            }
          </select>
        </label>

        <div class="flex items-center gap-2">
          <p class="min-w-24 text-right text-sm text-secondaryText">
            Page {{ currentPage() }} of {{ pageCount() }}
          </p>

          <button
            type="button"
            class="inline-flex h-10 items-center justify-center rounded-xl border border-line bg-surface px-3 text-sm font-medium text-principalText transition-colors duration-200 hover:border-primary-soft hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-50"
            [disabled]="!canGoPrevious()"
            (click)="pageChange.emit(currentPage() - 1)"
          >
            Previous
          </button>

          <button
            type="button"
            class="inline-flex h-10 items-center justify-center rounded-xl border border-line bg-surface px-3 text-sm font-medium text-principalText transition-colors duration-200 hover:border-primary-soft hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-50"
            [disabled]="!canGoNext()"
            (click)="pageChange.emit(currentPage() + 1)"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTablePagination {
  readonly currentPage = input(1);
  readonly pageCount = input(1);
  readonly pageSize = input(10);
  readonly totalItems = input(0);
  readonly startIndex = input(0);
  readonly endIndex = input(0);
  readonly selectedCount = input(0);
  readonly canGoPrevious = input(false);
  readonly canGoNext = input(false);
  readonly pageSizeOptions = input<readonly number[]>([5, 10, 20, 50]);

  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();

  handlePageSizeChange(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLSelectElement) {
      this.pageSizeChange.emit(Number(target.value));
    }
  }
}
