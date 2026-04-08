import { ChangeDetectionStrategy, Component, input, output, computed } from '@angular/core';

import { Button } from '../../../../../shared/components/button/button';
import { SearchInput } from '../../../../../shared/components/search-input/search-input';
import { DropdownFilter, type DropdownOption } from '../../../../../shared/components/dropdown-filter/dropdown-filter';

@Component({
  selector: 'app-formations-filters',
  standalone: true,
  imports: [SearchInput, DropdownFilter, Button],
  template: `
    <div class="rounded-3xl border border-line bg-gradient-to-br from-surface to-surface-subtle p-6 shadow-card mt-3 mb-3">
      <div class="space-y-4">
        <!-- Search Section -->
        <app-search-input
          identifier="formation"
          label="Rechercher une formation"
          placeholder="Entrez un code, cycle ou filière..."
          (searchChange)="searchChange.emit($event)"
        ></app-search-input>

        <!-- Filters Grid -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
          <!-- Cycle Filter -->
          <app-dropdown-filter
            identifier="cycle"
            label="Cycle"
            allLabel="Tous les cycles"
            [options]="cycleOptions()"
            iconClass="fa-solid fa-circle-play"
            iconBackgroundClass="bg-primary-soft text-primary"
            iconColor="primary"
            hoverBorderClass="border-primary-soft"
            (filterChange)="cycleFilterChange.emit($event)"
          ></app-dropdown-filter>

          <!-- Field Filter -->
          <app-dropdown-filter
            identifier="field"
            label="Filière"
            allLabel="Toutes les filières"
            [options]="fieldOptions()"
            iconClass="fa-solid fa-bookmark"
            iconBackgroundClass="bg-secondary-soft text-secondary"
            iconColor="secondary"
            hoverBorderClass="border-secondary-soft"
            (filterChange)="fieldFilterChange.emit($event)"
          ></app-dropdown-filter>

          <!-- Semester Filter -->
          <app-dropdown-filter
            identifier="semester"
            label="Semestre"
            allLabel="Tous les semestres"
            [options]="semesterOptions()"
            iconClass="fa-solid fa-calendar"
            iconBackgroundClass="bg-warning-soft text-warning"
            iconColor="warning"
            hoverBorderClass="border-warning-soft"
            (filterChange)="semesterFilterChange.emit($event)"
          ></app-dropdown-filter>
        </div>

        <!-- Reset Button -->
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
export class FormationsFilters {
  readonly cycles = input.required<string[]>();
  readonly fields = input.required<string[]>();
  readonly semesters = input.required<string[]>();
  readonly searchChange = output<string>();
  readonly cycleFilterChange = output<string | null>();
  readonly fieldFilterChange = output<string | null>();
  readonly semesterFilterChange = output<string | null>();
  readonly resetFilters = output<void>();

  readonly cycleOptions = computed<DropdownOption[]>(() =>
    this.cycles().map(cycle => ({ value: cycle, label: cycle }))
  );

  readonly fieldOptions = computed<DropdownOption[]>(() =>
    this.fields().map(field => ({ value: field, label: field }))
  );

  readonly semesterOptions = computed<DropdownOption[]>(() =>
    this.semesters().map(semester => ({ value: semester, label: semester }))
  );
}
