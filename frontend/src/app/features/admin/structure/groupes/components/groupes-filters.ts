import { ChangeDetectionStrategy, Component, input, output, computed, signal } from '@angular/core';

import { Button } from '../../../../../shared/components/button/button';
import { SearchInput } from '../../../../../shared/components/search-input/search-input';
import { DropdownFilter, type DropdownOption } from '../../../../../shared/components/dropdown-filter/dropdown-filter';

@Component({
  selector: 'app-groupes-filters',
  standalone: true,
  imports: [SearchInput, DropdownFilter, Button],
  template: `
    <div class="rounded-3xl border border-line bg-linear-to-br from-surface to-surface-subtle p-6 shadow-card mt-3 mb-3">
      <div class="space-y-4">
        <!-- Search Section -->
        <app-search-input
          identifier="groupe"
          label="Rechercher un groupe"
          placeholder="Entrez un code, formation ou semestre..."
          [value]="searchValue()"
          (searchChange)="onSearchChange($event)"
        ></app-search-input>

        <!-- Filters Grid -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
          <!-- Formation Filter -->
          <app-dropdown-filter
            identifier="formation"
            label="Formation"
            allLabel="Toutes les formations"
            [options]="formationOptions()"
            [value]="formationValue()"
            iconClass="fa-solid fa-book-open"
            iconBackgroundClass="bg-primary-soft text-primary"
            iconColor="primary"
            hoverBorderClass="border-primary-soft"
            (filterChange)="onFormationChange($event)"
          ></app-dropdown-filter>

          <!-- Field Filter -->
          <app-dropdown-filter
            identifier="field"
            label="Filière"
            allLabel="Toutes les filières"
            [options]="fieldOptions()"
            [value]="fieldValue()"
            iconClass="fa-solid fa-bookmark"
            iconBackgroundClass="bg-secondary-soft text-secondary"
            iconColor="secondary"
            hoverBorderClass="border-secondary-soft"
            (filterChange)="onFieldChange($event)"
          ></app-dropdown-filter>

          <!-- Semester Filter -->
          <app-dropdown-filter
            identifier="semester"
            label="Semestre"
            allLabel="Tous les semestres"
            [options]="semesterOptions()"
            [value]="semesterValue()"
            iconClass="fa-solid fa-calendar"
            iconBackgroundClass="bg-warning-soft text-warning"
            iconColor="warning"
            hoverBorderClass="border-warning-soft"
            (filterChange)="onSemesterChange($event)"
          ></app-dropdown-filter>
        </div>

        <!-- Reset Button -->
        <div class="flex justify-end pt-2">
          <app-button
            label="Réinitialiser les filtres"
            icon="fa-solid fa-arrow-rotate-left"
            variant="primary"
            [fullWidth]="false"
            (clicked)="onReset()"
          ></app-button>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupesFilters {
  readonly formations = input.required<string[]>();
  readonly fields = input.required<string[]>();
  readonly semesters = input.required<string[]>();
  readonly searchChange = output<string>();
  readonly formationFilterChange = output<string | null>();
  readonly fieldFilterChange = output<string | null>();
  readonly semesterFilterChange = output<string | null>();
  readonly resetFilters = output<void>();

  readonly searchValue = signal<string>('');
  readonly formationValue = signal<string | null>(null);
  readonly fieldValue = signal<string | null>(null);
  readonly semesterValue = signal<string | null>(null);

  readonly formationOptions = computed<DropdownOption[]>(() =>
    this.formations().map(f => ({ value: f, label: f }))
  );

  readonly fieldOptions = computed<DropdownOption[]>(() =>
    this.fields().map(f => ({ value: f, label: f }))
  );

  readonly semesterOptions = computed<DropdownOption[]>(() =>
    this.semesters().map(s => ({ value: s, label: s }))
  );

  onSearchChange(value: string): void {
    this.searchValue.set(value);
    this.searchChange.emit(value);
  }

  onFormationChange(value: string | null): void {
    this.formationValue.set(value);
    this.formationFilterChange.emit(value);
  }

  onFieldChange(value: string | null): void {
    this.fieldValue.set(value);
    this.fieldFilterChange.emit(value);
  }

  onSemesterChange(value: string | null): void {
    this.semesterValue.set(value);
    this.semesterFilterChange.emit(value);
  }

  onReset(): void {
    this.searchValue.set('');
    this.formationValue.set(null);
    this.fieldValue.set(null);
    this.semesterValue.set(null);
    this.resetFilters.emit();
  }
}
