import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { IconButton } from '../../../../../shared/components/button/icon-button';
import { GroupesFilters } from './groupes-filters'; 
import { DropdownOption } from '../../../../../shared/components/dropdown-filter/dropdown-filter';

export interface GroupeItem {
  id: number;
  name: string;
  formationId: number;
  formationLabel: string;
}

@Component({
  selector: 'app-groupes-list',
  standalone: true,
  imports: [CommonModule, IconButton, GroupesFilters],
  template: `
    <!-- Header -->
    <div class="mt-4 flex flex-wrap items-center justify-between gap-4 mb-6">
      <div>
        <h2 class="text-xl font-bold text-principalText tracking-tight">Groupes pédagogiques</h2>
      </div>
    </div>

    <!-- Filters Interface -->
    <app-groupes-filters
      [formations]="formationOptions()"
      [searchValue]="searchQuery()"
      [formationValue]="selectedFormation()"
      createLabel="Ajouter un groupe"
      (searchChange)="searchQuery.set($event)"
      (formationFilterChange)="selectedFormation.set($event)"
      (resetFilters)="resetFilters()"
      (createClicked)="createClicked.emit()"
    ></app-groupes-filters>

    @if (selectedCount() > 0) {
      <div class="-mt-2 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
        <p class="flex items-center gap-2 text-sm font-medium text-secondaryText">
          <span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
            {{ selectedCount() }}
          </span>
          groupe(s) sélectionné(s)
        </p>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl border border-danger/20 bg-danger/5 px-4 py-2 text-xs font-semibold text-danger transition-colors hover:bg-danger/10"
          (click)="requestBulkDelete()"
        >
          <i class="fa-regular fa-trash-can"></i>
          Supprimer la sélection
        </button>
      </div>
    }

    <!-- Grouped Content -->
    <div *ngIf="groupedGroupes().length; else emptyState" class="space-y-6">
      <section
        *ngFor="let section of groupedGroupes()"
        class="rounded-xl border border-line bg-surface shadow-sm overflow-hidden"
      >
        <header class="flex items-center justify-between gap-4 bg-surface-subtle px-5 py-4 border-b border-line">
          <div class="flex items-center gap-3">
            <input
              type="checkbox"
              class="h-4 w-4 rounded border-line accent-primary"
              [checked]="isSectionSelected(section.groupes)"
              [indeterminate]="isSectionPartiallySelected(section.groupes)"
              (change)="toggleSectionSelection(section.groupes, $event)"
              aria-label="Sélectionner les groupes de la formation"
            />
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
               <i class="fa-solid fa-graduation-cap text-xs"></i>
            </div>
            <h3 class="text-sm font-bold text-principalText">{{ section.label }}</h3>
          </div>
          <span class="rounded-full bg-white border border-line px-3 py-1 text-[11px] font-bold text-secondaryText uppercase tracking-wider">
            {{ section.groupes.length }} groupe(s)
          </span>
        </header>

        <div class="divide-y divide-line">
          <div
            *ngFor="let groupe of section.groupes"
            class="group flex items-center justify-between gap-4 px-5 py-4 hover:bg-surface-subtle/50 transition-colors"
          >
            <div class="flex items-center gap-4">
              <input
                type="checkbox"
                class="h-4 w-4 rounded border-line accent-primary"
                [checked]="isSelected(groupe.id)"
                (change)="toggleSelected(groupe.id, $event)"
                [attr.aria-label]="'Sélectionner ' + groupe.name"
              />
              <span
                class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/5 text-sm font-bold text-primary border border-primary/10 transition-transform group-hover:scale-105"
              >
                {{ groupe.name.charAt(0).toUpperCase() }}
              </span>
              <div>
                <p class="font-bold text-principalText leading-none mb-1">{{ groupe.name }}</p>
              </div>
            </div>
            
            <div class="flex items-center gap-2">
              <app-icon-button
                icon="fa-regular fa-pen-to-square"
                label="Modifier"
                tone="primary"
                size="sm"
                (click)="manageClicked.emit(groupe)"
              ></app-icon-button>
              <app-icon-button
                icon="fa-regular fa-trash-can"
                label="Supprimer"
                tone="danger"
                size="sm"
                (click)="deleteClicked.emit(groupe)"
              ></app-icon-button>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Empty State -->
    <ng-template #emptyState>
      <div class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface p-12 text-center">
        <h3 class="text-base font-bold text-principalText">Aucun groupe trouvé</h3>
        <p class="text-sm text-secondaryText max-w-xs mt-2">Ajustez les filtres ou créez un nouveau groupe.</p>
      </div>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupesList {
  // --- Inputs & Outputs ---
  readonly groupes = input.required<GroupeItem[]>();
  readonly createClicked = output<void>();
  readonly manageClicked = output<GroupeItem>();
  readonly deleteClicked = output<GroupeItem>();
  readonly bulkDeleteRequested = output<readonly GroupeItem[]>();

  // --- State (Signals) ---
  readonly searchQuery = signal('');
  readonly selectedFormation = signal<string | null>(null);
  readonly selectedIds = signal<readonly number[]>([]);
  readonly selectedIdSet = computed(() => new Set(this.selectedIds()));

  // --- Logic (Computed) ---
  
  /**
   * Extrait les formations uniques pour le filtre dropdown
   */
  readonly formationOptions = computed<DropdownOption[]>(() => {
    const uniques = [...new Set(this.groupes().map(g => g.formationLabel))];
    return uniques.sort().map(label => ({ label, value: label }));
  });

  readonly groupedGroupes = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const formationFilter = this.selectedFormation();

    // 1. Filtrage combiné (Recherche + Dropdown)
    let filtered = this.groupes();

    if (query) {
      filtered = filtered.filter(g => 
        g.name.toLowerCase().includes(query) || 
        g.formationLabel.toLowerCase().includes(query)
      );
    }

    if (formationFilter) {
      filtered = filtered.filter(g => g.formationLabel === formationFilter);
    }

    // 2. Groupement par formation
    const groupedMap = new Map<string, GroupeItem[]>();

    filtered.forEach((groupe) => {
      const label = groupe.formationLabel || 'Formation non définie';
      const bucket = groupedMap.get(label) || [];
      bucket.push(groupe);
      groupedMap.set(label, bucket);
    });

    // 3. Transformation en tableau d'objets pour le template
    return [...groupedMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, list]) => ({
        label,
        groupes: [...list].sort((a, b) => a.name.localeCompare(b.name)),
      }));
  });

  readonly selectedCount = computed(() => this.selectedIds().length);

  resetFilters(): void {
    this.searchQuery.set('');
    this.selectedFormation.set(null);
  }

  toggleSelected(id: number, event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    const next = new Set(this.selectedIds());
    if (target.checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
    this.selectedIds.set([...next]);
  }

  isSelected(id: number): boolean {
    return this.selectedIdSet().has(id);
  }

  isSectionSelected(groupes: readonly GroupeItem[]): boolean {
    if (groupes.length === 0) {
      return false;
    }
    const selected = this.selectedIdSet();
    return groupes.every((groupe) => selected.has(groupe.id));
  }

  isSectionPartiallySelected(groupes: readonly GroupeItem[]): boolean {
    const selected = this.selectedIdSet();
    const selectedCount = groupes.filter((groupe) => selected.has(groupe.id)).length;
    return selectedCount > 0 && selectedCount < groupes.length;
  }

  toggleSectionSelection(groupes: readonly GroupeItem[], event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    const next = new Set(this.selectedIds());
    groupes.forEach((groupe) => {
      if (target.checked) {
        next.add(groupe.id);
      } else {
        next.delete(groupe.id);
      }
    });
    this.selectedIds.set([...next]);
  }

  requestBulkDelete(): void {
    const selected = this.groupes().filter((groupe) => this.selectedIdSet().has(groupe.id));
    if (selected.length === 0) {
      return;
    }
    this.bulkDeleteRequested.emit(selected);
  }
}
