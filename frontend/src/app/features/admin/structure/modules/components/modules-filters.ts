import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { Button } from '../../../../../shared/components/button/button';
import { SearchInput } from '../../../../../shared/components/search-input/search-input';
import { DropdownFilter, type DropdownOption } from '../../../../../shared/components/dropdown-filter/dropdown-filter';

@Component({
  selector: 'app-modules-filters',
  imports: [SearchInput, DropdownFilter, Button],
  template: `
    <div class="rounded-3xl border border-line bg-linear-to-br from-surface to-surface-subtle p-6 shadow-card mt-3 mb-3">
      <div class="space-y-4">
        <app-search-input
          identifier="module"
          label="Rechercher un module"
          placeholder="Entrez un code, module ou formation..."
          (searchChange)="searchChange.emit($event)"
        ></app-search-input>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
          <app-dropdown-filter
            identifier="formation"
            label="Formation"
            allLabel="Toutes les formations"
            [options]="formationOptions()"
            iconClass="fa-solid fa-book-open"
            iconBackgroundClass="bg-primary-soft text-primary"
            iconColor="primary"
            (filterChange)="formationFilterChange.emit($event)"
          ></app-dropdown-filter>

          <app-dropdown-filter
            identifier="semester"
            label="Semestre"
            allLabel="Tous les semestres"
            [options]="semesterOptions()"
            iconClass="fa-solid fa-calendar"
            iconBackgroundClass="bg-warning-soft text-warning"
            iconColor="warning"
            (filterChange)="semesterFilterChange.emit($event)"
          ></app-dropdown-filter>

          <app-dropdown-filter
            identifier="status"
            label="Statut"
            allLabel="Tous les statuts"
            [options]="statusOptions()"
            iconClass="fa-solid fa-shield-check"
            iconBackgroundClass="bg-secondary-soft text-secondary"
            iconColor="secondary"
            (filterChange)="statusFilterChange.emit($event)"
          ></app-dropdown-filter>
        </div>

        <div class="flex justify-end pt-2">
          <app-button
            label="Réinitialiser les filtres"
            icon="fa-solid fa-arrow-rotate-left"
            variant="primary"
            [fullWidth]="false"
            (clicked)="resetFilters.emit()"
          ></app-button>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModulesFilters {
  readonly formations = input.required<string[]>();
  readonly semesters = input.required<string[]>();
  readonly statuses = input.required<string[]>();
  readonly searchChange = output<string>();
  readonly formationFilterChange = output<string | null>();
  readonly semesterFilterChange = output<string | null>();
  readonly statusFilterChange = output<string | null>();
  readonly resetFilters = output<void>();

  readonly formationOptions = computed<DropdownOption[]>(() =>
    this.formations().map((formation) => ({ value: formation, label: formation }))
  );

  readonly semesterOptions = computed<DropdownOption[]>(() =>
    this.semesters().map((semester) => ({ value: semester, label: semester }))
  );

  readonly statusOptions = computed<DropdownOption[]>(() =>
    this.statuses().map((status) => ({ value: status, label: status }))
  );
}
