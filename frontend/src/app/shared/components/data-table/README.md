# Data Table Component

This is the shared Angular data table for the Attendance Platform.

It is designed to give you the practical behavior people usually expect from a modern admin table:

- global search
- per-column filters
- sortable columns
- column visibility toggles
- client-side pagination
- row selection
- custom cell templates

It is intentionally a **client-side table**, not a fake promise of full TanStack parity.

## What It Is

Use this component when you need an administrative table with consistent styling and common behaviors already wired.

It fits the project design language:

- light surface
- soft borders
- low-noise controls
- readable data density
- modular composition instead of page-specific markup duplication

## What It Is Not

This component does **not** currently provide:

- server-side sorting
- server-side filtering
- virtual scrolling
- column resizing
- drag-and-drop column reordering
- grouped headers
- expandable sub-rows

If you need those, say so directly and extend the component deliberately. Do not pretend they already exist.

## Files

- [`data-table.ts`](./data-table.ts): main component logic and public inputs
- [`data-table.html`](./data-table.html): table markup
- [`data-table.types.ts`](./data-table.types.ts): reusable types for columns, filters, and template context
- [`data-table-cell-def.ts`](./data-table-cell-def.ts): directive used to provide custom cell templates
- [`data-table-toolbar.ts`](./data-table-toolbar.ts): search, filters, and column toggles
- [`data-table-pagination.ts`](./data-table-pagination.ts): pagination controls
- [`students-page.ts`](../../../features/admin/students/students-page.ts): live usage example

## Quick Start

Import the table, the cell directive, and any components you want to use inside custom cells.

```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';

import { DataTable } from '../../../shared/components/data-table/data-table';
import { DataTableCellDef } from '../../../shared/components/data-table/data-table-cell-def';
import { DataTableColumn } from '../../../shared/components/data-table/data-table.types';

type StudentRow = {
  readonly name: string;
  readonly email: string;
  readonly program: string;
  readonly absences: number;
};

@Component({
  selector: 'app-example-page',
  imports: [DataTable, DataTableCellDef],
  template: `
    <app-data-table
      title="Students"
      [rows]="students"
      [columns]="columns"
      [rowId]="rowId"
      [enableRowSelection]="true"
    >
      <ng-template [appDataTableCell]="'student'" let-row="row">
        <div>
          <p>{{ row.name }}</p>
          <p>{{ row.email }}</p>
        </div>
      </ng-template>
    </app-data-table>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExamplePage {
  readonly rowId = (row: StudentRow) => row.email;

  readonly students: readonly StudentRow[] = [
    {
      name: 'Sofiane Meziane',
      email: 'sofiane.meziane@ump.ac.ma',
      program: 'Software Engineering',
      absences: 1,
    },
  ];

  readonly columns: readonly DataTableColumn<StudentRow>[] = [
    {
      id: 'student',
      header: 'Student',
      accessor: (row) => row.name,
    },
    {
      id: 'program',
      header: 'Program',
      accessor: (row) => row.program,
    },
    {
      id: 'absences',
      header: 'Absences',
      accessor: (row) => row.absences,
      align: 'end',
    },
  ];
}
```

## Minimum Requirements

You must provide:

- `[rows]`
- `[columns]`

You should usually provide:

- `[rowId]` when your rows do not have a stable `id` field

If you skip a stable row id, selection state can become fragile when row order changes. That is sloppy. Use a real identifier.

## Public Inputs

These are the inputs on [`DataTable`](./data-table.ts#L38).

| Input                   | Type                                | Default                                                      | Purpose                                 |
| ----------------------- | ----------------------------------- | ------------------------------------------------------------ | --------------------------------------- |
| `title`                 | `string`                            | `''`                                                         | Card-style header title                 |
| `description`           | `string`                            | `''`                                                         | Supporting copy under the title         |
| `caption`               | `string`                            | `''`                                                         | Badge-like metadata shown in the header |
| `searchPlaceholder`     | `string`                            | `'Search rows...'`                                           | Placeholder for the global search input |
| `emptyStateTitle`       | `string`                            | `'No rows found'`                                            | Empty-state title                       |
| `emptyStateDescription` | `string`                            | `'Try adjusting filters, search terms, or visible columns.'` | Empty-state supporting text             |
| `rows`                  | `readonly T[]`                      | required                                                     | Data source                             |
| `columns`               | `readonly DataTableColumn<T>[]`     | required                                                     | Column configuration                    |
| `pageSizeOptions`       | `readonly number[]`                 | `[5, 10, 20, 50]`                                            | Page size dropdown options              |
| `initialPageSize`       | `number`                            | `10`                                                         | Initial rows per page                   |
| `enableRowSelection`    | `boolean`                           | `false`                                                      | Enables checkbox selection              |
| `rowId`                 | `(row: T, index: number) => string` | optional                                                     | Stable row identifier resolver          |

## Public Output

| Output            | Type           | Meaning                       |
| ----------------- | -------------- | ----------------------------- |
| `selectionChange` | `readonly T[]` | Emits currently selected rows |

Example:

```html
<app-data-table
  [rows]="students"
  [columns]="columns"
  [enableRowSelection]="true"
  (selectionChange)="handleSelection($event)"
