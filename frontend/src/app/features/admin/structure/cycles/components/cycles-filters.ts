import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Button } from '../../../../../shared/components/button/button';
import {
  DropdownFilter,
  type DropdownOption,
} from '../../../../../shared/components/dropdown-filter/dropdown-filter';
import { SearchInput } from '../../../../../shared/components/search-input/search-input';

@Component({
  selector: 'app-cycles-filters',
  standalone: true,
  imports: [SearchInput, DropdownFilter, Button],
  template: `
    <section class="rounded-xl border border-line bg-surface p-3 shadow-sm sm:px-5 sm:py-4 mb-4">
      <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        
        <!-- Recherche : Prend l'espace disponible à gauche -->
        <div class="flex-1 max-w-md">
          <app-search-input
            identifier="cycle"
            label="Rechercher un cycle"
            placeholder="Code, libellé ou type..."
            [value]="searchValue()"
            (searchChange)="searchChange.emit($event)"
          ></app-search-input>
        </div>

        <!-- Filtres et Actions : Groupés à droite -->
        <div class="flex flex-wrap items-end gap-3 lg:gap-4">
          <div class="min-w-[200px]">
            <app-dropdown-filter
              identifier="cycle-type"
              label="Type de cycle"
              allLabel="Tous les types"
              [options]="typeOptions"
              [value]="typeValue()"
              [searchable]="false"
              iconClass="fa-solid fa-layer-group"
              iconBackgroundClass="bg-secondary-soft text-secondary"
              (filterChange)="typeFilterChange.emit($event)"
            ></app-dropdown-filter>
          </div>

          <div class="flex items-center">
            <app-button
              label="Réinitialiser"
              icon="fa-solid fa-arrow-rotate-left"
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
export class CyclesFilters {
  readonly searchValue = input('');
  readonly typeValue = input<string | null>(null);
  readonly createLabel = input<string | null>(null);
  readonly searchChange = output<string>();
  readonly typeFilterChange = output<string | null>();
  readonly resetFilters = output<void>();
  readonly createClicked = output<void>();

  readonly typeOptions: DropdownOption[] = [
    { label: 'Préparatoire', value: 'PREPA' },
    { label: 'Ingénieur', value: 'INGENIEUR' },
  ];
}
