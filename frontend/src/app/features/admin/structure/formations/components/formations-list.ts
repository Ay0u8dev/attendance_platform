import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { IconButton } from '../../../../../shared/components/button/icon-button';
import { DataTable } from '../../../../../shared/components/data-table/data-table';
import { DataTableCellDef } from '../../../../../shared/components/data-table/data-table-cell-def';
import { DataTableColumn } from '../../../../../shared/components/data-table/data-table.types';
import { FormationsFilters } from './formations-filters';
import { DropdownOption } from '../../../../../shared/components/dropdown-filter/dropdown-filter';

export interface FormationItem {
  id: number;
  name: string;
  cycleId: number;
  fieldId: number | null;
  yearId: number;
  cycleName: string;
  fieldName: string;
  academicYear: string;
}

@Component({
  selector: 'app-formations-list',
  standalone: true,
  imports: [CommonModule, DataTable, DataTableCellDef, IconButton, FormationsFilters],
  template: `
    <app-formations-filters
      [cycles]="cycleOptions()"
      [fields]="fieldOptions()"
      [searchValue]="searchQuery()"
      [cycleValue]="selectedCycle()"
      [fieldValue]="selectedField()"
      createLabel="Ajouter une formation"
      (searchChange)="searchQuery.set($event)"
      (cycleFilterChange)="selectedCycle.set($event)"
      (fieldFilterChange)="selectedField.set($event)"
      (resetFilters)="resetFilters()"
      (createClicked)="createClicked.emit()"
    ></app-formations-filters>

    <app-data-table
      title="Formations"
      description="Associations entre années, cycles et filières."
      [rows]="filteredFormations()"
      [columns]="columns"
      [rowId]="formationRowId"
      [enableRowSelection]="true"
      (bulkDeleteRequested)="bulkDeleteRequested.emit($event)"
      emptyStateTitle="Aucune formation trouvée"
      emptyStateDescription="Ajustez les filtres ou créez une nouvelle formation."
      [initialPageSize]="5"
      [showToolbar]="false"
    >
      <ng-template [appDataTableCell]="'academicYear'" let-row="row">
        <span class="inline-flex rounded-lg bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">
          {{ row.academicYear }}
        </span>
      </ng-template>

      <ng-template [appDataTableCell]="'cycleName'" let-row="row">
        <p class="font-semibold text-principalText">{{ row.cycleName }}</p>
      </ng-template>

      <ng-template [appDataTableCell]="'actions'" let-row="row">
        <div class="flex justify-end gap-2">
          <app-icon-button
            icon="fa-regular fa-pen-to-square"
            label="Modifier la formation"
            tone="primary"
            size="sm"
            (click)="manageClicked.emit(row)"
          ></app-icon-button>
          <app-icon-button
            icon="fa-regular fa-trash-can"
            label="Supprimer la formation"
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
export class FormationsList {
  readonly formations = input.required<FormationItem[]>();
  readonly createClicked = output<void>();
  readonly manageClicked = output<FormationItem>();
  readonly deleteClicked = output<FormationItem>();
  readonly bulkDeleteRequested = output<readonly FormationItem[]>();

  // Filtres (Signals)
  readonly searchQuery = signal('');
  readonly selectedCycle = signal<string | null>(null);
  readonly selectedField = signal<string | null>(null);
  readonly selectedAcademicYear = signal<string | null>(null);

  /**
   * Génère les options de filtrage à partir des données réelles
   */
  readonly academicYearOptions = computed(() => this.getUniqueOptions(this.formations(), 'academicYear'));
  readonly cycleOptions = computed(() => this.getUniqueOptions(this.formations(), 'cycleName'));
  readonly fieldOptions = computed(() => this.getUniqueOptions(this.formations(), 'fieldName'));

  /**
   * Logique de filtrage réactive
   */
  readonly filteredFormations = computed(() => {
    let result = this.formations();
    const query = this.searchQuery().toLowerCase().trim();
    const cycle = this.selectedCycle();
    const field = this.selectedField();
    const year = this.selectedAcademicYear();

    if (query) {
      result = result.filter(f =>
        f.name.toLowerCase().includes(query) ||
        f.cycleName.toLowerCase().includes(query) ||
        f.fieldName.toLowerCase().includes(query) ||
        f.academicYear.toLowerCase().includes(query)
      );
    }

    if (cycle) result = result.filter(f => f.cycleName === cycle);
    if (field) result = result.filter(f => f.fieldName === field);
    if (year) result = result.filter(f => f.academicYear === year);

    return result;
  });

  resetFilters(): void {
    this.searchQuery.set('');
    this.selectedCycle.set(null);
    this.selectedField.set(null);
    this.selectedAcademicYear.set(null);
  }

  private getUniqueOptions(data: FormationItem[], key: keyof FormationItem): DropdownOption[] {
    const uniques = [...new Set(data.map(item => String(item[key])))];
    return uniques.sort().map(val => ({ label: val, value: val }));
  }

  readonly formationRowId = (formation: FormationItem) => String(formation.id);

  readonly columns: readonly DataTableColumn<FormationItem>[] = [
    {
      id: 'name',
      header: 'Nom',
      accessor: (formation) => formation.name,
      width: '16rem',
    },
    {
      id: 'academicYear',
      header: 'Année',
      accessor: (formation) => formation.academicYear,
      width: '12rem',
    },
    {
      id: 'cycleName',
      header: 'Cycle',
      accessor: (formation) => formation.cycleName,
      width: '18rem',
    },
    {
      id: 'fieldName',
      header: 'Filière',
      accessor: (formation) => formation.fieldName,
      width: '20rem',
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
