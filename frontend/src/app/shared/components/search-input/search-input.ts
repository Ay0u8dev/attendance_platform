import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-input',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="flex-1">
      <label [for]="'search-' + identifier()" class="text-sm font-semibold text-principalText mb-3 flex items-center gap-2">
        <i class="fa-solid fa-magnifying-glass text-primary"></i>
        {{ label() }}
      </label>
      <div class="relative group">
        <input
          [id]="'search-' + identifier()"          type="text"
          [value]="value()"
          [placeholder]="placeholder()"
          (input)="searchChange.emit($any($event.target).value)"
          class="w-full pl-4 pr-4 py-3 rounded-xl border border-line bg-surface text-sm text-principalText placeholder:text-muted transition duration-200 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-20 hover:border-primary-soft"
        />
        <i class="fa-solid fa-magnifying-glass absolute right-3.5 top-3.5 text-secondaryText pointer-events-none"></i>
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
