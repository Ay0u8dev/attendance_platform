import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from '../../../../../shared/components/button/button';
import {
  DropdownFilter,
  type DropdownOption,
} from '../../../../../shared/components/dropdown-filter/dropdown-filter';
import { SearchInput } from '../../../../../shared/components/search-input/search-input';

@Component({
  selector: 'app-groupes-filters',
  standalone: true,
  imports: [SearchInput, DropdownFilter, Button],
  template: `
    <section class="rounded-xl border border-line bg-surface p-3 shadow-sm sm:px-5 sm:py-4 mb-4">
      <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <!-- Zone de Recherche (Prend l'espace restant) -->
        <div class="flex-1 max-w-md">
          <app-search-input
            identifier="groupe"
            label="Rechercher un groupe"
            placeholder="Nom du groupe..."
            [value]="searchValue()"
            (searchChange)="searchChange.emit($event)"
          ></app-search-input>
        </div>

        <div class="flex flex-wrap items-end gap-3 lg:gap-4">
          <!-- Zone de Filtre Catégoriel (Formation) -->
          <div class="min-w-[200px] ">
            <app-dropdown-filter
              identifier="formation-filter"
              label="Formation"
              allLabel="Toutes les formations"
              [options]="formations()"
              [value]="formationValue()"
              [searchable]="true"
              iconClass="fa-solid fa-graduation-cap"
              iconBackgroundClass="bg-primary/10 text-primary"
              (filterChange)="formationFilterChange.emit($event)"
            ></app-dropdown-filter>
          </div>

          <!-- Action de Réinitialisation -->
          <div class="flex items-center pb-0.5">
            <app-button
              label="Réinitialiser"
              icon="fa-solid fa-rotate-left"
              variant="primary"
              size="sm"
              class="text-sm font-medium text-secondaryText hover:text-primary transition-colors"
              (clicked)="resetFilters.emit()"
            ></app-button>
          </div>

          @if (createLabel(); as label) {
            <div class="flex items-center pb-0.5">
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
export class GroupesFilters {
  // --- Inputs ---
  readonly formations = input.required<DropdownOption[]>();
  readonly searchValue = input('');
  readonly formationValue = input<string | null>(null);
  readonly createLabel = input<string | null>(null);

  // --- Outputs ---
  readonly searchChange = output<string>();
  readonly formationFilterChange = output<string | null>();
  readonly resetFilters = output<void>();
  readonly createClicked = output<void>();
}
