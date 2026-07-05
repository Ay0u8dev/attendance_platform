import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from '../../../../../shared/components/button/button';
import {
  DropdownFilter,
  type DropdownOption,
} from '../../../../../shared/components/dropdown-filter/dropdown-filter';
import { SearchInput } from '../../../../../shared/components/search-input/search-input';

@Component({
  selector: 'app-academic-year-filters',
  standalone: true,
  imports: [SearchInput, DropdownFilter, Button],
  template: `
    <section class="rounded-xl border border-line bg-surface p-3 shadow-sm sm:px-5 sm:py-4 mb-4">
      <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">

        <!-- Search Section: Takes priority on the left -->
        <div class="flex-1 max-w-md">
          <app-search-input
            identifier="academic-year"
            label="Rechercher une année"
            placeholder="Nom ou statut..."
            [value]="searchValue()"
            (searchChange)="searchChange.emit($event)"
          ></app-search-input>
        </div>

        <!-- Filters & Actions Section -->
        <div class="flex flex-wrap items-end gap-3 lg:gap-4">
          <div class="min-w-[200px]">
            <app-dropdown-filter
              identifier="academic-year-status"
              label="Statut"
              allLabel="Tous les statuts"
              [options]="statusOptions"
              [value]="statusValue()"
              [searchable]="false"
              iconClass="fa-solid fa-toggle-on" 
              iconBackgroundClass="bg-secondary-soft text-secondary"
              (filterChange)="statusFilterChange.emit($event)"
            ></app-dropdown-filter>
          </div>

          <div class="flex items-center">
            <app-button
              label="Réinitialiser"
              icon="fa-solid fa-rotate-left"
              variant="primary"
              size="sm"
              class="text-sm font-medium text-muted hover:text-primary transition-colors"
              (clicked)="resetFilters.emit()"
            ></app-button>
          </div>

          @if (createLabel(); as label) {
            <div class="flex items-center">
              <button
                type="button"
                class="inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-primary px-5 text-sm font-semibold text-white shadow-card transition hover:-translate-y-0.5 hover:bg-primary-strong hover:shadow-card-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                (click)="createClicked.emit()"
              >
                <i class="fa-solid fa-plus text-sm" aria-hidden="true"></i>
                <span>{{ label }}</span>
              </button>
            </div>
          }
        </div>

      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AcademicYearFilters {
  readonly searchValue = input('');
  readonly statusValue = input<string | null>(null);
  readonly createLabel = input<string | null>(null);
  readonly searchChange = output<string>();
  readonly statusFilterChange = output<string | null>();
  readonly resetFilters = output<void>();
  readonly createClicked = output<void>();

  readonly statusOptions: DropdownOption[] = [
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
  ];
}
