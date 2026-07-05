import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { type Cycle } from '../../../../../core/structure/models/cycle.model';
import { IconButton } from '../../../../../shared/components/button/icon-button';
import { DataTable } from '../../../../../shared/components/data-table/data-table';
import { DataTableCellDef } from '../../../../../shared/components/data-table/data-table-cell-def';
import { DataTableColumn } from '../../../../../shared/components/data-table/data-table.types';
import { StatusBadge } from '../../../../../shared/components/status-badge/status-badge';
import { CyclesFilters } from './cycles-filters';

@Component({
  selector: 'app-cycles-list',
  standalone: true,
  imports: [DataTable, DataTableCellDef, IconButton, StatusBadge, CyclesFilters],
  template: `
    <app-cycles-filters
      [searchValue]="searchQuery()"
      [typeValue]="selectedType()"
      createLabel="Ajouter un cycle"
      (searchChange)="searchQuery.set($event)"
      (typeFilterChange)="selectedType.set($event)"
      (resetFilters)="resetFilters()"
      (createClicked)="createClicked.emit()"
    ></app-cycles-filters>

    <app-data-table
      title="Cycles"
      description="Socle académique des formations et filières."
      [rows]="filteredCycles()"
      [columns]="columns"
      [rowId]="cycleRowId"
      [enableRowSelection]="true"
      (bulkDeleteRequested)="bulkDeleteRequested.emit($event)"
      emptyStateTitle="Aucun cycle trouvé"
      emptyStateDescription="Ajustez la recherche ou ajoutez un nouveau cycle."
      [initialPageSize]="5"
      [showToolbar]="false"
    >
      <ng-template [appDataTableCell]="'code'" let-row="row">
        <span class="inline-flex rounded-lg bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">
          {{ row.code }}
        </span>
      </ng-template>

      <ng-template [appDataTableCell]="'name'" let-row="row">
        <p class="font-semibold text-principalText">{{ row.name }}</p>
      </ng-template>

      <ng-template [appDataTableCell]="'type'" let-row="row">
        <app-status-badge
          [label]="typeLabel(row.type)"
          [variant]="row.type === 'PREPA' ? 'info' : 'success'"
        ></app-status-badge>
      </ng-template>

      <ng-template [appDataTableCell]="'actions'" let-row="row">
        <div class="flex justify-end gap-2">
          <app-icon-button
            icon="fa-regular fa-pen-to-square"
            label="Modifier le cycle"
            tone="primary"
            size="sm"
            (click)="editClicked.emit(row)"
          ></app-icon-button>
          <app-icon-button
            icon="fa-regular fa-trash-can"
            label="Supprimer le cycle"
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
export class CyclesList {
  readonly cycles = input.required<Cycle[]>();
  readonly createClicked = output<void>();
  readonly editClicked = output<Cycle>();
  readonly deleteClicked = output<Cycle>();
  readonly bulkDeleteRequested = output<readonly Cycle[]>();

  // Signaux pour gérer l'état des filtres
  readonly searchQuery = signal('');
  readonly selectedType = signal<string | null>(null);

  // Logique de filtrage réactive
  readonly filteredCycles = computed(() => {
    let result = this.cycles();
    const query = this.searchQuery().toLowerCase();
    const type = this.selectedType();

    if (query) {
      result = result.filter(c => 
        c.name.toLowerCase().includes(query) || 
        c.code.toLowerCase().includes(query)
      );
    }

    if (type) {
      result = result.filter(c => c.type === type);
    }

    return result;
  });

  resetFilters(): void {
    this.searchQuery.set('');
    this.selectedType.set(null);
  }

  readonly cycleRowId = (cycle: Cycle) => String(cycle.id);

  readonly columns: readonly DataTableColumn<Cycle>[] = [
    {
      id: 'code',
      header: 'Code',
      accessor: (cycle) => cycle.code,
      width: '8rem',
    },
    {
      id: 'name',
      header: 'Libellé',
      accessor: (cycle) => cycle.name,
      width: '18rem',
    },
    {
      id: 'type',
      header: 'Type',
      accessor: (cycle) => this.typeLabel(cycle.type),
      width: '12rem',
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

  typeLabel(type: Cycle['type']): string {
    return type === 'PREPA' ? 'Préparatoire' : 'Ingénieur';
  }
}
