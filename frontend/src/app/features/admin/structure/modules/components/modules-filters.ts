import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Button } from '../../../../../shared/components/button/button';
import {
  DropdownFilter,
  type DropdownOption,
} from '../../../../../shared/components/dropdown-filter/dropdown-filter';
import { SearchInput } from '../../../../../shared/components/search-input/search-input';

@Component({
  selector: 'app-modules-filters',
  standalone: true,
  imports: [SearchInput, DropdownFilter, Button],
  template: `
    <section class="rounded-xl border border-line bg-surface p-3 shadow-sm sm:px-5 sm:py-4 mb-4">
      <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <!-- Recherche (Centre - Flex grow) -->
        <div class="flex-1 max-w-md">
          <app-search-input
            identifier="module"
            label="Rechercher un module"
            placeholder="Code ou nom..."
            [value]="searchValue()"
            (searchChange)="searchChange.emit($event)"
          ></app-search-input>
        </div>

        <!-- Filtres contextuels (Gauche) -->
        <div class="flex flex-wrap items-end gap-3 lg:gap-4">
          <div class="min-w-[200px]">
            <app-dropdown-filter
              identifier="formation"
              label="Formation"
              allLabel="Toutes les formations"
              [options]="formationOptions()"
              [value]="formationValue()"
              [searchable]="true"
              iconClass="fa-solid fa-book-open"
              iconBackgroundClass="bg-primary/10 text-primary"
              (filterChange)="formationFilterChange.emit($event)"
            ></app-dropdown-filter>
          </div>

          <div class="min-w-[200px]">
            <app-dropdown-filter
              identifier="semester"
              label="Semestre"
              allLabel="Tous"
              [options]="semesterOptions()"
              [value]="semesterValue()"
              [searchable]="false"
              iconClass="fa-solid fa-calendar"
              iconBackgroundClass="bg-warning/10 text-warning"
              (filterChange)="semesterFilterChange.emit($event)"
            ></app-dropdown-filter>
          </div>
          
          <div class="flex items-center">
            <app-button
              label="Réinitialiser"
              icon="fa-solid fa-rotate-left"
              variant="primary"
              size="sm"
              class="text-sm font-medium text-secondaryText hover:text-primary transition-colors"
              (clicked)="resetFilters.emit()"
            ></app-button>
          </div>
        </div>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModulesFilters {
  // Inputs & Outputs
  readonly formations = input.required<DropdownOption[]>();
  readonly semesters = input.required<DropdownOption[]>();
  readonly searchValue = input('');
  readonly formationValue = input<string | null>(null);
  readonly semesterValue = input<string | null>(null);

  readonly searchChange = output<string>();
  readonly formationFilterChange = output<string | null>();
  readonly semesterFilterChange = output<string | null>();
  readonly resetFilters = output<void>();

  // Computed Options
  readonly formationOptions = computed(() => this.formations());
  readonly semesterOptions = computed(() => this.semesters());
}
