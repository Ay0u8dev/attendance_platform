import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from '../../../../../shared/components/button/button';
import { SearchInput } from '../../../../../shared/components/search-input/search-input';

@Component({
  selector: 'app-fields-filters',
  standalone: true,
  imports: [SearchInput, Button],
  template: `
    <section class="rounded-xl border border-line bg-surface p-3 shadow-sm sm:px-5 sm:py-4 mb-4">
      <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        
        <!-- Zone de Recherche -->
        <div class="flex-1 max-w-md">
          <app-search-input
            identifier="field"
            label="Rechercher une filière"
            placeholder="Code ou libellé..."
            [value]="searchValue()"
            (searchChange)="searchChange.emit($event)"
          ></app-search-input>
        </div>

        <!-- Zone d'Actions -->
        <div class="flex items-center justify-end">
          <app-button
            label="Réinitialiser"
            icon="fa-solid fa-rotate-left"
            variant="primary"
            size="sm"
            class="text-sm font-medium text-secondaryText hover:text-primary transition-colors"
            (clicked)="resetFilters.emit()"
          ></app-button>
          @if (createLabel(); as label) {
            <button
              type="button"
              class="ml-3 inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-primary px-5 text-sm font-semibold text-white shadow-card transition hover:-translate-y-0.5 hover:bg-primary-strong hover:shadow-card-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              (click)="createClicked.emit()"
            >
              <i class="fa-solid fa-plus text-sm" aria-hidden="true"></i>
              <span>{{ label }}</span>
            </button>
          }
        </div>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FieldsFilters {
  readonly searchValue = input('');
  readonly createLabel = input<string | null>(null);
  readonly searchChange = output<string>();
  readonly resetFilters = output<void>();
  readonly createClicked = output<void>();
}
