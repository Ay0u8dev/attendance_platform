import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { type Filiere } from '../../../../../core/structure/models/filiere.model';
import { Button } from '../../../../../shared/components/button/button';
import { IconButton } from '../../../../../shared/components/button/icon-button';
import { DataTable } from '../../../../../shared/components/data-table/data-table';
import { DataTableCellDef } from '../../../../../shared/components/data-table/data-table-cell-def';
import { DataTableColumn } from '../../../../../shared/components/data-table/data-table.types';
import { FieldsFilters } from './fields-filters';

@Component({
  selector: 'app-fields-list',
  standalone: true,
  imports: [Button, DataTable, DataTableCellDef, IconButton, FieldsFilters],
  template: `

    
    <div class="mt-4 flex justify-end mb-4">
      <app-button
        label="Ajouter une filière"
        icon="fa-solid fa-plus"
        variant="primary"
        [fullWidth]="false"
        (clicked)="createClicked.emit()"
      ></app-button>
    </div>

    <app-fields-filters
      [searchValue]="searchQuery()"
      (searchChange)="searchQuery.set($event)"
      (resetFilters)="resetFilters()"
    ></app-fields-filters>

    <app-data-table
      title="Filières"
      description="Parcours rattachés aux cycles lorsque la formation le requiert."
      [caption]="filteredFields().length + ' filière(s)'"
      [rows]="filteredFields()"
      [columns]="columns"
      [rowId]="fieldRowId"
      [enableRowSelection]="true"
      (bulkDeleteRequested)="bulkDeleteRequested.emit($event)"
      emptyStateTitle="Aucune filière trouvée"
      emptyStateDescription="Ajustez la recherche ou ajoutez une nouvelle filière."
      [initialPageSize]="5"
      [showToolbar]="false"
    >
      <ng-template [appDataTableCell]="'code'" let-row="row">
        <span
          class="inline-flex rounded-lg bg-secondary-soft px-2.5 py-1 text-xs font-semibold text-secondary"
        >
          {{ row.code }}
        </span>
      </ng-template>

      <ng-template [appDataTableCell]="'name'" let-row="row">
        <p class="font-semibold text-principalText">{{ row.name }}</p>
      </ng-template>

      <ng-template [appDataTableCell]="'actions'" let-row="row">
        <div class="flex justify-end gap-2">
          <app-icon-button
            icon="fa-regular fa-pen-to-square"
            label="Modifier la filière"
            tone="primary"
            size="sm"
            (click)="editClicked.emit(row)"
          ></app-icon-button>
          <app-icon-button
            icon="fa-regular fa-trash-can"
            label="Supprimer la filière"
            tone="danger"
            size="sm"
            (click)="deleteClicked.emit(row)"
          ></app-icon-button>
        </div>
      </ng-template>
    </app-data-table>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FieldsList {
  readonly fields = input.required<Filiere[]>();
  readonly createClicked = output<void>();
  readonly editClicked = output<Filiere>();
  readonly deleteClicked = output<Filiere>();
  readonly bulkDeleteRequested = output<readonly Filiere[]>();

  readonly searchQuery = signal('');

  /**
   * Logique de filtrage réactive basée sur les signaux.
   */
  readonly filteredFields = computed(() => {
    const data = this.fields();
    const query = this.searchQuery().toLowerCase().trim();

    if (!query) return data;

    return data.filter(
      (f) => f.name.toLowerCase().includes(query) || f.code.toLowerCase().includes(query)
    );
  });

  resetFilters(): void {
    this.searchQuery.set('');
  }

  readonly fieldRowId = (field: Filiere) => String(field.id);

  readonly columns: readonly DataTableColumn<Filiere>[] = [
    {
      id: 'code',
      header: 'Code',
      accessor: (field) => field.code,
      width: '8rem',
    },
    {
      id: 'name',
      header: 'Libellé',
      accessor: (field) => field.name,
      width: '24rem',
    },
    {
      id: 'actions',
      header: 'Actions',
      accessor: () => '',
      sortable: false,
      searchable: false,
      hideable: false,
      align: 'end',
      width: '8rem',
    },
  ];
}
