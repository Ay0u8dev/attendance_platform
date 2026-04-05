import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  effect,
  input,
  output,
  signal,
} from '@angular/core';

import { DataTableCellDef } from './data-table-cell-def';
import { DataTablePagination } from './data-table-pagination';
import { DataTableToolbar } from './data-table-toolbar';
import {
  DataTableCellContext,
  DataTableColumn,
  DataTableColumnVisibilityOption,
  DataTableSortDirection,
  DataTableSortState,
  DataTableToolbarFilter,
} from './data-table.types';

type DataTableRowEntry<T> = {
  readonly id: string;
  readonly index: number;
  readonly row: T;
};

@Component({
  selector: 'app-data-table',
  imports: [NgTemplateOutlet, DataTableToolbar, DataTablePagination],
  templateUrl: './data-table.html',
  styleUrl: './data-table.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTable<T extends object> {
  readonly title = input('');
  readonly description = input('');
  readonly caption = input('');
  readonly searchPlaceholder = input('Search rows...');
  readonly emptyStateTitle = input('No rows found');
  readonly emptyStateDescription = input(
    'Try adjusting filters, search terms, or visible columns.',
  );
  readonly rows = input.required<readonly T[]>();
  readonly columns = input.required<readonly DataTableColumn<T>[]>();
  readonly pageSizeOptions = input<readonly number[]>([5, 10, 20, 50]);
  readonly initialPageSize = input(10);
  readonly enableRowSelection = input(false);
  readonly rowId = input<((row: T, index: number) => string) | undefined>(undefined);

  readonly selectionChange = output<readonly T[]>();

  private readonly cellDefinitions = contentChildren(DataTableCellDef);

  readonly searchQuery = signal('');
  readonly columnFilters = signal<Record<string, string>>({});
  readonly currentPage = signal(1);
  readonly pageSizeOverride = signal<number | null>(null);
  readonly sortState = signal<DataTableSortState | null>(null);
  readonly columnVisibilityOverrides = signal<Record<string, boolean>>({});
  readonly selectedRowIds = signal<readonly string[]>([]);
  readonly selectedRowIdsSet = computed(() => new Set(this.selectedRowIds()));

  readonly pageSize = computed(() => this.pageSizeOverride() ?? this.initialPageSize());
  readonly selectionColumnCount = computed(() => (this.enableRowSelection() ? 1 : 0));

  readonly allRows = computed<readonly DataTableRowEntry<T>[]>(() =>
    this.rows().map((row, index) => ({
      id: this.resolveRowId(row, index),
      index,
      row,
    })),
  );

  readonly columnLookup = computed(
    () => new Map(this.columns().map((column) => [column.id, column])),
  );

  readonly visibleColumns = computed(() =>
    this.columns().filter((column) => this.isColumnVisible(column)),
  );

  readonly toolbarFilters = computed<readonly DataTableToolbarFilter[]>(() =>
    this.columns()
      .filter((column) => column.filter)
      .map((column) => ({
        columnId: column.id,
        label: column.filter!.label ?? column.header,
        type: column.filter!.type,
        value: this.columnFilters()[column.id] ?? '',
        placeholder:
          column.filter!.placeholder ??
          (column.filter!.type === 'select'
            ? `All ${column.header.toLowerCase()}`
            : `Filter ${column.header.toLowerCase()}`),
        options: column.filter!.options ?? [],
      })),
  );

  readonly columnVisibilityOptions = computed<readonly DataTableColumnVisibilityOption[]>(() => {
    const hideableColumns = this.columns().filter((column) => column.hideable !== false);
    const visibleCount = hideableColumns.filter((column) => this.isColumnVisible(column)).length;

    return hideableColumns.map((column) => {
      const visible = this.isColumnVisible(column);
      return {
        columnId: column.id,
        label: column.header,
        visible,
        disabled: visible && visibleCount === 1,
      };
    });
  });

  readonly filteredRows = computed<readonly DataTableRowEntry<T>[]>(() => {
    const normalizedSearchQuery = this.normalizeText(this.searchQuery());
    const filters = this.columnFilters();

    return this.sortedRows().filter((rowEntry) => {
      if (normalizedSearchQuery) {
        const matchesSearch = this.columns()
          .filter((column) => column.searchable !== false)
          .some((column) =>
            this.normalizeText(this.readFilterValue(column, rowEntry.row)).includes(
              normalizedSearchQuery,
            ),
          );

        if (!matchesSearch) {
          return false;
        }
      }

      return this.columns().every((column) => {
        const filterValue = filters[column.id]?.trim();
        if (!filterValue || !column.filter) {
          return true;
        }

        const cellValue = this.readFilterValue(column, rowEntry.row);
        if (column.filter.match) {
          return column.filter.match(filterValue, cellValue, rowEntry.row);
        }

        const normalizedFilter = this.normalizeText(filterValue);
        const normalizedCellValue = this.normalizeText(cellValue);

        return column.filter.type === 'select'
          ? normalizedCellValue === normalizedFilter
          : normalizedCellValue.includes(normalizedFilter);
      });
    });
  });

  readonly pageCount = computed(() => {
    const totalRows = this.filteredRows().length;
    return totalRows === 0 ? 1 : Math.ceil(totalRows / this.pageSize());
  });

  readonly paginatedRows = computed<readonly DataTableRowEntry<T>[]>(() => {
    const pageSize = this.pageSize();
    const startIndex = (this.currentPage() - 1) * pageSize;
    return this.filteredRows().slice(startIndex, startIndex + pageSize);
  });

  readonly pageStartIndex = computed(() =>
    this.filteredRows().length === 0 ? 0 : (this.currentPage() - 1) * this.pageSize() + 1,
  );

  readonly pageEndIndex = computed(() => {
    if (this.filteredRows().length === 0) {
      return 0;
    }

    return Math.min(this.currentPage() * this.pageSize(), this.filteredRows().length);
  });

  readonly selectedFilteredRowCount = computed(() => {
    const selectedIds = new Set(this.selectedRowIds());
    return this.filteredRows().filter((rowEntry) => selectedIds.has(rowEntry.id)).length;
  });

  readonly allPageRowsSelected = computed(() => {
    const currentPageRows = this.paginatedRows();
    if (currentPageRows.length === 0) {
      return false;
    }

    const selectedIds = new Set(this.selectedRowIds());
    return currentPageRows.every((rowEntry) => selectedIds.has(rowEntry.id));
  });

  readonly somePageRowsSelected = computed(() => {
    if (this.allPageRowsSelected()) {
      return false;
    }

    const currentPageRows = this.paginatedRows();
    if (currentPageRows.length === 0) {
      return false;
    }

    const selectedIds = new Set(this.selectedRowIds());
    return currentPageRows.some((rowEntry) => selectedIds.has(rowEntry.id));
  });

  private readonly customCellTemplates = computed(() => {
    return new Map(this.cellDefinitions().map((definition) => [definition.columnId(), definition]));
  });

  private readonly sortedRows = computed<readonly DataTableRowEntry<T>[]>(() => {
    const rows = [...this.allRows()];
    const sortState = this.sortState();

    if (!sortState) {
      return rows;
    }

    const column = this.columnLookup().get(sortState.columnId);
    if (!column) {
      return rows;
    }

    const directionMultiplier = this.directionMultiplier(sortState.direction);

    return rows.sort((left, right) => {
      const leftValue = this.readSortValue(column, left.row);
      const rightValue = this.readSortValue(column, right.row);
      return this.compareValues(leftValue, rightValue) * directionMultiplier;
    });
  });

  constructor() {
    effect(
      () => {
        this.searchQuery();
        this.columnFilters();
        this.pageSize();
        this.currentPage.set(1);
      },
      { allowSignalWrites: true },
    );

    effect(
      () => {
        const maximumPage = this.pageCount();
        const currentPage = this.currentPage();
        if (currentPage > maximumPage) {
          this.currentPage.set(maximumPage);
        }
      },
      { allowSignalWrites: true },
    );

    effect(
      () => {
        const validIds = new Set(this.allRows().map((rowEntry) => rowEntry.id));
        const currentSelection = this.selectedRowIds();
        const nextSelection = currentSelection.filter((id) => validIds.has(id));

        if (nextSelection.length !== currentSelection.length) {
          this.selectedRowIds.set(nextSelection);
          this.emitSelectionChange(nextSelection);
        }
      },
      { allowSignalWrites: true },
    );
  }

  updateSearchQuery(value: string): void {
    this.searchQuery.set(value);
  }

  updateColumnFilter(payload: { columnId: string; value: string }): void {
    this.columnFilters.update((current) => ({
      ...current,
      [payload.columnId]: payload.value,
    }));
  }

  updateColumnVisibility(payload: { columnId: string; visible: boolean }): void {
    const column = this.columnLookup().get(payload.columnId);
    if (!column) {
      return;
    }

    if (!payload.visible) {
      const visibleColumns = this.visibleColumns();
      if (visibleColumns.length === 1 && visibleColumns[0]?.id === column.id) {
        return;
      }
    }

    this.columnVisibilityOverrides.update((current) => ({
      ...current,
      [payload.columnId]: payload.visible,
    }));
  }

  updatePageSize(value: number): void {
    this.pageSizeOverride.set(value);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.pageCount()) {
      return;
    }

    this.currentPage.set(page);
  }

  toggleSort(column: DataTableColumn<T>): void {
    if (column.sortable === false) {
      return;
    }

    this.sortState.update((current) => {
      if (!current || current.columnId !== column.id) {
        return { columnId: column.id, direction: 'asc' };
      }

      if (current.direction === 'asc') {
        return { columnId: column.id, direction: 'desc' };
      }

      return null;
    });
  }

  toggleRowSelection(rowId: string, event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    const nextSelection = new Set(this.selectedRowIds());
    if (target.checked) {
      nextSelection.add(rowId);
    } else {
      nextSelection.delete(rowId);
    }

    const nextSelectionList = [...nextSelection];
    this.selectedRowIds.set(nextSelectionList);
    this.emitSelectionChange(nextSelectionList);
  }

  togglePageRowsSelection(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    const nextSelection = new Set(this.selectedRowIds());

    for (const rowEntry of this.paginatedRows()) {
      if (target.checked) {
        nextSelection.add(rowEntry.id);
      } else {
        nextSelection.delete(rowEntry.id);
      }
    }

    const nextSelectionList = [...nextSelection];
    this.selectedRowIds.set(nextSelectionList);
    this.emitSelectionChange(nextSelectionList);
  }

  isRowSelected(rowId: string): boolean {
    return this.selectedRowIdsSet().has(rowId);
  }

  cellTemplate(columnId: string): DataTableCellDef<T>['template'] | null {
    return this.customCellTemplates().get(columnId)?.template ?? null;
  }

  cellContext(rowEntry: DataTableRowEntry<T>, column: DataTableColumn<T>): DataTableCellContext<T> {
    const value = column.accessor(rowEntry.row);
    return {
      $implicit: value,
      value,
      row: rowEntry.row,
      column,
      rowIndex: rowEntry.index,
      rowId: rowEntry.id,
      selected: this.isRowSelected(rowEntry.id),
    };
  }

  formatCellValue(value: unknown): string {
    if (Array.isArray(value)) {
      return value.map((item) => this.formatCellValue(item)).join(', ');
    }

    if (value instanceof Date) {
      return value.toLocaleDateString();
    }

    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    if (value === null || value === undefined || value === '') {
      return '—';
    }

    return String(value);
  }

  headerCellClasses(column: DataTableColumn<T>): string {
    return `${this.alignmentClasses(column.align)} ${column.headerClassName ?? ''}`.trim();
  }

  bodyCellClasses(column: DataTableColumn<T>): string {
    return `${this.alignmentClasses(column.align)} ${column.cellClassName ?? ''}`.trim();
  }

  sortIconClasses(columnId: string): string {
    const sortState = this.sortState();

    if (!sortState || sortState.columnId !== columnId) {
      return 'fa-solid fa-arrow-up-wide-short text-xs text-secondaryText';
    }

    return sortState.direction === 'asc'
      ? 'fa-solid fa-arrow-up-wide-short text-xs text-primary'
      : 'fa-solid fa-arrow-down-wide-short text-xs text-primary';
  }

  private resolveRowId(row: T, index: number): string {
    const rowId = this.rowId();
    if (rowId) {
      return rowId(row, index);
    }

    const candidate = (row as Record<string, unknown>)['id'];
    if (typeof candidate === 'string' || typeof candidate === 'number') {
      return String(candidate);
    }

    return `${index}`;
  }

  private isColumnVisible(column: DataTableColumn<T>): boolean {
    const override = this.columnVisibilityOverrides()[column.id];
    return override ?? !column.initiallyHidden;
  }

  private readSortValue(
    column: DataTableColumn<T>,
    row: T,
  ): string | number | boolean | Date | null | undefined {
    return column.sortValue
      ? column.sortValue(row)
      : (column.accessor(row) as string | number | boolean | Date | null | undefined);
  }

  private readFilterValue(
    column: DataTableColumn<T>,
    row: T,
  ): string | number | boolean | readonly string[] | null | undefined {
    return column.filterValue
      ? column.filterValue(row)
      : (column.accessor(row) as string | number | boolean | readonly string[] | null | undefined);
  }

  private compareValues(left: unknown, right: unknown): number {
    if (left === right) {
      return 0;
    }

    if (left === null || left === undefined || left === '') {
      return 1;
    }

    if (right === null || right === undefined || right === '') {
      return -1;
    }

    if (left instanceof Date && right instanceof Date) {
      return left.getTime() - right.getTime();
    }

    if (typeof left === 'number' && typeof right === 'number') {
      return left - right;
    }

    if (typeof left === 'boolean' && typeof right === 'boolean') {
      return Number(left) - Number(right);
    }

    return String(left).localeCompare(String(right), undefined, {
      numeric: true,
      sensitivity: 'base',
    });
  }

  private directionMultiplier(direction: DataTableSortDirection): number {
    return direction === 'asc' ? 1 : -1;
  }

  private alignmentClasses(alignment: DataTableColumn<T>['align']): string {
    switch (alignment) {
      case 'center':
        return 'text-center';
      case 'end':
        return 'text-right';
      default:
        return 'text-left';
    }
  }

  private normalizeText(value: unknown): string {
    if (Array.isArray(value)) {
      return value.map((item) => this.normalizeText(item)).join(' ');
    }

    if (value === null || value === undefined) {
      return '';
    }

    return String(value).trim().toLowerCase();
  }

  private emitSelectionChange(selectionIds: readonly string[]): void {
    const selection = new Set(selectionIds);
    const selectedRows = this.allRows()
      .filter((rowEntry) => selection.has(rowEntry.id))
      .map((rowEntry) => rowEntry.row);

    this.selectionChange.emit(selectedRows);
  }
}
