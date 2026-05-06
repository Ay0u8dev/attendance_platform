import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from '../../../../../shared/components/button/button';
import {
  DropdownFilter,
  type DropdownOption,
} from '../../../../../shared/components/dropdown-filter/dropdown-filter';
import { SearchInput } from '../../../../../shared/components/search-input/search-input';

@Component({
  selector: 'app-formations-filters',
  standalone: true,
  imports: [SearchInput, DropdownFilter, Button],
  template: `
    <section class="rounded-xl border border-line bg-surface p-3 shadow-sm sm:px-5 sm:py-4 mb-4">
      <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">

        <!-- Zone de Recherche Principale -->
        <div class="flex-1 max-w-md">
          <app-search-input
            identifier="formation"
            label="Rechercher une formation"
            placeholder="Cycle ou filière..."
            [value]="searchValue()"
            (searchChange)="searchChange.emit($event)"
          ></app-search-input>
        </div>

        <!-- Zone de Filtres et Actions -->
        <div class="flex flex-wrap items-end gap-3 lg:gap-4">
          <div class="min-w-[200px]">
            <app-dropdown-filter
              identifier="cycle"
              label="Cycle"
              allLabel="Tous les cycles"
              [options]="cycles()"
              [value]="cycleValue()"
              [searchable]="false"
              iconClass="fa-solid fa-layer-group"
              iconBackgroundClass="bg-primary/10 text-primary"
              (filterChange)="cycleFilterChange.emit($event)"
            ></app-dropdown-filter>
          </div>

          <div class="min-w-[200px]">
            <app-dropdown-filter
              identifier="field"
              label="Filière"
              allLabel="Toutes les filières"
              [options]="fields()"
              [value]="fieldValue()"
              [searchable]="false"
              iconClass="fa-solid fa-graduation-cap"
              iconBackgroundClass="bg-secondary/10 text-secondary"
              (filterChange)="fieldFilterChange.emit($event)"
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
export class FormationsFilters {
  // Entrées obligatoires
  readonly cycles = input.required<DropdownOption[]>();
  readonly fields = input.required<DropdownOption[]>();

  // Valeurs des filtres
  readonly searchValue = input('');
  readonly cycleValue = input<string | null>(null);
  readonly fieldValue = input<string | null>(null);

  // Sorties d'événements
  readonly searchChange = output<string>();
  readonly cycleFilterChange = output<string | null>();
  readonly fieldFilterChange = output<string | null>();
  readonly resetFilters = output<void>();
}