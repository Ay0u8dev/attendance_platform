import { NgFor, NgIf } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface DropdownOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-dropdown-filter',
  standalone: true,
  imports: [FormsModule, NgFor, NgIf],
  template: `
    <div class="w-full text-left">
      <!-- Label Section -->
      <label
        [for]="'filter-' + identifier()"
        class="mb-2 flex items-center gap-2 text-sm font-semibold text-principalText"
      >
        <span
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line"
          [class]="iconBackgroundClass()"
        >
          <i class="text-sm" [class]="iconClass()"></i>
        </span>
        <span>{{ label() }}</span>
        <span *ngIf="required()" class="text-danger" aria-hidden="true">*</span>
      </label>

      <div class="relative" [class.group]="isOpen()">
        <!-- Trigger Button -->
        <button
          type="button"
          [id]="'filter-' + identifier()"
          (click)="toggleDropdown()"
          [disabled]="disabled()"
          class="flex w-full items-center justify-between overflow-hidden rounded-xl border bg-surface px-3.5 py-3 text-left text-sm font-medium text-principalText shadow-sm transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-muted"
          [class.border-danger]="error()"
          [class.border-line]="!error()"
          [class.hover:border-primary/50]="!disabled() && !error()"
          [attr.aria-invalid]="!!error()"
          [attr.aria-expanded]="isOpen()"
        >
          <span class="truncate" [class.text-muted]="!selectedLabel()">
            {{ selectedLabel() || allLabel() }}
          </span>
          <span
            class="ml-3 shrink-0 text-secondaryText transition-transform duration-300"
            [class.rotate-180]="isOpen()"
          >
            <i class="fa-solid fa-chevron-down text-xs"></i>
          </span>
        </button>

        <!-- Dropdown Popover -->
        <div
          *ngIf="isOpen()"
          class="absolute left-0 right-0 top-full z-30 mt-2 flex max-h-80 flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-xl animate-in"
        >
          <!-- Optional Search Bar -->
          <div *ngIf="searchable()" class="sticky top-0 border-b border-line bg-surface p-3">
            <div class="relative group">
              <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-secondaryText group-focus-within:text-primary transition-colors"></i>
              <input
                type="text"
                placeholder="Rechercher..."
                [ngModel]="searchQuery()"
                (ngModelChange)="onSearchChange($event)"
                class="w-full rounded-lg border border-line bg-surface-subtle py-2 pl-9 pr-3 text-sm text-principalText font-medium placeholder:text-muted/50 transition-all focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/10"
              />
            </div>
          </div>

          <!-- Options List -->
          <div class="flex-1 overflow-y-auto custom-scrollbar">
            <!-- Default "All" Option -->
            <button
              type="button"
              (click)="selectOption('')"
              class="flex w-full items-center justify-between border-b border-line px-4 py-3 text-left transition-colors hover:bg-primary-soft/30"
              [class.bg-primary-soft]="selectedValue() === ''"
            >
              <span
                class="text-sm font-semibold"
                [class]="selectedValue() === '' ? 'text-primary' : 'text-secondaryText'"
              >
                {{ allLabel() }}
              </span>
              <i
                class="fa-solid fa-check text-[10px]"
                [class]="selectedValue() === '' ? 'text-primary' : 'text-transparent'"
              ></i>
            </button>

            <!-- Loop Options -->
            <button
              type="button"
              *ngFor="let option of filteredOptions(); trackBy: trackByValue"
              (click)="selectOption(option.value)"
              class="flex w-full items-center justify-between border-b border-line px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-primary-soft/30"
              [class.bg-primary-soft]="selectedValue() === option.value"
            >
              <span
                class="truncate text-sm font-semibold transition-colors"
                [class]="selectedValue() === option.value ? 'text-primary' : 'text-principalText'"
              >
                {{ option.label }}
              </span>
              <i
                class="fa-solid fa-check text-[10px]"
                [class]="selectedValue() === option.value ? 'text-primary' : 'text-transparent'"
              ></i>
            </button>

            <!-- Empty State -->
            <div
              *ngIf="filteredOptions().length === 0"
              class="w-full px-4 py-8 text-center text-sm text-secondaryText"
            >
              <div class="mb-3 text-muted/30">
                <i class="fa-solid fa-face-frown text-2xl"></i>
              </div>
              <p class="font-medium">Aucun résultat trouvé</p>
            </div>
          </div>
        </div>

        <!-- Backdrop to close -->
        <div *ngIf="isOpen()" (click)="closeDropdown()" class="fixed inset-0 z-20 bg-transparent"></div>
      </div>

      <!-- Helper & Error Messages -->
      <p *ngIf="helper() && !error()" class="mt-2 text-xs text-secondaryText/70 italic leading-relaxed">{{ helper() }}</p>
      <div 
        *ngIf="error()" 
        class="mt-2 flex items-center gap-1.5 text-xs font-bold text-danger animate-in"
      >
        <i class="fa-solid fa-circle-exclamation"></i>
        <span>{{ error() }}</span>
      </div>
    </div>
  `,
  styles: [`
    @keyframes animateIn {
      from { opacity: 0; transform: translateY(-8px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .animate-in { animation: animateIn 0.2s cubic-bezier(0, 0, 0.2, 1) forwards; }
    .custom-scrollbar::-webkit-scrollbar { width: 5px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { 
      background: rgba(var(--primary-rgb, 0, 0, 0), 0.1); 
      border-radius: 10px; 
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { 
      background: rgba(var(--primary-rgb, 0, 0, 0), 0.2); 
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DropdownFilter {
  // Inputs
  readonly identifier = input.required<string>();
  readonly label = input.required<string>();
  readonly allLabel = input('Tous les éléments');
  readonly options = input.required<DropdownOption[]>();
  readonly value = input<string | null>(null);
  readonly iconClass = input.required<string>();
  readonly iconBackgroundClass = input.required<string>();
  readonly searchable = input(true);
  readonly required = input(false);
  readonly disabled = input(false);
  readonly helper = input('');
  readonly error = input('');

  // Outputs
  readonly filterChange = output<string | null>();

  // Internal State
  readonly isOpen = signal(false);
  readonly selectedValue = signal('');
  readonly searchQuery = signal('');

  // Computed Values
  readonly selectedLabel = computed(() => {
    const val = this.selectedValue();
    if (!val) return null;
    return this.options().find((opt) => opt.value === val)?.label ?? null;
  });

  readonly filteredOptions = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!this.searchable() || !query) return this.options();

    return this.options().filter(
      (opt) => opt.label.toLowerCase().includes(query) || opt.value.toLowerCase().includes(query)
    );
  });

  // Sync input value with internal state
  private readonly valueSync = effect(() => {
    this.selectedValue.set(this.value() ?? '');
  }, { allowSignalWrites: true });

  // Methods
  toggleDropdown(): void {
    if (this.disabled()) return;
    this.isOpen.update((v) => !v);
    if (!this.isOpen()) this.searchQuery.set('');
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

  trackByValue(_: number, option: DropdownOption): string {
    return option.value;
  }
}