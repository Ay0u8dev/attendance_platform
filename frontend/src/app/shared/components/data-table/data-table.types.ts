export type DataTableSortDirection = 'asc' | 'desc';
export type DataTableColumnAlign = 'start' | 'center' | 'end';

export interface DataTableFilterOption {
  readonly label: string;
  readonly value: string;
}

export interface DataTableFilterConfig<T> {
  readonly type: 'text' | 'select';
  readonly label?: string;
  readonly placeholder?: string;
  readonly options?: readonly DataTableFilterOption[];
  readonly match?: (filterValue: string, cellValue: unknown, row: T) => boolean;
}

export interface DataTableColumn<T> {
  readonly id: string;
  readonly header: string;
  readonly accessor: (row: T) => unknown;
  readonly sortValue?: (row: T) => string | number | boolean | Date | null | undefined;
  readonly filterValue?:
    | ((row: T) => string | number | boolean | readonly string[] | null | undefined)
    | undefined;
  readonly searchable?: boolean;
  readonly sortable?: boolean;
  readonly hideable?: boolean;
  readonly initiallyHidden?: boolean;
  readonly filter?: DataTableFilterConfig<T>;
  readonly align?: DataTableColumnAlign;
  readonly width?: string;
  readonly cellClassName?: string;
  readonly headerClassName?: string;
}

export interface DataTableSortState {
  readonly columnId: string;
  readonly direction: DataTableSortDirection;
}

export interface DataTableCellContext<T> {
  readonly $implicit: unknown;
  readonly value: unknown;
  readonly row: T;
  readonly column: DataTableColumn<T>;
  readonly rowIndex: number;
  readonly rowId: string;
  readonly selected: boolean;
}

export interface DataTableToolbarFilter {
  readonly columnId: string;
  readonly label: string;
  readonly type: 'text' | 'select';
  readonly value: string;
  readonly placeholder: string;
  readonly options: readonly DataTableFilterOption[];
}

export interface DataTableColumnVisibilityOption {
  readonly columnId: string;
  readonly label: string;
  readonly visible: boolean;
  readonly disabled: boolean;
}
