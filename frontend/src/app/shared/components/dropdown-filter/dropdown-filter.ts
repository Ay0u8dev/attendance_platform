import { ChangeDetectionStrategy, Component, input, output, signal, computed, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';

export interface DropdownOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-dropdown-filter',
  standalone: true,
  imports: [FormsModule, NgFor, NgIf],
  template: `
    <div class="w-full">
      <!-- Label Section -->
      <label [for]="'filter-' + identifier" class="text-sm font-bold text-principalText mb-3 flex items-center gap-2.5">
        <div class="flex h-7 w-7 items-center justify-center rounded-lg shadow-md transform transition-transform" [class]="iconBackgroundClass()">
          <i class="text-sm" [class]="iconClass()"></i>
        </div>
        <span class="tracking-wide">{{ label() }}</span>
      </label>

      <!-- Modern Dropdown Container -->
      <div class="relative" [class.group]="isOpen()">
        <!-- Custom Dropdown Display Button -->
        <button
          type="button"
          [id]="'filter-' + identifier"
          (click)="toggleDropdown()"
          class="w-full px-4 py-3.5 rounded-xl border-2 border-line bg-white text-sm transition-all duration-300 cursor-pointer shadow-sm hover:shadow-lg hover:border-primary flex items-center justify-between overflow-hidden text-left font-semibold text-principalText"
        >
          <!-- Selected Value Display -->
          <span class="truncate">
            {{ selectedLabel() || allLabel() }}
          </span>

          <!-- Chevron Icon with Animation -->
          <div class="shrink-0 ml-3 transition-all duration-300 transform" [class]="'text-' + iconColor()" [class.rotate-180]="isOpen()">
            <i class="fa-solid fa-chevron-down text-base"></i>
          </div>
        </button>

        <!-- Options Dropdown Panel -->
        <div
          *ngIf="isOpen()"
          class="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border-2 border-line shadow-lg z-30 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 max-h-96 flex flex-col"
        >
          <!-- Search Input -->
          <div class="sticky top-0 p-3 bg-white border-b border-line">
            <div class="relative">
              <i class="fa-solid fa-magnifying-glass absolute left-3 top-3 text-secondaryText text-sm"></i>
              <input
                type="text"
                placeholder="Rechercher..."
                [ngModel]="searchQuery()"
                (ngModelChange)="onSearchChange($event)"
                class="w-full pl-9 pr-3 py-2 rounded-lg border border-line bg-surface-subtle text-sm text-principalText placeholder:text-muted transition focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary-soft"
              />
            </div>
          </div>

          <!-- Options List Container -->
          <div class="overflow-y-auto flex-1">
            <!-- All Options Item -->
            <button
              type="button"
              (click)="selectOption('')"
              class="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-surface-subtle transition-colors border-b border-line"
              [class.bg-primary-soft]="selectedValue() === ''"
            >
              <span class="text-sm font-medium" [class]="selectedValue() === '' ? 'text-primary' : 'text-secondaryText'">
                {{ allLabel() }}
              </span>
              <i class="fa-solid fa-check text-base" [class]="selectedValue() === '' ? 'text-primary' : 'text-transparent'"></i>
            </button>

            <!-- Option Items -->
            <button
              type="button"
              *ngFor="let option of filteredOptions()"
              (click)="selectOption(option.value)"
              class="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-surface-subtle transition-colors border-b border-line last:border-b-0"
              [class.bg-primary-soft]="selectedValue() === option.value"
            >
              <span class="text-sm font-medium" [class]="selectedValue() === option.value ? 'text-primary' : 'text-principalText'">
                {{ option.label }}
              </span>
              <i class="fa-solid fa-check text-base" [class]="selectedValue() === option.value ? 'text-primary' : 'text-transparent'"></i>
            </button>

            <!-- No Results Message -->
            <div
              *ngIf="filteredOptions().length === 0"
              class="w-full px-4 py-6 text-center text-secondaryText text-sm"
            >
              <div class="opacity-50 mb-2">
                <i class="fa-solid fa-search text-lg"></i>
              </div>
              Aucun résultat trouvé
            </div>
          </div>
        </div>

        <!-- Backdrop overlay to close dropdown -->
        <div
          *ngIf="isOpen()"
          (click)="closeDropdown()"
          class="fixed inset-0 z-20"
        ></div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --color-primary: #0052cc;
      --color-secondary: #6c5ce7;
      --color-warning: #f39c12;
    }

    @keyframes animateIn {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .animate-in {
      animation: animateIn 0.2s ease-out forwards;
    }

    /* Custom scrollbar */
    div::-webkit-scrollbar {
      width: 6px;
    }

    div::-webkit-scrollbar-track {
      background: #f5f7fa;
    }

    div::-webkit-scrollbar-thumb {
      background: #d0d7e0;
      border-radius: 3px;
    }

    div::-webkit-scrollbar-thumb:hover {
      background: #b3bac4;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DropdownFilter {
  readonly identifier = input.required<string>();
  readonly label = input.required<string>();
  readonly allLabel = input('Tous les éléments');
  readonly options = input.required<DropdownOption[]>();
  readonly value = input<string | null>(null);
  readonly iconClass = input.required<string>();
  readonly iconBackgroundClass = input.required<string>();
  readonly iconColor = input<'primary' | 'secondary' | 'warning'>('primary');
  readonly filterChange = output<string | null>();

  readonly isOpen = signal<boolean>(false);
  readonly selectedValue = signal<string>('');
  readonly searchQuery = signal<string>('');

  readonly selectedLabel = computed(() => {
    if (!this.selectedValue()) return null;
    return this.options().find(opt => opt.value === this.selectedValue())?.label || null;
  });

  readonly filteredOptions = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.options();

    return this.options().filter(opt =>
      opt.label.toLowerCase().includes(query) ||
      opt.value.toLowerCase().includes(query)
    );
  });

  private readonly valueSync = effect(() => {
    this.selectedValue.set(this.value() ?? '');
  });

  toggleDropdown(): void {
    this.isOpen.set(!this.isOpen());
    if (!this.isOpen()) {
      this.searchQuery.set('');
    }
  }

  closeDropdown(): void {
    this.isOpen.set(false);
    this.searchQuery.set('');
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
  }

  selectOption(value: string): void {
    this.selectedValue.set(value);
    this.filterChange.emit(value || null);
    this.closeDropdown();
  }
}