></app-data-table>
```

## Column Definition

Each column uses the `DataTableColumn<T>` interface from [`data-table.types.ts`](./data-table.types.ts#L15).

```ts
readonly columns: readonly DataTableColumn<StudentRow>[] = [
  {
    id: 'student',
    header: 'Student',
    accessor: (row) => row.name,
    sortValue: (row) => row.name,
    filterValue: (row) => [row.name, row.email],
    searchable: true,
    sortable: true,
    hideable: true,
    initiallyHidden: false,
    align: 'start',
    width: '18rem',
    cellClassName: 'whitespace-nowrap',
    headerClassName: 'tracking-tight',
  },
];
```

### Column Fields

| Field             | Required | Meaning                                                       |
| ----------------- | -------- | ------------------------------------------------------------- |
| `id`              | yes      | Unique identifier for the column                              |
| `header`          | yes      | Header label shown in the table                               |
| `accessor`        | yes      | Reads the default cell value from a row                       |
| `sortValue`       | no       | Overrides what is used for sorting                            |
| `filterValue`     | no       | Overrides what is used for global search and column filtering |
| `searchable`      | no       | If `false`, excludes this column from global search           |
| `sortable`        | no       | If `false`, disables header sorting                           |
| `hideable`        | no       | If `false`, removes this column from the visibility menu      |
| `initiallyHidden` | no       | Hides the column on first render                              |
| `filter`          | no       | Enables a toolbar filter for this column                      |
| `align`           | no       | `'start'`, `'center'`, or `'end'`                             |
| `width`           | no       | CSS width string applied to the column                        |
| `cellClassName`   | no       | Extra classes for body cells                                  |
| `headerClassName` | no       | Extra classes for header cells                                |

## Filters

The component supports two filter types:

- `text`
- `select`

Example:

```ts
{
  id: 'program',
  header: 'Program',
  accessor: (row) => row.program,
  filter: {
    type: 'select',
    options: [
      { label: 'Software Engineering', value: 'Software Engineering' },
      { label: 'Data Science', value: 'Data Science' },
    ],
  },
}
```

### Filter Behavior

- Text filters perform a normalized `includes()` match.
- Select filters perform a normalized equality match.
- Global search runs across every column where `searchable !== false`.
- Filtering uses `filterValue` when present, otherwise it uses `accessor`.

### Custom Filter Match

If default matching is not enough, use `match`.

```ts
{
  id: 'risk',
  header: 'Risk',
  accessor: (row) => row.riskScore,
  filter: {
    type: 'text',
    label: 'Risk filter',
    placeholder: 'high, medium, low',
    match: (filterValue, cellValue) => {
      const score = Number(cellValue ?? 0);
      const normalized = filterValue.trim().toLowerCase();

      if (normalized === 'high') {
        return score >= 80;
      }

      if (normalized === 'medium') {
        return score >= 50 && score < 80;
      }

      if (normalized === 'low') {
        return score < 50;
      }

      return true;
    },
  },
}
```

## Custom Cell Templates

Use `appDataTableCell` when the default string rendering is not enough.

The template key must match the column `id`.

```html
<ng-template [appDataTableCell]="'status'" let-row="row" let-value="value">
  <app-status-badge [label]="row.status" [variant]="row.variant"></app-status-badge>
