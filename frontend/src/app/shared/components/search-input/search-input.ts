import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-input',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="min-w-0 flex-1">
      <label
        [for]="'search-' + identifier()"
        class="mb-2 flex items-center gap-2 text-sm font-semibold text-principalText"
      >
        <i class="fa-solid fa-magnifying-glass text-sm text-primary" aria-hidden="true"></i>
        {{ label() }}
      </label>
      <div class="group relative">
        <input
          [id]="'search-' + identifier()"
          type="text"
          [value]="value()"
          [placeholder]="placeholder()"
          (input)="searchChange.emit($any($event.target).value)"
          class="w-full rounded-xl border border-line bg-surface py-3 pl-3.5 pr-10 text-sm text-principalText placeholder:text-muted shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 hover:border-line-strong"
        />
        <i
          class="fa-solid fa-magnifying-glass pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-secondaryText"
          aria-hidden="true"
        ></i>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchInput {
  readonly identifier = input('search');
  readonly label = input('Rechercher');
  readonly placeholder = input('Entrez votre recherche...');
  readonly value = input('');
  readonly searchChange = output<string>();
}
