import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-data-table-pagination',
  standalone: true,
  template: `
    <div
      class="flex flex-col gap-4 border-t border-line px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between"
    >
      <div
        class="flex flex-col gap-2 text-sm text-secondaryText sm:flex-row sm:items-center sm:gap-4"
      >
        <div class="flex items-center gap-1">
          <p class="min-w-[100px] text-right text-sm text-secondaryText">
            Page <span class="text-principalText font-medium">{{ currentPage() }}</span> sur
            {{ pageCount() }}
          </p>
        </div>
      </div>

      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <!-- Menu Déroulant Amélioré -->
        <label class="flex items-center gap-3 text-sm font-medium text-secondaryText">
          <span>Lignes par page</span>
          <div class="relative group">
            <!-- Bouton Déclencheur -->
            <button
              type="button"
              class="flex h-10 w-24 items-center justify-between rounded-xl border border-line bg-surface px-4 text-sm font-bold text-principalText transition-all duration-300 hover:border-primary/50 hover:bg-primary-soft/10 focus:ring-4 focus:ring-primary-soft/30 active:scale-95"
            >
              <span>{{ pageSize() }}</span>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="14" height="14" 
                viewBox="0 0 24 24" fill="none" 
                stroke="currentColor" stroke-width="3" 
                stroke-linecap="round" stroke-linejoin="round"
                class="text-secondaryText transition-transform duration-300 group-focus-within:rotate-180"
              >
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </button>

            <!-- Liste Popover Moderne -->
            <div
              class="absolute bottom-full mb-2 left-0 z-50 w-full min-w-[100px] origin-bottom scale-95 opacity-0 invisible transition-all duration-200 group-focus-within:visible group-focus-within:scale-100 group-focus-within:opacity-100"
            >
              <div class="overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-xl ring-1 ring-black/5">
                <p class="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-secondaryText/60">Lignes</p>
                
                @for (option of pageSizeOptions(); track option) {
                  <button
                    (click)="pageSizeChange.emit(option)"
                    class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold transition-colors
                           hover:bg-primary-soft hover:text-primary
                           [&:not(:hover)]:text-principalText"
                    [class.bg-primary-soft]="option === pageSize()"
                  >
                    {{ option }}
                    @if (option === pageSize()) {
                      <i class="fa-solid fa-check text-[10px]"></i>
                    }
                  </button>
                }
              </div>
            </div>
          </div>
        </label>

        <div class="flex items-center gap-2">

          <button
            type="button"
            class="inline-flex h-10 items-center justify-center rounded-xl border border-line bg-surface px-4 text-sm font-semibold text-principalText transition-all duration-200 hover:bg-primary-soft hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
            [disabled]="!canGoPrevious()"
            (click)="pageChange.emit(currentPage() - 1)"
          >
            Précédent
          </button>

          <button
            type="button"
            class="inline-flex h-10 items-center justify-center rounded-xl border border-line bg-surface px-4 text-sm font-semibold text-principalText transition-all duration-200 hover:bg-primary-soft hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
            [disabled]="!canGoNext()"
            (click)="pageChange.emit(currentPage() + 1)"
          >
            Suivant
          </button>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTablePagination {
  readonly currentPage = input(1);
  readonly pageCount = input(1);
  readonly pageSize = input(10);
  readonly totalItems = input(0);
  readonly startIndex = input(0);
  readonly endIndex = input(0);
  readonly selectedCount = input(0);
  readonly canGoPrevious = input(false);
  readonly canGoNext = input(false);
  readonly pageSizeOptions = input<readonly number[]>([5, 10, 20, 50]);

  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();
  readonly deleteSelected = output<void>();

  handlePageSizeChange(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLSelectElement) {
      this.pageSizeChange.emit(Number(target.value));
    }
  }
}