</ng-template>
```

### Available Template Context

The directive exposes `DataTableCellContext<T>`:

| Variable    | Meaning                               |
| ----------- | ------------------------------------- |
| `$implicit` | same as `value`                       |
| `value`     | resolved cell value                   |
| `row`       | current row object                    |
| `column`    | current column config                 |
| `rowIndex`  | original row index                    |
| `rowId`     | resolved row identifier               |
| `selected`  | whether the row is currently selected |

Example:

```html
<ng-template [appDataTableCell]="'student'" let-row="row" let-selected="selected">
  <div [class.font-semibold]="selected">{{ row.name }}</div>
</ng-template>
```

## Default Behaviors

### Sorting

- Click a sortable header once for ascending.
- Click it again for descending.
- Click it a third time to clear sorting.
- Sorting uses `sortValue` when present, otherwise `accessor`.

### Search

- Search is global across searchable columns.
- Values are normalized with `trim().toLowerCase()`.
- Arrays returned from `filterValue` are flattened into a single searchable string.

### Pagination

- Pagination is client-side.
- Changing filters or search resets the page back to 1.
- If filtering reduces the total page count, the current page is clamped automatically.

### Row Selection

- Selection is tracked by row id.
- The header checkbox selects the current page only.
- `selectionChange` emits full row objects, not ids.

### Column Visibility

- Only hideable columns appear in the visibility menu.
- The component prevents the user from hiding the last remaining visible column.

## Default Cell Rendering

If you do not provide a custom cell template, the table renders values like this:

- arrays become comma-separated text
- `Date` becomes `toLocaleDateString()`
- booleans become `Yes` or `No`
- `null`, `undefined`, and empty strings become `—`
- everything else becomes `String(value)`

If that output is not acceptable for a column, provide a custom cell template. Don’t complain after choosing not to.

## Best Practices

- Keep row data typed.
- Keep column definitions in the page or feature component that owns the dataset.
- Use `filterValue` when users need search across more than one field.
- Use `sortValue` when display text is not the right sort source.
- Use custom cells for badges, actions, avatars, links, and compound content.
- Use `searchable: false` on action columns and purely decorative columns.
- Provide a real `rowId`.
- Reuse the shared table instead of rebuilding page-specific table markup.

## Common Mistakes

- Using array index as identity when a stable real id exists
- Forgetting to set `sortable: false` on action columns
- Expecting search to read custom template markup instead of `accessor` or `filterValue`
- Forgetting that select filters compare the actual stored value
- Returning complex objects from `accessor` without also defining custom rendering
- Treating this as a server-side data grid when it is not

## Recommended Usage Pattern

1. Define a typed row model.
2. Provide a stable `rowId`.
3. Define columns close to the page that owns the data.
4. Add `filter` configs only where they improve real workflows.
5. Add custom templates only for columns that need richer rendering.
6. Keep the table generic and keep feature-specific behavior outside it.

## Real Example In This Repo

If you want a working reference instead of theory, read:

- [`students-page.ts`](../../../features/admin/students/students-page.ts#L23)

That example shows:

- typed row data
- text and select filters
- hidden columns
- sortable numeric columns
- custom status badge cells
- custom action cells
- row selection

## When To Extend The Component

Extend the shared table when the new requirement is reusable across multiple admin pages.

Do **not** extend it when the need is page-specific and should stay in projected cell content.

Good shared extensions:

- server-side state support
- loading skeleton state
- reusable bulk action bar
- reusable empty-state actions
- reusable row click handling

Bad extensions:

- feature-specific modal logic
- one-off API calls inside the table
- feature-specific button labels baked into the component
- student-only, teacher-only, or attendance-only business rules
