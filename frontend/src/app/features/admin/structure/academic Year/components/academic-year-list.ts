import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { AnneeUniversitaire } from '../../../../../core/structure/models/annee-universitaire.model';
import { Button } from '../../../../../shared/components/button/button';
import { IconButton } from '../../../../../shared/components/button/icon-button';
import { DataTable } from '../../../../../shared/components/data-table/data-table';
import { DataTableCellDef } from '../../../../../shared/components/data-table/data-table-cell-def';
import { DataTableColumn } from '../../../../../shared/components/data-table/data-table.types';
import { StatusBadge } from '../../../../../shared/components/status-badge/status-badge';
import { AcademicYearFilters } from './academic-year-filters';  

@Component({
  selector: 'app-academic-year-list',
  standalone: true,
  imports: [Button, DataTable, DataTableCellDef, DatePipe, IconButton, StatusBadge, AcademicYearFilters],
  template: `
    <div class="mt-4 flex justify-end mb-4">
      <app-button
        label="Ajouter une année"
        icon="fa-solid fa-plus"
        variant="primary"
        [fullWidth]="false"
        (clicked)="createClicked.emit()"
      ></app-button>
    </div>

    <!-- Filters Section -->
    <app-academic-year-filters
      [searchValue]="searchQuery()"
      [statusValue]="selectedStatus()"
      (searchChange)="searchQuery.set($event)"
      (statusFilterChange)="selectedStatus.set($event)"
      (resetFilters)="resetFilters()"
    ></app-academic-year-filters>

    <!-- Data Table Section -->
    <app-data-table
      title="Années universitaires"
      description="Périodes académiques officielles et statut d'activation."
      [caption]="filteredYears().length + ' année(s)'"
      [rows]="filteredYears()"
      [columns]="columns"
      [rowId]="yearRowId"
      [enableRowSelection]="true"
      (bulkDeleteRequested)="bulkDeleteRequested.emit($event)"
      emptyStateTitle="Aucune année trouvée"
      emptyStateDescription="Ajoutez une année universitaire ou modifiez vos filtres."
      [initialPageSize]="5"
      [showToolbar]="false"
    >
      <!-- Custom Cell Template: Name -->
      <ng-template [appDataTableCell]="'name'" let-row="row">
        <p class="font-semibold text-principalText">{{ row.name }}</p>
      </ng-template>

      <!-- Custom Cell Template: Period -->
      <ng-template [appDataTableCell]="'period'" let-row="row">
        <div class="flex flex-wrap items-center gap-2 text-secondaryText">
          <span>{{ row.startDate | date: 'dd MMM yyyy' }}</span>
          <i class="fa-solid fa-arrow-right text-[10px] text-muted" aria-hidden="true"></i>
          <span>{{ row.endDate | date: 'dd MMM yyyy' }}</span>
        </div>
      </ng-template>

      <!-- Custom Cell Template: Status -->
      <ng-template [appDataTableCell]="'active'" let-row="row">
        <app-status-badge
          [label]="row.active ? 'Active' : 'Inactive'"
          [variant]="row.active ? 'success' : 'neutral'"
        ></app-status-badge>
      </ng-template>

      <!-- Custom Cell Template: Actions -->
      <ng-template [appDataTableCell]="'actions'" let-row="row">
        <div class="flex justify-end gap-2">
          <app-icon-button
            icon="fa-regular fa-pen-to-square"
            label="Modifier l'année"
            tone="primary"
            size="sm"
            (click)="editClicked.emit(row)"
          ></app-icon-button>
          <app-icon-button
            icon="fa-regular fa-trash-can"
            label="Supprimer l'année"
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
export class AcademicYearList {
  // Inputs & Outputs
  readonly years = input.required<AnneeUniversitaire[]>();
  readonly createClicked = output<void>();
  readonly editClicked = output<AnneeUniversitaire>();
  readonly deleteClicked = output<AnneeUniversitaire>();
  readonly bulkDeleteRequested = output<readonly AnneeUniversitaire[]>();

  // Filter Signals
  readonly searchQuery = signal('');
  readonly selectedStatus = signal<string | null>(null);

  /**
   * Computed logic to handle filtering based on name and status
   */
  readonly filteredYears = computed(() => {
    let result = this.years();
    const query = this.searchQuery().toLowerCase();
    const status = this.selectedStatus();

    if (query) {
      result = result.filter(y => y.name.toLowerCase().includes(query));
    }

    if (status) {
      const isActive = status === 'active';
      result = result.filter(y => y.active === isActive);
    }

    return result;
  });

  resetFilters() {
    this.searchQuery.set('');
    this.selectedStatus.set(null);
  }

  readonly yearRowId = (year: AnneeUniversitaire) => String(year.id);

  readonly columns: readonly DataTableColumn<AnneeUniversitaire>[] = [
    {
      id: 'name',
      header: 'Année',
      accessor: (year) => year.name,
      width: '14rem',
    },
    {
      id: 'period',
      header: 'Période',
      accessor: (year) => `${year.startDate} - ${year.endDate}`,
      sortValue: (year) => year.startDate,
      width: '20rem',
    },
    {
      id: 'active',
      header: 'Statut',
      accessor: (year) => (year.active ? 'Active' : 'Inactive'),
      width: '10rem',
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