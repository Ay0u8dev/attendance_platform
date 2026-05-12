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
    <section class="mb-4 rounded-xl border border-line bg-surface p-3 shadow-sm sm:px-5 sm:py-4">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">

        <div class="w-full lg:max-w-md">
          <app-search-input
            identifier="formation"
            label="Rechercher une formation"
            placeholder="Cycle ou filière..."
            [value]="searchValue()"
            (searchChange)="searchChange.emit($event)"
          ></app-search-input>
        </div>

        <div class="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:flex xl:w-auto xl:items-end xl:gap-4">

          <div class="w-full xl:min-w-[220px]">
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

          <div class="w-full xl:min-w-[220px]">
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

          <div class="flex items-center justify-end sm:col-span-2 xl:col-span-1 xl:pb-1">
            <app-button
              label="Réinitialiser"
              icon="fa-solid fa-rotate-left"
              variant="primary"
              size="sm"
              class="w-full text-sm font-medium text-secondaryText transition-colors hover:text-primary sm:w-auto"
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
  readonly cycles = input.required<DropdownOption[]>();
  readonly fields = input.required<DropdownOption[]>();
  readonly searchValue = input('');
  readonly cycleValue = input<string | null>(null);
  readonly fieldValue = input<string | null>(null);

  readonly searchChange = output<string>();
  readonly cycleFilterChange = output<string | null>();
  readonly fieldFilterChange = output<string | null>();
  readonly resetFilters = output<void>();
}
